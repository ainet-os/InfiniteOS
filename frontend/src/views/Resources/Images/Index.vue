<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {{ $t('pages.images.title') }}
        </h1>
        <p class="mt-1 text-gray-600 dark:text-gray-400">
          {{ $t('pages.images.description') }}
        </p>
      </div>

      <div
        v-if="showCloudLoginDialog"
        class="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 dark:bg-black/70"
        @click.self="showCloudLoginDialog = false"
      >
        <div class="m-4 w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-gray-800">
          <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">登录云端镜像</h2>
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

      <div
        v-if="showCloudUploadDialog"
        class="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 dark:bg-black/70"
        @click.self="closeCloudUploadDialog"
      >
        <div class="m-4 w-full max-w-xl rounded-lg bg-white shadow-xl dark:bg-gray-800">
          <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">上传云端镜像</h2>
            <button
              @click="closeCloudUploadDialog"
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

          <form class="space-y-4 p-6" @submit.prevent="handleCloudUpload">
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                本地镜像
              </label>
              <select
                v-model="cloudUploadForm.sourceImage"
                @change="handleUploadSourceChange"
                class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
              >
                <option value="">请选择本地镜像</option>
                <option
                  v-for="image in uploadableLocalImages"
                  :key="`upload-source-${getLocalImageKey(image)}`"
                  :value="getLocalImageLabel(image)"
                >
                  {{ getLocalImageLabel(image) }}
                </option>
              </select>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  目标仓库
                </label>
                <input
                  v-model.trim="cloudUploadForm.targetRepository"
                  type="text"
                  placeholder="例如 my-app"
                  class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                />
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  目标标签
                </label>
                <input
                  v-model.trim="cloudUploadForm.targetTag"
                  type="text"
                  placeholder="latest"
                  class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                />
              </div>
            </div>

            <div class="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
              <div class="mb-1 font-medium text-gray-700 dark:text-gray-200">目标地址</div>
              <div class="break-all font-mono text-xs">{{ cloudUploadTargetPreview || '-' }}</div>
            </div>

            <p v-if="cloudUploadError" class="text-sm text-error-500">{{ cloudUploadError }}</p>

            <div class="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <button
                type="button"
                @click="closeCloudUploadDialog"
                class="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="uploadingCloudImage"
                class="rounded-lg bg-brand-500 px-4 py-2 text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {{ uploadingCloudImage ? '上传中...' : '上传' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div class="max-w-6xl space-y-5">
        <section class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="border-b border-gray-200 px-5 py-3 dark:border-gray-700">
            <div class="flex items-center justify-between gap-4">
              <h2 class="text-lg font-medium text-gray-800 dark:text-white/90">本地镜像</h2>
              <button
                @click="loadLocalImages"
                :disabled="localLoading"
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {{ localLoading ? '刷新中...' : '刷新' }}
              </button>
            </div>
          </div>

          <div class="p-5 pt-4">
            <div v-if="localLoading" class="flex py-8 items-center justify-center text-center">
              <div>
                <div class="inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-brand-500"></div>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">加载中...</p>
              </div>
            </div>
            <div
              v-else-if="localImages.length === 0"
              class="flex items-center justify-center rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
            >
              暂无本地镜像
            </div>
            <div v-else class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
              <table class="w-full table-fixed">
                <colgroup>
                  <col class="w-[34%]" />
                  <col class="w-[16%]" />
                  <col class="w-[14%]" />
                  <col class="w-[20%]" />
                  <col class="w-[16%]" />
                </colgroup>
                <thead class="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th class="px-3 py-2 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">仓库</th>
                    <th class="px-3 py-2 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">标签</th>
                    <th class="px-3 py-2 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">大小</th>
                    <th class="px-3 py-2 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">镜像 ID</th>
                    <th class="px-3 py-2 text-right text-xs font-medium uppercase text-gray-600 dark:text-gray-400">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                  <tr
                    v-for="image in pagedLocalImages"
                    :key="`local-${image.id}-${image.repository}-${image.tag}`"
                    class="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <td class="truncate px-3 py-2 text-sm text-gray-800 dark:text-white/90" :title="image.repository">
                      {{ image.repository }}
                    </td>
                    <td class="truncate px-3 py-2 text-sm text-gray-600 dark:text-gray-400" :title="image.tag">
                      {{ image.tag }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                      {{ image.size }}
                    </td>
                    <td class="truncate px-3 py-2 font-mono text-sm text-gray-600 dark:text-gray-400" :title="image.id">
                      {{ image.id }}
                    </td>
                    <td class="px-3 py-2 text-right">
                      <button
                        @click="handleDeleteLocalImage(image)"
                        :disabled="deletingLocalImage === getLocalImageKey(image)"
                        class="min-w-[92px] rounded-lg bg-error-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-error-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-error-500 dark:hover:bg-error-600"
                      >
                        {{ deletingLocalImage === getLocalImageKey(image) ? '删除中...' : '删除' }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                每页
                <select
                  v-model.number="localPageSize"
                  class="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  <option v-for="size in pageSizeOptions" :key="`local-size-${size}`" :value="size">{{ size }}</option>
                </select>
                条，共 {{ localImages.length }} 条
              </label>

              <PaginationWithText
                :total-pages="localTotalPages"
                :initial-page="localCurrentPage"
                @page-change="handleLocalPageChange"
              />
            </div>
          </div>
        </section>

        <section class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="border-b border-gray-200 px-5 py-3 dark:border-gray-700">
            <div class="flex items-center justify-between gap-4">
              <div>
                <h2 class="text-lg font-medium text-gray-800 dark:text-white/90">云端镜像</h2>
                <p v-if="cloudCredentials?.scopeSummary" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {{ cloudCredentials.scopeSummary }}
                </p>
              </div>
              <div class="flex items-center gap-3">
                <span
                  v-if="cloudCredentials"
                  class="text-sm text-success-600 dark:text-success-400"
                >
                  已登录 {{ cloudCredentials.accountName || cloudCredentials.privateProject || '云端镜像' }}
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

          <div class="flex flex-wrap items-center justify-between gap-3 px-5 pt-3">
            <div class="flex gap-2">
              <button
                v-for="tab in cloudTabs"
                :key="`cloud-${tab.key}`"
                @click="cloudActiveTab = tab.key"
                :class="getTabButtonClass(cloudActiveTab === tab.key)"
              >
                {{ tab.label }}
              </button>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="cloudActiveTab === 'private'"
                @click="openCloudUploadDialog"
                :disabled="!cloudCredentials"
                class="rounded-lg bg-brand-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                上传
              </button>
              <button
                @click="handleCloudRefresh(cloudActiveTab)"
                :disabled="cloudLoading[cloudActiveTab] || !cloudCredentials"
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {{ cloudLoading[cloudActiveTab] ? '刷新中...' : '刷新' }}
              </button>
            </div>
          </div>

          <div class="p-5 pt-4">
            <div
              v-if="!cloudCredentials"
              class="flex items-center justify-center rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
            >
              请先登录云端镜像
            </div>
            <div v-else-if="cloudLoading[cloudActiveTab]" class="flex py-8 items-center justify-center text-center">
              <div>
                <div class="inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-brand-500"></div>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">加载中...</p>
              </div>
            </div>
            <div
              v-else-if="cloudImageGroups[cloudActiveTab].length === 0"
              class="flex items-center justify-center rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
            >
              {{ cloudActiveTab === 'public' ? '暂无公共云端镜像' : '暂无私有云端镜像' }}
            </div>
            <div v-else class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
              <table class="w-full table-fixed">
                <colgroup>
                  <col class="w-[32%]" />
                  <col class="w-[20%]" />
                  <col class="w-[12%]" />
                  <col class="w-[16%]" />
                  <col class="w-[20%]" />
                </colgroup>
                <thead class="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th class="px-3 py-2 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">仓库</th>
                    <th class="px-3 py-2 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">标签</th>
                    <th class="px-3 py-2 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">大小</th>
                    <th class="px-3 py-2 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">Digest</th>
                    <th class="px-3 py-2 text-right text-xs font-medium uppercase text-gray-600 dark:text-gray-400">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                  <tr
                    v-for="group in pagedCloudImageGroups"
                    :key="`cloud-${cloudActiveTab}-${group.repository}`"
                    class="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <td class="truncate px-3 py-2 text-sm text-gray-800 dark:text-white/90" :title="group.repository">
                      {{ group.repository }}
                    </td>
                    <td class="px-3 py-2">
                      <select
                        :value="getSelectedCloudTag(cloudActiveTab, group)"
                        @change="handleCloudTagChange(cloudActiveTab, group.repository, $event)"
                        class="min-w-[112px] max-w-[156px] rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:border-brand-400"
                      >
                        <option
                          v-for="image in group.images"
                          :key="`cloud-option-${group.repository}-${image.tag}-${image.digest}`"
                          :value="image.tag"
                        >
                          {{ formatCloudTag(image.tag) }}
                        </option>
                      </select>
                    </td>
                    <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                      {{ getSelectedCloudImage(cloudActiveTab, group)?.size || '-' }}
                    </td>
                    <td
                      class="truncate px-3 py-2 font-mono text-sm text-gray-600 dark:text-gray-400"
                      :title="getSelectedCloudImage(cloudActiveTab, group)?.digest || ''"
                    >
                      {{ truncateDigest(getSelectedCloudImage(cloudActiveTab, group)?.digest || '') }}
                    </td>
                    <td class="px-3 py-2 text-right">
                      <button
                        @click="handleSyncCloudImage(cloudActiveTab, group)"
                        :disabled="syncingCloudImage === getCloudImageSyncKey(cloudActiveTab, group)"
                        class="min-w-[92px] rounded-lg bg-brand-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {{ syncingCloudImage === getCloudImageSyncKey(cloudActiveTab, group) ? '同步中...' : '同步到本地' }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                每页
                <select
                  v-model.number="cloudPageSize[cloudActiveTab]"
                  class="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  <option v-for="size in pageSizeOptions" :key="`cloud-size-${size}`" :value="size">{{ size }}</option>
                </select>
                条，共 {{ cloudImageGroups[cloudActiveTab].length }} 个仓库
              </label>

              <PaginationWithText
                :total-pages="cloudTotalPages"
                :initial-page="cloudCurrentPage[cloudActiveTab]"
                @page-change="(page) => handleCloudPageChange(cloudActiveTab, page)"
              />
            </div>
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
import { imagesApi } from '@/api/images'
import type {
  CloudImage,
  CloudImageCredentials,
  CloudImageRequest,
  ImageCloudTabType,
  LocalImage,
} from '@/api/images'

interface CloudImageGroup {
  repository: string
  images: CloudImage[]
}

const { t: $t } = useI18n()
const CLOUD_IMAGE_CREDENTIALS_STORAGE_KEY = 'infiniteos-cloud-image-credentials'

const cloudTabs: Array<{ key: ImageCloudTabType; label: string }> = [
  { key: 'public', label: '公共' },
  { key: 'private', label: '私有' },
]
const pageSizeOptions = [10, 20, 50, 100]

const localImages = ref<LocalImage[]>([])
const localLoading = ref(false)
const localCurrentPage = ref(1)
const localPageSize = ref(10)
const deletingLocalImage = ref<string | null>(null)

const cloudActiveTab = ref<ImageCloudTabType>('public')
const showCloudLoginDialog = ref(false)
const showCloudUploadDialog = ref(false)
const cloudLoggingIn = ref(false)
const cloudLoginError = ref('')
const cloudUploadError = ref('')
const cloudCredentials = ref<CloudImageCredentials | null>(null)
const cloudImages = ref<Record<ImageCloudTabType, CloudImage[]>>({
  public: [],
  private: [],
})
const cloudLoading = ref<Record<ImageCloudTabType, boolean>>({
  public: false,
  private: false,
})
const syncingCloudImage = ref<string | null>(null)
const uploadingCloudImage = ref(false)
const cloudCurrentPage = ref<Record<ImageCloudTabType, number>>({ public: 1, private: 1 })
const cloudPageSize = ref<Record<ImageCloudTabType, number>>({ public: 10, private: 10 })
const selectedCloudTags = ref<Record<ImageCloudTabType, Record<string, string>>>({
  public: {},
  private: {},
})

const cloudLoginForm = ref({
  consoleUrl: 'https://console.ainet.uno',
  email: '',
  password: '',
})

const cloudUploadForm = ref({
  sourceImage: '',
  targetRepository: '',
  targetTag: 'latest',
})

const getTabButtonClass = (isActive: boolean) =>
  [
    'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-500 text-white dark:bg-brand-500'
      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
  ].join(' ')

const clampPage = (page: number, totalPages: number) => {
  if (totalPages <= 0) return 1
  return Math.min(Math.max(page, 1), totalPages)
}

const localTotalPages = computed(() => Math.max(1, Math.ceil(localImages.value.length / localPageSize.value)))
const pagedLocalImages = computed(() => {
  const start = (localCurrentPage.value - 1) * localPageSize.value
  return localImages.value.slice(start, start + localPageSize.value)
})
const uploadableLocalImages = computed(() =>
  localImages.value.filter((image) => {
    if (image.repository && image.repository !== '<none>' && image.tag && image.tag !== '<none>') {
      return true
    }

    return Boolean(image.id)
  }),
)

const groupCloudImages = (images: CloudImage[]): CloudImageGroup[] => {
  const grouped = new Map<string, CloudImage[]>()

  images.forEach((image) => {
    const group = grouped.get(image.repository) || []
    group.push(image)
    grouped.set(image.repository, group)
  })

  return Array.from(grouped.entries())
    .map(([repository, groupImages]) => ({
      repository,
      images: [...groupImages].sort((left, right) => {
        const byTag = (left.tag || '').localeCompare(right.tag || '')
        return byTag === 0 ? (left.digest || '').localeCompare(right.digest || '') : byTag
      }),
    }))
    .sort((left, right) => left.repository.localeCompare(right.repository))
}

const cloudImageGroups = computed<Record<ImageCloudTabType, CloudImageGroup[]>>(() => ({
  public: groupCloudImages(cloudImages.value.public),
  private: groupCloudImages(cloudImages.value.private),
}))

const cloudTotalPages = computed(() => {
  const size = cloudPageSize.value[cloudActiveTab.value]
  return Math.max(1, Math.ceil(cloudImageGroups.value[cloudActiveTab.value].length / size))
})
const pagedCloudImageGroups = computed(() => {
  const type = cloudActiveTab.value
  const start = (cloudCurrentPage.value[type] - 1) * cloudPageSize.value[type]
  return cloudImageGroups.value[type].slice(start, start + cloudPageSize.value[type])
})
const cloudUploadTargetPreview = computed(() => {
  const credentials = cloudCredentials.value
  const repository = cloudUploadForm.value.targetRepository.trim()
  const tag = cloudUploadForm.value.targetTag.trim() || 'latest'
  if (!credentials || !credentials.privateProject || !repository) {
    return ''
  }

  return `${credentials.registryAlias || 'ainet.io'}/${credentials.privateProject}/${repository}:${tag}`
})

const syncLocalPageBounds = () => {
  localCurrentPage.value = clampPage(localCurrentPage.value, localTotalPages.value)
}

const syncSelectedCloudTags = (type: ImageCloudTabType) => {
  const nextSelection: Record<string, string> = {}

  cloudImageGroups.value[type].forEach((group) => {
    const current = selectedCloudTags.value[type][group.repository]
    nextSelection[group.repository] = group.images.some((image) => image.tag === current)
      ? (current || '')
      : (group.images[0]?.tag || '')
  })

  selectedCloudTags.value[type] = nextSelection
}

const syncCloudPageBounds = (type: ImageCloudTabType) => {
  const totalPages = Math.max(1, Math.ceil(cloudImageGroups.value[type].length / cloudPageSize.value[type]))
  cloudCurrentPage.value[type] = clampPage(cloudCurrentPage.value[type], totalPages)
}

const getLocalImageKey = (image: LocalImage) => `${image.id}-${image.repository}-${image.tag}`

const getLocalImageLabel = (image: LocalImage) => {
  if (image.repository && image.repository !== '<none>' && image.tag && image.tag !== '<none>') {
    return `${image.repository}:${image.tag}`
  }

  return image.id || image.repository
}

const truncateDigest = (digest: string) => {
  if (!digest) {
    return '-'
  }

  return digest.length > 22 ? `${digest.slice(0, 19)}...` : digest
}

const formatCloudTag = (tag: string) => tag || '-'

const getDefaultUploadRepository = (image: LocalImage | null) => {
  const repository = image?.repository || ''
  if (!repository || repository === '<none>') {
    return ''
  }

  const parts = repository.split('/').filter(Boolean)
  const lastPart = parts[parts.length - 1] || ''
  return lastPart.toLowerCase().replace(/[^a-z0-9._/-]+/g, '-').replace(/^[-./]+|[-./]+$/g, '') || lastPart
}

const getDefaultUploadTag = (image: LocalImage | null) => {
  const tag = image?.tag || ''
  return tag && tag !== '<none>' ? tag : 'latest'
}

const getUploadSourceImage = (image: LocalImage | null) => {
  if (!image) {
    return ''
  }

  return getLocalImageLabel(image)
}

const findLocalImageByLabel = (label: string) =>
  uploadableLocalImages.value.find((image) => getLocalImageLabel(image) === label) || null

const getSelectedCloudImage = (type: ImageCloudTabType, group: CloudImageGroup) => {
  const selectedTag = selectedCloudTags.value[type][group.repository]
  return group.images.find((image) => image.tag === selectedTag) || group.images[0] || null
}

const getSelectedCloudTag = (type: ImageCloudTabType, group: CloudImageGroup) =>
  getSelectedCloudImage(type, group)?.tag || ''

const getCloudImageSyncKey = (type: ImageCloudTabType, group: CloudImageGroup) =>
  `${type}:${getSelectedCloudImage(type, group)?.image || group.repository}`

const handleCloudTagChange = (type: ImageCloudTabType, repository: string, event: Event) => {
  const target = event.target as HTMLSelectElement | null
  if (!target) {
    return
  }

  selectedCloudTags.value[type] = {
    ...selectedCloudTags.value[type],
    [repository]: target.value,
  }
}

const handleSyncCloudImage = async (type: ImageCloudTabType, group: CloudImageGroup) => {
  const selectedImage = getSelectedCloudImage(type, group)
  if (!selectedImage) {
    alert('请选择镜像标签')
    return
  }

  const syncKey = getCloudImageSyncKey(type, group)
  syncingCloudImage.value = syncKey
  try {
    await imagesApi.syncCloudImageToLocal(selectedImage)
    await loadLocalImages()
  } catch (error: any) {
    alert(error?.error || error?.message || '同步失败')
  } finally {
    syncingCloudImage.value = null
  }
}

const applyUploadDefaults = (image: LocalImage | null) => {
  cloudUploadForm.value.sourceImage = getUploadSourceImage(image)
  cloudUploadForm.value.targetRepository = getDefaultUploadRepository(image)
  cloudUploadForm.value.targetTag = getDefaultUploadTag(image)
}

const openCloudUploadDialog = () => {
  if (!cloudCredentials.value) {
    alert('请先登录云端镜像')
    return
  }

  cloudUploadError.value = ''
  const currentImage = findLocalImageByLabel(cloudUploadForm.value.sourceImage) || uploadableLocalImages.value[0] || null
  applyUploadDefaults(currentImage)
  showCloudUploadDialog.value = true
}

const closeCloudUploadDialog = () => {
  if (uploadingCloudImage.value) {
    return
  }

  showCloudUploadDialog.value = false
  cloudUploadError.value = ''
}

const handleUploadSourceChange = () => {
  const image = findLocalImageByLabel(cloudUploadForm.value.sourceImage)
  if (!image) {
    cloudUploadForm.value.targetRepository = ''
    cloudUploadForm.value.targetTag = 'latest'
    return
  }

  cloudUploadForm.value.targetRepository = getDefaultUploadRepository(image)
  cloudUploadForm.value.targetTag = getDefaultUploadTag(image)
}

const handleCloudUpload = async () => {
  if (!cloudCredentials.value) {
    cloudUploadError.value = '请先登录云端镜像'
    return
  }

  const sourceImage = cloudUploadForm.value.sourceImage.trim()
  const targetRepository = cloudUploadForm.value.targetRepository.trim()
  const targetTag = cloudUploadForm.value.targetTag.trim() || 'latest'

  if (!sourceImage) {
    cloudUploadError.value = '请选择本地镜像'
    return
  }

  if (!targetRepository) {
    cloudUploadError.value = '目标仓库不能为空'
    return
  }

  uploadingCloudImage.value = true
  cloudUploadError.value = ''
  try {
    await imagesApi.uploadCloudImage({
      ...cloudCredentials.value,
      sourceImage,
      targetRepository,
      targetTag,
    })
    showCloudUploadDialog.value = false
    cloudCurrentPage.value.private = 1
    await loadCloudImages('private')
  } catch (error: any) {
    cloudUploadError.value = error?.error || error?.message || '上传失败'
  } finally {
    uploadingCloudImage.value = false
  }
}

const persistCloudCredentials = (credentials: CloudImageCredentials) => {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(CLOUD_IMAGE_CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials))
}

const clearPersistedCloudCredentials = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(CLOUD_IMAGE_CREDENTIALS_STORAGE_KEY)
}

