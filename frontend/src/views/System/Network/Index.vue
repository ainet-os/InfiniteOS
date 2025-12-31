<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ $t('pages.network.title') }}</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">{{ $t('pages.network.description') }}</p>
        </div>
        <button
          @click="openCreateDialog"
          class="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700 transition-colors"
        >
          <span class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            {{ $t('common.createNetwork') }}
          </span>
        </button>
      </div>

      <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div class="p-6">
          <div v-if="loading" class="text-center py-12">
            <p class="text-gray-600 dark:text-gray-400">{{ $t('common.loading') }}</p>
          </div>
          <div v-else-if="interfaces.length === 0" class="text-center py-12">
            <p class="text-gray-600 dark:text-gray-400">{{ $t('common.noNetworkInterfaces') }}</p>
          </div>
          <table v-else class="w-full">
            <thead class="bg-gray-50 dark:bg-white/[0.02]">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.interfaceName') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.ipAddress') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.status') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.type') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
              <tr v-for="iface in interfaces" :key="iface.name" class="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <td class="px-6 py-4 text-sm text-gray-800 dark:text-white/90">{{ iface.name }}</td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ iface.ip || '-' }}</td>
                <td class="px-6 py-4">
                  <span :class="[
                    'px-2 py-1 text-xs rounded',
                    iface.status === 'up' ? 'bg-success-500/10 text-success-500' : 'bg-gray-500/10 text-gray-500'
                  ]">
                    {{ iface.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ iface.type }}</td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <button
                      @click="toggleInterfaceStatus(iface)"
                      :class="[
                        'px-3 py-1 text-xs rounded transition-colors',
                        iface.status === 'up'
                          ? 'bg-warning-500/10 text-warning-500 hover:bg-warning-500/20'
                          : 'bg-success-500/10 text-success-500 hover:bg-success-500/20'
                      ]"
                    >
                      {{ iface.status === 'up' ? $t('common.disable') : $t('common.enable') }}
                    </button>
                    <button
                      @click="openEditDialog(iface)"
                      class="px-3 py-1 text-xs rounded bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition-colors"
                    >
                      {{ $t('common.edit') }}
                    </button>
                    <button
                      @click="openDeleteDialog(iface)"
                      class="px-3 py-1 text-xs rounded bg-danger-500/10 text-danger-500 hover:bg-danger-500/20 transition-colors"
                    >
                      {{ $t('common.delete') }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 创建网络对话框 -->
    <div
      v-if="showCreateDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000]"
      @click.self="closeCreateDialog"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div class="p-6">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90 mb-4">创建网络连接</h2>
          
          <form @submit.prevent="handleCreate" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                接口名称 <span class="text-danger-500">*</span>
              </label>
              <input
                v-model="createForm.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="例如: eth0, ens33"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                连接类型
              </label>
              <select
                v-model="createForm.type"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="ethernet">以太网</option>
                <option value="wifi">WiFi</option>
                <option value="bridge">网桥</option>
                <option value="bond">绑定</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                配置方式
              </label>
              <select
                v-model="createForm.method"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                @change="onMethodChange"
              >
                <option value="auto">自动 (DHCP)</option>
                <option value="static">静态 IP</option>
              </select>
            </div>

            <div v-if="createForm.method === 'static'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                IP 地址 <span class="text-danger-500">*</span>
              </label>
              <input
                v-model="createForm.ip4"
                type="text"
                :required="createForm.method === 'static'"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="例如: 192.168.1.100/24"
              />
            </div>

            <div v-if="createForm.method === 'static'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                网关
              </label>
              <input
                v-model="createForm.gateway"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="例如: 192.168.1.1"
              />
            </div>

            <div v-if="createForm.method === 'static'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                DNS 服务器（逗号分隔）
              </label>
              <input
                v-model="createForm.dnsStr"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="例如: 8.8.8.8, 8.8.4.4"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                MAC 地址
              </label>
              <input
                v-model="createForm.mac"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="例如: 00:11:22:33:44:55"
              />
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button
                type="button"
                @click="closeCreateDialog"
                class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="creating"
                class="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ creating ? '创建中...' : '创建' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 编辑网络对话框 -->
    <div
      v-if="showEditDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000]"
      @click.self="closeEditDialog"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div class="p-6">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90 mb-4">编辑网络连接</h2>
          
          <form @submit.prevent="handleUpdate" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                接口名称
              </label>
              <input
                :value="editForm.name"
                type="text"
                disabled
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                配置方式
              </label>
              <select
                v-model="editForm.method"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                @change="onEditMethodChange"
              >
                <option value="auto">自动 (DHCP)</option>
                <option value="static">静态 IP</option>
              </select>
            </div>

            <div v-if="editForm.method === 'static'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                IP 地址 <span class="text-danger-500">*</span>
              </label>
              <input
                v-model="editForm.ip4"
                type="text"
                :required="editForm.method === 'static'"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="例如: 192.168.1.100/24"
              />
            </div>

            <div v-if="editForm.method === 'static'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                网关
              </label>
              <input
                v-model="editForm.gateway"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="例如: 192.168.1.1"
              />
            </div>

            <div v-if="editForm.method === 'static'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                DNS 服务器（逗号分隔）
              </label>
              <input
                v-model="editForm.dnsStr"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="例如: 8.8.8.8, 8.8.4.4"
              />
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button
                type="button"
                @click="closeEditDialog"
                class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="updating"
                class="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ updating ? '更新中...' : '更新' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <div
      v-if="showDeleteDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000]"
      @click.self="closeDeleteDialog"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div class="p-6">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90 mb-4">删除网络连接</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            确定要删除网络连接 <strong>{{ deleteTarget?.name }}</strong> 吗？此操作不可恢复。
          </p>
          <div class="flex justify-end gap-3">
            <button
              @click="closeDeleteDialog"
              class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              @click="handleDelete"
              :disabled="deleting"
              class="px-4 py-2 bg-danger-500 text-white rounded-lg hover:bg-danger-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ deleting ? '删除中...' : '删除' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { networkApi } from '@/api/network'
import type { NetworkInterface, NetworkInterfaceDetails } from '@/api/network'

const { t: $t } = useI18n()
const loading = ref(false)
const interfaces = ref<NetworkInterface[]>([])

// 对话框状态
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)

