import net from 'net'
import jwt from 'jsonwebtoken'
import { WebSocketServer } from 'ws'

import { getVMConsole } from '../services/vmService.js'

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

export function attachVncWsProxy(httpServer) {
  const wss = new WebSocketServer({ noServer: true })

  httpServer.on('upgrade', (req, socket, head) => {
    try {
      const host = req.headers.host || 'localhost'
      const url = new URL(req.url, `http://${host}`)

      // 仅处理 /api/virtual-machines/:name/ws
      const m = url.pathname.match(/^\/api\/virtual-machines\/([^/]+)\/ws$/)
      if (!m) return

      const vmName = decodeURIComponent(m[1])

      // token 通过 query 传递（浏览器 WebSocket 不方便自定义 Authorization 头）
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
        wss.emit('connection', ws, req, { vmName })
      })
    } catch (e) {
      return rejectUpgrade(socket, 400, 'Bad Request')
    }
  })

  wss.on('connection', async (ws, req, ctx) => {
    const vmName = ctx?.vmName || 'unknown'
    let tcp = null

    try {
      const info = await getVMConsole(vmName)
      const vncPort = info?.vncPort
      if (!vncPort) {
        ws.close()
        return
      }

      tcp = net.connect({ host: '127.0.0.1', port: vncPort })

      tcp.on('data', (chunk) => {
        try {
          ws.send(chunk)
        } catch (_) {
          try {
            tcp.destroy()
          } catch (_) {}
        }
      })

      tcp.on('error', () => {
        try {
          ws.close()
        } catch (_) {}
      })

      tcp.on('close', () => {
        try {
          ws.close()
        } catch (_) {}
      })

      ws.on('message', (data) => {
        if (!tcp) return
        if (typeof data === 'string') {
          tcp.write(Buffer.from(data))
        } else if (data instanceof ArrayBuffer) {
          tcp.write(Buffer.from(new Uint8Array(data)))
        } else {
          tcp.write(data)
        }
      })

      ws.on('close', () => {
        try {
          tcp?.destroy()
        } catch (_) {}
      })

      ws.on('error', () => {
        try {
          tcp?.destroy()
        } catch (_) {}
      })
    } catch (e) {
      try {
        tcp?.destroy()
      } catch (_) {}
      try {
        ws.close()
      } catch (_) {}
    }
  })

  return wss
}


