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
            <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">虚拟机详情</h1>
            <p class="text-gray-600 dark:text-gray-400 mt-1">{{ vmName }}</p>
          </div>
          <div class="flex flex-wrap gap-2 justify-end">
            <button
              v-if="vm.status === 'stopped'"
              @click="startVM"
              class="px-4 py-2 bg-success-600 dark:bg-success-500 text-white rounded-lg hover:bg-success-700 dark:hover:bg-success-600"
            >
              启动
            </button>
            <button
              v-if="vm.status === 'running'"
              @click="stopVM"
              class="px-4 py-2 bg-error-600 dark:bg-error-500 text-white rounded-lg hover:bg-error-700 dark:hover:bg-error-600"
            >
              停止
            </button>
            <button
              v-if="vm.status === 'running'"
              @click="restartVM"
              class="px-4 py-2 bg-warning-600 dark:bg-warning-500 text-white rounded-lg hover:bg-warning-700 dark:hover:bg-warning-600"
            >
              重启
            </button>
            <button
              v-if="vm.status === 'running'"
              @click="suspendVM"
              class="px-4 py-2 bg-warning-600 dark:bg-warning-500 text-white rounded-lg hover:bg-warning-700 dark:hover:bg-warning-600"
            >
              暂停
            </button>
            <button
              v-if="vm.status === 'paused'"
              @click="resumeVM"
              class="px-4 py-2 bg-success-600 dark:bg-success-500 text-white rounded-lg hover:bg-success-700 dark:hover:bg-success-600"
            >
              恢复
            </button>
            <button
              v-if="vm.status !== 'stopped'"
              @click="openConsole"
              class="px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600"
            >
              控制台
            </button>
            <button
              @click="deleteVM"
              class="px-4 py-2 bg-error-600 dark:bg-error-500 text-white rounded-lg hover:bg-error-700 dark:hover:bg-error-600"
            >
              删除
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- 基本信息 -->
        <div class="lg:col-span-2 space-y-6">
          <!-- 状态卡片 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">状态信息</h2>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">状态</p>
                <span
                  :class="[
                    'mt-1 inline-block px-3 py-1 text-sm rounded',
                    vm.status === 'running'
                      ? 'bg-success-500/10 text-success-500'
                      : 'bg-gray-500/10 text-gray-500',
                  ]"
                >
                  {{ vm.status === 'running' ? '运行中' : '已停止' }}
                </span>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">ID</p>
                <p class="mt-1 text-gray-800 dark:text-white/90">{{ vm.id || '-' }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">CPU</p>
                <p class="mt-1 text-gray-800 dark:text-white/90">{{ vm.cpu || '-' }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">内存</p>
                <p class="mt-1 text-gray-800 dark:text-white/90">{{ vm.memory || '-' }}</p>
              </div>
            </div>
          </div>

          <!-- 配置信息 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">配置信息</h2>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">操作系统类型</span>
                <span class="text-gray-800 dark:text-white/90">{{ vm.osType || 'Linux' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">虚拟CPU数量</span>
                <span class="text-gray-800 dark:text-white/90">{{ vm.vcpu || '2' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">内存大小</span>
                <span class="text-gray-800 dark:text-white/90">{{ vm.ram || '4 GB' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">存储大小</span>
                <span class="text-gray-800 dark:text-white/90">{{ vm.storage || '20 GB' }}</span>
              </div>
            </div>
          </div>

          <!-- 网络接口 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">网络接口</h2>
            <div v-if="vm.networkInterfaces && vm.networkInterfaces.length > 0" class="space-y-3">
              <div
                v-for="(iface, index) in vm.networkInterfaces"
                :key="index"
                class="flex justify-between items-center p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg"
              >
                <div>
                  <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ iface.name }}</p>
                  <p class="text-xs text-gray-600 dark:text-gray-400">{{ iface.mac }}</p>
                </div>
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ iface.type }}</span>
              </div>
            </div>
            <p v-else class="text-gray-600 dark:text-gray-400">暂无网络接口</p>
          </div>

          <!-- 磁盘 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">磁盘</h2>
            <div v-if="vm.disks && vm.disks.length > 0" class="space-y-3">
              <div
                v-for="(disk, index) in vm.disks"
                :key="index"
                class="flex justify-between items-center p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg"
              >
                <div>
                  <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ disk.target }}</p>
                  <p class="text-xs text-gray-600 dark:text-gray-400">{{ disk.source }} ({{ disk.type }})</p>
                </div>
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ disk.bus }}</span>
              </div>
            </div>
            <p v-else class="text-gray-600 dark:text-gray-400">暂无磁盘</p>
          </div>
        </div>

        <!-- 侧边栏 -->
        <div class="space-y-6">
          <!-- CPU使用率 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">CPU使用率</h2>
              <span class="text-sm text-gray-800 dark:text-white/90">{{ vm.cpuUsage || 0 }}%</span>
            </div>
            <VueApexCharts type="area" height="120" :options="cpuChartOptions" :series="cpuChartSeries" />
          </div>

          <!-- 内存使用率 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">内存使用率</h2>
              <span class="text-sm text-gray-800 dark:text-white/90">{{ vm.memoryUsage || 0 }}%</span>
            </div>
            <VueApexCharts type="area" height="120" :options="memoryChartOptions" :series="memoryChartSeries" />
          </div>

          <!-- 网络使用率 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">网络使用率</h2>
              <span class="text-sm text-gray-800 dark:text-white/90">{{ vm.networkUsage || 0 }}%</span>
            </div>
            <VueApexCharts type="area" height="120" :options="networkChartOptions" :series="networkChartSeries" />
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-500">
              近5秒吞吐: {{ networkMbps.toFixed(2) }} Mbps（按 1Gbps 归一化）
            </p>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { virtualMachinesApi } from '@/api/virtualMachines'
