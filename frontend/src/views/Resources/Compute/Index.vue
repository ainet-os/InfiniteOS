<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ $t('pages.compute.title') }}</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">{{ $t('pages.compute.description') }}</p>
      </div>

      <!-- 汇总统计信息 -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('common.totalDevices') }}</p>
              <p class="text-2xl font-semibold text-gray-800 dark:text-white/90 mt-1">{{ summaryStats.totalDevices }}</p>
            </div>
            <div class="h-12 w-12 rounded-full bg-brand-500/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
          </div>
        </div>

        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('common.availableDevices') }}</p>
              <p class="text-2xl font-semibold text-gray-800 dark:text-white/90 mt-1">{{ summaryStats.availableDevices }}</p>
            </div>
            <div class="h-12 w-12 rounded-full bg-success-500/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('common.avgUtilization') }}</p>
              <p class="text-2xl font-semibold text-gray-800 dark:text-white/90 mt-1">{{ summaryStats.avgUtilization }}%</p>
            </div>
            <div class="h-12 w-12 rounded-full bg-warning-500/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-warning-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('common.totalCompute') }}</p>
              <p class="text-2xl font-semibold text-gray-800 dark:text-white/90 mt-1">{{ summaryStats.totalCompute }}</p>
            </div>
            <div class="h-12 w-12 rounded-full bg-brand-500/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- 算力设备卡片 -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="device in devices"
          :key="device.id"
          class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow cursor-pointer"
          @click="viewDeviceDetail(device.id)"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">{{ device.name }}</h3>
            <span
              :class="[
                'px-2 py-1 text-xs rounded',
                device.status === 'available'
                  ? 'bg-success-500/10 text-success-500'
                  : 'bg-gray-500/10 text-gray-500',
              ]"
            >
              {{ device.status === 'available' ? $t('common.available') : $t('common.unavailable') }}
            </span>
          </div>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">{{ $t('common.vendor') }}</span>
              <span class="text-gray-800 dark:text-white/90 font-medium">{{ device.vendor }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">{{ $t('common.computeValue') }}</span>
              <span class="text-gray-800 dark:text-white/90 font-medium">{{ device.compute }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">{{ $t('common.vram') }}</span>
              <span class="text-gray-800 dark:text-white/90 font-medium">{{ device.memory }}</span>
            </div>
            <div>
              <div class="flex justify-between mb-1">
                <span class="text-gray-600 dark:text-gray-400">{{ $t('common.utilization') }}</span>
                <span class="text-gray-800 dark:text-white/90 font-medium">{{ device.utilization }}%</span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  class="bg-brand-500 h-2 rounded-full transition-all"
                  :style="{ width: device.utilization + '%' }"
                ></div>
              </div>
            </div>
            <div v-if="device.temperature" class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">{{ $t('common.temperature') }}</span>
              <span class="text-gray-800 dark:text-white/90 font-medium">{{ device.temperature }}°C</span>
            </div>
            <div v-if="device.power" class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">{{ $t('common.power') }}</span>
              <span class="text-gray-800 dark:text-white/90 font-medium">{{ device.power }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="devices.length === 0" class="text-center py-12">
        <p class="text-gray-600 dark:text-gray-400">{{ $t('common.noComputeDevices') }}</p>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { computeApi } from '@/api/compute'
import type { ComputeDevice } from '@/api/compute'

const router = useRouter()

const loading = ref(false)
const devices = ref<ComputeDevice[]>([])

// 汇总统计
const summaryStats = computed(() => {
  const totalDevices = devices.value.length
  const availableDevices = devices.value.filter(d => d.status === 'available').length
  const avgUtilization = devices.value.length > 0
    ? Math.round(devices.value.reduce((sum, d) => sum + d.utilization, 0) / devices.value.length)
    : 0
  
  // 计算总算力：从所有设备的算力值中提取数字并累加
  const totalCompute = devices.value.reduce((sum, device) => {
    if (device.compute && device.compute !== 'Unknown') {
      // 提取算力值中的数字部分（如 "83 TFLOPS (FP32)" -> 83）
      const match = device.compute.match(/(\d+\.?\d*)/)
      if (match) {
        return sum + parseFloat(match[1])
      }
    }
    return sum
  }, 0)
  
  // 格式化总算力显示（保留一位小数，单位 TFLOPS）
  const formattedTotalCompute = totalCompute > 0 
    ? `${totalCompute.toFixed(1)} TFLOPS`
    : '0 TFLOPS'
  
  return {
    totalDevices,
    availableDevices,
    avgUtilization,
    totalCompute: formattedTotalCompute,
  }
})

const viewDeviceDetail = (deviceId: number) => {
  router.push(`/compute/${deviceId}`)
}

let refreshInterval: number | undefined

// 加载算力设备数据
const loadDevices = async () => {
  loading.value = true
  try {
    const data = await computeApi.getComputeResources()
    devices.value = data || []
  } catch (error: any) {
    console.error('加载算力设备失败:', error)
    devices.value = []
    // 如果是认证错误，响应拦截器应该已经处理了跳转
    if (error?.error?.includes('未提供认证令牌') || error?.error?.includes('无效的认证令牌')) {
      return
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 立即加载数据
  loadDevices()
  
  // 每30秒刷新一次数据
  refreshInterval = setInterval(() => {
    loadDevices()
  }, 30000) as unknown as number
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>
