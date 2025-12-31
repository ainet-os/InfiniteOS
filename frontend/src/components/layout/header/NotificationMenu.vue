<template>
  <div class="relative" ref="dropdownRef">
    <button
      class="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-dark-900 h-11 w-11 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
      @click="toggleDropdown"
    >
      <span
        :class="{ hidden: unreadCount === 0, flex: unreadCount > 0 }"
        class="absolute right-0 top-0.5 z-1 h-2 w-2 rounded-full bg-orange-400"
      >
        <span
          class="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 -z-1 animate-ping"
        ></span>
      </span>
      <svg
        class="fill-current"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
          fill=""
        />
      </svg>
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger-500 text-xs font-medium text-white"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- Dropdown Start -->
    <div
      v-if="dropdownOpen"
      class="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
    >
      <div
        class="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800"
      >
        <h5 class="text-lg font-semibold text-gray-800 dark:text-white/90">系统告警</h5>
        <div class="flex items-center gap-2">
          <button
            v-if="alerts.length > 0"
            @click="handleClearAll"
            class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            清除全部
          </button>
          <button @click="closeDropdown" class="text-gray-500 dark:text-gray-400">
            <svg
              class="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill=""
              />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-8">
        <p class="text-gray-500 dark:text-gray-400">加载中...</p>
      </div>
      <ul v-else-if="alerts.length > 0" class="flex flex-col h-auto overflow-y-auto custom-scrollbar">
        <li
          v-for="alert in alerts"
          :key="alert.id"
          @click="handleItemClick(alert)"
          class="cursor-pointer"
        >
          <div
            :class="[
              'flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5',
              alert.type === 'error' ? 'bg-error-500/5 dark:bg-error-500/10' : '',
              alert.type === 'warning' ? 'bg-warning-500/5 dark:bg-warning-500/10' : '',
            ]"
          >
            <span
              :class="[
                'flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0',
                alert.type === 'error'
                  ? 'bg-error-500/10 text-error-500'
                  : alert.type === 'warning'
                  ? 'bg-warning-500/10 text-warning-500'
                  : 'bg-info-500/10 text-info-500',
              ]"
            >
              <svg
                v-if="alert.type === 'error'"
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <svg
                v-else-if="alert.type === 'warning'"
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <svg
                v-else
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>

            <span class="block flex-1 min-w-0">
              <span class="mb-1.5 block text-theme-sm">
                <span
                  :class="[
                    'font-medium',
                    alert.type === 'error'
                      ? 'text-error-500 dark:text-error-400'
                      : alert.type === 'warning'
                      ? 'text-warning-500 dark:text-warning-400'
                      : 'text-gray-800 dark:text-white/90',
                  ]"
                >
                  {{ alert.title }}
                </span>
              </span>
              <span class="block text-gray-600 text-theme-xs dark:text-gray-400 truncate">
                {{ alert.message }}
              </span>
              <span class="flex items-center gap-2 mt-1 text-gray-500 text-theme-xs dark:text-gray-400">
                <span>{{ formatCategory(alert.category) }}</span>
                <span class="w-1 h-1 bg-gray-400 rounded-full"></span>
                <span>{{ formatTime(alert.timestamp) }}</span>
              </span>
            </span>
          </div>
        </li>
      </ul>
      <div v-else class="flex items-center justify-center py-8">
        <p class="text-gray-500 dark:text-gray-400">暂无告警信息</p>
      </div>

      <router-link
        to="/logs"
        @click="closeDropdown"
        class="mt-3 flex justify-center rounded-lg border border-gray-300 bg-white p-3 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
      >
        查看所有日志
      </router-link>
    </div>
    <!-- Dropdown End -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { alertsApi } from '@/api/alerts'
import type { SystemAlert } from '@/api/alerts'

const dropdownOpen = ref(false)
const loading = ref(false)
const alerts = ref<SystemAlert[]>([])
const dropdownRef = ref(null)

// 计算未读告警数量
const unreadCount = computed(() => {
  return alerts.value.filter(a => a.level === 'high' || a.type === 'error').length
})

// 格式化类别
const formatCategory = (category: string): string => {
  const categoryMap: Record<string, string> = {
    service: '服务',
    resource: '资源',
    log: '日志',
  }
  return categoryMap[category] || category
}

// 格式化时间
const formatTime = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}天前`
  } else if (hours > 0) {
    return `${hours}小时前`
  } else if (minutes > 0) {
    return `${minutes}分钟前`
  } else {
    return '刚刚'
  }
}

// 加载告警信息
const loadAlerts = async () => {
  loading.value = true
  try {
    const response = await alertsApi.getAlerts()
    alerts.value = response.alerts || []
  } catch (error: any) {
    console.error('获取告警信息失败:', error)
    alerts.value = []
    if (error?.error?.includes('未提供认证令牌') || error?.error?.includes('无效的认证令牌')) {
      return
    }
  } finally {
    loading.value = false
  }
}

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
  if (dropdownOpen.value) {
    loadAlerts()
  }
}

const closeDropdown = () => {
  dropdownOpen.value = false
}

const handleClickOutside = (event: Event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

const handleItemClick = async (alert: SystemAlert) => {
  // 标记为已读
  try {
    await alertsApi.markAsRead(alert.id)
    // 从列表中移除或更新状态
    alerts.value = alerts.value.filter(a => a.id !== alert.id)
  } catch (error) {
    console.error('标记告警已读失败:', error)
  }
  
  // 根据告警类型跳转到相应页面
  if (alert.category === 'service' && alert.service) {
    // 可以跳转到服务详情页面
  } else if (alert.category === 'resource') {
    // 可以跳转到概览页面
  } else if (alert.category === 'log') {
    // 跳转到日志页面
    window.location.href = '/logs'
  }
  
  closeDropdown()
}

const handleClearAll = async () => {
  try {
    await alertsApi.clearAll()
    alerts.value = []
  } catch (error) {
    console.error('清除告警失败:', error)
  }
}

let refreshInterval: number | undefined

onMounted(() => {
  // 初始加载
  loadAlerts()
  
  // 每30秒刷新一次告警信息
  refreshInterval = setInterval(() => {
    if (!dropdownOpen.value) {
      loadAlerts()
    }
  }, 30000) as unknown as number
  
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  document.removeEventListener('click', handleClickOutside)
})
</script>
