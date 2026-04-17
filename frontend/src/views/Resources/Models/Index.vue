<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {{ $t('pages.models.title') }}
        </h1>
        <p class="mt-1 text-gray-600 dark:text-gray-400">
          {{ $t('pages.models.description') }}
        </p>
      </div>

      <div
        v-if="showCloudLoginDialog"
        class="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 dark:bg-black/70"
        @click.self="showCloudLoginDialog = false"
      >
        <div class="m-4 w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-gray-800">
          <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">登录云端模型</h2>
            <button
              @click="showCloudLoginDialog = false"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form class="space-y-4 p-6" @submit.prevent="handleCloudLogin">
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                地址
              </label>
              <input
                v-model="cloudLoginForm.consoleUrl"
                type="text"
                class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
              />
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                用户名
              </label>
              <input
                v-model="cloudLoginForm.email"
                type="text"
                class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
              />
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                密码
              </label>
              <input
                v-model="cloudLoginForm.password"
                type="password"
                class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
              />
            </div>

            <p v-if="cloudLoginError" class="text-sm text-error-500">{{ cloudLoginError }}</p>

            <div class="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <button
                type="button"
                @click="showCloudLoginDialog = false"
                class="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="cloudLoggingIn"
                class="rounded-lg bg-brand-500 px-4 py-2 text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {{ cloudLoggingIn ? '登录中...' : '登录' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div class="space-y-6">
        <section class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 class="text-lg font-medium text-gray-800 dark:text-white/90">本地模型</h2>
          </div>
          <div class="flex items-center justify-between px-6 pt-4">
            <div class="flex gap-2">
              <button
                v-for="tab in modelTabs"
                :key="`local-${tab.key}`"
                @click="localActiveTab = tab.key"
                :class="getTabButtonClass(localActiveTab === tab.key)"
              >
                {{ tab.label }}
              </button>
            </div>
            <button
              @click="loadLocalModels(localActiveTab)"
              :disabled="localLoading[localActiveTab]"
              class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {{ localLoading[localActiveTab] ? '刷新中...' : '刷新' }}
            </button>
          </div>
          <div class="p-6">
            <div class="mb-4 flex items-center justify-between gap-4">
              <div class="text-sm text-gray-500 dark:text-gray-400">
                共 {{ localModels[localActiveTab].length }} 条
              </div>
              <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                每页
                <select
                  v-model.number="localPageSize[localActiveTab]"
                  class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  <option v-for="size in pageSizeOptions" :key="`local-size-${size}`" :value="size">{{ size }}</option>
                </select>
                条
              </label>
            </div>

            <div v-if="localLoading[localActiveTab]" class="py-8 text-center">
              <div class="inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-brand-500"></div>
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">加载中...</p>
            </div>
            <div
              v-else-if="localModels[localActiveTab].length === 0"
              class="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
            >
              {{ localActiveTab === 'public' ? '暂无公共本地模型' : '暂无私有本地模型' }}
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full min-w-[720px]">
                <thead class="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">名称</th>
                    <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">大小</th>
                    <th class="px-4 py-3 text-right text-xs font-medium uppercase text-gray-600 dark:text-gray-400">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                  <tr
                    v-for="model in pagedLocalModels"
                    :key="`local-${localActiveTab}-${model.name}`"
                    class="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <td class="px-4 py-3 text-sm text-gray-800 dark:text-white/90">{{ model.name }}</td>
                    <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{{ model.size }}</td>
                    <td class="px-4 py-3 text-right">
                      <button
                        @click="handleDeleteLocal(model.name, localActiveTab)"
                        :disabled="deletingLocal[localActiveTab] === model.name"
                        class="rounded-lg bg-error-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-error-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-error-500 dark:hover:bg-error-600"
                      >
                        {{ deletingLocal[localActiveTab] === model.name ? '删除中...' : '删除' }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <PaginationWithText
              v-if="localTotalPages > 1"
              :total-pages="localTotalPages"
              :initial-page="localCurrentPage[localActiveTab]"
              @page-change="(page) => handleLocalPageChange(localActiveTab, page)"
            />
          </div>
        </section>

        <section class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <div class="flex items-center justify-between gap-4">
              <h2 class="text-lg font-medium text-gray-800 dark:text-white/90">云端模型</h2>
              <div class="flex items-center gap-3">
                <span
                  v-if="cloudCredentials"
                  class="text-sm text-success-600 dark:text-success-400"
                >
                  已登录 {{ cloudCredentials.tenantBucket || '云端模型' }}
                </span>
                <button
                  @click="openCloudLoginDialog"
                  class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white transition-colors hover:bg-brand-600"
                >
                  {{ cloudCredentials ? '重新登录' : '登录' }}
                </button>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-between px-6 pt-4">
            <div class="flex gap-2">
              <button
                v-for="tab in modelTabs"
                :key="`cloud-${tab.key}`"
                @click="cloudActiveTab = tab.key"
                :class="getTabButtonClass(cloudActiveTab === tab.key)"
              >
                {{ tab.label }}
              </button>
            </div>
            <button
              @click="handleCloudRefresh(cloudActiveTab)"
              :disabled="cloudLoading[cloudActiveTab] || !cloudCredentials"
              class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {{ cloudLoading[cloudActiveTab] ? '刷新中...' : '刷新' }}
            </button>
          </div>
          <div class="p-6">
            <div class="mb-4 flex items-center justify-between gap-4">
              <div class="text-sm text-gray-500 dark:text-gray-400">
                共 {{ cloudModels[cloudActiveTab].length }} 条
              </div>
              <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                每页
                <select
                  v-model.number="cloudPageSize[cloudActiveTab]"
                  class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  <option v-for="size in pageSizeOptions" :key="`cloud-size-${size}`" :value="size">{{ size }}</option>
                </select>
                条
              </label>
            </div>

            <div
              v-if="!cloudCredentials"
              class="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
            >
              请先登录云端模型
            </div>
            <div v-else-if="cloudLoading[cloudActiveTab]" class="py-8 text-center">
              <div class="inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-brand-500"></div>
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">加载中...</p>
            </div>
            <div
              v-else-if="cloudModels[cloudActiveTab].length === 0"
              class="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
            >
              {{ cloudActiveTab === 'public' ? '暂无公共云端模型' : '暂无私有云端模型' }}
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full min-w-[720px]">
                <thead class="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">名称</th>
                    <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">大小</th>
                    <th class="px-4 py-3 text-right text-xs font-medium uppercase text-gray-600 dark:text-gray-400">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                  <tr
                    v-for="model in pagedCloudModels"
                    :key="`cloud-${cloudActiveTab}-${model.name}`"
                    class="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <td class="px-4 py-3 text-sm text-gray-800 dark:text-white/90">{{ model.name }}</td>
                    <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{{ model.size }}</td>
                    <td class="px-4 py-3 text-right">
                      <button
                        @click="handleSyncCloudModel(model.name, cloudActiveTab)"
                        :disabled="syncingCloud[cloudActiveTab] === model.name"
                        class="rounded-lg bg-brand-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {{ syncingCloud[cloudActiveTab] === model.name ? '同步中...' : '同步到本地' }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <PaginationWithText
              v-if="cloudTotalPages > 1"
              :total-pages="cloudTotalPages"
              :initial-page="cloudCurrentPage[cloudActiveTab]"
              @page-change="(page) => handleCloudPageChange(cloudActiveTab, page)"
            />
          </div>
        </section>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PaginationWithText from '@/components/ui/pagination/PaginationWithText.vue'
import { modelsApi } from '@/api/models'
import type { CloudCredentials, CloudModelRequest, ModelListItem, ModelTabType } from '@/api/models'

const { t: $t } = useI18n()
const CLOUD_CREDENTIALS_STORAGE_KEY = 'infiniteos-cloud-model-credentials'

const modelTabs: Array<{ key: ModelTabType; label: string }> = [
  { key: 'public', label: '公共' },
  { key: 'private', label: '私有' },
]
const pageSizeOptions = [10, 20, 50, 100]

const localActiveTab = ref<ModelTabType>('public')
const cloudActiveTab = ref<ModelTabType>('public')
const showCloudLoginDialog = ref(false)
const cloudLoggingIn = ref(false)
const cloudLoginError = ref('')
const cloudCredentials = ref<CloudCredentials | null>(null)

const cloudLoginForm = ref({
  consoleUrl: 'https://console.ainet.uno',
  email: '',
  password: '',
})

const localModels = ref<Record<ModelTabType, ModelListItem[]>>({
  public: [],
  private: [],
})
const cloudModels = ref<Record<ModelTabType, ModelListItem[]>>({
  public: [],
  private: [],
})
const localLoading = ref<Record<ModelTabType, boolean>>({
  public: false,
  private: false,
})
const cloudLoading = ref<Record<ModelTabType, boolean>>({
  public: false,
  private: false,
})
const deletingLocal = ref<Record<ModelTabType, string | null>>({
  public: null,
  private: null,
})
const syncingCloud = ref<Record<ModelTabType, string | null>>({
  public: null,
  private: null,
})
const localCurrentPage = ref<Record<ModelTabType, number>>({ public: 1, private: 1 })
const cloudCurrentPage = ref<Record<ModelTabType, number>>({ public: 1, private: 1 })
const localPageSize = ref<Record<ModelTabType, number>>({ public: 10, private: 10 })
const cloudPageSize = ref<Record<ModelTabType, number>>({ public: 10, private: 10 })

const getTabButtonClass = (isActive: boolean) =>
  [
    'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-500 text-white dark:bg-brand-500'
      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
  ].join(' ')

const persistCloudCredentials = (credentials: CloudCredentials) => {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(CLOUD_CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials))
}

