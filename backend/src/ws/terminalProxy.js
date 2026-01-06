import { spawn } from 'child_process'
import jwt from 'jsonwebtoken'
import { WebSocketServer } from 'ws'

const JWT_SECRET = process.env.JWT_SECRET || 'infiniteos-secret-key-change-in-production'

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
      // 获取用户的shell（从环境变量或默认使用bash）
      const userShell = process.env.SHELL || '/bin/bash'
      const shellName = userShell.split('/').pop() || 'bash'

      // 启动shell进程
      shell = spawn(shellName, ['-i'], {
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          LANG: 'en_US.UTF-8',
          LC_ALL: 'en_US.UTF-8',
          LC_CTYPE: 'en_US.UTF-8',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      })

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
        if (!isClosed && ws.readyState === ws.OPEN) {
          try {
            ws.send(`\r\n[进程退出，代码: ${code || signal}]\r\n`)
          } catch (_) {}
        }
        cleanup()
      })

      shell.on('error', (error) => {
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
          if (shell && !shell.killed) {
            shell.kill('SIGTERM')
            // 如果SIGTERM无效，强制杀死
            setTimeout(() => {
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

