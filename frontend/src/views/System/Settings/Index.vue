<template>
  <AdminLayout>
    <div class="p-6 space-y-8">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ $t('pages.settings.title') }}</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">{{ $t('pages.settings.description') }}</p>
      </div>

      <!-- InfiniteUno 配置 -->
      <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">{{ $t('pages.settings.infiniteUno') }}</h2>
        </div>
        <div class="p-6 space-y-6">
          <!-- 状态展示 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-white/[0.02] px-4 py-3">
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ $t('pages.settings.networkStatus') }}</span>
              <span :class="[
                'px-2 py-1 text-xs rounded font-medium',
                infiniteUnoStatus?.network === 'online' ? 'bg-success-500/10 text-success-500' : 'bg-gray-500/10 text-gray-500'
              ]">
                {{ infiniteUnoStatus?.network === 'online' ? $t('pages.settings.networkOnline') : $t('pages.settings.networkOffline') }}
              </span>
            </div>
            <div class="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-white/[0.02] px-4 py-3">
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ $t('pages.settings.poolStatus') }}</span>
              <span :class="[
                'px-2 py-1 text-xs rounded font-medium',
                infiniteUnoStatus?.pool === 'in' ? 'bg-success-500/10 text-success-500' : 'bg-gray-500/10 text-gray-500'
              ]">
                {{ infiniteUnoStatus?.pool === 'in' ? $t('pages.settings.poolIn') : $t('pages.settings.poolOut') }}
              </span>
            </div>
          </div>

          <!-- 配置表单 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('pages.settings.infiniteUnoAddress') }}</label>
              <input
                v-model="infiniteUnoForm.address"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                :placeholder="$t('pages.settings.addressPlaceholder')"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('pages.settings.tenantAdminEmail') }}</label>
              <input
                v-model="infiniteUnoForm.username"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('pages.settings.password') }}</label>
              <input
                v-model="infiniteUnoForm.password"
                type="password"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('pages.settings.authKey') }}</label>
              <input
                v-model="infiniteUnoForm.authKey"
                type="password"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                :placeholder="$t('pages.settings.authKeyPlaceholder')"
              />
            </div>
          </div>

          <div class="flex flex-wrap gap-3 items-center">
            <button
              @click="doJoinNetwork"
              :disabled="infiniteUnoLoading"
              class="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {{ infiniteUnoLoading ? $t('common.loading') : $t('pages.settings.joinNetwork') }}
            </button>
            <button
              @click="doJoinPool"
              :disabled="infiniteUnoLoading"
              class="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {{ infiniteUnoLoading ? $t('common.loading') : $t('pages.settings.joinPool') }}
            </button>
            <button
              @click="doLeaveNetwork"
              :disabled="infiniteUnoLoading"
              class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              {{ infiniteUnoLoading ? $t('common.loading') : $t('pages.settings.leaveNetwork') }}
            </button>
            <span v-if="networkMessage" class="text-sm text-gray-600 dark:text-gray-400">{{ networkMessage }}</span>
            <span v-if="networkError" class="text-sm text-danger-500">{{ networkError }}</span>
          </div>
          <!-- 组网执行日志 -->
          <div v-if="networkLogs.length > 0" class="mt-4">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('pages.settings.networkLogs') }}</p>
            <pre class="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-800 dark:text-gray-200 overflow-x-auto max-h-64 overflow-y-auto">{{ networkLogs.join('\n') }}</pre>
          </div>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {{ $t('pages.settings.networkStatusHint') }}
          </p>
        </div>
      </div>

      <!-- 节点类型配置 -->
      <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">{{ $t('pages.settings.nodeType') }}</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ $t('pages.settings.nodeTypeDesc') }}</p>
        </div>
        <div class="p-6">
          <div class="flex flex-wrap gap-4 items-center">
            <label
              v-for="opt in nodeTypeOptions"
              :key="opt.value"
              class="inline-flex items-center gap-2 cursor-pointer"
            >
              <input
                v-model="nodeTypeForm"
                type="radio"
                :value="opt.value"
                class="rounded-full border-gray-300 dark:border-gray-600 text-brand-500 focus:ring-brand-500"
              />
              <span class="text-gray-800 dark:text-white/90">{{ opt.label }}</span>
            </label>
          </div>
          <button
            @click="saveNodeType"
            :disabled="nodeTypeLoading"
            class="mt-4 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {{ nodeTypeLoading ? $t('common.saving') : $t('pages.settings.saveNodeType') }}
          </button>
        </div>
      </div>

      <!-- 授权配置 -->
      <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">{{ $t('pages.settings.license') }}</h2>
        </div>
        <div class="p-6 space-y-4">
          <div class="flex flex-wrap gap-6">
            <div>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ $t('pages.settings.version') }}：</span>
              <span class="text-gray-800 dark:text-white/90 font-medium">{{ licenseInfo?.version || '-' }}</span>
            </div>
            <div>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ $t('pages.settings.licenseInfo') }}：</span>
              <span v-if="!licenseInfo || licenseInfo.edition === 'community'" class="text-gray-800 dark:text-white/90 font-medium">
                {{ $t('pages.settings.communityEdition') }}，{{ $t('pages.settings.noExpiry') }}
              </span>
              <span v-else class="text-gray-800 dark:text-white/90 font-medium">
                {{ $t('pages.settings.enterpriseEdition') }}
                <template v-if="licenseInfo?.expiry">，{{ $t('pages.settings.validityPeriod') }}：{{ licenseInfo.expiry }}</template>
                <template v-else>，{{ $t('pages.settings.noExpiry') }}</template>
              </span>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <label class="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 cursor-pointer transition-colors inline-block">
              <input
                type="file"
                accept=".json,application/json"
                class="hidden"
                @change="onLicenseFileSelect"
              />
              {{ $t('pages.settings.uploadLicense') }}
            </label>
            <span v-if="licenseUploading" class="text-sm text-gray-500">{{ $t('common.uploading') }}</span>
            <span v-if="licenseError" class="text-sm text-danger-500">{{ licenseError }}</span>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { settingsApi, type InfiniteUnoStatus, type LicenseInfo } from '@/api/settings'

