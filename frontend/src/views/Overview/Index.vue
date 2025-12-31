<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ $t('pages.overview.title') }}</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">{{ $t('pages.overview.description') }}</p>
      </div>

      <!-- 系统资源卡片 -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <!-- CPU使用率 -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('common.cpuUsage') }}</p>
              <p class="text-2xl font-semibold text-gray-800 dark:text-white/90 mt-1">
                {{ cpuUsage !== null ? `${cpuUsage}%` : loading ? $t('common.loading') : '-' }}
              </p>
            </div>
            <div class="h-12 w-12 rounded-full bg-brand-500/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              class="bg-brand-500 h-2 rounded-full transition-all"
              :style="{ width: cpuUsage !== null ? cpuUsage + '%' : '0%' }"
            ></div>
          </div>
        </div>

        <!-- 内存使用率 -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('common.memoryUsage') }}</p>
              <p class="text-2xl font-semibold text-gray-800 dark:text-white/90 mt-1">
                {{ memoryUsage !== null ? `${memoryUsage}%` : loading ? $t('common.loading') : '-' }}
              </p>
            </div>
            <div class="h-12 w-12 rounded-full bg-success-500/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              class="bg-success-500 h-2 rounded-full transition-all"
              :style="{ width: memoryUsage !== null ? memoryUsage + '%' : '0%' }"
            ></div>
          </div>
        </div>

        <!-- 磁盘使用率 -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('common.diskUsage') }}</p>
              <p class="text-2xl font-semibold text-gray-800 dark:text-white/90 mt-1">
                {{ diskUsage !== null ? `${diskUsage}%` : loading ? $t('common.loading') : '-' }}
              </p>
            </div>
            <div class="h-12 w-12 rounded-full bg-warning-500/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-warning-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              class="bg-warning-500 h-2 rounded-full transition-all"
              :style="{ width: diskUsage !== null ? diskUsage + '%' : '0%' }"
            ></div>
          </div>
        </div>

        <!-- 网络流量 -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('common.networkTraffic') }}</p>
              <p class="text-2xl font-semibold text-gray-800 dark:text-white/90 mt-1">
                {{ networkTraffic !== null ? networkTraffic : loading ? $t('common.loading') : '-' }}
              </p>
            </div>
            <div class="h-12 w-12 rounded-full bg-brand-500/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
          </div>
          <div class="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <span>↑ {{ networkUpload !== null ? networkUpload : loading ? $t('common.loading') : '-' }}</span>
            <span class="mx-2">|</span>
            <span>↓ {{ networkDownload !== null ? networkDownload : loading ? $t('common.loading') : '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="mb-6 rounded-lg bg-error-500/10 border border-error-500/20 p-4">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-error-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-error-500">{{ error }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- 系统信息 -->
        <div class="lg:col-span-2 space-y-6">
          <!-- 系统信息卡片 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">{{ $t('common.systemInfo') }}</h2>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('common.operatingSystem') }}</p>
                <p class="mt-1 text-gray-800 dark:text-white/90 font-medium">{{ systemInfo.os }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('common.kernelVersion') }}</p>
                <p class="mt-1 text-gray-800 dark:text-white/90 font-medium">{{ systemInfo.kernel }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('common.uptime') }}</p>
                <p class="mt-1 text-gray-800 dark:text-white/90 font-medium">{{ systemInfo.uptime }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('common.hostname') }}</p>
                <p class="mt-1 text-gray-800 dark:text-white/90 font-medium">{{ systemInfo.hostname }}</p>
              </div>
            </div>
          </div>

          <!-- 资源统计 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">{{ $t('common.resourceStats') }}</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <router-link
                to="/compute"
                class="p-4 bg-gray-50 dark:bg-white/[0.02] rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                <div class="flex items-center justify-between mb-2">
                  <svg class="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  <span class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ resourceStats.compute }}</span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('common.computeDevices') }}</p>
              </router-link>

              <router-link
                to="/virtual-machines"
                class="p-4 bg-gray-50 dark:bg-white/[0.02] rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                <div class="flex items-center justify-between mb-2">
                  <svg class="w-8 h-8 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                  <span class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ resourceStats.vms }}</span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('common.virtualMachines') }}</p>
              </router-link>

              <router-link
                to="/containers"
                class="p-4 bg-gray-50 dark:bg-white/[0.02] rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                <div class="flex items-center justify-between mb-2">
                  <svg class="w-8 h-8 text-warning-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ resourceStats.containers }}</span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('common.containers') }}</p>
              </router-link>

              <router-link
                to="/models"
                class="p-4 bg-gray-50 dark:bg-white/[0.02] rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                <div class="flex items-center justify-between mb-2">
                  <svg class="w-8 h-8 text-info-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ resourceStats.models }}</span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('common.models') }}</p>
              </router-link>
            </div>
          </div>

          <!-- 系统服务状态 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">{{ $t('common.systemServices') }}</h2>
              <router-link
                to="/services"
                class="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
              >
                {{ $t('common.viewAll') }} →
              </router-link>
            </div>
            <div class="space-y-3">
              <div
                v-for="service in services"
                :key="service.name"
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg"
              >
                <div class="flex items-center">
                  <span
                    :class="[
                      'w-2 h-2 rounded-full mr-3',
                      service.status === 'active' ? 'bg-success-500' : 'bg-gray-500',
                    ]"
                  ></span>
                  <div>
                    <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ service.name }}</p>
                    <p class="text-xs text-gray-600 dark:text-gray-400">{{ service.description }}</p>
                  </div>
                </div>
                <span
                  :class="[
                    'px-2 py-1 text-xs rounded',
                    service.status === 'active'
                      ? 'bg-success-500/10 text-success-500'
                      : 'bg-gray-500/10 text-gray-500',
                  ]"
                >
                  {{ service.status === 'active' ? $t('common.running') : $t('common.stopped') }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 侧边栏 -->
        <div class="space-y-6">
          <!-- 网络接口 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">{{ $t('common.networkInterfaces') }}</h2>
              <router-link
                to="/network"
                class="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
              >
                {{ $t('common.viewAll') }} →
              </router-link>
            </div>
            <div class="space-y-3">
              <div
                v-for="iface in networkInterfaces"
                :key="iface.name"
                class="p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg"
              >
                <div class="flex items-center justify-between mb-1">
                  <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ iface.name }}</p>
                  <span
                    :class="[
                      'w-2 h-2 rounded-full',
                      iface.status === 'up' ? 'bg-success-500' : 'bg-gray-500',
                    ]"
                  ></span>
                </div>
                <p class="text-xs text-gray-600 dark:text-gray-400">{{ iface.ip || $t('common.noIP') }}</p>
              </div>
            </div>
          </div>

          <!-- 存储概览 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">{{ $t('common.storageOverview') }}</h2>
              <router-link
                to="/storage"
                class="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
              >
                {{ $t('common.viewAll') }} →
              </router-link>
            </div>
            <div class="space-y-3">
              <div
                v-for="disk in disks"
                :key="disk.device"
                class="p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg"
              >
                <div class="flex items-center justify-between mb-2">
                  <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ disk.device }}</p>
                  <span class="text-xs text-gray-600 dark:text-gray-400">{{ disk.usage }}%</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    class="bg-warning-500 h-1.5 rounded-full"
                    :style="{ width: disk.usage + '%' }"
                  ></div>
                </div>
                <p class="text-xs text-gray-600 dark:text-gray-400 mt-1 break-words">{{ disk.mountpoint || $t('common.notMounted') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { systemApi } from '@/api/system'

const { t } = useI18n()
// 使用 systemApi.getOverviewSummary() 替代多个单独的API调用，提高加载速度

const loading = ref(false)
const error = ref<string | null>(null)

// 系统指标
const cpuUsage = ref<number | null>(null)
const memoryUsage = ref<number | null>(null)
const diskUsage = ref<number | null>(null)
const networkTraffic = ref<string | null>(null)
const networkUpload = ref<string | null>(null)
const networkDownload = ref<string | null>(null)

const systemInfo = ref({
  os: '-',
  kernel: '-',
  uptime: '-',
  hostname: '-',
})

const resourceStats = ref({
  compute: 0,
  vms: 0,
  containers: 0,
  models: 0,
})

const services = ref<Array<{ name: string; description: string; status: string }>>([])
const networkInterfaces = ref<Array<{ name: string; ip: string; status: string }>>([])
const disks = ref<Array<{ device: string; mountpoint: string; usage: number }>>([])

// 格式化字节大小
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// 格式化运行时间
const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) {
    return `${days}${t('common.days')} ${hours}${t('common.hours')} ${minutes}${t('common.minutes')}`
  } else if (hours > 0) {
    return `${hours}${t('common.hours')} ${minutes}${t('common.minutes')}`
  } else {
    return `${minutes}${t('common.minutes')}`
  }
}

