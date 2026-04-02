<template>
  <AdminLayout>
    <div class="p-6 h-full flex flex-col">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ $t('pages.terminal.title') }}</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">{{ $t('pages.terminal.description') }}</p>
      </div>

      <div class="flex-1 min-w-0 rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
        <!-- 终端工具栏 -->
        <div class="px-4 py-2 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">{{ $t('pages.terminal.status') }}:</span>
            <span
              :class="[
                'px-2 py-1 text-xs rounded',
                isConnected ? 'bg-success-500/10 text-success-500' : 'bg-gray-500/10 text-gray-500'
              ]"
            >
              {{ isConnected ? $t('pages.terminal.connected') : $t('pages.terminal.disconnected') }}
            </span>
            <span v-if="isConnecting" class="text-sm text-gray-500">{{ $t('pages.terminal.connecting') }}...</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="!isConnected && !isConnecting"
              @click="connect"
              class="px-3 py-1.5 text-sm bg-brand-500 text-white rounded hover:bg-brand-600 transition-colors"
            >
              {{ $t('pages.terminal.connect') }}
            </button>
            <button
              v-if="isConnected"
              @click="disconnect"
              class="px-3 py-1.5 text-sm bg-error-500 text-white rounded hover:bg-error-600 transition-colors"
            >
              {{ $t('pages.terminal.disconnect') }}
            </button>
            <button
              v-if="isConnected"
              @click="clearTerminal"
              class="px-3 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              {{ $t('pages.terminal.clear') }}
            </button>
          </div>
        </div>

        <!-- xterm.js终端容器 -->
        <div
          ref="terminalContainer"
          class="flex-1 min-w-0 bg-gray-900 dark:bg-gray-950 overflow-hidden"
          style="min-height: 0;"
        ></div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

const { t: $t } = useI18n()
const route = useRoute()

const terminalContainer = ref<HTMLElement | null>(null)
const isConnected = ref(false)
const isConnecting = ref(false)
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let ws: WebSocket | null = null
let reconnectAttempts = 0
const maxReconnectAttempts = 3
let connectTimeout: number | null = null
let resizeHandler: (() => void) | null = null
const CONNECTION_TIMEOUT = 10000 // 10秒超时
const TERMINAL_CONTROL_PREFIX = '\u0000__INFINITEOS_TERMINAL_CONTROL__'
let resizeObserver: ResizeObserver | null = null
let contextMenuHandler: ((event: MouseEvent) => void) | null = null
let lastTerminalSize: { cols: number; rows: number } | null = null

// 获取WebSocket URL
const getWsUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  const token = localStorage.getItem('token')
  return `${protocol}//${host}/api/terminal/ws?token=${token || ''}`
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

const sendTerminalResize = (
  cols: number | undefined = terminal?.cols,
  rows: number | undefined = terminal?.rows,
  force = false,
) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return

  const nextCols = Number(cols)
  const nextRows = Number(rows)

  if (!Number.isFinite(nextCols) || !Number.isFinite(nextRows)) return
  if (nextCols <= 0 || nextRows <= 0) return

  if (!force && lastTerminalSize?.cols === nextCols && lastTerminalSize?.rows === nextRows) {
    return
  }

  lastTerminalSize = { cols: nextCols, rows: nextRows }
  ws.send(
    `${TERMINAL_CONTROL_PREFIX}${JSON.stringify({ type: 'resize', cols: nextCols, rows: nextRows })}`,
  )
}

const fitTerminal = () => {
  if (!fitAddon || !terminal || !terminalContainer.value) return

  const container = terminalContainer.value
  if (container.offsetWidth <= 0 || container.offsetHeight <= 0) return

  fitAddon.fit()
}