const restoreCloudCredentials = (): CloudImageCredentials | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.sessionStorage.getItem(CLOUD_IMAGE_CREDENTIALS_STORAGE_KEY)
  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue)
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.registryUrl !== 'string' ||
      typeof parsed.registryHost !== 'string' ||
      typeof parsed.privateProject !== 'string' ||
      !Array.isArray(parsed.publicProjects) ||
      typeof parsed.robotUsername !== 'string' ||
      typeof parsed.apiKey !== 'string'
    ) {
      throw new Error('invalid credentials')
    }

    return {
      consoleUrl: typeof parsed.consoleUrl === 'string' ? parsed.consoleUrl : 'https://console.ainet.uno',
      accountName: typeof parsed.accountName === 'string' ? parsed.accountName : '',
      registryUrl: parsed.registryUrl,
      registryHost: parsed.registryHost,
      registryAlias: typeof parsed.registryAlias === 'string' ? parsed.registryAlias : 'ainet.io',
      privateProject: parsed.privateProject,
      publicProjects: parsed.publicProjects,
      robotUsername: parsed.robotUsername,
      apiKey: parsed.apiKey,
      scopeSummary: typeof parsed.scopeSummary === 'string' ? parsed.scopeSummary : '',
    }
  } catch (error) {
    console.error('恢复云端镜像登录信息失败:', error)
    clearPersistedCloudCredentials()
    return null
  }
}

