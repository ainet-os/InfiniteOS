<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6 flex items-center gap-4">
        <router-link
          :to="{ name: 'Models' }"
          class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          返回模型管理
        </router-link>
      </div>

      <div v-if="loading" class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-12 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
      </div>

      <div v-else-if="error" class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
        <p class="text-error-500">{{ error }}</p>
        <router-link :to="{ name: 'Models' }" class="mt-4 inline-block text-brand-500 hover:underline">返回列表</router-link>
      </div>

      <div v-else-if="detail" class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h1 class="text-xl font-semibold text-gray-800 dark:text-white/90">{{ detail.name }}</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ source === 'local' ? '本地模型' : '云端模型' }} · 大小 {{ detail.size }}
          </p>
        </div>
        <div class="p-6">
          <h2 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">模型目录下的文件</h2>
          <div v-if="!detail.files || detail.files.length === 0" class="text-gray-500 dark:text-gray-400 text-sm py-4">暂无文件</div>
          <div v-else class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50 dark:bg-white/[0.02]">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">文件名</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">大小</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                <tr v-for="(file, index) in detail.files" :key="index" class="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <td class="px-6 py-3 text-sm text-gray-800 dark:text-white/90 font-mono break-all">{{ file.name }}</td>
                  <td class="px-6 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {{ formatFileSize(file.size) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { modelsApi } from '@/api/models'
import type { ModelDetail } from '@/api/models'

const route = useRoute()
const source = computed(() => (route.params.source as string) || 'local')
const name = computed(() => (route.params.name as string) || '')

const loading = ref(true)
const error = ref('')
const detail = ref<ModelDetail | null>(null)

const formatFileSize = (size: number | string): string => {
  if (size === '-' || size == null) return '-'
  const n = typeof size === 'string' ? parseInt(size, 10) : size
  if (isNaN(n) || n === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(n) / Math.log(k))
  return Math.round((n / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const fetchDetail = async () => {
  if (!name.value) {
    error.value = '缺少模型名称'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  detail.value = null
  try {
    if (source.value === 'local') {
      detail.value = await modelsApi.getLocalModelDetail(name.value)
    } else {
      detail.value = await modelsApi.getCloudModelDetail(name.value)
    }
    if (!detail.value) {
      error.value = '模型不存在'
    }
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

watch([source, name], fetchDetail)
onMounted(fetchDetail)
</script>