import type { VMDetails, VMMonitoring } from '@/api/virtualMachines'
import VueApexCharts from 'vue3-apexcharts'

const route = useRoute()
const router = useRouter()

const vmName = ref(route.params.name as string)

type VMDetailViewModel = VMDetails & {
  cpuUsage?: number
  memoryUsage?: number
  networkUsage?: number
}

const loading = ref(true)
const loadError = ref('')

const vm = ref<VMDetailViewModel>({
  id: null,
  name: vmName.value,
  status: 'stopped',
  osType: 'hvm',
  vcpu: 0,
  cpu: '-',
  ram: '-',
  memory: '-',
  storage: '-',
  networkInterfaces: [],
  disks: [],
  cpuUsage: 0,
  memoryUsage: 0,
  networkUsage: 0,
})

let monitorTimer: number | null = null
let prevCpuTimeNs: number | null = null
let prevAtMs: number | null = null
let prevNetBytes: number | null = null

const networkMbps = ref(0)

const pushPoint = (arr: number[], v: number, maxLen = 30) => {
  arr.push(v)
  if (arr.length > maxLen) arr.splice(0, arr.length - maxLen)
}

const labels = ref<string[]>([])
const pushLabel = () => {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  labels.value.push(`${hh}:${mm}:${ss}`)
  if (labels.value.length > 30) labels.value.splice(0, labels.value.length - 30)
}

const cpuSeriesData = ref<number[]>([])
const memorySeriesData = ref<number[]>([])
const networkSeriesData = ref<number[]>([])

const baseChartOptions = computed(() => {
  const isDark = document?.documentElement?.classList?.contains('dark')
  return {
    chart: {
      type: 'area',
      toolbar: { show: false },
      sparkline: { enabled: true },
      animations: { enabled: false },
      fontFamily: 'Outfit, sans-serif',
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.05,
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: labels.value,
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      max: 100,
      labels: { show: false },
    },
    grid: { show: false },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
    },
  }
})

const cpuChartSeries = computed(() => [{ name: 'CPU', data: cpuSeriesData.value }])
const memoryChartSeries = computed(() => [{ name: 'Memory', data: memorySeriesData.value }])
const networkChartSeries = computed(() => [{ name: 'Network', data: networkSeriesData.value }])

const cpuChartOptions = computed(() => ({
  ...baseChartOptions.value,
  colors: ['#3C50E0'],
}))
const memoryChartOptions = computed(() => ({
  ...baseChartOptions.value,
  colors: ['#22C55E'],
}))
const networkChartOptions = computed(() => ({
  ...baseChartOptions.value,
  colors: ['#F59E0B'],
}))

const parseKiB = (s?: string) => {
  if (!s) return null
  const m = String(s).trim().match(/^(\d+(?:\.\d+)?)\s*(kib|kb|mib|mb|gib|gb)$/i)
  if (!m) return null
  const n = Number(m[1])
  const u = m[2].toLowerCase()
  if (!Number.isFinite(n)) return null
  if (u === 'kib' || u === 'kb') return Math.round(n)
  if (u === 'mib' || u === 'mb') return Math.round(n * 1024)
  if (u === 'gib' || u === 'gb') return Math.round(n * 1024 * 1024)
  return null
}

const refreshDetails = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const details = await virtualMachinesApi.getVMDetails(vmName.value)
    vm.value = {
      ...vm.value,
      ...details,
      cpuUsage: vm.value.cpuUsage ?? 0,
      memoryUsage: vm.value.memoryUsage ?? 0,
    }
  } catch (e: any) {
    console.error('获取虚拟机详情失败:', e)
    loadError.value = e?.error || e?.message || '获取虚拟机详情失败'
  } finally {
    loading.value = false
  }
}