const buildCloudRequest = (type: ImageCloudTabType): CloudImageRequest => {
  if (!cloudCredentials.value) {
    throw new Error('请先登录云端镜像')
  }

  return {
    ...cloudCredentials.value,
    type,
  }
}

const loadLocalImages = async () => {
  localLoading.value = true
  try {
    localImages.value = await imagesApi.getLocalImages()
    syncLocalPageBounds()
  } catch (error) {
    console.error('获取本地镜像列表失败:', error)
    localImages.value = []
    syncLocalPageBounds()
  } finally {
    localLoading.value = false
  }
}

const loadCloudImages = async (type: ImageCloudTabType) => {
  if (!cloudCredentials.value) {
    cloudImages.value[type] = []
    syncCloudPageBounds(type)
    return
  }

  cloudLoading.value[type] = true
  try {
    cloudImages.value[type] = await imagesApi.getCloudImages(buildCloudRequest(type))
    syncSelectedCloudTags(type)
    syncCloudPageBounds(type)
  } catch (error) {
    console.error(type === 'public' ? '获取公共云端镜像列表失败:' : '获取私有云端镜像列表失败:', error)
    cloudImages.value[type] = []
    syncSelectedCloudTags(type)
    syncCloudPageBounds(type)
    throw error
  } finally {
    cloudLoading.value[type] = false
  }
}

