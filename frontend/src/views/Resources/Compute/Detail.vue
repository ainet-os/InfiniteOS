<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <button
              @click="$router.back()"
              class="mb-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white/90 flex items-center"
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              返回列表
            </button>
            <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">算力设备详情</h1>
            <p class="text-gray-600 dark:text-gray-400 mt-1">{{ device.name }}</p>
          </div>
          <div class="flex gap-2">
            <button
              v-if="device.status === 'unavailable'"
              class="px-4 py-2 bg-success-600 dark:bg-success-500 text-white rounded-lg hover:bg-success-700 dark:hover:bg-success-600"
            >
              启用
            </button>
            <button
              v-if="device.status === 'available'"
              class="px-4 py-2 bg-error-600 dark:bg-error-500 text-white rounded-lg hover:bg-error-700 dark:hover:bg-error-600"
            >
              禁用
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- 主要信息 -->
        <div class="lg:col-span-2 space-y-6">
          <!-- 基本信息 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">基本信息</h2>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">设备名称</p>
                <p class="mt-1 text-gray-800 dark:text-white/90 font-medium">{{ device.name }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">厂商</p>
                <p class="mt-1 text-gray-800 dark:text-white/90 font-medium">{{ device.vendor }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">算力值</p>
                <p class="mt-1 text-gray-800 dark:text-white/90 font-medium">{{ device.compute }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">显存</p>
                <p class="mt-1 text-gray-800 dark:text-white/90 font-medium">{{ device.memory }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">状态</p>
                <span
                  :class="[
                    'mt-1 inline-block px-3 py-1 text-sm rounded',
                    device.status === 'available'
                      ? 'bg-success-500/10 text-success-500'
                      : 'bg-gray-500/10 text-gray-500',
                  ]"
                >
                  {{ device.status === 'available' ? '可用' : '不可用' }}
                </span>
              </div>
              <div v-if="device.driver">
                <p class="text-sm text-gray-600 dark:text-gray-400">驱动版本</p>
                <p class="mt-1 text-gray-800 dark:text-white/90 font-medium">{{ device.driver }}</p>
              </div>
            </div>
          </div>

          <!-- 实时资源利用监控 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">实时资源利用监控</h2>
            
            <!-- GPU利用率 -->
            <div class="mb-6">
              <div class="flex justify-between mb-2">
                <span class="text-sm font-medium text-gray-800 dark:text-white/90">GPU 利用率</span>
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ device.utilization }}%</span>
              </div>
              <VueApexCharts
                type="area"
                height="150"
                :options="gpuChartOptions"
                :series="gpuChartSeries"
              ></VueApexCharts>
            </div>

            <!-- 显存使用率 -->
            <div class="mb-6">
              <div class="flex justify-between mb-2">
                <span class="text-sm font-medium text-gray-800 dark:text-white/90">显存使用率</span>
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ device.memoryUsage }}%</span>
              </div>
              <VueApexCharts
                type="area"
                height="150"
                :options="memoryChartOptions"
                :series="memoryChartSeries"
              ></VueApexCharts>
            </div>

            <!-- 温度 -->
            <div v-if="device.temperature" class="mb-6">
              <div class="flex justify-between mb-2">
                <span class="text-sm font-medium text-gray-800 dark:text-white/90">温度</span>
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ device.temperature }}°C</span>
              </div>
              <VueApexCharts
                type="area"
                height="150"
                :options="temperatureChartOptions"
                :series="temperatureChartSeries"
              ></VueApexCharts>
            </div>

            <!-- 功耗 -->
            <div v-if="device.power">
              <div class="flex justify-between mb-2">
                <span class="text-sm font-medium text-gray-800 dark:text-white/90">功耗</span>
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ device.power }}</span>
              </div>
              <VueApexCharts
                type="area"
                height="150"
                :options="powerChartOptions"
                :series="powerChartSeries"
              ></VueApexCharts>
            </div>
          </div>

          <!-- 详细信息 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">详细信息</h2>
            <div class="space-y-3">
              <div v-if="device.cudaVersion" class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">CUDA 版本</span>
                <span class="text-gray-800 dark:text-white/90">{{ device.cudaVersion }}</span>
              </div>
              <div v-if="device.computeCapability" class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">计算能力</span>
                <span class="text-gray-800 dark:text-white/90">{{ device.computeCapability }}</span>
              </div>
              <div v-if="device.powerLimit" class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">功耗限制</span>
                <span class="text-gray-800 dark:text-white/90">{{ device.powerLimit }}</span>
              </div>
              <div v-if="device.note" class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">备注</span>
                <span class="text-gray-800 dark:text-white/90">{{ device.note }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 侧边栏 -->
        <div class="space-y-6">
          <!-- 当前状态 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">当前状态</h2>
            <div class="space-y-4">
              <div>
                <div class="flex justify-between mb-1">
                  <span class="text-sm text-gray-600 dark:text-gray-400">GPU 利用率</span>
                  <span class="text-sm text-gray-800 dark:text-white/90 font-medium">{{ device.utilization }}%</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    class="bg-brand-500 h-2 rounded-full transition-all"
                    :style="{ width: device.utilization + '%' }"
                  ></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between mb-1">
                  <span class="text-sm text-gray-600 dark:text-gray-400">显存使用率</span>
                  <span class="text-sm text-gray-800 dark:text-white/90 font-medium">{{ device.memoryUsage }}%</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    class="bg-success-500 h-2 rounded-full transition-all"
                    :style="{ width: device.memoryUsage + '%' }"
                  ></div>
                </div>
              </div>
              <div v-if="device.temperature">
                <div class="flex justify-between mb-1">
                  <span class="text-sm text-gray-600 dark:text-gray-400">温度</span>
                  <span class="text-sm text-gray-800 dark:text-white/90 font-medium">{{ device.temperature }}°C</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    class="bg-warning-500 h-2 rounded-full transition-all"
                    :style="{ width: (device.temperature / 100) * 100 + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 运行任务 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">运行任务</h2>
            <div v-if="device.tasks && device.tasks.length > 0" class="space-y-3">
              <div
                v-for="task in device.tasks"
                :key="task.id"
                class="p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg"
              >
                <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ task.name }}</p>
                <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">{{ task.type }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">GPU 使用: {{ task.gpuUsage }}%</p>
              </div>
            </div>
            <p v-else class="text-sm text-gray-600 dark:text-gray-400">暂无运行任务</p>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import type { ApexOptions } from 'apexcharts'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import VueApexCharts from 'vue3-apexcharts'