const refreshMonitoring = async () => {
  if (!vm.value || vm.value.status !== 'running') {
    vm.value.cpuUsage = 0
    vm.value.memoryUsage = 0
    vm.value.networkUsage = 0
    networkMbps.value = 0
    prevCpuTimeNs = null
    prevAtMs = null
    prevNetBytes = null
    return
  }

  try {
    const mon: VMMonitoring = await virtualMachinesApi.getVMMonitoring(vmName.value)

    const now = Date.now()
    const cpuTimeNs = Number(mon.cpuUsage) || 0
    const vcpu = Number(vm.value.vcpu) || 1

    // 后端 mon.cpuUsage 当前是 virsh domstats 的 cpu.time (ns)，这里前端计算百分比
    if (prevCpuTimeNs !== null && prevAtMs !== null && cpuTimeNs >= prevCpuTimeNs) {
      const dtMs = now - prevAtMs
      const dCpuNs = cpuTimeNs - prevCpuTimeNs
      if (dtMs > 0) {
        const pct = (dCpuNs / (dtMs * 1e6 * vcpu)) * 100
        vm.value.cpuUsage = Math.max(0, Math.min(100, Math.round(pct)))
      }
    }
    prevCpuTimeNs = cpuTimeNs
    prevAtMs = now

    // 后端 mon.memoryUsage 当前是 virsh domstats 的 balloon.current (KiB)
    const memCurrentKiB = Number(mon.memoryUsage) || 0
    const memMaxKiB = vm.value.memoryKiB ?? parseKiB(vm.value.ram) ?? 0
    if (memMaxKiB > 0) {
      const memPct = (memCurrentKiB / memMaxKiB) * 100
      vm.value.memoryUsage = Math.max(0, Math.min(100, Math.round(memPct)))
    } else {
      vm.value.memoryUsage = 0
    }

    // 网络：mon.networkRx/Tx 是累计字节，计算近一次间隔的吞吐，并按 1Gbps 归一化为百分比
    const netBytes = (Number(mon.networkRx) || 0) + (Number(mon.networkTx) || 0)
    if (prevNetBytes !== null && prevAtMs !== null) {
      const dtSec = (now - prevAtMs) / 1000
      const dBytes = netBytes - prevNetBytes
      if (dtSec > 0 && dBytes >= 0) {
        const mbps = (dBytes * 8) / 1e6 / dtSec
        networkMbps.value = mbps
        const pct = (mbps / 1000) * 100 // 1Gbps 作为 100%
        vm.value.networkUsage = Math.max(0, Math.min(100, Math.round(pct)))
      }
    }
    prevNetBytes = netBytes

    // 记录折线点
    pushLabel()
    pushPoint(cpuSeriesData.value, Number(vm.value.cpuUsage) || 0)
    pushPoint(memorySeriesData.value, Number(vm.value.memoryUsage) || 0)
    pushPoint(networkSeriesData.value, Number(vm.value.networkUsage) || 0)
  } catch (e) {
    // 监控失败不影响详情页
    console.warn('获取虚拟机监控失败:', e)
  }
}

const startVM = async () => {
  try {
    await virtualMachinesApi.startVM(vmName.value)
    await refreshDetails()
    await refreshMonitoring()
  } catch (e: any) {
    alert(e?.error || '启动虚拟机失败')
  }
}

const stopVM = async () => {
  try {
    await virtualMachinesApi.stopVM(vmName.value)
    await refreshDetails()
    await refreshMonitoring()
  } catch (e: any) {
    alert(e?.error || '停止虚拟机失败')
  }
}

const restartVM = async () => {
  try {
    await virtualMachinesApi.restartVM(vmName.value)
    await refreshDetails()
    await refreshMonitoring()
  } catch (e: any) {
    alert(e?.error || '重启虚拟机失败')
  }
}

const suspendVM = async () => {
  try {
    await virtualMachinesApi.suspendVM(vmName.value)
    await refreshDetails()
  } catch (e: any) {
    alert(e?.error || '暂停虚拟机失败')
  }
}

const resumeVM = async () => {
  try {
    await virtualMachinesApi.resumeVM(vmName.value)
    await refreshDetails()
  } catch (e: any) {
    alert(e?.error || '恢复虚拟机失败')
  }
}

const openConsole = async () => {
  try {
    const info = await virtualMachinesApi.getVMConsole(vmName.value)
    const url = info?.consoleUrl || `/virtual-machines/${encodeURIComponent(vmName.value)}/console`
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (e: any) {
    alert(e?.error || e?.message || '打开控制台失败')
  }
}

const deleteVM = async () => {
  if (confirm('确定要删除这个虚拟机吗？')) {
    try {
      await virtualMachinesApi.deleteVM(vmName.value)
      router.push('/virtual-machines')
    } catch (e: any) {
      alert(e?.error || '删除虚拟机失败')
    }
  }
}

onMounted(() => {
  refreshDetails().then(() => refreshMonitoring())
  monitorTimer = window.setInterval(() => {
    refreshDetails().then(() => refreshMonitoring())
  }, 5000)
})

onUnmounted(() => {
  if (monitorTimer) {
    window.clearInterval(monitorTimer)
    monitorTimer = null
  }
})
</script>

