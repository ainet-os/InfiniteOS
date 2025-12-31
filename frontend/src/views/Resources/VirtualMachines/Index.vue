<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ $t('pages.virtualMachines.title') }}</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">{{ $t('pages.virtualMachines.description') }}</p>
        </div>
        <button
          @click="showCreateDialog = true"
          class="px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 transition-colors flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          {{ $t('common.createVM') }}
        </button>
      </div>

      <!-- 创建虚拟机对话框 -->
      <div
        v-if="showCreateDialog"
        class="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 dark:bg-black/70"
        @click.self="showCreateDialog = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">{{ $t('common.createVM') }}</h2>
            <button
              @click="showCreateDialog = false"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleCreateVM" class="p-6 space-y-6">
            <!-- 基本信息 -->
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">基本信息</h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    虚拟机名称 <span class="text-error-500">*</span>
                  </label>
                  <input
                    v-model="createForm.name"
                    type="text"
                    required
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: vm-ubuntu-01"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    操作系统类型 <span class="text-error-500">*</span>
                  </label>
                  <select
                    v-model="createForm.osType"
                    required
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="">请选择操作系统</option>
                    <option value="linux">Linux</option>
                    <option value="windows">Windows</option>
                    <option value="other">其他</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    操作系统版本/发行版
                  </label>
                  <input
                    v-model="createForm.osVersion"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: Ubuntu 22.04 LTS"
                  />
                </div>
              </div>
            </div>

            <!-- 资源配置 -->
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">资源配置</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    vCPU 数量 <span class="text-error-500">*</span>
                  </label>
                  <input
                    v-model.number="createForm.vcpu"
                    type="number"
                    min="1"
                    max="32"
                    required
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="1-32"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    内存大小 <span class="text-error-500">*</span>
                  </label>
                  <div class="flex gap-2">
                    <input
                      v-model.number="createForm.memory"
                      type="number"
                      min="512"
                      step="512"
                      required
                      class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      placeholder="512"
                    />
                    <select
                      v-model="createForm.memoryUnit"
                      class="w-24 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    >
                      <option value="MB">MB</option>
                      <option value="GB">GB</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    磁盘大小 <span class="text-error-500">*</span>
                  </label>
                  <div class="flex gap-2">
                    <input
                      v-model.number="createForm.disk"
                      type="number"
                      min="1"
                      step="1"
                      required
                      class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      placeholder="20"
                    />
                    <select
                      v-model="createForm.diskUnit"
                      class="w-24 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    >
                      <option value="GB">GB</option>
                      <option value="TB">TB</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    网络类型
                  </label>
                  <select
                    v-model="createForm.networkType"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="default">默认网络 (NAT)</option>
                    <option value="bridge">桥接网络</option>
                    <option value="isolated">隔离网络</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- 高级选项 -->
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">高级选项</h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    启动方式
                  </label>
                  <select
                    v-model="createForm.bootMode"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="cdrom">从 CD/DVD 启动</option>
                    <option value="disk">从磁盘启动</option>
                    <option value="network">网络启动 (PXE)</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    安装介质/ISO 镜像路径
                  </label>
                  <input
                    v-model="createForm.isoPath"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: /var/lib/libvirt/images/ubuntu-22.04.iso"
                  />
                </div>

                <div class="flex items-center">
                  <input
                    v-model="createForm.startAfterCreate"
                    type="checkbox"
                    id="startAfterCreate"
                    class="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <label for="startAfterCreate" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    创建后立即启动
                  </label>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                @click="showCreateDialog = false"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                :disabled="creating"
                class="px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="creating">创建中...</span>
                <span v-else>创建虚拟机</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- 虚拟机列表 -->
      <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div class="p-6">
          <div v-if="vms.length === 0" class="text-center py-12">
            <p class="text-gray-600 dark:text-gray-400">{{ $t('common.noVMs') }}</p>
            <button
              @click="showCreateDialog = true"
              class="mt-4 px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 transition-colors"
            >
              {{ $t('common.createFirstVM') }}
            </button>
          </div>
          <div v-else class="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]">
            <table class="w-full min-w-[1000px]">
              <thead class="bg-gray-50 dark:bg-white/[0.02]">
                <tr>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">{{ $t('common.name') }}</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">{{ $t('common.status') }}</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">{{ $t('common.vcpu') }}</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">{{ $t('common.memory') }}</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">{{ $t('common.cpuUsage') }}</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">{{ $t('common.memoryUsage') }}</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">{{ $t('common.networkUsage') }}</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">{{ $t('common.actions') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                <tr v-for="vm in vms" :key="vm.name" class="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <td class="px-3 py-3 text-sm whitespace-nowrap">
                    <router-link
                      :to="`/virtual-machines/${vm.name}`"
                      class="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
                    >
                      {{ vm.name }}
                    </router-link>
                  </td>
                  <td class="px-3 py-3 whitespace-nowrap">
                    <span
                      :class="[
                        'px-2 py-0.5 text-xs rounded whitespace-nowrap',
                        vm.status === 'running'
                          ? 'bg-success-500/10 text-success-500'
                          : 'bg-gray-500/10 text-gray-500',
                      ]"
                    >
                      {{ vm.status === 'running' ? $t('common.running') : $t('common.stopped') }}
                    </span>
                  </td>
                  <td class="px-3 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{{ vm.cpu || '-' }}</td>
                  <td class="px-3 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{{ vm.memory || '-' }}</td>
                  <!-- CPU使用率 -->
                  <td class="px-3 py-3 whitespace-nowrap">
                    <div class="flex items-center gap-1.5 w-24">
                      <div class="flex-1 min-w-0">
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            class="bg-brand-500 h-1.5 rounded-full transition-all"
                            :style="{ width: (vm.cpuUsage || 0) + '%' }"
                          ></div>
                        </div>
                      </div>
                      <span class="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
                        {{ vm.cpuUsage || 0 }}%
                      </span>
                    </div>
                  </td>
                  <!-- 内存使用率 -->
                  <td class="px-3 py-3 whitespace-nowrap">
                    <div class="flex items-center gap-1.5 w-24">
                      <div class="flex-1 min-w-0">
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            class="bg-success-500 h-1.5 rounded-full transition-all"
                            :style="{ width: (vm.memoryUsage || 0) + '%' }"
                          ></div>
                        </div>
                      </div>
                      <span class="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
                        {{ vm.memoryUsage || 0 }}%
                      </span>
                    </div>
                  </td>
                  <!-- 网络使用率 -->
                  <td class="px-3 py-3 whitespace-nowrap">
                    <div class="flex items-center gap-1.5 w-24">
                      <div class="flex-1 min-w-0">
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            class="bg-warning-500 h-1.5 rounded-full transition-all"
                            :style="{ width: (vm.networkUsage || 0) + '%' }"
                          ></div>
                        </div>
                      </div>
                      <span class="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
                        {{ vm.networkUsage || 0 }}%
                      </span>
                    </div>
                  </td>
                  <td class="px-3 py-3 text-sm whitespace-nowrap">
                    <div class="flex gap-1 flex-wrap">
                      <button
                        v-if="vm.status !== 'running'"
                        @click="startVM(vm.name)"
                        class="px-2 py-1 text-xs bg-success-600 dark:bg-success-500 text-white rounded hover:bg-success-700 dark:hover:bg-success-600 transition-colors whitespace-nowrap"
                        :title="$t('common.start')"
                      >
                        {{ $t('common.start') }}
                      </button>
                      <button
                        v-if="vm.status === 'running'"
                        @click="stopVM(vm.name)"
                        class="px-2 py-1 text-xs bg-error-600 dark:bg-error-500 text-white rounded hover:bg-error-700 dark:hover:bg-error-600 transition-colors whitespace-nowrap"
                        :title="$t('common.stop')"
                      >
                        {{ $t('common.stop') }}
                      </button>
                      <button
                        @click="restartVM(vm.name)"
                        class="px-2 py-1 text-xs bg-warning-600 dark:bg-warning-500 text-white rounded hover:bg-warning-700 dark:hover:bg-warning-600 transition-colors whitespace-nowrap"
                        :title="$t('common.restart')"
                      >
                        {{ $t('common.restart') }}
                      </button>
                      <button
                        v-if="vm.status === 'running'"
                        @click="openConsole(vm.name)"
                        class="px-2 py-1 text-xs bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors whitespace-nowrap"
                        :title="$t('common.console')"
                      >
                        {{ $t('common.console') }}
                      </button>
                      <button
                        @click="deleteVM(vm.name)"
                        class="px-2 py-1 text-xs bg-error-600 dark:bg-error-500 text-white rounded hover:bg-error-700 dark:hover:bg-error-600 transition-colors whitespace-nowrap"
                        :title="$t('common.delete')"
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
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { virtualMachinesApi } from '@/api/virtualMachines'
import type { VirtualMachine } from '@/api/virtualMachines'

const router = useRouter()
const { t: $t } = useI18n()

const loading = ref(false)
const vms = ref<VirtualMachine[]>([])

// 刷新虚拟机列表
let refreshInterval: number | undefined

const refreshVMs = async () => {
  loading.value = true
  try {
    const data = await virtualMachinesApi.getVMs()
    vms.value = data || []
  } catch (error: any) {
    console.error('获取虚拟机列表失败:', error)
    vms.value = []
    // 如果是认证错误，响应拦截器应该已经处理了跳转
    if (error?.error?.includes('未提供认证令牌') || error?.error?.includes('无效的认证令牌')) {
      return
    }
  } finally {
    loading.value = false
  }
}

// 创建虚拟机对话框
const showCreateDialog = ref(false)
const creating = ref(false)

const createForm = ref({
  name: '',
  osType: '',
  osVersion: '',
  vcpu: 2,
  memory: 2,
  memoryUnit: 'GB',
  disk: 20,
  diskUnit: 'GB',
  networkType: 'default',
  bootMode: 'cdrom',
  isoPath: '',
  startAfterCreate: false,
})

const handleCreateVM = async () => {
  if (!createForm.value.name || !createForm.value.osType) {
    alert('请填写必填项')
    return
  }

  creating.value = true

  try {
    await virtualMachinesApi.createVM({
      name: createForm.value.name,
      osType: createForm.value.osType,
      osVersion: createForm.value.osVersion,
      vcpu: createForm.value.vcpu,
      memory: createForm.value.memory,
      memoryUnit: createForm.value.memoryUnit as 'MB' | 'GB',
      disk: createForm.value.disk,
      diskUnit: createForm.value.diskUnit as 'GB' | 'TB',
      networkType: createForm.value.networkType,
      bootMode: createForm.value.bootMode,
      isoPath: createForm.value.isoPath,
      startAfterCreate: createForm.value.startAfterCreate,
    })

    // 重置表单
    createForm.value = {
      name: '',
      osType: '',
      osVersion: '',
      vcpu: 2,
      memory: 2,
      memoryUnit: 'GB',
      disk: 20,
      diskUnit: 'GB',
      networkType: 'default',
      bootMode: 'cdrom',
      isoPath: '',
      startAfterCreate: false,
    }

    showCreateDialog.value = false
    alert('虚拟机创建成功！')
    
    // 刷新列表
    await refreshVMs()
  } catch (error: any) {
    console.error('创建虚拟机失败:', error)
    alert(error?.error || '创建虚拟机失败，请重试')
  } finally {
    creating.value = false
  }
}

const startVM = async (name: string) => {
  try {
    await virtualMachinesApi.startVM(name)
    alert('虚拟机启动成功')
    await refreshVMs()
  } catch (error: any) {
    console.error('启动虚拟机失败:', error)
    // 提取错误信息：可能是 error.error 或 error.message 或直接是字符串
    const errorMsg = error?.error || error?.message || (typeof error === 'string' ? error : '启动虚拟机失败')
    alert(`启动虚拟机失败: ${errorMsg}`)
  }
}

const stopVM = async (name: string) => {
  try {
    await virtualMachinesApi.stopVM(name)
    alert('虚拟机停止成功')
    await refreshVMs()
  } catch (error: any) {
    console.error('停止虚拟机失败:', error)
    alert(error?.error || '停止虚拟机失败')
  }
}

const restartVM = async (name: string) => {
  try {
    await virtualMachinesApi.restartVM(name)
    alert('虚拟机重启成功')
    await refreshVMs()
  } catch (error: any) {
    console.error('重启虚拟机失败:', error)
    alert(error?.error || '重启虚拟机失败')
  }
}

const deleteVM = async (name: string) => {
  if (confirm(`${$t('common.confirmDeleteVM')} ${name} ${$t('common.questionMark')}`)) {
    try {
      await virtualMachinesApi.deleteVM(name)
      alert('虚拟机删除成功')
      await refreshVMs()
    } catch (error: any) {
      console.error('删除虚拟机失败:', error)
      alert(error?.error || '删除虚拟机失败')
    }
  }
}

const openConsole = async (name: string) => {
  try {
    // 获取控制台信息
    const consoleInfo = await virtualMachinesApi.getVMConsole(name)

    // 在新标签页中打开
    const url = consoleInfo?.consoleUrl || `/virtual-machines/${name}/console`
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (error: any) {
    console.error('打开控制台失败:', error)
    const errorMsg = error?.error || error?.message || (typeof error === 'string' ? error : '打开控制台失败')
    alert(`打开控制台失败: ${errorMsg}`)
  }
}

onMounted(() => {
  // 立即加载数据
  refreshVMs()
  
  // 每30秒刷新一次数据
  refreshInterval = setInterval(() => {
    refreshVMs()
  }, 30000) as unknown as number
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>
