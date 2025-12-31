import net from 'net'
import { WebSocketServer } from 'ws'

// 使用内置 WS↔TCP 代理，避免 NPM websockify 在 Node 20 下 upgradeReq 兼容性崩溃导致 1006
// key: vmName -> { wss, websocketPort, vncPort }
const proxyServersByVm = new Map()
// key: websocketPort -> vmName
const portOwner = new Map()

/**
 * 启动websockify代理服务
 * @param {string} vmName - 虚拟机名称
 * @param {number} vncPort - VNC端口
 * @param {number} websocketPort - WebSocket端口
 */
export const startWebsockify = async (vmName, vncPort, websocketPort) => {
  // 已运行则复用
  if (proxyServersByVm.has(vmName)) {
    const existing = proxyServersByVm.get(vmName)
    if (existing && existing.websocketPort === websocketPort && existing.vncPort === vncPort) {
      return { success: true, message: 'Websockify代理已运行' }
    }
  }

  // 端口归属冲突
  const owner = portOwner.get(websocketPort)
  if (owner && owner !== vmName) {
    throw new Error(`Websockify端口 ${websocketPort} 已被 ${owner} 占用`)
  }

  // 若同 VM 之前起过不同端口/目标，先停掉
  try {
    stopWebsockify(vmName)
  } catch (_) {}

  return await new Promise((resolve, reject) => {
    const wss = new WebSocketServer({ host: '0.0.0.0', port: websocketPort })

    wss.on('listening', () => {
      proxyServersByVm.set(vmName, { wss, websocketPort, vncPort })
      portOwner.set(websocketPort, vmName)
      console.log(`[ws-proxy:${vmName}] listening 0.0.0.0:${websocketPort} -> 127.0.0.1:${vncPort}`)
      resolve({ success: true, message: 'Websockify代理已启动' })
    })

    wss.on('error', (err) => {
      console.error(`[ws-proxy:${vmName}] server error:`, err)
      try {
        wss.close()
      } catch (_) {}
      proxyServersByVm.delete(vmName)
      if (portOwner.get(websocketPort) === vmName) portOwner.delete(websocketPort)
      reject(new Error(`Websockify启动失败: ${err?.message || err}`))
    })

    wss.on('connection', (ws, req) => {
      console.log(`[ws-proxy:${vmName}] ws connection ${req?.socket?.remoteAddress || ''}`)

      // 连接到本地 VNC
      const tcp = net.connect({ host: '127.0.0.1', port: vncPort })

      tcp.on('connect', () => {
        // ready
      })

      tcp.on('data', (chunk) => {
        try {
          ws.send(chunk)
        } catch (e) {
          try {
            tcp.destroy()
          } catch (_) {}
        }
      })

      tcp.on('error', (e) => {
        console.error(`[ws-proxy:${vmName}] tcp error:`, e?.message || e)
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
        // data: Buffer | ArrayBuffer | string
        if (typeof data === 'string') {
          tcp.write(Buffer.from(data))
        } else if (data instanceof ArrayBuffer) {
          tcp.write(Buffer.from(new Uint8Array(data)))
        } else {
          tcp.write(data)
        }
      })

      ws.on('error', (e) => {
        console.error(`[ws-proxy:${vmName}] ws error:`, e?.message || e)
        try {
          tcp.destroy()
        } catch (_) {}
      })

      ws.on('close', () => {
        try {
          tcp.destroy()
        } catch (_) {}
      })
    })
  })
}

/**
 * 停止websockify代理服务
 */
export const stopWebsockify = (vmName) => {
  if (proxyServersByVm.has(vmName)) {
    const server = proxyServersByVm.get(vmName)
    try {
      server?.wss?.close()
    } catch (_) {}
    proxyServersByVm.delete(vmName)
    if (server?.websocketPort && portOwner.get(server.websocketPort) === vmName) {
      portOwner.delete(server.websocketPort)
    }
    return { success: true, message: 'Websockify代理已停止' }
  }
  return { success: false, message: 'Websockify代理未运行' }
}

/**
 * 检查websockify是否在运行
 */
export const isWebsockifyRunning = (vmName) => {
  return proxyServersByVm.has(vmName)
}