// 加载系统数据（分批加载，关键数据优先）
const loadSystemData = async () => {
  loading.value = true
  error.value = null
  try {
    // 检查是否有token
    const token = localStorage.getItem('token')
    if (!token) {
      error.value = '未登录，请先登录'
      console.warn('未登录，无法加载数据')
      setTimeout(() => {
        window.location.href = '/signin'
      }, 1000)
      return
    }

    // 第一批：关键数据（使用合并API，减少请求次数，提高加载速度）
    const [overviewData] = await Promise.allSettled([
      systemApi.getSystemOverview(),
    ])
    
    // 为了兼容性，也保留单独获取的方式作为fallback
    const systemInfoData = overviewData.status === 'fulfilled' 
      ? { status: 'fulfilled' as const, value: overviewData.value } 
      : await Promise.allSettled([systemApi.getSystemInfo()]).then(r => r[0])
    
    const metrics = overviewData.status === 'fulfilled'
      ? { status: 'fulfilled' as const, value: overviewData.value }
      : await Promise.allSettled([systemApi.getSystemMetrics()]).then(r => r[0])

    // 检查是否有API调用失败
    const errors: string[] = []
    if (systemInfoData.status === 'rejected') {
      const reason = systemInfoData.reason
      console.error('获取系统信息失败:', reason)
      if (reason?.error?.includes('未提供认证令牌') || reason?.error?.includes('无效的认证令牌')) {
        error.value = '认证失败，请重新登录'
        setTimeout(() => {
          window.location.href = '/signin'
        }, 1000)
        return
      }
      errors.push('系统信息')
    }
    if (metrics.status === 'rejected') {
      const reason = metrics.reason
      console.error('获取系统指标失败:', reason)
      if (reason?.error?.includes('未提供认证令牌') || reason?.error?.includes('无效的认证令牌')) {
        error.value = '认证失败，请重新登录'
        setTimeout(() => {
          window.location.href = '/signin'
        }, 1000)
        return
      }
      errors.push('系统指标')
    }

    // 如果有多个API调用失败，显示错误提示
    if (errors.length > 0) {
      error.value = `部分数据加载失败: ${errors.join(', ')}`
    }

    // 立即处理关键数据，让用户先看到主要内容
    if (overviewData.status === 'fulfilled') {
      const overview = overviewData.value
      // 处理系统信息
      systemInfo.value = {
        os: `${overview.os.distro} ${overview.os.release}`,
        kernel: overview.os.release || '-',
        uptime: formatUptime(overview.os.uptime || 0),
        hostname: overview.os.hostname || '-',
      }
      
      // 处理系统指标
      cpuUsage.value = parseFloat(overview.cpu.currentLoad.toFixed(1))
      memoryUsage.value = parseFloat(overview.memory.usage || '0')
      
      if (overview.disk && overview.disk.length > 0) {
        const mainDisk = overview.disk[0]
        diskUsage.value = mainDisk.use || 0
      }

      if (overview.network && overview.network.length > 0) {
        const mainNetwork = overview.network[0]
        const totalRx = mainNetwork.rx_sec || 0
        const totalTx = mainNetwork.tx_sec || 0
        const total = totalRx + totalTx
        networkTraffic.value = formatBytes(total) + '/s'
        networkUpload.value = formatBytes(totalTx) + '/s'
        networkDownload.value = formatBytes(totalRx) + '/s'
      }
    } else if (systemInfoData.status === 'fulfilled' && metrics.status === 'fulfilled') {
      // Fallback: 使用单独获取的数据
      const info = systemInfoData.value
      systemInfo.value = {
        os: `${info.os.distro} ${info.os.release}`,
        kernel: info.os.release || '-',
        uptime: formatUptime(info.os.uptime || 0),
        hostname: info.os.hostname || '-',
      }
      
      const m = metrics.value
      cpuUsage.value = parseFloat(m.cpu.currentLoad.toFixed(1))
      memoryUsage.value = parseFloat(m.memory.usage || '0')
      
      if (systemInfoData.status === 'fulfilled' && systemInfoData.value.disk.length > 0) {
        const mainDisk = systemInfoData.value.disk[0]
        diskUsage.value = mainDisk.use || 0
      }

      if (m.network && m.network.length > 0) {
        const mainNetwork = m.network[0]
        const totalRx = mainNetwork.rx_sec || 0
        const totalTx = mainNetwork.tx_sec || 0
        const total = totalRx + totalTx
        networkTraffic.value = formatBytes(total) + '/s'
        networkUpload.value = formatBytes(totalTx) + '/s'
        networkDownload.value = formatBytes(totalRx) + '/s'
      }
    }

    // 关键数据加载完成，可以显示主要内容了
    loading.value = false

    // 第二批：次要数据（资源统计、列表等）- 使用合并API，减少请求次数，提高加载速度
    systemApi.getOverviewSummary().then((summary) => {
      // 处理资源统计
      resourceStats.value = summary.resourceStats
      
      // 处理服务列表
      services.value = summary.services
      
      // 处理网络接口
      networkInterfaces.value = summary.networkInterfaces
      
      // 处理存储磁盘
      disks.value = summary.disks
    }).catch((error) => {
      console.error('获取概览摘要数据失败:', error)
      // 如果合并API失败，可以降级到单独请求（可选）
    }).catch(err => {
      console.error('加载次要数据失败:', err)
      // 次要数据加载失败不影响主要功能，只记录错误
    })
  } catch (err: any) {
    console.error('加载系统数据失败:', err)
    if (err?.error?.includes('未提供认证令牌') || err?.error?.includes('无效的认证令牌') || err?.response?.status === 401) {
      error.value = '认证失败，请重新登录'
      console.warn('认证失败，应该跳转到登录页')
      setTimeout(() => {
        window.location.href = '/signin'
      }, 1000)
      return
    }
    error.value = err?.error || err?.message || '加载数据失败，请刷新页面重试'
    loading.value = false
  }
}

onMounted(() => {
  // 立即加载数据
  loadSystemData()
  
  // 每30秒刷新一次数据
  const interval = setInterval(() => {
    loadSystemData()
  }, 30000)
  
  // 组件卸载时清除定时器
  onUnmounted(() => {
    clearInterval(interval)
  })
})
</script>
