<template>
  <AdminLayout>
    <div class="p-6 logs-page">
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ $t('pages.logs.title') }}</h1>
      <p class="text-gray-600 dark:text-gray-400 mt-1">{{ $t('pages.logs.description') }}</p>
    </div>

    <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">{{ $t('common.systemLogs') }}</h2>
          <div class="flex gap-2">
            <select
              v-model="selectedService"
              @change="loadLogs"
              class="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="" class="bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90">{{ $t('common.allServices') }}</option>
              <option value="systemd" class="bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90">systemd</option>
              <option value="kernel" class="bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90">kernel</option>
            </select>
            <select
              v-model="selectedLevel"
              @change="loadLogs"
              class="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="" class="bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90">{{ $t('common.allLevels') }}</option>
              <option value="3" class="bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90">{{ $t('common.error') }}</option>
              <option value="4" class="bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90">{{ $t('common.warning') }}</option>
              <option value="6" class="bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90">{{ $t('common.info') }}</option>
            </select>
            <button
              @click="loadLogs"
              class="px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 transition-colors"
            >
              {{ $t('common.refresh') }}
            </button>
            <button
              @click="exportLogs"
              class="px-4 py-2 bg-gray-500 dark:bg-gray-500 text-white rounded-lg hover:bg-gray-600 dark:hover:bg-gray-600 transition-colors"
            >
              {{ $t('common.export') }}
            </button>
          </div>
        </div>
        <div class="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 font-mono text-sm overflow-auto" style="max-height: 600px;">
          <div v-if="logs.length === 0" class="text-gray-500">
            {{ $t('common.noLogs') }}
          </div>
          <div
            v-for="(log, index) in logs"
            :key="index"
            :class="[
              'py-1',
              log.level === 'error' ? 'text-error-500' : log.level === 'warning' ? 'text-warning-500' : 'text-gray-300'
            ]"
          >
            <span class="text-gray-500">{{ formatTimestamp(log.timestamp) }}</span>
            <span class="ml-2">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { logsApi } from '@/api/logs'
import type { LogEntry } from '@/api/logs'

const loading = ref(false)
const logs = ref<LogEntry[]>([])
const selectedLevel = ref('')
const selectedService = ref('')

// 格式化时间戳
const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return '-'
  try {
    const date = new Date(parseInt(timestamp) / 1000)
    return date.toLocaleString('zh-CN')
  } catch {
    return timestamp
  }
}

// 获取日志级别显示名称
const getLevelName = (level: string): string => {
  const levelMap: Record<string, string> = {
    '0': 'emergency',
    '1': 'alert',
    '2': 'critical',
    '3': 'error',
    '4': 'warning',
    '5': 'notice',
    '6': 'info',
    '7': 'debug',
  }
  return levelMap[level] || level
}

// 加载日志
const loadLogs = async () => {
  loading.value = true
  try {
    const params: any = {
      lines: 200,
    }
    if (selectedLevel.value) {
      params.level = selectedLevel.value
    }
    if (selectedService.value) {
      params.service = selectedService.value
    }
    
    const response = await logsApi.getLogs(params)
    logs.value = (response?.logs || []).map(log => ({
      ...log,
      level: getLevelName(log.level),
    }))
  } catch (error: any) {
    console.error('获取日志失败:', error)
    logs.value = []
    if (error?.error?.includes('未提供认证令牌') || error?.error?.includes('无效的认证令牌')) {
      return
    }
  } finally {
    loading.value = false
  }
}

// 导出日志
const exportLogs = () => {
  const logText = logs.value.map(log => {
    return `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] ${log.message}`
  }).join('\n')
  
  const blob = new Blob([logText], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logs-${new Date().toISOString().split('T')[0]}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(() => {
  loadLogs()
})
</script>

<style>
/* 修复下拉框在深色模式下的显示问题 - 使用全局样式因为 option 标签样式支持有限 */
.logs-page select {
  color-scheme: light dark;
}

.logs-page select option {
  background-color: #ffffff;
  color: #1f2937;
  padding: 8px 12px;
}

/* 深色模式 */
.dark .logs-page select {
  background-color: #1f2937;
  color: rgba(255, 255, 255, 0.9);
}

.dark .logs-page select option {
  background-color: #1f2937;
  color: rgba(255, 255, 255, 0.9);
}

/* 选中和悬停状态 */
.logs-page select option:checked,
.logs-page select option:hover {
  background-color: #3b82f6;
  color: #ffffff;
}

.dark .logs-page select option:checked,
.dark .logs-page select option:hover {
  background-color: #3b82f6;
  color: #ffffff;
}
</style>