const route = useRoute()
const deviceId = parseInt(route.params.id as string)

interface DeviceTask {
  id: number
  name: string
  type: string
  gpuUsage: number
}

interface DeviceDetail {
  id: number
  name: string
  vendor: string
  compute: string
  memory: string
  utilization: number
  memoryUsage: number
  status: 'available' | 'unavailable'
  temperature: number | null
  power: string | null
  driver?: string
  cudaVersion?: string
  computeCapability?: string
  powerLimit?: string
  note?: string
  tasks: DeviceTask[]
}

const device = ref<DeviceDetail>({
  id: deviceId,
  name: 'NVIDIA GeForce RTX 4090',
  vendor: 'NVIDIA',
  compute: '83 TFLOPS (FP32)',
  memory: '24 GB',
  utilization: 65,
  memoryUsage: 58,
  status: 'available',
  temperature: 72,
  power: '450W / 600W',
  driver: '535.154.05',
  cudaVersion: '12.2',
  computeCapability: '8.9',
  powerLimit: '600W',
  note: '高性能GPU，适用于AI训练和推理',
  tasks: [
    {
      id: 1,
      name: 'llama-inference',
      type: 'AI推理',
      gpuUsage: 45,
    },
    {
      id: 2,
      name: 'stable-diffusion',
      type: '图像生成',
      gpuUsage: 20,
    },
  ],
})

const gpuSeriesData = ref<number[]>([45, 52, 48, 61, 58, 65, 62, 68, 65, 70, 65, 72, 65])
const memorySeriesData = ref<number[]>([42, 48, 45, 52, 50, 55, 58, 56, 58, 60, 58, 62, 58])
const temperatureSeriesData = ref<number[]>([65, 68, 66, 70, 69, 72, 71, 73, 72, 74, 72, 75, 72])
const powerSeriesData = ref<number[]>([380, 420, 400, 450, 435, 470, 460, 480, 470, 490, 450, 500, 450])