const clearPersistedCloudCredentials = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(CLOUD_CREDENTIALS_STORAGE_KEY)
}

const restoreCloudCredentials = (): CloudCredentials | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.sessionStorage.getItem(CLOUD_CREDENTIALS_STORAGE_KEY)
  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue)
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.consoleUrl !== 'string' ||
      typeof parsed.endpoint !== 'string' ||
      typeof parsed.accessKey !== 'string' ||
      typeof parsed.secretKey !== 'string' ||
      typeof parsed.tenantBucket !== 'string' ||
      !Array.isArray(parsed.readonlyPublicBuckets)
    ) {
      throw new Error('invalid credentials')
    }

    return {
      consoleUrl: parsed.consoleUrl,
      endpoint: parsed.endpoint,
      useSSL: parsed.useSSL === true,
      accessKey: parsed.accessKey,
      secretKey: parsed.secretKey,
      tenantBucket: parsed.tenantBucket,
      readonlyPublicBuckets: parsed.readonlyPublicBuckets,
    }
  } catch (error) {
    console.error('恢复云端模型登录信息失败:', error)
    clearPersistedCloudCredentials()
    return null
  }
}

const buildCloudRequest = (type: ModelTabType): CloudModelRequest => {
  if (!cloudCredentials.value) {
    throw new Error('请先登录云端模型')
  }
  return {
    ...cloudCredentials.value,
    type,
  }
}

