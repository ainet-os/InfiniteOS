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
              @click="loadPods"
              class="px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 transition-colors"
            >
              {{ $t('common.refresh') }}
            </button>
          </div>
          <div v-if="pods.length === 0" class="text-center py-12">
            <p class="text-gray-600 dark:text-gray-400">{{ $t('common.noPods') }}</p>
          </div>
          <table v-else class="w-full">
            <thead class="bg-gray-50 dark:bg-white/[0.02]">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.name') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.namespace') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.status') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.node') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.restartCount') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.age') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.actions') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">推理 API</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
              <tr v-for="pod in pods" :key="pod.name" class="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <td class="px-6 py-4 text-sm">
                  <router-link
                    :to="`/pods/${pod.namespace}/${pod.name}`"
                    class="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
                  >
                    {{ pod.name }}
                  </router-link>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ pod.namespace }}</td>
                <td class="px-6 py-4">
                  <span :class="[
                    'px-2 py-1 text-xs rounded',
                    pod.status === 'Running' ? 'bg-success-500/10 text-success-500' :
                    pod.status === 'Pending' ? 'bg-warning-500/10 text-warning-500' :
                    pod.status === 'Failed' ? 'bg-error-500/10 text-error-500' :
                    'bg-gray-500/10 text-gray-500'
                  ]">
                    {{ pod.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ pod.node }}</td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ pod.restarts }}</td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ pod.age }}</td>
                <td class="px-6 py-4 text-sm">
                  <div class="flex gap-2">
                    <button
                      @click="viewPodLogs(pod.namespace, pod.name)"
                      class="px-2.5 py-1.5 text-xs bg-brand-500 dark:bg-brand-500 text-white rounded hover:bg-brand-600 dark:hover:bg-brand-600 transition-colors"
                    >
                      日志
                    </button>
                    <button
                      @click="deletePod(pod.namespace, pod.name)"
                      class="px-2.5 py-1.5 text-xs bg-error-600 dark:bg-error-500 text-white rounded hover:bg-error-700 dark:hover:bg-error-600 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </td>
                <td class="px-6 py-4 text-sm">
                  <a
                    v-if="isVllmInferencePod(pod.name)"
                    :href="vllmApiBaseUrl"
                    target="_blank"
                    rel="noopener"
                    class="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 break-all"
                  >
                    {{ vllmApiBaseUrl }}
                  </a>
                  <span v-else class="text-gray-400">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { k8sApi } from '@/api/k8s'
import type { Pod } from '@/api/k8s'

const loading = ref(false)
const pods = ref<Pod[]>([])

// Qwen3-VL 等 vLLM 推理服务 NodePort 端口，与 deployments/qwen3-vl-32b-vllm.yaml 中一致
const VLLM_NODEPORT = 30090
const vllmApiBaseUrl = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:${VLLM_NODEPORT}`
  : `http://localhost:${VLLM_NODEPORT}`

const isVllmInferencePod = (name: string) => /qwen3-vl.*vllm|vllm.*qwen/i.test(name)

// 加载Pods列表
const loadPods = async () => {
  loading.value = true
  try {
    const data = await k8sApi.getPods('default')
    pods.value = data
  } catch (error) {
    console.error('获取Pods列表失败:', error)
    pods.value = []
  } finally {
    loading.value = false
  }
}

const viewPodLogs = async (namespace: string, name: string) => {
  try {
    const response = await k8sApi.getPodLogs(namespace, name, 100)
    // 这里可以打开一个对话框显示日志
    console.log('Pod日志:', response.logs)
    alert(`Pod ${name} 的日志（前100行）:\n\n${response.logs.slice(0, 10).join('\n')}...`)
  } catch (error: any) {
    console.error('获取Pod日志失败:', error)
    alert(error?.error || '获取Pod日志失败')
  }
}

const deletePod = async (namespace: string, name: string) => {
  if (confirm(`确定要删除 Pod ${name} 吗？`)) {
    try {
      await k8sApi.deletePod(namespace, name)
      alert('Pod删除成功')
      await loadPods()
    } catch (error: any) {
      console.error('删除Pod失败:', error)
      alert(error?.error || '删除Pod失败')
    }
  }
}

onMounted(() => {
  loadPods()
  
  // 每30秒刷新一次数据
  const interval = setInterval(() => {
    loadPods()
  }, 30000)
  
  return () => {
    clearInterval(interval)
  }
})
</script>

