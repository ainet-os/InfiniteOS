<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ $t('pages.storage.title') }}</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">{{ $t('pages.storage.description') }}</p>
      </div>

      <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div class="p-6">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">{{ $t('common.diskList') }}</h2>
          <div v-if="loading" class="text-center py-12">
            <p class="text-gray-600 dark:text-gray-400">{{ $t('common.loading') }}</p>
          </div>
          <div v-else-if="disks.length === 0" class="text-center py-12">
            <p class="text-gray-600 dark:text-gray-400">{{ $t('common.noDisks') }}</p>
          </div>
          <table v-else class="w-full">
            <thead class="bg-gray-50 dark:bg-white/[0.02]">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.device') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase w-[300px]">{{ $t('common.mountpoint') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.filesystem') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.totalCapacity') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.used') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.usage') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
              <tr v-for="disk in pagedDisks" :key="disk.device" class="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <td class="px-6 py-4 text-sm text-gray-800 dark:text-white/90">{{ disk.device }}</td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-[300px] break-words">{{ disk.mountpoint || '-' }}</td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ disk.fstype || '-' }}</td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ disk.size || '-' }}</td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ disk.used || '-' }}</td>
                <td class="px-6 py-4 text-sm">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        class="bg-brand-500 h-2 rounded-full"
                        :style="{ width: disk.usage + '%' }"
                      ></div>
                    </div>
                    <span class="text-sm text-gray-600 dark:text-gray-400">{{ disk.usage || 0 }}%</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex gap-2">
                    <button
                      v-if="disk.mountpoint && disk.mountpoint !== '-'"
                      @click="openUnmountDialog(disk)"
                      class="px-3 py-1 text-xs rounded bg-warning-500/10 text-warning-500 hover:bg-warning-500/20 transition-colors"
                    >
                      {{ $t('common.unmount') }}
                    </button>
                    <button
                      v-else
                      @click="openMountDialog(disk)"
                      class="px-3 py-1 text-xs rounded bg-success-500/10 text-success-500 hover:bg-success-500/20 transition-colors"
                    >
                      {{ $t('common.mount') }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <ListPagination
            v-if="disks.length > 0"
            :total-items="diskTotalItems"
            :total-pages="diskTotalPages"
            :current-page="diskCurrentPage"
            :page-size="diskPageSize"
            :page-size-options="diskPageSizeOptions"
            @page-change="setDiskPage"
            @page-size-change="diskPageSize = $event"
          />
        </div>
      </div>
    </div>

    <!-- 挂载对话框 -->
    <div
      v-if="showMountDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000]"
      @click.self="closeMountDialog"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div class="p-6">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90 mb-4">挂载文件系统</h2>
          
          <form @submit.prevent="handleMount" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                设备
              </label>
              <input
                :value="mountForm.device"
                type="text"
                disabled
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                挂载点 <span class="text-danger-500">*</span>
              </label>
              <input
                v-model="mountForm.mountPoint"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="例如: /mnt/data"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                文件系统类型
              </label>
              <select
                v-model="mountForm.fsType"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="auto">自动检测</option>
                <option value="ext4">ext4</option>
                <option value="ext3">ext3</option>
                <option value="xfs">xfs</option>
                <option value="ntfs">ntfs</option>
                <option value="vfat">vfat</option>
              </select>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button
                type="button"
                @click="closeMountDialog"
                class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="mounting"
                class="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ mounting ? $t('common.mounting') : $t('common.mount') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 卸载对话框 -->
    <div
      v-if="showUnmountDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000]"
      @click.self="closeUnmountDialog"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div class="p-6">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90 mb-4">卸载文件系统</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            确定要卸载 <strong>{{ unmountTarget?.mountpoint }}</strong> 吗？
          </p>
          <div class="flex justify-end gap-3">
            <button
              @click="closeUnmountDialog"
              class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              @click="handleUnmount"
              :disabled="unmounting"
              class="px-4 py-2 bg-warning-500 text-white rounded-lg hover:bg-warning-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ unmounting ? $t('common.unmounting') : $t('common.unmount') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '@/components/layout/AdminLayout.vue'
import ListPagination from '@/components/ui/pagination/ListPagination.vue'
import { usePagination } from '@/composables/usePagination'
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storageApi } from '@/api/storage'
import type { StorageDisk } from '@/api/storage'

const { t: $t } = useI18n()
const loading = ref(false)
const disks = ref<Array<{
  device: string
  mountpoint: string
  fstype: string
  size: string
  used: string
  usage: number
}>>([])
const {
  currentPage: diskCurrentPage,
  pageSize: diskPageSize,
  pageSizeOptions: diskPageSizeOptions,
  totalItems: diskTotalItems,
  totalPages: diskTotalPages,
  pagedItems: pagedDisks,
  setPage: setDiskPage,
} = usePagination(disks)

// 对话框状态
const showMountDialog = ref(false)
const showUnmountDialog = ref(false)
const mountForm = ref({
  device: '',
  mountPoint: '',
  fsType: 'auto',
})
const unmountTarget = ref<{ mountpoint: string } | null>(null)
const mounting = ref(false)
const unmounting = ref(false)

// 格式化字节大小
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

let refreshInterval: number | undefined

// 加载存储磁盘
const loadDisks = async () => {
  loading.value = true
  try {
    const data = await storageApi.getDisks()
    disks.value = (data || []).map(disk => ({
      device: disk.device,
      mountpoint: disk.mount || '-',
      fstype: disk.type || '-',
      size: formatBytes(disk.size),
      used: formatBytes(disk.used),
      usage: disk.use || 0,
    }))
  } catch (error: any) {
    console.error('获取存储磁盘失败:', error)
    disks.value = []
    if (error?.error?.includes('未提供认证令牌') || error?.error?.includes('无效的认证令牌')) {
      return
    }
  } finally {
    loading.value = false
  }
}

// 打开挂载对话框
const openMountDialog = (disk: any) => {
  mountForm.value = {
    device: disk.device,
    mountPoint: '',
    fsType: 'auto',
  }
  showMountDialog.value = true
}

// 关闭挂载对话框
const closeMountDialog = () => {
  showMountDialog.value = false
}

// 打开卸载对话框
const openUnmountDialog = (disk: any) => {
  unmountTarget.value = { mountpoint: disk.mountpoint }
  showUnmountDialog.value = true
}

// 关闭卸载对话框
const closeUnmountDialog = () => {
  showUnmountDialog.value = false
  unmountTarget.value = null
}

// 挂载文件系统
const handleMount = async () => {
  mounting.value = true
  try {
    await storageApi.mountFilesystem({
      device: mountForm.value.device,
      mountPoint: mountForm.value.mountPoint,
      fsType: mountForm.value.fsType,
    })
    alert('文件系统挂载成功')
    closeMountDialog()
    await loadDisks()
  } catch (error: any) {
    console.error('挂载文件系统失败:', error)
    alert(error?.error || '挂载文件系统失败')
  } finally {
    mounting.value = false
  }
}

// 卸载文件系统
const handleUnmount = async () => {
  if (!unmountTarget.value) return

  unmounting.value = true
  try {
    await storageApi.unmountFilesystem({
      mountPoint: unmountTarget.value.mountpoint,
    })
    alert('文件系统卸载成功')
    closeUnmountDialog()
    await loadDisks()
  } catch (error: any) {
    console.error('卸载文件系统失败:', error)
    alert(error?.error || '卸载文件系统失败')
  } finally {
    unmounting.value = false
  }
}

onMounted(() => {
  loadDisks()
  
  refreshInterval = setInterval(() => {
    loadDisks()
  }, 30000) as unknown as number
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>
