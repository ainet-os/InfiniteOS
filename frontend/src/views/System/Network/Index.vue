<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ $t('pages.network.title') }}</h1>
          <p class="mt-1 text-gray-600 dark:text-gray-400">{{ $t('pages.network.description') }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            class="rounded-lg bg-brand-500 px-4 py-2 text-white transition-colors hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700"
            @click="openCreateDialog"
          >
            创建逻辑网络
          </button>
          <button
            :disabled="pendingCount === 0"
            class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            @click="discardChanges"
          >
            放弃变更
          </button>
          <button
            :disabled="pendingCount === 0 || applying"
            class="rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            @click="applyChanges"
          >
            {{ applyButtonLabel }}
          </button>
        </div>
      </div>

      <div class="mb-6 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100">
        物理网卡只允许编辑配置和启停，不允许删除。创建入口仅用于桥接、Bond、VLAN 等逻辑网络。所有创建、删除和 IP 修改都会先进入待应用队列，只有点击“应用配置”后才会真正写入 Netplan 并生效。
      </div>

      <div
        v-if="pendingCount > 0"
        class="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100"
      >
        当前有 {{ pendingCount }} 项待应用变更。保存草稿不会立即修改系统网络，点击右上角“应用配置”才会执行 Netplan 写入和 `netplan apply`。
      </div>

      <div class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="p-6">
          <div v-if="loading" class="py-12 text-center">
            <p class="text-gray-600 dark:text-gray-400">{{ $t('common.loading') }}</p>
          </div>
          <div v-else-if="displayInterfaces.length === 0" class="py-12 text-center">
            <p class="text-gray-600 dark:text-gray-400">{{ $t('common.noNetworkInterfaces') }}</p>
          </div>
          <table v-else class="w-full">
            <thead class="bg-gray-50 dark:bg-white/[0.02]">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">名称</th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">类别</th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">IP 地址</th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">状态</th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">管理方式</th>
                <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-600 dark:text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
              <tr
                v-for="iface in pagedInterfaces"
                :key="iface.name"
                :class="iface.pendingAction === 'delete' ? 'bg-red-50/40 dark:bg-red-500/5' : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'"
              >
                <td class="px-6 py-4 text-sm text-gray-800 dark:text-white/90">
                  <div class="flex items-center gap-2">
                    <span>{{ iface.name }}</span>
                    <span
                      v-if="iface.pendingAction"
                      :class="[
                        'rounded px-2 py-0.5 text-[11px] font-medium',
                        iface.pendingAction === 'delete'
                          ? 'bg-red-500/10 text-red-600 dark:text-red-300'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
                      ]"
                    >
                      {{ pendingActionLabel(iface.pendingAction) }}
                    </span>
                  </div>
                  <p
                    v-if="iface.type === 'bridge' || iface.type === 'bond'"
                    class="mt-1 text-xs text-gray-500 dark:text-gray-400"
                  >
                    成员接口: {{ formatMemberNames(iface) }}
                  </p>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                  <div class="flex items-center gap-2">
                    <span>{{ typeLabel(iface.type) }}</span>
                    <span
                      class="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {{ roleLabel(iface.role) }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ iface.ip }}</td>
                <td class="px-6 py-4">
                  <span
                    :class="[
                      'rounded px-2 py-1 text-xs',
                      iface.status === 'up' ? 'bg-success-500/10 text-success-500' : 'bg-gray-500/10 text-gray-500',
                    ]"
                  >
                    {{ iface.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {{ managementLabel(iface) }}
                </td>
                <td class="px-6 py-4">
                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      v-if="iface.editable && iface.pendingAction !== 'delete'"
                      class="rounded bg-brand-500/10 px-3 py-1 text-xs text-brand-500 transition-colors hover:bg-brand-500/20"
                      @click="openEditDialog(iface)"
                    >
                      编辑
                    </button>
                    <button
                      v-if="iface.deletable"
                      :class="[
                        'rounded px-3 py-1 text-xs transition-colors',
                        iface.pendingAction === 'delete'
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                          : 'bg-danger-500/10 text-danger-500 hover:bg-danger-500/20',
                      ]"
                      @click="toggleDeleteDraft(iface)"
                    >
                      {{ iface.pendingAction === 'delete' ? '撤销删除' : '删除' }}
                    </button>
                    <button
                      v-if="iface.role === 'physical' && iface.editable"
                      :class="[
                        'rounded px-3 py-1 text-xs transition-colors',
                        iface.status === 'up'
                          ? 'bg-warning-500/10 text-warning-500 hover:bg-warning-500/20'
                          : 'bg-success-500/10 text-success-500 hover:bg-success-500/20',
                      ]"
                      @click="toggleInterfaceStatus(iface)"
                    >
                      {{ iface.status === 'up' ? '禁用' : '启用' }}
                    </button>
                    <span
                      v-if="!iface.editable && iface.role === 'physical'"
                      class="text-xs text-gray-500 dark:text-gray-400"
                    >
                      当前类型不支持编辑
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <ListPagination
            v-if="displayInterfaces.length > 0"
            :total-items="interfaceTotalItems"
            :total-pages="interfaceTotalPages"
            :current-page="interfaceCurrentPage"
            :page-size="interfacePageSize"
            :page-size-options="interfacePageSizeOptions"
            @page-change="setInterfacePage"
            @page-size-change="interfacePageSize = $event"
          />
        </div>
      </div>
    </div>

    <div
      v-if="showCreateDialog"
      class="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50"
      @click.self="closeCreateDialog"
    >
      <div class="mx-4 w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div class="p-6">
          <h2 class="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">创建逻辑网络</h2>
          <form class="space-y-4" @submit.prevent="stageCreate">
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">网络名称</label>
                <input
                  v-model="createForm.name"
                  type="text"
                  required
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                  placeholder="例如: br0 / bond0 / vlan100"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">网络类型</label>
                <select
                  v-model="createForm.type"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                  @change="onCreateTypeChange"
                >
                  <option value="bridge">桥接 (Bridge)</option>
                  <option value="bond">Bond</option>
                  <option value="vlan">VLAN</option>
                </select>
              </div>
            </div>

            <div v-if="createForm.type === 'bridge' || createForm.type === 'bond'">
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ createForm.type === 'bridge' ? '成员接口' : 'Bond 成员接口' }}
              </label>
              <div class="grid gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700 md:grid-cols-2">
                <label
                  v-for="option in memberOptions(createForm)"
                  :key="`${createForm.type}-${option.name}`"
                  class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    :checked="createForm.interfaces.includes(option.name)"
                    type="checkbox"
                    class="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    @change="toggleFormMember(createForm, option.name)"
                  />
                  <span>{{ option.name }}</span>
                  <span class="text-xs text-gray-500 dark:text-gray-400">{{ typeLabel(option.type) }}</span>
                </label>
              </div>
            </div>

            <div v-if="createForm.type === 'bond'">
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Bond 模式</label>
              <select
                v-model="createForm.bondMode"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
              >
                <option value="active-backup">active-backup</option>
                <option value="802.3ad">802.3ad</option>
                <option value="balance-rr">balance-rr</option>
                <option value="balance-xor">balance-xor</option>
              </select>
            </div>

            <div v-if="createForm.type === 'vlan'" class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">父接口</label>
                <select
                  v-model="createForm.link"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                >
                  <option value="" disabled>请选择父接口</option>
                  <option v-for="option in vlanParentOptions" :key="option.name" :value="option.name">
                    {{ option.name }} ({{ typeLabel(option.type) }})
                  </option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">VLAN ID</label>
                <input
                  v-model="createForm.vlanId"
                  type="number"
                  min="1"
                  max="4094"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                />
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">配置方式</label>
                <select
                  v-model="createForm.method"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                  @change="onMethodChange(createForm)"
                >
                  <option value="auto">自动 (DHCP)</option>
                  <option value="static">静态 IP</option>
                </select>
              </div>
            </div>

            <template v-if="createForm.method === 'static'">
              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">IP 地址</label>
                  <input
                    v-model="createForm.ip4"
                    type="text"
                    required
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                    placeholder="例如: 192.168.1.100/24"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">网关</label>
                  <input
                    v-model="createForm.gateway"
                    type="text"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                    placeholder="例如: 192.168.1.1"
                  />
                </div>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">DNS 服务器（逗号分隔）</label>
                <input
                  v-model="createForm.dnsStr"
                  type="text"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                  placeholder="例如: 223.5.5.5, 8.8.8.8"
                />
              </div>
            </template>

            <div>
              <div class="mb-2 flex items-center justify-between gap-3">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">静态路由</label>
                <button
                  type="button"
                  class="rounded bg-brand-500/10 px-3 py-1 text-xs text-brand-500 transition-colors hover:bg-brand-500/20"
                  @click="addRouteRow(createForm)"
                >
                  添加路由
                </button>
              </div>
              <div v-if="createForm.routes.length > 0" class="space-y-3">
                <div
                  v-for="(route, index) in createForm.routes"
                  :key="`create-route-${index}`"
                  class="grid gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <input
                    v-model="route.to"
                    type="text"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                    placeholder="目标网段，例如: 10.10.0.0/16"
                  />
                  <input
                    v-model="route.via"
                    type="text"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                    placeholder="下一跳，例如: 192.168.1.254"
                  />
                  <button
                    type="button"
                    class="rounded bg-danger-500/10 px-3 py-2 text-xs text-danger-500 transition-colors hover:bg-danger-500/20"
                    @click="removeRouteRow(createForm, index)"
                  >
                    删除
                  </button>
                </div>
              </div>
              <p v-else class="text-sm text-gray-500 dark:text-gray-400">未配置额外静态路由</p>
              <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                默认路由请使用“网关”字段；这里用于配置额外网段路由，DHCP 和静态 IP 都可使用。
              </p>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button
                type="button"
                class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                @click="closeCreateDialog"
              >
                取消
              </button>
              <button
                type="submit"
                class="rounded-lg bg-brand-500 px-4 py-2 text-white transition-colors hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700"
              >
                保存变更
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div
      v-if="showEditDialog"
      class="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50"
      @click.self="closeEditDialog"
    >
      <div class="mx-4 w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div class="p-6">
          <h2 class="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">编辑网络配置</h2>

          <form class="space-y-4" @submit.prevent="stageEdit">
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">网络名称</label>
                <input
                  :value="editForm.name"
                  type="text"
                  disabled
                  class="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">网络类型</label>
                <input
                  :value="typeLabel(editForm.type)"
                  type="text"
                  disabled
                  class="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                />
              </div>
            </div>

            <div v-if="editForm.type === 'bridge' || editForm.type === 'bond'">
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ editForm.type === 'bridge' ? '成员接口' : 'Bond 成员接口' }}
              </label>
              <div class="grid gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700 md:grid-cols-2">
                <label
                  v-for="option in memberOptions(editForm)"
                  :key="`${editForm.type}-${option.name}`"
                  class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    :checked="editForm.interfaces.includes(option.name)"
                    type="checkbox"
                    class="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    @change="toggleFormMember(editForm, option.name)"
                  />
                  <span>{{ option.name }}</span>
                  <span class="text-xs text-gray-500 dark:text-gray-400">{{ typeLabel(option.type) }}</span>
                </label>
              </div>
            </div>

            <div v-if="editForm.type === 'bond'">
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Bond 模式</label>
              <select
                v-model="editForm.bondMode"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
              >
                <option value="active-backup">active-backup</option>
                <option value="802.3ad">802.3ad</option>
                <option value="balance-rr">balance-rr</option>
                <option value="balance-xor">balance-xor</option>
              </select>
            </div>

            <div v-if="editForm.type === 'vlan'" class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">父接口</label>
                <select
                  v-model="editForm.link"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                >
                  <option value="" disabled>请选择父接口</option>
                  <option v-for="option in vlanParentOptions" :key="option.name" :value="option.name">
                    {{ option.name }} ({{ typeLabel(option.type) }})
                  </option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">VLAN ID</label>
                <input
                  v-model="editForm.vlanId"
                  type="number"
                  min="1"
                  max="4094"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                />
              </div>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">配置方式</label>
              <select
                v-model="editForm.method"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                @change="onMethodChange(editForm)"
              >
                <option value="auto">自动 (DHCP)</option>
                <option value="static">静态 IP</option>
              </select>
            </div>

            <template v-if="editForm.method === 'static'">
              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">IP 地址</label>
                  <input
                    v-model="editForm.ip4"
                    type="text"
                    required
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                    placeholder="例如: 192.168.1.100/24"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">网关</label>
                  <input
                    v-model="editForm.gateway"
                    type="text"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                    placeholder="例如: 192.168.1.1"
                  />
                </div>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">DNS 服务器（逗号分隔）</label>
                <input
                  v-model="editForm.dnsStr"
                  type="text"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                  placeholder="例如: 223.5.5.5, 8.8.8.8"
                />
              </div>
            </template>

            <div>
              <div class="mb-2 flex items-center justify-between gap-3">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">静态路由</label>
                <button
                  type="button"
                  class="rounded bg-brand-500/10 px-3 py-1 text-xs text-brand-500 transition-colors hover:bg-brand-500/20"
                  @click="addRouteRow(editForm)"
                >
                  添加路由
                </button>
              </div>
              <div v-if="editForm.routes.length > 0" class="space-y-3">
                <div
                  v-for="(route, index) in editForm.routes"
                  :key="`edit-route-${index}`"
                  class="grid gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <input
                    v-model="route.to"
                    type="text"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                    placeholder="目标网段，例如: 10.10.0.0/16"
                  />
                  <input
                    v-model="route.via"
                    type="text"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-transparent focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                    placeholder="下一跳，例如: 192.168.1.254"
                  />
                  <button
                    type="button"
                    class="rounded bg-danger-500/10 px-3 py-2 text-xs text-danger-500 transition-colors hover:bg-danger-500/20"
                    @click="removeRouteRow(editForm, index)"
                  >
                    删除
                  </button>
                </div>
              </div>
              <p v-else class="text-sm text-gray-500 dark:text-gray-400">未配置额外静态路由</p>
              <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                默认路由请使用“网关”字段；这里用于配置额外网段路由，DHCP 和静态 IP 都可使用。
              </p>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button
                type="button"
                class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                @click="closeEditDialog"
              >
                取消
              </button>
              <button
                type="submit"
                class="rounded-lg bg-brand-500 px-4 py-2 text-white transition-colors hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700"
              >
                保存变更
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '@/components/layout/AdminLayout.vue'
import ListPagination from '@/components/ui/pagination/ListPagination.vue'
import { usePagination } from '@/composables/usePagination'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { networkApi } from '@/api/network'
import type {
  ApplyNetworkOperation,
  NetworkDeviceType,
  NetworkInterface,
  NetworkInterfaceDetails,
} from '@/api/network'

