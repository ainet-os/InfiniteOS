<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ $t('menu.pods') }} {{ $t('common.status') }}</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">{{ $t('menu.pods') }}</p>
      </div>

      <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">{{ $t('common.podsList') }}</h2>
            <button
              :disabled="loading"
              @click="loadPods"
              class="px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ loading ? $t('common.loading') : $t('common.refresh') }}
            </button>
          </div>
          <div v-if="loading && pods.length === 0" class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            <p class="mt-4 text-gray-600 dark:text-gray-400">{{ $t('common.loading') }}</p>
          </div>
          <div v-else-if="pods.length === 0" class="text-center py-12">
            <p class="text-gray-600 dark:text-gray-400">{{ $t('common.noPods') }}</p>
          </div>
          <table v-else class="w-full">
            <thead class="bg-gray-50 dark:bg-white/[0.02]">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.name') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.namespace') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.status') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.attempt') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.createdAt') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
              <tr v-for="pod in pods" :key="`${pod.namespace}:${pod.name}:${pod.attempt}`" class="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <td class="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white/90">{{ pod.name }}</td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ pod.namespace }}</td>
                <td class="px-6 py-4">
                  <span :class="getStatusClasses(pod.status)">
                    {{ formatStatus(pod.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ pod.attempt }}</td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ formatCreatedTime(pod.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { k8sApi } from '@/api/k8s'
import type { Pod } from '@/api/k8s'

const loading = ref(false)
const pods = ref<Pod[]>([])
let refreshInterval: number | null = null

const loadPods = async () => {
  if (loading.value) return

  loading.value = true
  try {
    const data = await k8sApi.getPods()
    pods.value = data
  } catch (error) {
    console.error('获取Pods列表失败:', error)
    pods.value = []
  } finally {
    loading.value = false
  }
}

const formatStatus = (status: string): string => {
  const normalized = (status || '').toUpperCase()
  if (normalized === 'SANDBOX_READY' || normalized === 'READY') return '运行中'
  if (normalized === 'SANDBOX_NOTREADY' || normalized === 'NOTREADY') return '未就绪'
  return status || '-'
}

const getStatusClasses = (status: string) => {
  const normalized = (status || '').toUpperCase()
  if (normalized.includes('NOTREADY')) {
    return 'px-2 py-1 text-xs rounded bg-warning-500/10 text-warning-500'
  }
  if (normalized.includes('READY')) {
    return 'px-2 py-1 text-xs rounded bg-success-500/10 text-success-500'
  }
  return 'px-2 py-1 text-xs rounded bg-gray-500/10 text-gray-500'
}

const formatCreatedTime = (createdAt: string | null): string => {
  if (!createdAt || createdAt === '-') return '-'

  const directDate = new Date(createdAt)
  if (!Number.isNaN(directDate.getTime())) {
    return formatDate(directDate)
  }

  const numericValue = Number(createdAt)
  if (Number.isFinite(numericValue) && numericValue > 0) {
    let millis = numericValue * 1000
    if (numericValue > 1e18) {
      millis = numericValue / 1000000
    } else if (numericValue > 1e15) {
      millis = numericValue / 1000
    } else if (numericValue > 1e12) {
      millis = numericValue
    }

    const numericDate = new Date(millis)
    if (!Number.isNaN(numericDate.getTime())) {
      return formatDate(numericDate)
    }
  }

  return createdAt
}

const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

onMounted(() => {
  loadPods()
  refreshInterval = window.setInterval(() => {
    loadPods()
  }, 30000)
})

onUnmounted(() => {
  if (refreshInterval !== null) {
    clearInterval(refreshInterval)
  }
})
</script>
