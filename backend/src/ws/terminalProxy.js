import { spawn } from 'child_process'
import { readdirSync, readlinkSync } from 'fs'
import jwt from 'jsonwebtoken'
import { WebSocketServer } from 'ws'

const JWT_SECRET = process.env.JWT_SECRET || 'infiniteos-secret-key-change-in-production'
const DEFAULT_SHELL = '/bin/bash'
const DEFAULT_HOME = process.env.HOME || '/root'
const TERMINAL_CONTROL_PREFIX = '\u0000__INFINITEOS_TERMINAL_CONTROL__'

function escapeShellPathForCommand(shellPath) {
  return `"${String(shellPath).replace(/(["\\$`])/g, '\\$1')}"`
}

function buildTerminalEnv(shellPath) {
  const env = {
    ...process.env,
    SHELL: shellPath,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    HOME: process.env.HOME || DEFAULT_HOME,
  }

  for (const key of Object.keys(env)) {
    if (key === 'LANG' || key.startsWith('LC_')) {
      delete env[key]
    }
  }

  env.LANG = 'C.UTF-8'
  env.LC_ALL = 'C.UTF-8'
  env.LC_CTYPE = 'C.UTF-8'

  return env
}

function createTerminalProcess() {
  const shellPath = DEFAULT_SHELL
  const env = buildTerminalEnv(shellPath)
  const shellCommand = `${escapeShellPathForCommand(shellPath)} -i`

  return spawn('script', ['-q', '-e', '-f', '-c', shellCommand, '/dev/null'], {
    cwd: env.HOME || DEFAULT_HOME,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}

function getTerminalPtyPath(shell) {
  if (!shell?.pid) {
    return null
  }

  if (shell._ptyPath) {
    return shell._ptyPath
  }

  try {
    const fdDir = `/proc/${shell.pid}/fd`

    for (const fdName of readdirSync(fdDir)) {
      const target = readlinkSync(`${fdDir}/${fdName}`)

      if (/^\/dev\/pts\/\d+$/.test(target)) {
        shell._ptyPath = target
        return target
      }
    }
  } catch (_) {}

  return null
}

function clearShellResizeRetryTimer(shell) {
  if (shell?._resizeRetryTimer) {
    clearTimeout(shell._resizeRetryTimer)
    shell._resizeRetryTimer = null
  }
}

function clearShellKillTimer(shell) {
  if (shell?._killTimer) {
    clearTimeout(shell._killTimer)
    shell._killTimer = null
  }
}

function applyTerminalResize(shell, cols, rows) {
  if (!shell || shell.killed) {
    return
  }

  const normalizedCols = Number.parseInt(String(cols), 10)
  const normalizedRows = Number.parseInt(String(rows), 10)

  if (!Number.isFinite(normalizedCols) || !Number.isFinite(normalizedRows)) {
    return
  }

  if (normalizedCols <= 0 || normalizedRows <= 0) {
    return
  }

  if (shell._lastResize?.cols === normalizedCols && shell._lastResize?.rows === normalizedRows) {
    return
  }

  const ptyPath = getTerminalPtyPath(shell)

  if (!ptyPath) {
    shell._resizeRetryCount = (shell._resizeRetryCount || 0) + 1

    if (shell._resizeRetryCount <= 5) {
      clearShellResizeRetryTimer(shell)
      shell._resizeRetryTimer = setTimeout(() => {
        shell._resizeRetryTimer = null
        applyTerminalResize(shell, normalizedCols, normalizedRows)
      }, 50)
    }

    return
  }

  clearShellResizeRetryTimer(shell)
  shell._resizeRetryCount = 0
  shell._lastResize = { cols: normalizedCols, rows: normalizedRows }

  const resizeProcess = spawn(
    'stty',
    ['-F', ptyPath, 'rows', String(normalizedRows), 'cols', String(normalizedCols)],
    { stdio: 'ignore' },
  )

  resizeProcess.on('error', () => {})
}

function parseTerminalControlMessage(data) {
  let input

  if (typeof data === 'string') {
    input = data
  } else if (Buffer.isBuffer(data)) {
    input = data.toString('utf8')
  } else {
    input = String(data)
  }

  if (!input.startsWith(TERMINAL_CONTROL_PREFIX)) {
    return null
  }

  try {
    return JSON.parse(input.slice(TERMINAL_CONTROL_PREFIX.length))
  } catch (_) {
    return null
  }
}

function rejectUpgrade(socket, statusCode, message) {
  try {
    socket.write(
      `HTTP/1.1 ${statusCode} ${message}\r\n` +
        'Connection: close\r\n' +
        'Content-Type: text/plain; charset=utf-8\r\n' +
        `Content-Length: ${Buffer.byteLength(message)}\r\n` +
        '\r\n' +
        message,
    )
  } catch (_) {
    // ignore
  } finally {
    try {
      socket.destroy()
    } catch (_) {}
  }
}

export function attachTerminalWsProxy(httpServer) {
  const wss = new WebSocketServer({ noServer: true })

  httpServer.on('upgrade', (req, socket, head) => {
    try {
      const host = req.headers.host || 'localhost'
      const url = new URL(req.url, `http://${host}`)

      // 仅处理 /api/terminal/ws
      if (url.pathname !== '/api/terminal/ws') {
        console.log('WebSocket upgrade ignored:', url.pathname)
        return
      }

      console.log('WebSocket upgrade request for terminal:', url.pathname, url.search)

      // token 通过 query 传递
      const token = url.searchParams.get('token')
      const allowNoAuth = process.env.ALLOW_WS_NOAUTH === 'true'
      if (!token && !allowNoAuth) {
        return rejectUpgrade(socket, 401, 'Unauthorized')
      }

      if (token) {
        try {
          jwt.verify(token, JWT_SECRET)
        } catch (_) {
          return rejectUpgrade(socket, 403, 'Forbidden')
        }
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req)
      })
    } catch (e) {
      return rejectUpgrade(socket, 400, 'Bad Request')
    }
  })

  wss.on('connection', (ws, req) => {
    let shell = null
    let isClosed = false

    try {
      // 使用 script 分配 PTY，避免交互 shell 在无 tty 下启动时报错
      shell = createTerminalProcess()

      // 发送shell输出到WebSocket
      shell.stdout.on('data', (data) => {
        if (!isClosed && ws.readyState === ws.OPEN) {
          try {
            // 确保使用UTF-8编码
            if (Buffer.isBuffer(data)) {
              ws.send(data.toString('utf8'))
            } else {
              ws.send(String(data))
            }
          } catch (_) {
            // WebSocket已关闭，忽略错误
          }
        }
      })

      shell.stderr.on('data', (data) => {
        if (!isClosed && ws.readyState === ws.OPEN) {
          try {
            // 确保使用UTF-8编码
            if (Buffer.isBuffer(data)) {
              ws.send(data.toString('utf8'))
            } else {
              ws.send(String(data))
            }
          } catch (_) {
            // WebSocket已关闭，忽略错误
          }
        }
      })

      // 处理shell退出
      shell.on('exit', (code, signal) => {
        clearShellKillTimer(shell)
        clearShellResizeRetryTimer(shell)

        if (!isClosed && ws.readyState === ws.OPEN) {
          try {
            ws.send(`\r\n[进程退出，代码: ${code || signal}]\r\n`)
          } catch (_) {}
        }
        cleanup()
      })

      shell.on('error', (error) => {
        clearShellKillTimer(shell)
        clearShellResizeRetryTimer(shell)

        if (!isClosed && ws.readyState === ws.OPEN) {
          try {
            ws.send(`\r\n[错误: ${error.message}]\r\n`)
          } catch (_) {}
        }
        cleanup()
      })

      // 从WebSocket接收输入并发送到shell
      ws.on('message', (data) => {
        if (shell && !shell.killed && !isClosed) {
          try {
            const controlMessage = parseTerminalControlMessage(data)

            if (controlMessage?.type === 'resize') {
              applyTerminalResize(shell, controlMessage.cols, controlMessage.rows)
              return
            }

            // 确保正确处理输入数据
            let input
            if (typeof data === 'string') {
              input = data
            } else if (Buffer.isBuffer(data)) {
              input = data.toString('utf8')
            } else {
              input = String(data)
            }
            shell.stdin.write(input, 'utf8')
          } catch (error) {
            console.error('写入shell输入失败:', error)
          }
        }
      })

      // WebSocket关闭时清理
      ws.on('close', () => {
        cleanup()
      })

      ws.on('error', () => {
        cleanup()
      })

      // 清理函数
      function cleanup() {
        if (isClosed) return
        isClosed = true

        try {
          clearShellKillTimer(shell)
          clearShellResizeRetryTimer(shell)

          if (shell && !shell.killed) {
            shell.kill('SIGTERM')
            // 如果SIGTERM无效，强制杀死
            shell._killTimer = setTimeout(() => {
              if (shell && !shell.killed) {
                shell.kill('SIGKILL')
              }
            }, 1000)
          }
        } catch (_) {}

        try {
          if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
            ws.close()
          }
        } catch (_) {}
      }

      // 发送欢迎消息
      if (ws.readyState === ws.OPEN) {
        ws.send('\x1b[32m欢迎使用系统终端\x1b[0m\r\n')
      }
    } catch (e) {
      console.error('终端连接错误:', e)
      try {
        if (ws.readyState === ws.OPEN) {
          ws.send(`\r\n[连接错误: ${e.message}]\r\n`)
        }
        ws.close()
      } catch (_) {}
    }
  })

  return wss
}
