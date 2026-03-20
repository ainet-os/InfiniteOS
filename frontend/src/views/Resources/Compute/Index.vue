<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ $t('pages.compute.title') }}</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">{{ $t('pages.compute.description') }}</p>
        </div>
        <button
          type="button"
          :disabled="loading"
          class="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-white/[0.06] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="loadDevices"
        >
          <svg class="h-4 w-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ loading ? $t('common.loading') : $t('common.refresh') }}
        </button>
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

      <!-- 加载中：骨架屏 -->
      <div v-if="loading && devices.length === 0" class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="i in 3"
          :key="'skeleton-' + i"
          class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6 animate-pulse"
        >
          <div class="flex items-center justify-between mb-4">
            <div class="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            <div class="h-6 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div class="space-y-3">
            <div class="flex justify-between"><div class="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" /><div class="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" /></div>
            <div class="flex justify-between"><div class="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" /><div class="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" /></div>
            <div class="flex justify-between"><div class="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" /><div class="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" /></div>
            <div><div class="h-2 w-full rounded bg-gray-200 dark:bg-gray-700" /></div>
          </div>
        </div>
      </div>

      <!-- 算力设备卡片（有数据时展示，刷新时保留旧数据） -->
      <div v-else-if="devices.length > 0" class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
              <span class="text-gray-800 dark:text-white/90 font-medium">{{ formatComputePFLOPS(device.compute) }}</span>
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

      <!-- 空状态：仅当加载完成且无数据时显示 -->
      <div v-else-if="!loading && devices.length === 0" class="text-center py-12">
        <p class="text-gray-600 dark:text-gray-400 mb-4">{{ $t('common.noComputeDevices') }}</p>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          @click="loadDevices"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ $t('common.refresh') }}
        </button>
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
/** 首次加载若为空，是否已做过一次重试（避免无限重试） */
const initialLoadRetried = ref(false)

// 汇总统计
const summaryStats = computed(() => {
  const totalDevices = devices.value.length
  const availableDevices = devices.value.filter(d => d.status === 'available').length
  const avgUtilization = devices.value.length > 0
    ? Math.round(devices.value.reduce((sum, d) => sum + d.utilization, 0) / devices.value.length)
    : 0
  
  // 计算总算力：从所有设备的算力值中提取数字并累加（统一为 PFLOPS）
  const totalCompute = devices.value.reduce((sum, device) => {
    if (device.compute && device.compute !== 'Unknown') {
      const match = device.compute.match(/(\d+\.?\d*)/)
      if (match) {
        let val = parseFloat(match[1])
        // 若后端返回的是 TFLOPS（如 "26.9 TFLOPS"），换算为 PFLOPS
        if (device.compute.includes('TFLOPS') && !device.compute.includes('PFLOPS')) val = val / 1000
        return sum + val
      }
    }
    return sum
  }, 0)
  
  // 格式化总算力显示（保留三位小数，单位 PFLOPS FP16）
  const formattedTotalCompute = totalCompute > 0 
    ? `${totalCompute.toFixed(3)} PFLOPS (FP16)`
    : '0 PFLOPS (FP16)'
  
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

/** 统一格式化为 PFLOPS (FP16) 展示：兼容后端返回 TFLOPS 或 PFLOPS */
function formatComputePFLOPS(compute: string | undefined): string {
  if (!compute || compute === 'Unknown') return 'Unknown'
  if (compute.includes('PFLOPS')) return compute
  const match = compute.match(/(\d+\.?\d*)\s*TFLOPS/i)
  if (match) {
    const pf = (parseFloat(match[1]) / 1000).toFixed(3)
    return `${pf} PFLOPS (FP16)`
  }
  return compute
}

let refreshInterval: number | undefined

// 加载算力设备数据（isInitialLoad：是否首次进入页面，用于空结果时自动重试一次）
const loadDevices = async (isInitialLoad = false) => {
  loading.value = true
  let willRetry = false
  try {
    const data = await computeApi.getComputeResources()
    const list = data || []
    devices.value = list

    // 首次加载若为空，可能是后端/驱动尚未就绪，自动重试一次（保持 loading 不闪出空状态）
    if (isInitialLoad && list.length === 0 && !initialLoadRetried.value) {
      initialLoadRetried.value = true
      willRetry = true
      setTimeout(() => loadDevices(false), 1500)
    }
  } catch (error: any) {
    console.error('加载算力设备失败:', error)
    devices.value = []
    if (isInitialLoad && !initialLoadRetried.value) {
      initialLoadRetried.value = true
      willRetry = true
      setTimeout(() => loadDevices(false), 1500)
    }
    if (error?.error?.includes('未提供认证令牌') || error?.error?.includes('无效的认证令牌')) {
      return
    }
  } finally {
    if (!willRetry) loading.value = false
  }
}

onMounted(() => {
  loadDevices(true)

  refreshInterval = setInterval(() => {
    loadDevices(false)
  }, 30000) as unknown as number
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>
