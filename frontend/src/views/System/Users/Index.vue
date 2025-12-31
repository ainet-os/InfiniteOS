<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ $t('pages.users.title') }}</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">{{ $t('pages.users.description') }}</p>
        </div>
        <button
          @click="openCreateDialog"
          class="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700 transition-colors"
        >
          <span class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            {{ $t('common.create') }} {{ $t('menu.users') }}
          </span>
        </button>
      </div>

      <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div class="p-6">
          <div v-if="loading" class="text-center py-12">
            <p class="text-gray-600 dark:text-gray-400">{{ $t('common.loading') }}</p>
          </div>
          <div v-else-if="users.length === 0" class="text-center py-12">
            <p class="text-gray-600 dark:text-gray-400">{{ $t('common.noData') }}</p>
          </div>
          <table v-else class="w-full">
            <thead class="bg-gray-50 dark:bg-white/[0.02]">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.username') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.uid') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.gid') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.home') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.shell') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
              <tr v-for="user in users" :key="user.username" class="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <td class="px-6 py-4 text-sm text-gray-800 dark:text-white/90">{{ user.username }}</td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ user.uid }}</td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ user.gid }}</td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ user.home }}</td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ user.shell }}</td>
                <td class="px-6 py-4 text-sm">
                  <div class="flex gap-2">
                    <button
                      @click="openEditDialog(user)"
                      class="px-3 py-1 text-xs rounded bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition-colors"
                    >
                      {{ $t('common.edit') }}
                    </button>
                    <button
                      v-if="user.username !== 'root'"
                      @click="openDeleteDialog(user)"
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

    <!-- 创建用户对话框 -->
    <div
      v-if="showCreateDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000]"
      @click.self="closeCreateDialog"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div class="p-6">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90 mb-4">{{ $t('common.create') }} {{ $t('menu.users') }}</h2>
          
          <form @submit.prevent="handleCreate" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                用户名 <span class="text-danger-500">*</span>
              </label>
              <input
                v-model="createForm.username"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="例如: testuser"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                密码
              </label>
              <input
                v-model="createForm.password"
                type="password"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="留空则不设置密码"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                主目录
              </label>
              <input
                v-model="createForm.home"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="例如: /home/testuser"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shell
              </label>
              <select
                v-model="createForm.shell"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="/bin/bash">/bin/bash</option>
                <option value="/bin/sh">/bin/sh</option>
                <option value="/bin/zsh">/bin/zsh</option>
                <option value="/sbin/nologin">/sbin/nologin</option>
              </select>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button
                type="button"
                @click="closeCreateDialog"
                class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="creating"
                class="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ creating ? $t('common.creating') : $t('common.create') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 编辑用户对话框 -->
    <div
      v-if="showEditDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000]"
      @click.self="closeEditDialog"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div class="p-6">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90 mb-4">{{ $t('common.editUser') }}</h2>
          
          <form @submit.prevent="handleUpdate" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                用户名
              </label>
              <input
                :value="editForm.username"
                type="text"
                disabled
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                新密码（留空不修改）
              </label>
              <input
                v-model="editForm.password"
                type="password"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="留空则不修改密码"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                主目录
              </label>
              <input
                v-model="editForm.home"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="例如: /home/testuser"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shell
              </label>
              <select
                v-model="editForm.shell"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="/bin/bash">/bin/bash</option>
                <option value="/bin/sh">/bin/sh</option>
                <option value="/bin/zsh">/bin/zsh</option>
                <option value="/sbin/nologin">/sbin/nologin</option>
              </select>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button
                type="button"
                @click="closeEditDialog"
                class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {{ $t('common.cancel') }}
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
          <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90 mb-4">{{ $t('common.deleteUser') }}</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            {{ $t('common.confirmDelete') }} <strong>{{ deleteTarget?.username }}</strong> {{ $t('common.confirmDeleteDesc') }}
          </p>
          <div class="flex justify-end gap-3">
            <button
              @click="closeDeleteDialog"
              class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              @click="handleDelete"
              :disabled="deleting"
              class="px-4 py-2 bg-danger-500 text-white rounded-lg hover:bg-danger-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ deleting ? $t('common.deleting') : $t('common.delete') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { ref, onMounted } from 'vue'
import { usersApi } from '@/api/users'
import type { User, CreateUserRequest, UpdateUserRequest } from '@/api/users'

const loading = ref(false)
const users = ref<User[]>([])

// 对话框状态
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)

// 表单数据
const createForm = ref<CreateUserRequest>({
  username: '',
  password: '',
  home: '',
  shell: '/bin/bash',
})

const editForm = ref<UpdateUserRequest & { username: string }>({
  username: '',
  password: '',
  home: '',
  shell: '/bin/bash',
})

const deleteTarget = ref<User | null>(null)

// 操作状态
const creating = ref(false)
const updating = ref(false)
const deleting = ref(false)

// 加载用户列表
const loadUsers = async () => {
  loading.value = true
  try {
    const data = await usersApi.getUsers()
    users.value = data || []
  } catch (error: any) {
    console.error('获取用户列表失败:', error)
    users.value = []
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
    username: '',
    password: '',
    home: '',
    shell: '/bin/bash',
  }
  showCreateDialog.value = true
}

// 关闭创建对话框
const closeCreateDialog = () => {
  showCreateDialog.value = false
}

// 打开编辑对话框
const openEditDialog = (user: User) => {
  editForm.value = {
    username: user.username,
    password: '',
    home: user.home,
    shell: user.shell,
  }
  showEditDialog.value = true
}

// 关闭编辑对话框
const closeEditDialog = () => {
  showEditDialog.value = false
}

// 打开删除对话框
const openDeleteDialog = (user: User) => {
  deleteTarget.value = user
  showDeleteDialog.value = true
}

// 关闭删除对话框
const closeDeleteDialog = () => {
  showDeleteDialog.value = null
  showDeleteDialog.value = false
}

// 创建用户
const handleCreate = async () => {
  creating.value = true
  try {
    const data: CreateUserRequest = {
      username: createForm.value.username,
      shell: createForm.value.shell || '/bin/bash',
    }
    
    if (createForm.value.password) {
      data.password = createForm.value.password
    }
    
    if (createForm.value.home) {
      data.home = createForm.value.home
    }
    
    await usersApi.createUser(data)
    alert('用户创建成功')
    closeCreateDialog()
    await loadUsers()
  } catch (error: any) {
    console.error('创建用户失败:', error)
    alert(error?.error || '创建用户失败')
  } finally {
    creating.value = false
  }
}

// 更新用户
const handleUpdate = async () => {
  updating.value = true
  try {
    const data: UpdateUserRequest = {}
    
    if (editForm.value.password) {
      data.password = editForm.value.password
    }
    
    if (editForm.value.home) {
      data.home = editForm.value.home
    }
    
    if (editForm.value.shell) {
      data.shell = editForm.value.shell
    }
    
    await usersApi.updateUser(editForm.value.username, data)
    alert('用户更新成功')
    closeEditDialog()
    await loadUsers()
  } catch (error: any) {
    console.error('更新用户失败:', error)
    alert(error?.error || '更新用户失败')
  } finally {
    updating.value = false
  }
}

// 删除用户
const handleDelete = async () => {
  if (!deleteTarget.value) return

  deleting.value = true
  try {
    await usersApi.deleteUser(deleteTarget.value.username)
    alert('用户删除成功')
    closeDeleteDialog()
    await loadUsers()
  } catch (error: any) {
    console.error('删除用户失败:', error)
    alert(error?.error || '删除用户失败')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  loadUsers()
})
</script>