// 表单数据
const createForm = ref({
  name: '',
  type: 'ethernet',
  method: 'auto' as 'auto' | 'static',
  ip4: '',
  gateway: '',
  dnsStr: '',
  mac: '',
})

const editForm = ref({
  name: '',
  method: 'auto' as 'auto' | 'static',
  ip4: '',
  gateway: '',
  dnsStr: '',
})

const deleteTarget = ref<NetworkInterface | null>(null)

// 操作状态
const creating = ref(false)
const updating = ref(false)
const deleting = ref(false)

let refreshInterval: number | undefined

// 加载网络接口
const loadInterfaces = async () => {
  loading.value = true
  try {
    const data = await networkApi.getInterfaces()
    interfaces.value = (data || []).map(iface => ({
      ...iface,
      ip: iface.ip4 || iface.ip6 || '-',
    }))
  } catch (error: any) {
    console.error('获取网络接口失败:', error)
    interfaces.value = []
    if (error?.error?.includes('未提供认证令牌') || error?.error?.includes('无效的认证令牌')) {
      return
    }
  } finally {
    loading.value = false
  }
}

// 打开创建对话框
const openCreateDialog = () => {
  createForm.value = {
    name: '',
    type: 'ethernet',
    method: 'auto',
    ip4: '',
    gateway: '',
    dnsStr: '',
    mac: '',
  }
  showCreateDialog.value = true
}

// 关闭创建对话框
const closeCreateDialog = () => {
  showCreateDialog.value = false
}

