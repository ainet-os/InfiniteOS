<template>
  <ThemeProvider>
    <SidebarProvider>
      <RouterView />
    </SidebarProvider>
  </ThemeProvider>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import ThemeProvider from './components/layout/ThemeProvider.vue'
import SidebarProvider from './components/layout/SidebarProvider.vue'
import { useSessionTimeout } from './composables/useSessionTimeout'

const router = useRouter()
const { init, reset, stop } = useSessionTimeout(5) // 5分钟超时

let cleanup: (() => void) | null = null

// 监听显式触发的用户活动事件（如路由切换、登录初始化）
const handleUserActivity = () => {
  reset()
}

// 监听会话初始化事件（登录成功后触发）
const handleSessionInitialize = () => {
  // 重新初始化会话超时管理
  if (cleanup) {
    cleanup()
  }
  cleanup = init() || null
}

onMounted(() => {
  // 初始化会话超时管理
  cleanup = init() || null
  
  // 监听显式触发的用户活动事件
  window.addEventListener('user-activity', handleUserActivity)
  // 监听会话初始化事件
  window.addEventListener('session-initialize', handleSessionInitialize)
})

onUnmounted(() => {
  // 清理会话超时管理
  if (cleanup) {
    cleanup()
  }
  stop()
  window.removeEventListener('user-activity', handleUserActivity)
  window.removeEventListener('session-initialize', handleSessionInitialize)
})
</script>