const gpuChartSeries = computed(() => [{ name: 'GPU利用率', data: gpuSeriesData.value }])
const memoryChartSeries = computed(() => [{ name: '显存使用率', data: memorySeriesData.value }])
const temperatureChartSeries = computed(() => [{ name: '温度', data: temperatureSeriesData.value }])
const powerChartSeries = computed(() => [{ name: '功耗', data: powerSeriesData.value }])

const chartOptions = {
  chart: {
    type: 'area',
    toolbar: { show: false },
    sparkline: { enabled: true },
  },
  stroke: {
    curve: 'smooth',
    width: 2,
  },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.1,
    },
  },
  xaxis: {
    labels: { show: false },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: { show: false },
  },
  grid: {
    show: false,
  },
  tooltip: {
    theme: 'dark',
  },
} satisfies ApexOptions

const gpuChartOptions = computed<ApexOptions>(() => ({
  ...chartOptions,
  colors: ['#3C50E0'],
  fill: {
    ...chartOptions.fill,
    gradient: {
      ...chartOptions.fill.gradient,
      colorStops: [
        { offset: 0, color: '#3C50E0', opacity: 0.4 },
        { offset: 100, color: '#3C50E0', opacity: 0.1 },
      ],
    },
  },
}))

const memoryChartOptions = computed<ApexOptions>(() => ({
  ...chartOptions,
  colors: ['#10B981'],
  fill: {
    ...chartOptions.fill,
    gradient: {
      ...chartOptions.fill.gradient,
      colorStops: [
        { offset: 0, color: '#10B981', opacity: 0.4 },
        { offset: 100, color: '#10B981', opacity: 0.1 },
      ],
    },
  },
}))

const temperatureChartOptions = computed<ApexOptions>(() => ({
  ...chartOptions,
  colors: ['#F59E0B'],
  fill: {
    ...chartOptions.fill,
    gradient: {
      ...chartOptions.fill.gradient,
      colorStops: [
        { offset: 0, color: '#F59E0B', opacity: 0.4 },
        { offset: 100, color: '#F59E0B', opacity: 0.1 },
      ],
    },
  },
}))

const powerChartOptions = computed<ApexOptions>(() => ({
  ...chartOptions,
  colors: ['#8B5CF6'],
  fill: {
    ...chartOptions.fill,
    gradient: {
      ...chartOptions.fill.gradient,
      colorStops: [
        { offset: 0, color: '#8B5CF6', opacity: 0.4 },
        { offset: 100, color: '#8B5CF6', opacity: 0.1 },
      ],
    },
  },
}))

let updateInterval: number | null = null

onMounted(() => {
  console.log('加载算力设备详情:', deviceId)
  
  // 模拟实时数据更新
  updateInterval = window.setInterval(() => {
    // 更新GPU利用率（模拟波动）
    const newUtilization = 60 + Math.random() * 15
    device.value.utilization = Math.round(newUtilization)
    
    // 更新显存使用率
    const newMemoryUsage = 50 + Math.random() * 15
    device.value.memoryUsage = Math.round(newMemoryUsage)
    
    // 更新温度
    if (device.value.temperature) {
      device.value.temperature = 68 + Math.round(Math.random() * 8)
    }
    
    // 更新图表数据（添加新数据点，移除旧数据点）
    const newGpuData = gpuSeriesData.value.slice(-12)
    newGpuData.push(device.value.utilization)
    gpuSeriesData.value = newGpuData.slice(-13)
    
    const newMemoryData = memorySeriesData.value.slice(-12)
    newMemoryData.push(device.value.memoryUsage)
    memorySeriesData.value = newMemoryData.slice(-13)
    
    if (device.value.temperature) {
      const newTempData = temperatureSeriesData.value.slice(-12)
      newTempData.push(device.value.temperature)
      temperatureSeriesData.value = newTempData.slice(-13)
    }
  }, 2000)
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
</script>