type DraftAction = 'create' | 'update' | 'delete'

type DisplayInterface = NetworkInterface & {
  ip: string
  pendingAction: DraftAction | null
}

type NetworkForm = {
  name: string
  type: 'ethernet' | 'bridge' | 'bond' | 'vlan'
  method: 'auto' | 'static'
  ip4: string
  gateway: string
  dnsStr: string
  routes: Array<{
    to: string
    via: string
  }>
  interfaces: string[]
  link: string
  vlanId: string
  bondMode: string
}

const { t: $t } = useI18n()
const loading = ref(false)
const applying = ref(false)
const rawInterfaces = ref<NetworkInterface[]>([])
const drafts = ref<Record<string, ApplyNetworkOperation>>({})
const showCreateDialog = ref(false)
const showEditDialog = ref(false)

const createForm = ref<NetworkForm>(createEmptyForm('bridge'))
const editForm = ref<NetworkForm>(createEmptyForm('ethernet'))

let refreshInterval: number | undefined

function createEmptyForm(type: NetworkForm['type']): NetworkForm {
  return {
    name: '',
    type,
    method: 'auto',
    ip4: '',
    gateway: '',
    dnsStr: '',
    routes: [],
    interfaces: [],
    link: '',
    vlanId: '',
    bondMode: 'active-backup',
  }
}