const openCloudLoginDialog = () => {
  cloudLoginError.value = ''
  cloudLoginForm.value.email = cloudCredentials.value?.accountName || cloudLoginForm.value.email
  cloudLoginForm.value.password = ''
  showCloudLoginDialog.value = true
}

const handleCloudLogin = async () => {
  cloudLoggingIn.value = true
  cloudLoginError.value = ''
  try {
    const credentials = await imagesApi.loginCloud(cloudLoginForm.value)
    cloudCredentials.value = credentials
    persistCloudCredentials(credentials)
    cloudLoginForm.value.email = credentials.accountName
    cloudLoginForm.value.password = ''
    showCloudLoginDialog.value = false
    cloudCurrentPage.value.public = 1
    cloudCurrentPage.value.private = 1
    try {
      await Promise.all([loadCloudImages('public'), loadCloudImages('private')])
    } catch (error: any) {
      alert(error?.error || error?.message || '获取云端镜像列表失败，请稍后刷新重试')
    }
  } catch (error: any) {
    cloudLoginError.value = error?.error || error?.message || '登录失败'
  } finally {
    cloudLoggingIn.value = false
  }
}

const handleDeleteLocalImage = async (image: LocalImage) => {
  const label = getLocalImageLabel(image)
  if (!confirm(`确定删除本地镜像「${label}」？此操作不可恢复。`)) {
    return
  }

  deletingLocalImage.value = getLocalImageKey(image)
  try {
    await imagesApi.deleteLocalImage(image)
    await loadLocalImages()
  } catch (error: any) {
    alert(error?.error || error?.message || '删除失败')
  } finally {
    deletingLocalImage.value = null
  }
}

const handleCloudRefresh = async (type: ImageCloudTabType) => {
  try {
    await loadCloudImages(type)
  } catch (error: any) {
    alert(error?.error || error?.message || '刷新失败')
  }
}

const handleLocalPageChange = (page: number) => {
  localCurrentPage.value = page
}

const handleCloudPageChange = (type: ImageCloudTabType, page: number) => {
  cloudCurrentPage.value[type] = page
}

watch(localPageSize, syncLocalPageBounds)
watch(cloudActiveTab, (type) => {
  syncCloudPageBounds(type)
})
watch(cloudPageSize, () => {
  syncCloudPageBounds('public')
  syncCloudPageBounds('private')
}, { deep: true })

onMounted(async () => {
  await loadLocalImages()

  const restoredCredentials = restoreCloudCredentials()
  if (!restoredCredentials) {
    return
  }

  cloudCredentials.value = restoredCredentials
  cloudLoginForm.value.consoleUrl = restoredCredentials.consoleUrl

  try {
    await Promise.all([loadCloudImages('public'), loadCloudImages('private')])
  } catch (error) {
    console.error('恢复云端镜像列表失败:', error)
    cloudImages.value = {
      public: [],
      private: [],
    }
  }
})
</script>
