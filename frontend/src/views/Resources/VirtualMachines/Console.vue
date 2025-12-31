<template>
  <div class="fixed inset-0 z-50 bg-gray-900">
    <div class="flex flex-col h-full">
      <!-- 控制台头部 -->
      <div class="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div class="flex items-center gap-4">
          <h2 class="text-lg font-semibold text-white">虚拟机控制台 - {{ vmName }}</h2>
          <span
            :class="[
              'px-2 py-1 text-xs rounded',
              connected ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
            ]"
          >
            {{ connected ? '已连接' : '未连接' }}
          </span>
        </div>
        <button
          @click="closeConsole"
          class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
        >
          关闭
        </button>
      </div>

      <!-- 控制台内容 -->
      <div class="flex-1 relative bg-black">
        <!-- noVNC 渲染容器需要始终存在，否则 loading 阶段 ref 为空会导致初始化失败 -->
        <div ref="screenEl" class="absolute inset-0 w-full h-full"></div>

        <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
          <div class="text-center text-white">
            <div class="mb-4">
              <div class="inline-block w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p>正在连接虚拟机控制台...</p>
            <p class="text-sm text-gray-400 mt-2">{{ status }}</p>
          </div>
        </div>

        <div v-else-if="error" class="absolute inset-0 flex items-center justify-center">
          <div class="text-center text-white max-w-md">
            <p class="text-red-400 mb-4">{{ error }}</p>
            <p class="text-sm text-gray-400 mb-4">连接信息:</p>
            <div class="bg-gray-800 p-4 rounded text-left">
              <p class="text-sm mb-2"><strong>WebSocket:</strong> {{ wsUrl }}</p>
              <p class="text-sm mb-2"><strong>VNC端口:</strong> {{ consoleInfo?.vncPort }}</p>
              <p class="text-sm mb-2"><strong>VNC显示:</strong> {{ consoleInfo?.vncDisplay }}</p>
            </div>
            <button
              @click="closeConsole"
              class="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { virtualMachinesApi } from '@/api/virtualMachines'
import RFB from '@novnc/novnc/lib/rfb'

const route = useRoute()
const router = useRouter()
const vmName = ref(route.params.name as string)

const loading = ref(true)
const error = ref('')
const status = ref('初始化中...')
const connected = ref(false)
const consoleInfo = ref<any>(null)
const wsUrl = ref('')
const screenEl = ref<HTMLElement | null>(null)

let rfb: any = null
let connectTimer: number | null = null

const buildWsUrlFromApiBase = (wsPath: string) => {
  const token = localStorage.getItem('token') || ''
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  const apiUrl = new URL(apiBase)
  const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = apiUrl.hostname
  const port = apiUrl.port || (apiUrl.protocol === 'https:' ? '443' : '80')
  const qs = token ? `?token=${encodeURIComponent(token)}` : ''
  return `${wsProtocol}//${host}:${port}${wsPath}${qs}`
}

const closeConsole = () => {
  router.back()
}

onMounted(async () => {
  try {
    status.value = '获取控制台信息...'
    const info = await virtualMachinesApi.getVMConsole(vmName.value)
    consoleInfo.value = info
    status.value = '建立 WebSocket 代理连接...'
    wsUrl.value = buildWsUrlFromApiBase(info.wsPath)

    // 确保 ref 已绑定
    await nextTick()
    if (!screenEl.value) {
      throw new Error('无法初始化控制台容器')
    }

    status.value = '建立 noVNC 连接...'

    // 创建 noVNC RFB 连接（走后端 3000 的 WS 路由，不依赖 6080/6081 额外端口）
    rfb = new (RFB as any)(screenEl.value, wsUrl.value, {
      credentials: { password: '' },
    })

    // 体验设置
    rfb.scaleViewport = true
    rfb.resizeSession = false
    rfb.clipViewport = false

    rfb.addEventListener('connect', () => {
      connected.value = true
      status.value = '已连接'
      loading.value = false
    })

    rfb.addEventListener('disconnect', (e: any) => {
      connected.value = false
      loading.value = false
      // 1006/等错误会在这里体现
      const detail = e?.detail
      const reason = detail?.clean ? '连接已关闭' : `连接断开（code: ${detail?.code ?? 'unknown'}）`
      status.value = reason
      error.value = `VNC 连接失败：${reason}`
    })

    rfb.addEventListener('credentialsrequired', () => {
      // 当前我们默认无密码；如后续启用密码，可在此弹窗输入并 rfb.sendCredentials({password})
      status.value = '需要认证信息（当前未配置密码）'
    })

    // 若 2s 内仍未触发 connect，则认为连接异常
    window.setTimeout(() => {
      if (!connected.value && !error.value) {
        loading.value = false
        error.value = '连接超时（请确认 websockify 与 VNC 端口可达）'
      }
    }, 2000)
  } catch (err: any) {
    console.error('获取控制台信息失败:', err)
    loading.value = false
    error.value = err?.error || err?.message || '获取控制台信息失败'
  }
})

onUnmounted(() => {
  if (connectTimer) {
    window.clearTimeout(connectTimer)
    connectTimer = null
  }
  try {
    if (rfb) {
      rfb.disconnect?.()
      rfb = null
    }
  } catch (e) {
    // ignore
  }
})
</script>