function typeLabel(type: NetworkDeviceType | NetworkForm['type']) {
  switch (type) {
    case 'ethernet':
      return '以太网'
    case 'bridge':
      return '桥接'
    case 'bond':
      return 'Bond'
    case 'vlan':
      return 'VLAN'
    case 'wifi':
      return 'Wi-Fi'
    default:
      return '其他'
  }
}

function pendingActionLabel(action: DraftAction) {
  if (action === 'create') return '待创建'
  if (action === 'delete') return '待删除'
  return '待应用'
}

function roleLabel(role: DisplayInterface['role']) {
  if (role === 'physical') return '物理'
  if (role === 'logical') return '逻辑'
  return '系统'
}

function roleRank(role: DisplayInterface['role']) {
  if (role === 'physical') return 0
  if (role === 'logical') return 1
  return 2
}

function managementLabel(iface: DisplayInterface) {
  if (iface.managed) return '页面管理'
  if (iface.role === 'physical') return '物理网卡'
  if (iface.role === 'logical') return '外部配置'
  return '系统接口'
}

function formatMemberNames(iface: Pick<DisplayInterface, 'interfaces'>) {
  const members = iface.interfaces?.filter(Boolean) || []
  return members.length > 0 ? members.join(', ') : '-'
}

function parseDnsString(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function normalizeFormRoutes(routes: NetworkForm['routes']) {
  return routes
    .map(route => ({
      to: route.to.trim(),
      via: route.via.trim(),
    }))
    .filter(route => route.to || route.via)
}

function buildOperationFromForm(form: NetworkForm): ApplyNetworkOperation {
  const config: ApplyNetworkOperation['config'] = {
    method: form.method,
  }

  const routes = normalizeFormRoutes(form.routes)
  if (routes.length > 0) {
    config.routes = routes
  }

  if (form.method === 'static') {
    config.ip4 = form.ip4
    config.gateway = form.gateway || undefined
    const dns = parseDnsString(form.dnsStr)
    if (dns.length > 0) {
      config.dns = dns
    }
  }

  if (form.type === 'bridge' || form.type === 'bond') {
    config.interfaces = [...form.interfaces]
  }

  if (form.type === 'bond') {
    config.bondMode = form.bondMode
  }

  if (form.type === 'vlan') {
    config.link = form.link
    config.vlanId = form.vlanId ? Number(form.vlanId) : undefined
  }

  return {
    action: 'upsert',
    targetType: form.type,
    name: form.name.trim(),
    config,
  }
}

function getPendingAction(name: string): DraftAction | null {
  const operation = drafts.value[name]
  if (!operation) return null

  if (operation.action === 'delete') return 'delete'
  return rawInterfaces.value.some(item => item.name === name) ? 'update' : 'create'
}

function previewInterface(base: NetworkInterface | undefined, operation: ApplyNetworkOperation): DisplayInterface {
  const type = operation.targetType
  const method = operation.config?.method || 'auto'
  const ip4 = method === 'static' ? operation.config?.ip4 || '' : ''

  return {
    name: operation.name,
    type,
    role: type === 'ethernet' ? 'physical' : 'logical',
    managed: true,
    editable: true,
    deletable: type !== 'ethernet',
    mac: base?.mac || '',
    ip4,
    ip6: base?.ip6 || '',
    status: base?.status || 'down',
    speed: base?.speed || 0,
    rx_bytes: base?.rx_bytes || 0,
    tx_bytes: base?.tx_bytes || 0,
    rx_sec: base?.rx_sec || 0,
    tx_sec: base?.tx_sec || 0,
    interfaces: operation.config?.interfaces || base?.interfaces || [],
    link: operation.config?.link || base?.link || '',
    vlanId: operation.config?.vlanId ?? base?.vlanId,
    bondMode: operation.config?.bondMode || base?.bondMode,
    ip: ip4 || base?.ip4 || base?.ip6 || '-',
    pendingAction: getPendingAction(operation.name),
  }
}

function getBridgeBondMemberNames(interfaces: Iterable<DisplayInterface>) {
  const memberNames = new Set<string>()

  for (const iface of interfaces) {
    if (!['bridge', 'bond'].includes(iface.type)) continue

    for (const member of iface.interfaces || []) {
      memberNames.add(member)
    }
  }

  return memberNames
}

const displayInterfaces = computed<DisplayInterface[]>(() => {
  const orderedNames: string[] = []
  const map = new Map<string, DisplayInterface>()

  for (const iface of rawInterfaces.value) {
    orderedNames.push(iface.name)
    map.set(iface.name, {
      ...iface,
      ip: iface.ip4 || iface.ip6 || '-',
      pendingAction: null,
    })
  }

  for (const operation of Object.values(drafts.value)) {
    const existing = map.get(operation.name)

    if (operation.action === 'delete') {
      if (existing) {
        existing.pendingAction = 'delete'
      }
      continue
    }

    const preview = previewInterface(existing, operation)
    if (!existing) {
      orderedNames.push(operation.name)
    }
    map.set(operation.name, preview)
  }

  const bridgeBondMemberNames = getBridgeBondMemberNames(
    Array.from(map.values()).filter(iface => iface.pendingAction !== 'delete')
  )

  return orderedNames
    .filter((name, index) => orderedNames.indexOf(name) === index)
    .map(name => {
      const iface = map.get(name)
      if (!iface) return undefined

      if (iface.type === 'ethernet' && bridgeBondMemberNames.has(iface.name)) {
        return {
          ...iface,
          ip4: '',
          ip6: '',
          ip: '-',
        }
      }

      return iface
    })
    .filter((item): item is DisplayInterface => Boolean(item))
    .sort((left, right) => {
      if (left.role !== right.role) {
        return roleRank(left.role) - roleRank(right.role)
      }
      return left.name.localeCompare(right.name)
    })
})

const {
  currentPage: interfaceCurrentPage,
  pageSize: interfacePageSize,
  pageSizeOptions: interfacePageSizeOptions,
  totalItems: interfaceTotalItems,
  totalPages: interfaceTotalPages,
  pagedItems: pagedInterfaces,
  setPage: setInterfacePage,
} = usePagination(displayInterfaces)

const pendingCount = computed(() => Object.keys(drafts.value).length)
const applyButtonLabel = computed(() => (
  applying.value ? '应用中...' : `应用配置${pendingCount.value > 0 ? ` (${pendingCount.value})` : ''}`
))

const bridgeBondMemberNames = computed(() => (
  getBridgeBondMemberNames(displayInterfaces.value.filter(iface => iface.pendingAction !== 'delete'))
))
const editableInterfaces = computed(() => displayInterfaces.value.filter(iface => iface.pendingAction !== 'delete'))

const memberOwners = computed(() => {
  const owners = new Map<string, Set<string>>()

  for (const iface of editableInterfaces.value) {
    if (!['bridge', 'bond'].includes(iface.type)) continue

    for (const member of iface.interfaces || []) {
      if (!owners.has(member)) {
        owners.set(member, new Set())
      }
      owners.get(member)?.add(iface.name)
    }
  }

  return owners
})

const vlanParentOptions = computed(() => (
  editableInterfaces.value.filter(iface => ['ethernet', 'bond'].includes(iface.type))
))

function canUseMember(candidateName: string, currentName: string, selectedMembers: Set<string>) {
  if (selectedMembers.has(candidateName)) return true

  const owners = memberOwners.value.get(candidateName)
  if (!owners || owners.size === 0) return true

  return Array.from(owners).every(owner => owner === currentName)
}

function memberOptions(form: NetworkForm) {
  const currentName = form.name.trim()
  const selectedMembers = new Set(form.interfaces)
  const allowedTypes = form.type === 'bond'
    ? ['ethernet']
    : ['ethernet', 'bond', 'vlan']

  return editableInterfaces.value.filter(iface => (
    allowedTypes.includes(iface.type)
    && canUseMember(iface.name, currentName, selectedMembers)
  ))
}

function onMethodChange(form: NetworkForm) {
  if (form.method === 'auto') {
    form.ip4 = ''
    form.gateway = ''
    form.dnsStr = ''
  }
}

function onCreateTypeChange() {
  createForm.value.interfaces = []
  createForm.value.link = ''
  createForm.value.vlanId = ''
  createForm.value.bondMode = 'active-backup'
}

function toggleFormMember(form: NetworkForm, memberName: string) {
  if (form.interfaces.includes(memberName)) {
    form.interfaces = form.interfaces.filter(item => item !== memberName)
    return
  }

  form.interfaces = [...form.interfaces, memberName]
}

function addRouteRow(form: NetworkForm) {
  form.routes = [...form.routes, { to: '', via: '' }]
}

function removeRouteRow(form: NetworkForm, index: number) {
  form.routes = form.routes.filter((_, routeIndex) => routeIndex !== index)
}

async function loadInterfaces() {
  loading.value = true
  try {
    rawInterfaces.value = await networkApi.getInterfaces()
  } catch (error: any) {
    console.error('获取网络接口失败:', error)
    rawInterfaces.value = []
    if (error?.error?.includes('未提供认证令牌') || error?.error?.includes('无效的认证令牌')) {
      return
    }
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  createForm.value = createEmptyForm('bridge')
  showCreateDialog.value = true
}

function closeCreateDialog() {
  showCreateDialog.value = false
}

function closeEditDialog() {
  showEditDialog.value = false
}

function stageCreate() {
  const operation = buildOperationFromForm(createForm.value)
  drafts.value = {
    ...drafts.value,
    [operation.name]: operation,
  }
  closeCreateDialog()
}

async function openEditDialog(iface: DisplayInterface) {
  try {
    const draft = drafts.value[iface.name]
    if (draft && draft.action === 'upsert') {
      editForm.value = formFromOperation(draft)
      showEditDialog.value = true
      return
    }

    const details = await networkApi.getInterfaceDetails(iface.name)
    const isBridgeOrBondMember = details.type === 'ethernet' && bridgeBondMemberNames.value.has(details.name)
    editForm.value = {
      name: details.name,
      type: details.type === 'wifi' || details.type === 'other' ? 'ethernet' : details.type,
      method: isBridgeOrBondMember ? 'auto' : details.method,
      ip4: isBridgeOrBondMember ? '' : details.ip4 || '',
      gateway: isBridgeOrBondMember ? '' : details.gateway || '',
      dnsStr: isBridgeOrBondMember ? '' : details.dns.join(', '),
      routes: isBridgeOrBondMember ? [] : (details.routes || []).map(route => ({ ...route })),
      interfaces: details.interfaces || [],
      link: details.link || '',
      vlanId: details.vlanId ? String(details.vlanId) : '',
      bondMode: details.bondMode || 'active-backup',
    }
    showEditDialog.value = true
  } catch (error: any) {
    console.error('获取网络接口详情失败:', error)
    alert(error?.error || '获取网络接口详情失败')
  }
}

function formFromOperation(operation: ApplyNetworkOperation): NetworkForm {
  return {
    name: operation.name,
    type: operation.targetType,
    method: operation.config?.method || 'auto',
    ip4: operation.config?.ip4 || '',
    gateway: operation.config?.gateway || '',
    dnsStr: (operation.config?.dns || []).join(', '),
    routes: (operation.config?.routes || []).map(route => ({ ...route })),
    interfaces: [...(operation.config?.interfaces || [])],
    link: operation.config?.link || '',
    vlanId: operation.config?.vlanId ? String(operation.config.vlanId) : '',
    bondMode: operation.config?.bondMode || 'active-backup',
  }
}

function stageEdit() {
  const operation = buildOperationFromForm(editForm.value)
  drafts.value = {
    ...drafts.value,
    [operation.name]: operation,
  }
  closeEditDialog()
}

function toggleDeleteDraft(iface: DisplayInterface) {
  const currentDraft = drafts.value[iface.name]

  if (currentDraft?.action === 'delete') {
    const nextDrafts = { ...drafts.value }
    delete nextDrafts[iface.name]
    drafts.value = nextDrafts
    return
  }

  if (currentDraft?.action === 'upsert' && !rawInterfaces.value.some(item => item.name === iface.name)) {
    const nextDrafts = { ...drafts.value }
    delete nextDrafts[iface.name]
    drafts.value = nextDrafts
    return
  }

  drafts.value = {
    ...drafts.value,
    [iface.name]: {
      action: 'delete',
      targetType: iface.type as 'bridge' | 'bond' | 'vlan',
      name: iface.name,
    },
  }
}

function discardChanges() {
  drafts.value = {}
  closeCreateDialog()
  closeEditDialog()
}

async function applyChanges() {
  if (pendingCount.value === 0) return

  applying.value = true
  try {
    const operations = Object.values(drafts.value)
    await networkApi.applyChanges(operations)
    drafts.value = {}
    await loadInterfaces()
    alert('网络配置已应用')
  } catch (error: any) {
    console.error('应用网络配置失败:', error)
    alert(error?.error || '应用网络配置失败')
  } finally {
    applying.value = false
  }
}

async function toggleInterfaceStatus(iface: DisplayInterface) {
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