const { t } = useI18n()

const infiniteUnoStatus = ref<InfiniteUnoStatus | null>(null)
const infiniteUnoLoading = ref(false)
const networkMessage = ref('')
const networkError = ref('')
const networkLogs = ref<string[]>([])
const infiniteUnoForm = ref({
  address: 'https://infinite.ainet.uno',
  username: '',
  password: '',
  authKey: '',
})

const nodeTypeForm = ref('edge')
const nodeTypeLoading = ref(false)

const licenseInfo = ref<LicenseInfo | null>(null)
const licenseUploading = ref(false)
const licenseError = ref('')

const nodeTypeOptions = computed(() => [
  { value: 'cloud', label: t('pages.settings.nodeTypeCloud') },
  { value: 'edge', label: t('pages.settings.nodeTypeEdge') },
  { value: 'endpoint', label: t('pages.settings.nodeTypeEndpoint') },
])

async function loadInfiniteUno() {
  try {
    infiniteUnoStatus.value = await settingsApi.getInfiniteUno()
    infiniteUnoForm.value.address = infiniteUnoStatus.value?.config?.address || 'https://infinite.ainet.uno'
    infiniteUnoForm.value.username = infiniteUnoStatus.value?.config?.username ?? ''
    infiniteUnoForm.value.password = ''
    infiniteUnoForm.value.authKey = ''
  } catch (e) {
    console.error('loadInfiniteUno', e)
  }
}

async function doJoinNetwork() {
  networkMessage.value = ''
  networkError.value = ''
  networkLogs.value = []
  infiniteUnoLoading.value = true
  try {
    const res = await settingsApi.joinNetworkInfiniteUno()
    infiniteUnoStatus.value = res
    networkMessage.value = (res as { message?: string }).message || ''
    const logs = (res as { logs?: string[] }).logs
    if (Array.isArray(logs) && logs.length > 0) networkLogs.value = logs
  } catch (e: unknown) {
    const err = e as { error?: string }
    networkError.value = err?.error || String(e)
    networkLogs.value = networkLogs.value.length > 0 ? [...networkLogs.value, `错误: ${err?.error || String(e)}`] : [`错误: ${err?.error || String(e)}`]
  } finally {
    infiniteUnoLoading.value = false
  }
}

async function doJoinPool() {
  infiniteUnoLoading.value = true
  try {
    infiniteUnoStatus.value = await settingsApi.joinPoolInfiniteUno()
  } finally {
    infiniteUnoLoading.value = false
  }
}

async function doLeaveNetwork() {
  networkMessage.value = ''
  networkError.value = ''
  infiniteUnoLoading.value = true
  try {
    const res = await settingsApi.leaveNetworkInfiniteUno()
    infiniteUnoStatus.value = res
    networkMessage.value = (res as { message?: string }).message || ''
  } catch (e: unknown) {
    const err = e as { error?: string }
    networkError.value = err?.error || String(e)
  } finally {
    infiniteUnoLoading.value = false
  }
}

async function loadNodeType() {
  try {
    const res = await settingsApi.getNodeType()
    nodeTypeForm.value = res?.nodeType || 'edge'
  } catch (e) {
    console.error('loadNodeType', e)
  }
}

async function saveNodeType() {
  nodeTypeLoading.value = true
  try {
    await settingsApi.setNodeType(nodeTypeForm.value)
  } finally {
    nodeTypeLoading.value = false
  }
}

async function loadLicense() {
  try {
    licenseInfo.value = await settingsApi.getLicense()
  } catch (e) {
    console.error('loadLicense', e)
  }
}

function onLicenseFileSelect(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  licenseError.value = ''
  licenseUploading.value = true
  settingsApi
    .uploadLicense(file)
    .then((info) => {
      licenseInfo.value = info
    })
    .catch((err) => {
      licenseError.value = err?.error || err?.message || 'Upload failed'
    })
    .finally(() => {
      licenseUploading.value = false
      input.value = ''
    })
}

onMounted(() => {
  loadInfiniteUno()
  loadNodeType()
  loadLicense()
})
</script>