// 打开编辑对话框
const openEditDialog = async (iface: NetworkInterface) => {
  try {
    const details = await networkApi.getInterfaceDetails(iface.name)
    editForm.value = {
      name: details.name,
      method: details.method === 'dhcp' ? 'auto' : details.method,
      ip4: details.ip4 || '',
      gateway: details.gateway || '',
      dnsStr: details.dns.join(', ') || '',
    }
    showEditDialog.value = true
  } catch (error: any) {
    console.error('获取网络接口详情失败:', error)
    alert(error?.error || '获取网络接口详情失败')
  }
}

// 关闭编辑对话框
const closeEditDialog = () => {
  showEditDialog.value = false
}

// 打开删除对话框
const openDeleteDialog = (iface: NetworkInterface) => {
  deleteTarget.value = iface
  showDeleteDialog.value = true
}

// 关闭删除对话框
const closeDeleteDialog = () => {
  showDeleteDialog.value = false
  deleteTarget.value = null
}

// 配置方式改变
const onMethodChange = () => {
  if (createForm.value.method === 'auto') {
    createForm.value.ip4 = ''
    createForm.value.gateway = ''
    createForm.value.dnsStr = ''
  }
}

const onEditMethodChange = () => {
  if (editForm.value.method === 'auto') {
    editForm.value.ip4 = ''
    editForm.value.gateway = ''
    editForm.value.dnsStr = ''
  }
}

// 创建网络连接
const handleCreate = async () => {
  creating.value = true
  try {
    const dns = createForm.value.dnsStr
      ? createForm.value.dnsStr.split(',').map(d => d.trim()).filter(d => d)
      : []

    await networkApi.createInterface({
      name: createForm.value.name,
      type: createForm.value.type,
      method: createForm.value.method,
      ip4: createForm.value.method === 'static' ? createForm.value.ip4 : undefined,
      gateway: createForm.value.method === 'static' ? createForm.value.gateway : undefined,
      dns: createForm.value.method === 'static' && dns.length > 0 ? dns : undefined,
      mac: createForm.value.mac || undefined,
    })

    alert('网络连接创建成功')
    closeCreateDialog()
    await loadInterfaces()
  } catch (error: any) {
    console.error('创建网络连接失败:', error)
    alert(error?.error || '创建网络连接失败')
  } finally {
    creating.value = false
  }
}

// 更新网络连接
const handleUpdate = async () => {
  updating.value = true
  try {
    const dns = editForm.value.dnsStr
      ? editForm.value.dnsStr.split(',').map(d => d.trim()).filter(d => d)
      : []

    await networkApi.updateInterface(editForm.value.name, {
      method: editForm.value.method,
      ip4: editForm.value.method === 'static' ? editForm.value.ip4 : undefined,
      gateway: editForm.value.method === 'static' ? editForm.value.gateway : undefined,
      dns: editForm.value.method === 'static' && dns.length > 0 ? dns : undefined,
    })

    alert('网络连接更新成功')
    closeEditDialog()
    await loadInterfaces()
  } catch (error: any) {
    console.error('更新网络连接失败:', error)
    alert(error?.error || '更新网络连接失败')
  } finally {
    updating.value = false
  }
}

// 删除网络连接
const handleDelete = async () => {
  if (!deleteTarget.value) return

  deleting.value = true
  try {
    await networkApi.deleteInterface(deleteTarget.value.name)
    alert('网络连接删除成功')
    closeDeleteDialog()
    await loadInterfaces()
  } catch (error: any) {
    console.error('删除网络连接失败:', error)
    alert(error?.error || '删除网络连接失败')
  } finally {
    deleting.value = false
  }
}

// 切换网络接口状态
const toggleInterfaceStatus = async (iface: NetworkInterface) => {
  try {
    const enable = iface.status !== 'up'
    await networkApi.toggleInterface(iface.name, enable)
    await loadInterfaces()
  } catch (error: any) {
    console.error('切换网络接口状态失败:', error)
    alert(error?.error || '切换网络接口状态失败')
  }
}

onMounted(() => {
  loadInterfaces()
  
  refreshInterval = setInterval(() => {
    loadInterfaces()
  }, 30000) as unknown as number
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>