const clampPage = (page: number, totalPages: number) => {
  if (totalPages <= 0) return 1
  return Math.min(Math.max(page, 1), totalPages)
}

const createPagedModels = (
  models: () => ModelListItem[],
  page: () => number,
  pageSize: () => number,
) => computed(() => {
  const size = pageSize()
  const start = (page() - 1) * size
  return models().slice(start, start + size)
})

const localTotalPages = computed(() => {
  const size = localPageSize.value[localActiveTab.value]
  return Math.max(1, Math.ceil(localModels.value[localActiveTab.value].length / size))
})
const cloudTotalPages = computed(() => {
  const size = cloudPageSize.value[cloudActiveTab.value]
  return Math.max(1, Math.ceil(cloudModels.value[cloudActiveTab.value].length / size))
})
const pagedLocalModels = createPagedModels(
  () => localModels.value[localActiveTab.value],
  () => localCurrentPage.value[localActiveTab.value],
  () => localPageSize.value[localActiveTab.value],
)
const pagedCloudModels = createPagedModels(
  () => cloudModels.value[cloudActiveTab.value],
  () => cloudCurrentPage.value[cloudActiveTab.value],
  () => cloudPageSize.value[cloudActiveTab.value],
)

const syncPageBounds = (type: ModelTabType, scope: 'local' | 'cloud') => {
  if (scope === 'local') {
    const totalPages = Math.max(1, Math.ceil(localModels.value[type].length / localPageSize.value[type]))
    localCurrentPage.value[type] = clampPage(localCurrentPage.value[type], totalPages)
  } else {
    const totalPages = Math.max(1, Math.ceil(cloudModels.value[type].length / cloudPageSize.value[type]))
    cloudCurrentPage.value[type] = clampPage(cloudCurrentPage.value[type], totalPages)
  }
}