// 初始化xterm终端
const initTerminal = () => {
  if (!terminalContainer.value) return

  // 创建终端实例
  terminal = new Terminal({
    cursorBlink: true,
    cursorStyle: 'block',
    fontFamily: 'Courier New, Monaco, Menlo, monospace',
    fontSize: 14,
    theme: {
      background: '#111827', // gray-900
      foreground: '#d1d5db', // gray-300
      cursor: '#10b981', // green-500
      selectionBackground: '#374151', // gray-700
    },
    allowProposedApi: true,
    convertEol: true, // 将\n转换为\r\n，确保正确换行
    disableStdin: false,
  })

  // 添加插件
  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.loadAddon(new WebLinksAddon())

  // 打开终端
  terminal.open(terminalContainer.value)
  terminal.onResize(({ cols, rows }) => {
    sendTerminalResize(cols, rows)
  })

  // 等待DOM完全渲染后再调整大小
  nextTick(() => {
    fitTerminal()

    if (!terminalContainer.value) return
    const container = terminalContainer.value

    if (container.offsetWidth <= 0 || container.offsetHeight <= 0) {
      setTimeout(() => {
        fitTerminal()
      }, 100)
    }
  })

  // 监听窗口大小变化
  resizeObserver = new ResizeObserver(() => {
    fitTerminal()
  })
  if (terminalContainer.value) {
    resizeObserver.observe(terminalContainer.value)
  }

  // 监听浏览器窗口大小变化
  const handleWindowResize = () => {
    if (fitAddon && terminal) {
      setTimeout(() => {
        fitTerminal()
      }, 50)
    }
  }
  window.addEventListener('resize', handleWindowResize)
  resizeHandler = handleWindowResize

  // 监听终端输入
  terminal.onData((data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(data)
    }
  })

  // 支持复制粘贴
  terminal.attachCustomKeyEventHandler((event) => {
    // Ctrl+C / Cmd+C - 复制
    if ((event.ctrlKey || event.metaKey) && event.key === 'c' && terminal?.hasSelection()) {
      const selection = terminal.getSelection()
      if (selection) {
        navigator.clipboard.writeText(selection).catch(() => {
          // 降级方案
          const textarea = document.createElement('textarea')
          textarea.value = selection
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        })
      }
      return false // 阻止默认行为
    }
    // Ctrl+V / Cmd+V - 粘贴
    if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
      navigator.clipboard.readText().then((text) => {
        if (ws && ws.readyState === WebSocket.OPEN && terminal) {
          ws.send(text)
        }
      }).catch(() => {
        // 降级方案：使用剪贴板API
        const textarea = document.createElement('textarea')
        document.body.appendChild(textarea)
        textarea.focus()
        document.execCommand('paste')
        const text = textarea.value
        document.body.removeChild(textarea)
        if (text && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(text)
        }
      })
      return false // 阻止默认行为
    }
    return true
  })

  // 右键菜单支持复制粘贴
  contextMenuHandler = (e: MouseEvent) => {
    e.preventDefault()
    if (terminal?.hasSelection()) {
      const selection = terminal.getSelection()
      if (selection) {
        navigator.clipboard.writeText(selection).catch(() => {})
      }
    } else {
      // 粘贴
      navigator.clipboard.readText().then((text) => {
        if (ws && ws.readyState === WebSocket.OPEN && terminal) {
          ws.send(text)
        }
      }).catch(() => {})
    }
  }
  terminalContainer.value.addEventListener('contextmenu', contextMenuHandler)
}

// 清除连接超时
const clearConnectTimeout = () => {
  if (connectTimeout !== null) {
    clearTimeout(connectTimeout)
    connectTimeout = null
  }
}

