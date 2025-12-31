<template>
  <AdminLayout>
    <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ $t('pages.services.title') }}</h1>
      <p class="text-gray-600 dark:text-gray-400 mt-1">{{ $t('pages.services.description') }}</p>
    </div>

    <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div class="p-6">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">{{ $t('common.serviceList') }}</h2>
        <div v-if="services.length === 0" class="text-center py-12">
          <p class="text-gray-600 dark:text-gray-400">{{ $t('common.noServices') }}</p>
        </div>
        <table v-else class="w-full">
          <thead class="bg-gray-50 dark:bg-white/[0.02]">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.serviceName') }}</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.status') }}</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.description') }}</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
            <tr v-for="service in services" :key="service.name" class="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
              <td class="px-6 py-4 text-sm text-gray-800 dark:text-white/90">{{ service.name }}</td>
              <td class="px-6 py-4">
                <span :class="[
                  'px-2 py-1 text-xs rounded',
                  service.status === 'active' ? 'bg-success-500/10 text-success-500' : 'bg-gray-500/10 text-gray-500'
                ]">
                  {{ service.status }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ service.description || '-' }}</td>
              <td class="px-6 py-4 text-sm">
                <div class="flex gap-2">
                  <button
                    v-if="service.status !== 'active'"
                    @click="startService(service.name)"
                    class="px-2.5 py-1.5 text-xs bg-success-600 dark:bg-success-500 text-white rounded hover:bg-success-700 dark:hover:bg-success-600 transition-colors"
                  >
                    {{ $t('common.start') }}
                  </button>
                  <button
                    v-if="service.status === 'active'"
                    @click="stopService(service.name)"
                    class="px-2.5 py-1.5 text-xs bg-error-600 dark:bg-error-500 text-white rounded hover:bg-error-700 dark:hover:bg-error-600 transition-colors"
                  >
                    {{ $t('common.stop') }}
                  </button>
                  <button
                    @click="restartService(service.name)"
                    class="px-2.5 py-1.5 text-xs bg-warning-600 dark:bg-warning-500 text-white rounded hover:bg-warning-700 dark:hover:bg-warning-600 transition-colors"
                  >
                    {{ $t('common.restart') }}
                  </button>
                  <button
                    @click="openDetailsDialog(service.name)"
                    class="px-2.5 py-1.5 text-xs bg-brand-500 text-white rounded hover:bg-brand-600 transition-colors"
                  >
                    {{ $t('common.details') }}
                  </button>
                  <button
                    @click="openLogsDialog(service.name)"
                    class="px-2.5 py-1.5 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    {{ $t('common.logs') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    </div>

    <!-- 服务详情对话框 -->
    <div
      v-if="showDetailsDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000]"
      @click.self="closeDetailsDialog"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90 mb-4">{{ $t('common.details') }}</h2>
          
          <div v-if="loadingDetails" class="text-center py-8">
            <p class="text-gray-600 dark:text-gray-400">{{ $t('common.loading') }}</p>
          </div>
          <div v-else-if="serviceDetails" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('common.serviceName') }}</label>
                <p class="text-sm text-gray-800 dark:text-white/90">{{ serviceDetails.name }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('common.status') }}</label>
                <p class="text-sm text-gray-800 dark:text-white/90">{{ serviceDetails.status }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PID</label>
                <p class="text-sm text-gray-800 dark:text-white/90">{{ serviceDetails.pid || '-' }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('common.memory') }}</label>
                <p class="text-sm text-gray-800 dark:text-white/90">{{ serviceDetails.memory || '-' }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('common.description') }}</label>
                <p class="text-sm text-gray-800 dark:text-white/90">{{ serviceDetails.description || '-' }}</p>
              </div>
            </div>
            
            <div class="flex justify-end gap-3 pt-4">
              <button
                @click="closeDetailsDialog"
                class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {{ $t('common.close') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 服务日志对话框 -->
    <div
      v-if="showLogsDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000]"
      @click.self="closeLogsDialog"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">服务日志: {{ logsServiceName }}</h2>
        </div>
        <div class="p-6 flex-1 overflow-auto">
          <div v-if="loadingLogs" class="text-center py-8">
            <p class="text-gray-600 dark:text-gray-400">{{ $t('common.loading') }}</p>
          </div>
          <div v-else class="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 font-mono text-sm">
            <div v-if="serviceLogs.length === 0" class="text-gray-500">
              {{ $t('common.noLogs') }}
            </div>
            <div
              v-for="(log, index) in serviceLogs"
              :key="index"
              class="text-gray-300 py-1"
            >
              {{ log }}
            </div>
          </div>
        </div>
        <div class="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            @click="closeLogsDialog"
            class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {{ $t('common.close') }}
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { servicesApi } from '@/api/services'
import type { SystemService, ServiceDetails } from '@/api/services'

const { t: $t } = useI18n()
const loading = ref(false)
const services = ref<SystemService[]>([])

// 对话框状态
const showDetailsDialog = ref(false)
const showLogsDialog = ref(false)
const loadingDetails = ref(false)
const loadingLogs = ref(false)
const serviceDetails = ref<ServiceDetails | null>(null)
const serviceLogs = ref<string[]>([])
const logsServiceName = ref('')

let refreshInterval: number | undefined

// 加载服务列表
const loadServices = async () => {
  loading.value = true
  try {
    const data = await servicesApi.getServices()
    services.value = (data || []).map(s => ({
      ...s,
      status: s.status === 'running' ? 'active' : 'inactive',
    }))
  } catch (error: any) {
    console.error('获取服务列表失败:', error)
    services.value = []
    // 如果是认证错误，响应拦截器应该已经处理了跳转
    if (error?.error?.includes('未提供认证令牌') || error?.error?.includes('无效的认证令牌')) {
      return
    }
  } finally {
    loading.value = false
  }
}

const startService = async (name: string) => {
  try {
    await servicesApi.startService(name)
    alert('服务启动成功')
    await loadServices()
  } catch (error: any) {
    console.error('启动服务失败:', error)
    alert(error?.error || '启动服务失败')
  }
}

const stopService = async (name: string) => {
  try {
    await servicesApi.stopService(name)
    alert('服务停止成功')
    await loadServices()
  } catch (error: any) {
    console.error('停止服务失败:', error)
    alert(error?.error || '停止服务失败')
  }
}

const restartService = async (name: string) => {
  try {
    await servicesApi.restartService(name)
    alert('服务重启成功')
    await loadServices()
  } catch (error: any) {
    console.error('重启服务失败:', error)
    alert(error?.error || '重启服务失败')
  }
}

// 打开详情对话框
const openDetailsDialog = async (name: string) => {
  showDetailsDialog.value = true
  loadingDetails.value = true
  try {
    serviceDetails.value = await servicesApi.getServiceDetails(name)
  } catch (error: any) {
    console.error('获取服务详情失败:', error)
    alert(error?.error || '获取服务详情失败')
    closeDetailsDialog()
  } finally {
    loadingDetails.value = false
  }
}

// 关闭详情对话框
const closeDetailsDialog = () => {
  showDetailsDialog.value = false
  serviceDetails.value = null
}

// 打开日志对话框
const openLogsDialog = async (name: string) => {
  showLogsDialog.value = true
  logsServiceName.value = name
  loadingLogs.value = true
  try {
    const response = await servicesApi.getServiceLogs(name, 200)
    serviceLogs.value = response.logs || []
  } catch (error: any) {
    console.error('获取服务日志失败:', error)
    alert(error?.error || '获取服务日志失败')
    closeLogsDialog()
  } finally {
    loadingLogs.value = false
  }
}

// 关闭日志对话框
const closeLogsDialog = () => {
  showLogsDialog.value = false
  serviceLogs.value = []
  logsServiceName.value = ''
}

onMounted(() => {
  // 立即加载数据
  loadServices()
  
  // 每30秒刷新一次数据
  refreshInterval = setInterval(() => {
    loadServices()
  }, 30000) as unknown as number
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