const loadLocalModels = async (type: ModelTabType) => {
  localLoading.value[type] = true
  try {
    localModels.value[type] = await modelsApi.getLocalModels(type)
    syncPageBounds(type, 'local')
  } catch (error) {
    console.error(type === 'public' ? '获取公共本地模型列表失败:' : '获取私有本地模型列表失败:', error)
    localModels.value[type] = []
    syncPageBounds(type, 'local')
  } finally {
    localLoading.value[type] = false
  }
}

const loadCloudModels = async (type: ModelTabType) => {
  if (!cloudCredentials.value) {
    cloudModels.value[type] = []
    syncPageBounds(type, 'cloud')
    return
  }

  cloudLoading.value[type] = true
  try {
    cloudModels.value[type] = await modelsApi.getCloudModels(buildCloudRequest(type))
    syncPageBounds(type, 'cloud')
  } catch (error) {
    console.error(type === 'public' ? '获取公共云端模型列表失败:' : '获取私有云端模型列表失败:', error)
    cloudModels.value[type] = []
    syncPageBounds(type, 'cloud')
    throw error
  } finally {
    cloudLoading.value[type] = false
  }
}

const openCloudLoginDialog = () => {
  cloudLoginError.value = ''
  showCloudLoginDialog.value = true
}

const handleCloudLogin = async () => {
  cloudLoggingIn.value = true
  cloudLoginError.value = ''
  try {
    const credentials = await modelsApi.loginCloud(cloudLoginForm.value)
    cloudCredentials.value = credentials
    persistCloudCredentials(credentials)
    showCloudLoginDialog.value = false
    cloudCurrentPage.value.public = 1
    cloudCurrentPage.value.private = 1
    await Promise.all([loadCloudModels('public'), loadCloudModels('private')])
  } catch (error: any) {
    cloudLoginError.value = error?.error || error?.message || '登录失败'
  } finally {
    cloudLoggingIn.value = false
  }
}

const handleDeleteLocal = async (name: string, type: ModelTabType) => {
  const label = type === 'public' ? '公共' : '私有'
  if (!confirm(`确定删除${label}本地模型「${name}」？此操作不可恢复。`)) {
    return
  }

  deletingLocal.value[type] = name
  try {
    await modelsApi.deleteLocalModel(name, type)
    await loadLocalModels(type)
  } catch (error: any) {
    alert(error?.error || error?.message || '删除失败')
  } finally {
    deletingLocal.value[type] = null
  }
}

const handleSyncCloudModel = async (name: string, type: ModelTabType) => {
  if (!cloudCredentials.value) {
    alert('请先登录云端模型')
    return
  }

  syncingCloud.value[type] = name
  try {
    await modelsApi.syncCloudModelToLocal(name, buildCloudRequest(type))
    await loadLocalModels(type)
  } catch (error: any) {
    alert(error?.error || error?.message || '同步失败')
  } finally {
    syncingCloud.value[type] = null
  }
}

const handleCloudRefresh = async (type: ModelTabType) => {
  try {
    await loadCloudModels(type)
  } catch (error: any) {
    alert(error?.error || error?.message || '刷新失败')
  }
}

const handleLocalPageChange = (type: ModelTabType, page: number) => {
  localCurrentPage.value[type] = page
}

const handleCloudPageChange = (type: ModelTabType, page: number) => {
  cloudCurrentPage.value[type] = page
}

watch(localActiveTab, (type) => {
  syncPageBounds(type, 'local')
})
watch(cloudActiveTab, (type) => {
  syncPageBounds(type, 'cloud')
})
watch(localPageSize, () => {
  syncPageBounds('public', 'local')
  syncPageBounds('private', 'local')
}, { deep: true })
watch(cloudPageSize, () => {
  syncPageBounds('public', 'cloud')
  syncPageBounds('private', 'cloud')
}, { deep: true })

onMounted(async () => {
  await Promise.all([loadLocalModels('public'), loadLocalModels('private')])

  const restoredCredentials = restoreCloudCredentials()
  if (!restoredCredentials) {
    return
  }

  cloudCredentials.value = restoredCredentials
  cloudLoginForm.value.consoleUrl = restoredCredentials.consoleUrl

  try {
    await Promise.all([loadCloudModels('public'), loadCloudModels('private')])
  } catch (error) {
    console.error('恢复云端模型列表失败:', error)
    cloudCredentials.value = null
    cloudModels.value = {
      public: [],
      private: [],
    }
    clearPersistedCloudCredentials()
  }
})
</script>