// 连接终端
const connect = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return
  }

  if (isConnecting.value) {
    return
  }

  // 清除之前的超时
  clearConnectTimeout()

  isConnecting.value = true
  reconnectAttempts = 0

  try {
    const url = getWsUrl()
    console.log('正在连接WebSocket:', url)
    ws = new WebSocket(url)

    // 设置连接超时
    connectTimeout = window.setTimeout(() => {
      if (ws && ws.readyState !== WebSocket.OPEN) {
        console.error('WebSocket连接超时')
        isConnecting.value = false
        if (terminal) {
          terminal.writeln('\r\n\x1b[31m' + $t('pages.terminal.connectionTimeout') + '\x1b[0m')
        }
        try {
          ws?.close()
        } catch {}
        ws = null
        clearConnectTimeout()
      }
    }, CONNECTION_TIMEOUT)

    ws.onopen = () => {
      console.log('WebSocket连接成功')
      clearConnectTimeout()
      isConnected.value = true
      isConnecting.value = false
      reconnectAttempts = 0
      lastTerminalSize = null
      if (terminal) {
        terminal.clear()
        // 确保终端大小正确
        fitTerminal()
        sendTerminalResize(undefined, undefined, true)
        terminal.writeln('\x1b[32m' + $t('pages.terminal.connected') + '\x1b[0m')
      }
    }

    ws.onmessage = (event) => {
      if (terminal) {
        // xterm.js会自动处理UTF-8编码和ANSI转义码
        if (typeof event.data === 'string') {
          terminal.write(event.data)
        } else if (event.data instanceof Blob) {
          event.data.text().then((text: string) => {
            if (terminal) terminal.write(text)
          }).catch((err: unknown) => {
            console.error('读取Blob数据失败:', err)
          })
        } else if (event.data instanceof ArrayBuffer) {
          const decoder = new TextDecoder('utf-8')
          const text = decoder.decode(event.data)
          terminal.write(text)
        } else {
          terminal.write(String(event.data))
        }
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      clearConnectTimeout()
      isConnecting.value = false
      if (terminal) {
        terminal.writeln('\r\n\x1b[31m' + $t('pages.terminal.error') + ': ' + $t('pages.terminal.checkProxy') + '\x1b[0m')
      }
    }

    ws.onclose = (event) => {
      console.log('WebSocket关闭:', event.code, event.reason)
      clearConnectTimeout()
      isConnected.value = false
      isConnecting.value = false
      
      // 如果连接超时导致的关闭，不重连
      if (event.code === 1006) {
        if (terminal) {
          terminal.writeln('\r\n\x1b[31m' + $t('pages.terminal.connectionFailed') + ': ' + $t('pages.terminal.checkNetwork') + '\x1b[0m')
        }
        ws = null
        return
      }
      
      if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
        // 非正常关闭，尝试重连
        reconnectAttempts++
        if (terminal) {
          terminal.writeln(`\r\n\x1b[33m${$t('pages.terminal.reconnecting')} (${reconnectAttempts}/${maxReconnectAttempts})...\x1b[0m`)
        }
        setTimeout(() => {
          connect()
        }, 1000 * reconnectAttempts)
      } else {
        if (terminal) {
          terminal.writeln('\r\n\x1b[31m' + $t('pages.terminal.disconnected') + '\x1b[0m')
        }
        ws = null
      }
    }
  } catch (error: unknown) {
    console.error('Failed to connect:', error)
    clearConnectTimeout()
    isConnecting.value = false
    if (terminal) {
      terminal.writeln('\r\n\x1b[31m' + $t('pages.terminal.connectionFailed') + ': ' + getErrorMessage(error) + '\x1b[0m')
    }
  }
}

// 断开连接
const disconnect = () => {
  clearConnectTimeout()
  if (ws) {
    try {
      ws.close(1000, 'User disconnected')
    } catch {}
    ws = null
  }
  isConnected.value = false
}

// 清空终端
const clearTerminal = () => {
  if (terminal) {
    terminal.clear()
  }
}

// 监听路由变化，当进入终端页面时自动连接
watch(() => route.path, (newPath) => {
  if (newPath === '/terminal' && !isConnected.value && !isConnecting.value) {
    setTimeout(() => {
      connect()
    }, 100)
  }
}, { immediate: true })

onMounted(() => {
  // 初始化终端
  nextTick(() => {
    initTerminal()
    // 页面加载时自动连接
    if (route.path === '/terminal') {
      setTimeout(() => {
        connect()
      }, 100)
    }
  })
})

onUnmounted(() => {
  clearConnectTimeout()
  disconnect()
  // 移除窗口resize监听
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (terminalContainer.value && contextMenuHandler) {
    terminalContainer.value.removeEventListener('contextmenu', contextMenuHandler)
    contextMenuHandler = null
  }
  if (terminal) {
    terminal.dispose()
    terminal = null
  }
  if (fitAddon) {
    fitAddon.dispose()
    fitAddon = null
  }
})
</script>

<style scoped>
/* xterm.js样式已通过import引入 */
</style>
