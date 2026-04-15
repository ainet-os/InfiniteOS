<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">
            {{ $t('pages.virtualMachines.title') }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            {{ $t('pages.virtualMachines.description') }}
          </p>
        </div>
        <button
          @click="openCreateDialog"
          class="px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 transition-colors flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          {{ $t('common.createVM') }}
        </button>
      </div>

      <div
        v-if="showCreateDialog"
        class="fixed inset-0 z-[100000] overflow-y-auto bg-black/45 px-4 py-4 dark:bg-black/70 sm:px-6"
        @click.self="closeCreateDialog"
      >
        <div class="flex min-h-full items-center justify-center">
          <div
            class="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
          >
            <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700 sm:px-5">
              <div class="flex items-start justify-between gap-4">
                <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {{ $t('common.createVM') }}
                </h2>
                <button
                  @click="closeCreateDialog"
                  class="text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="max-h-[calc(100vh-4rem)] overflow-y-auto px-4 pb-4 pt-2.5 sm:px-5 sm:pb-5 sm:pt-3">
              <div
                v-if="capabilitiesLoading"
                class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300"
              >
                正在检测宿主机虚机能力...
              </div>

              <div
                v-else-if="capabilitiesError"
                class="rounded-lg border border-error-200 bg-error-50 px-3 py-2.5 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
              >
                {{ capabilitiesError }}
              </div>

              <div
                v-if="hostRequirementError"
                class="mt-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2.5 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
              >
                {{ hostRequirementError }}
              </div>

              <form @submit.prevent="handleCreateVM('create_and_edit')" class="mt-1 space-y-2.5">
                <section class="space-y-3 rounded-lg border border-gray-200 p-3.5 dark:border-gray-700">
                  <h3 class="text-sm font-medium text-gray-800 dark:text-white/90">基本信息</h3>

                  <div class="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[112px_minmax(0,1fr)]">
                    <label class="text-sm font-medium text-slate-700 dark:text-gray-300">
                      虚拟机名称 <span class="text-error-500">*</span>
                    </label>
                    <input
                      v-model="createForm.name"
                      type="text"
                      required
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                      placeholder="例如: vm-ubuntu-01"
                    />
                  </div>

                  <div class="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[112px_minmax(0,1fr)]">
                    <label class="text-sm font-medium text-slate-700 dark:text-gray-300">
                      操作系统
                    </label>
                    <select
                      v-model="createForm.osId"
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                    >
                      <option
                        v-for="option in availableOsOptions"
                        :key="option.id"
                        :value="option.id"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                  </div>
                </section>

                <section class="space-y-3 rounded-lg border border-gray-200 p-3.5 dark:border-gray-700">
                  <h3 class="text-sm font-medium text-gray-800 dark:text-white/90">详情</h3>

                  <div class="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[112px_minmax(0,1fr)]">
                    <label class="text-sm font-medium text-slate-700 dark:text-gray-300">
                      安装类型
                    </label>
                    <select
                      v-model="createForm.installSourceType"
                      @change="handleInstallSourceTypeChange"
                      class="w-44 max-w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                    >
                      <option value="local_iso">本地 ISO</option>
                      <option value="existing_disk">现有磁盘导入</option>
                    </select>
                  </div>

                  <div
                    v-if="createForm.installSourceType === 'local_iso'"
                    class="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[112px_minmax(0,1fr)]"
                  >
                    <label class="text-sm font-medium text-slate-700 dark:text-gray-300">
                      安装源 <span class="text-error-500">*</span>
                    </label>
                    <input
                      v-model="createForm.isoPath"
                      type="text"
                      class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                      placeholder="/var/lib/libvirt/images/ubuntu-22.04.iso"
                    />
                  </div>

                  <div class="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[112px_minmax(0,1fr)]">
                    <label class="text-sm font-medium text-slate-700 dark:text-gray-300">
                      vCPU 数量
                    </label>
                    <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-700 dark:text-gray-300">
                      <div class="flex items-center gap-3">
                        <span>插槽</span>
                        <input
                          v-model.number="createForm.cpuSockets"
                          type="number"
                          min="1"
                          max="64"
                          class="w-16 rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-center text-gray-800 transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                        />
                      </div>
                      <div class="flex items-center gap-3">
                        <span>核心</span>
                        <input
                          v-model.number="createForm.cpuCores"
                          type="number"
                          min="1"
                          max="64"
                          class="w-16 rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-center text-gray-800 transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                        />
                      </div>
                      <div class="flex items-center gap-3">
                        <span>线程</span>
                        <input
                          v-model.number="createForm.cpuThreads"
                          type="number"
                          min="1"
                          max="64"
                          class="w-16 rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-center text-gray-800 transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                        />
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[112px_minmax(0,1fr)]">
                    <label class="text-sm font-medium text-slate-700 dark:text-gray-300">
                      内存
                    </label>
                    <div class="flex w-full max-w-[220px] gap-2">
                      <input
                        v-model.number="createForm.memoryValue"
                        type="number"
                        min="1"
                        step="1"
                        class="w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                      />
                      <select
                        v-model="createForm.memoryUnit"
                        class="w-20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                      >
                        <option value="MiB">MiB</option>
                        <option value="GiB">GiB</option>
                      </select>
                    </div>
                  </div>

                  <div class="space-y-3">
                    <div class="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[112px_minmax(0,1fr)]">
                      <label class="text-sm font-medium text-slate-700 dark:text-gray-300">
                        磁盘路径 <span class="text-error-500">*</span>
                      </label>
                      <input
                        v-model="primaryDisk.path"
                        type="text"
                        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                        :placeholder="
                          primaryDisk.kind === 'existing_disk'
                            ? '/var/lib/libvirt/images/existing-disk.qcow2'
                            : '/var/lib/libvirt/images/new-vm.qcow2'
                        "
                      />
                    </div>

                    <div class="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[112px_minmax(0,1fr)]">
                      <label class="text-sm font-medium text-slate-700 dark:text-gray-300">
                        磁盘总线
                      </label>
                      <select
                        v-model="primaryDisk.bus"
                        class="w-32 max-w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                      >
                        <option value="virtio">virtio</option>
                        <option value="sata">sata</option>
                        <option value="scsi">scsi</option>
                      </select>
                    </div>
                  </div>

                  <div
                    v-if="primaryDisk.kind !== 'existing_disk'"
                    class="space-y-3"
                  >
                    <div class="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[112px_minmax(0,1fr)]">
                      <label class="text-sm font-medium text-slate-700 dark:text-gray-300">
                        磁盘容量
                      </label>
                      <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-700 dark:text-gray-300">
                        <div class="flex items-center gap-2">
                          <input
                            v-model.number="primaryDisk.sizeGiB"
                            type="number"
                            min="1"
                            step="1"
                            class="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-gray-800 transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                          />
                          <span>GiB</span>
                        </div>
                        <div class="ml-2 flex items-center gap-2 md:ml-4">
                          <span>磁盘格式</span>
                          <select
                            v-model="primaryDisk.format"
                            class="w-32 max-w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                          >
                            <option value="qcow2">qcow2</option>
                            <option value="raw">raw</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="space-y-3">
                    <div class="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[112px_minmax(0,1fr)]">
                      <label class="text-sm font-medium text-slate-700 dark:text-gray-300">
                        网络模式
                      </label>
                      <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-700 dark:text-gray-300">
                        <select
                          v-model="primaryNetwork.mode"
                          @change="handleNetworkModeChange"
                          class="w-32 max-w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                        >
                          <option :disabled="bridgeInterfaces.length === 0" value="bridge">桥接网卡</option>
                          <option value="none">无网络</option>
                        </select>
                        <div
                          v-if="primaryNetwork.mode === 'bridge'"
                          class="ml-2 flex items-center gap-2 md:ml-4"
                        >
                          <span>桥接网卡</span>
                          <select
                            v-model="primaryNetwork.source"
                            class="w-32 max-w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
                          >
                            <option v-for="item in bridgeInterfaces" :key="item.name" :value="item.name">
                              {{ item.name }}
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <div
                  v-if="creationJob"
                  class="space-y-2 rounded-lg border border-gray-200 p-3.5 dark:border-gray-700"
                >
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 class="text-sm font-medium text-gray-800 dark:text-white/90">创建任务</h3>
                      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {{ creationJob.vmName }} · {{ describeJobStage(creationJob.stage) }}
                      </p>
                    </div>
                    <span
                      :class="[
                        'inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold',
                        creationJob.status === 'succeeded'
                          ? 'bg-success-500/10 text-success-500'
                          : creationJob.status === 'failed'
                            ? 'bg-error-500/10 text-error-500'
                            : 'bg-brand-500/10 text-brand-500',
                      ]"
                    >
                      {{ describeJobStatus(creationJob.status) }}
                    </span>
                  </div>

                  <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                    {{ creationJob.message }}
                  </div>

                  <div v-if="creationJob.error" class="text-sm text-error-600 dark:text-error-300">
                    {{ creationJob.error }}
                  </div>

                  <div v-if="creationJob.logs.length > 0" class="space-y-2">
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-300">最近日志</p>
                    <div class="max-h-48 space-y-2 overflow-auto rounded-lg bg-gray-950 p-3 text-xs font-mono text-gray-100">
                      <div v-for="log in recentJobLogs" :key="`${log.timestamp}-${log.message}`">
                        <span class="text-gray-400">[{{ formatJobTime(log.timestamp) }}]</span>
                        <span :class="log.level === 'error' ? 'text-error-300' : 'text-brand-300'">
                          {{ log.level.toUpperCase() }}
                        </span>
                        <span>{{ log.message }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex justify-end gap-3 pt-0.5">
                  <button
                    type="button"
                    @click="closeCreateDialog"
                    class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    :disabled="createSubmitDisabled"
                    class="rounded-lg border border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-400 dark:text-brand-300 dark:hover:bg-brand-500/10"
                  >
                    创建
                  </button>
                  <button
                    type="button"
                    @click="handleCreateVM('create_and_run')"
                    :disabled="createSubmitDisabled"
                    class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    创建并运行
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div class="p-6">
          <div v-if="loading" class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            <p class="mt-4 text-gray-600 dark:text-gray-400">{{ $t('common.loading') }}</p>
          </div>
          <div v-else-if="vms.length === 0" class="text-center py-12">
            <p class="text-gray-600 dark:text-gray-400">{{ $t('common.noVMs') }}</p>
            <button
              @click="openCreateDialog"
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
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">内存</th>
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
                        v-if="vm.status !== 'stopped'"
                        @click="powerOffVM(vm.name)"
                        class="px-2 py-1 text-xs bg-error-800 text-white rounded hover:bg-error-900 transition-colors whitespace-nowrap dark:bg-error-700 dark:hover:bg-error-800"
                        title="断电"
                      >
                        断电
                      </button>
                      <button
                        v-if="vm.status === 'running'"
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
                        @click="openDeleteVMDialog(vm.name)"
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

    <Modal
      :is-open="deleteVmDialogOpen"
      class-name="mx-4 max-w-md overflow-hidden"
      overlay-class-name="bg-black/45"
      @close="cancelDeleteVMDialog"
    >
      <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">删除虚拟机</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ deleteTargetVmName ? `确定删除虚拟机 ${deleteTargetVmName} 吗？` : '确定删除当前虚拟机吗？' }}
        </p>
      </div>

      <div class="px-5 py-5 text-sm text-gray-600 dark:text-gray-400">
        <p>默认只会删除虚拟机定义，不会删除磁盘文件。</p>
        <label class="mt-4 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
          <input
            v-model="deleteVmRemoveFiles"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-error-600 focus:ring-error-500 dark:border-gray-600 dark:bg-gray-700"
          />
          <span>同时删除磁盘文件</span>
        </label>
        <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
          仅会删除磁盘设备对应的文件，不会删除光驱 ISO 文件。
        </p>
      </div>

      <div class="flex justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
        <button
          @click="cancelDeleteVMDialog"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          取消
        </button>
        <button
          @click="confirmDeleteVM"
          :disabled="deleteVmSaving || !deleteTargetVmName"
          class="rounded-lg bg-error-600 px-3 py-2 text-sm text-white hover:bg-error-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-error-500 dark:hover:bg-error-600"
        >
          删除
        </button>
      </div>
    </Modal>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import Modal from '@/components/ui/Modal.vue'
import {
  virtualMachinesApi,
  type CreateVMRequest,
  type VMCapabilities,
  type VMCreationJob,
  type VMOsOption,
  type VirtualMachine,
} from '@/api/virtualMachines'

const { t: $t } = useI18n()

type MemoryUnit = 'MiB' | 'GiB'
type InstallSourceType = 'local_iso' | 'existing_disk'
type DiskFormKind = 'new_disk_at_path' | 'existing_disk'
type DiskFormat = 'qcow2' | 'raw'
type DiskBus = 'virtio' | 'sata' | 'scsi'
type NetworkFormMode = 'bridge' | 'none'

interface DiskFormState {
  id: string
  kind: DiskFormKind
  path: string
  sizeGiB: number
  format: DiskFormat
  bus: DiskBus
}

interface NetworkFormState {
  id: string
  mode: NetworkFormMode
  source: string
}

interface CreateFormState {
  name: string
  osId: string
  cpuSockets: number
  cpuCores: number
  cpuThreads: number
  memoryValue: number
  memoryUnit: MemoryUnit
  installSourceType: InstallSourceType
  isoPath: string
  disks: DiskFormState[]
  networks: NetworkFormState[]
  firmware: 'bios' | 'uefi'
  graphics: 'vnc' | 'none'
  startMode: 'create_and_run' | 'create_and_edit'
}

const FALLBACK_VM_OS_OPTIONS: VMOsOption[] = [
  {
    id: 'generic',
    label: '通用 / 未识别系统',
  },
  {
    id: 'ubuntu24.04',
    label: 'Ubuntu 24.04 LTS (ubuntu24.04)',
  },
  {
    id: 'ubuntu22.04',
    label: 'Ubuntu 22.04 LTS (ubuntu22.04)',
  },
  {
    id: 'debian12',
    label: 'Debian 12 (debian12)',
  },
  {
    id: 'debian11',
    label: 'Debian 11 (debian11)',
  },
]

let createFormItemSequence = 0

const nextCreateFormItemId = (prefix: string) => {
  createFormItemSequence += 1
  return `${prefix}-${createFormItemSequence}`
}

const loading = ref(false)
const vms = ref<VirtualMachine[]>([])
const showCreateDialog = ref(false)
const deleteVmDialogOpen = ref(false)
const deleteTargetVmName = ref('')
const deleteVmRemoveFiles = ref(false)
const deleteVmSaving = ref(false)
const creating = ref(false)
const capabilitiesLoading = ref(false)
const capabilitiesError = ref('')
const capabilities = ref<VMCapabilities | null>(null)
const creationJob = ref<VMCreationJob | null>(null)

let refreshInterval: number | undefined
let createJobPollInterval: number | undefined

const bridgeInterfaces = computed(() => capabilities.value?.bridgeInterfaces || [])

const availableOsOptions = computed(() => {
  if ((capabilities.value?.osOptions || []).length > 0) {
    return capabilities.value?.osOptions || []
  }
  return FALLBACK_VM_OS_OPTIONS
})

const hostRequirementError = computed(() => {
  if (!capabilities.value) return ''
  const { virsh, virtInstall } = capabilities.value.tools
  if (!virsh || !virtInstall) {
    return '宿主机缺少 virsh 或 virt-install，当前无法创建虚拟机'
  }
  return ''
})

const creationJobRunning = computed(() => {
  return creationJob.value?.status === 'queued' || creationJob.value?.status === 'running'
})

const createSubmitDisabled = computed(() => {
  return creating.value || creationJobRunning.value || capabilitiesLoading.value || !!hostRequirementError.value
})

const recentJobLogs = computed(() => creationJob.value?.logs.slice(-12) || [])

const getDefaultDiskFormat = (): DiskFormat => {
  return capabilities.value?.defaults.diskFormat === 'raw' ? 'raw' : 'qcow2'
}

const getDefaultDiskBus = (): DiskBus => {
  if (capabilities.value?.defaults.diskBus === 'sata') return 'sata'
  if (capabilities.value?.defaults.diskBus === 'scsi') return 'scsi'
  return 'virtio'
}

const getDefaultDiskSizeGiB = () => {
  const size = Math.round(capabilities.value?.defaults.diskSizeGiB || 20)
  return Math.max(1, size)
}

const getPreferredNetworkMode = (): NetworkFormMode => {
  if (capabilities.value?.defaults.networkMode === 'bridge' && bridgeInterfaces.value.length > 0) {
    return 'bridge'
  }
  if (bridgeInterfaces.value.length > 0) {
    return 'bridge'
  }
  return 'none'
}

const resolveNetworkMode = (mode: NetworkFormMode): NetworkFormMode => {
  if (mode === 'none') return 'none'
  if (bridgeInterfaces.value.length > 0) return 'bridge'
  return 'none'
}

const resolveNetworkSource = (mode: NetworkFormMode, currentSource = '') => {
  const resolvedMode = resolveNetworkMode(mode)
  if (resolvedMode === 'none') {
    return ''
  }
  if (bridgeInterfaces.value.some((item) => item.name === currentSource)) {
    return currentSource
  }
  const preferred = capabilities.value?.defaults.networkSource || ''
  if (bridgeInterfaces.value.some((item) => item.name === preferred)) {
    return preferred
  }
  return bridgeInterfaces.value[0]?.name || ''
}

const createDiskForm = (
  kind: DiskFormKind = 'new_disk_at_path',
  overrides: Partial<Omit<DiskFormState, 'id' | 'kind'>> = {},
): DiskFormState => {
  return {
    id: nextCreateFormItemId('disk'),
    kind,
    path: '',
    sizeGiB: getDefaultDiskSizeGiB(),
    format: getDefaultDiskFormat(),
    bus: getDefaultDiskBus(),
    ...overrides,
  }
}

const normalizeDiskForm = (current: DiskFormState | undefined, kind: DiskFormKind): DiskFormState => {
  const next = createDiskForm(kind)
  return {
    ...next,
    id: current?.id || next.id,
    path: current && current.kind === kind ? current.path : '',
    bus: current?.bus || next.bus,
    sizeGiB:
      kind === 'new_disk_at_path' &&
      current &&
      current.kind === 'new_disk_at_path' &&
      Number.isFinite(current.sizeGiB) &&
      current.sizeGiB > 0
        ? Math.round(current.sizeGiB)
        : next.sizeGiB,
    format:
      kind === 'new_disk_at_path' && current && current.kind === 'new_disk_at_path'
        ? current.format
        : next.format,
  }
}

const createPrimaryDiskForm = (installSourceType: InstallSourceType): DiskFormState => {
  return installSourceType === 'existing_disk'
    ? createDiskForm('existing_disk')
    : createDiskForm('new_disk_at_path')
}

const createNetworkForm = (
  mode: NetworkFormMode = getPreferredNetworkMode(),
): NetworkFormState => {
  const resolvedMode = resolveNetworkMode(mode)
  return {
    id: nextCreateFormItemId('nic'),
    mode: resolvedMode,
    source: resolveNetworkSource(resolvedMode),
  }
}

const defaultCreateForm = (): CreateFormState => ({
  name: '',
  osId: 'generic',
  cpuSockets: 1,
  cpuCores: 2,
  cpuThreads: 1,
  memoryValue: 2,
  memoryUnit: 'GiB',
  installSourceType: 'local_iso',
  isoPath: '',
  disks: [createPrimaryDiskForm('local_iso')],
  networks: [createNetworkForm()],
  firmware: 'bios',
  graphics: 'vnc',
  startMode: 'create_and_run',
})

const createForm = ref<CreateFormState>(defaultCreateForm())
const primaryDisk = computed(
  () => createForm.value.disks[0] || createPrimaryDiskForm(createForm.value.installSourceType)
)
const primaryNetwork = computed(() => createForm.value.networks[0] || createNetworkForm())
const lastAutoIsoDiskPath = ref('')
const totalVcpu = computed(() => {
  const sockets = Math.max(1, Math.round(Number(createForm.value.cpuSockets) || 1))
  const cores = Math.max(1, Math.round(Number(createForm.value.cpuCores) || 1))
  const threads = Math.max(1, Math.round(Number(createForm.value.cpuThreads) || 1))
  return sockets * cores * threads
})

const buildDefaultIsoDiskPath = () => {
  const vmName = createForm.value.name.trim()
  if (!vmName) return ''
  return `/var/lib/libvirt/images/${vmName}.${primaryDisk.value.format}`
}

const syncDefaultIsoDiskPath = (force = false) => {
  if (createForm.value.installSourceType !== 'local_iso') {
    lastAutoIsoDiskPath.value = ''
    return
  }

  const disk = createForm.value.disks[0]
  if (!disk || disk.kind !== 'new_disk_at_path') return

  const nextPath = buildDefaultIsoDiskPath()
  const currentPath = disk.path.trim()
  if (force || !currentPath || currentPath === lastAutoIsoDiskPath.value) {
    disk.path = nextPath
  }
  lastAutoIsoDiskPath.value = nextPath
}

const refreshVMs = async () => {
  loading.value = true
  try {
    const data = await virtualMachinesApi.getVMs()
    vms.value = data || []
  } catch (error: any) {
    console.error('获取虚拟机列表失败:', error)
    vms.value = []
    if (error?.error?.includes('未提供认证令牌') || error?.error?.includes('无效的认证令牌')) {
      return
    }
  } finally {
    loading.value = false
  }
}

const applyCapabilitiesDefaults = () => {
  if (!capabilities.value) return
  const defaults = capabilities.value.defaults
  const defaultOsId = defaults.osId || availableOsOptions.value[0]?.id || 'generic'

  if (
    !createForm.value.osId ||
    createForm.value.osId === 'generic' ||
    !availableOsOptions.value.some((option) => option.id === createForm.value.osId)
  ) {
    createForm.value.osId = defaultOsId
  }

  createForm.value.firmware = defaults.firmware || createForm.value.firmware
  createForm.value.graphics = defaults.graphics || createForm.value.graphics
  createForm.value.startMode = defaults.startMode || createForm.value.startMode

  if (defaults.memoryMiB >= 1024) {
    createForm.value.memoryUnit = 'GiB'
    createForm.value.memoryValue = Math.max(1, Math.round(defaults.memoryMiB / 1024))
  } else {
    createForm.value.memoryUnit = 'MiB'
    createForm.value.memoryValue = defaults.memoryMiB
  }

  if (createForm.value.disks.length === 0) {
    createForm.value.disks = [createPrimaryDiskForm(createForm.value.installSourceType)]
  }

  const diskKind =
    createForm.value.installSourceType === 'existing_disk' ? 'existing_disk' : 'new_disk_at_path'
  const primaryDisk = normalizeDiskForm(createForm.value.disks[0], diskKind)
  primaryDisk.path = createForm.value.disks[0]?.path || ''
  createForm.value.disks = [primaryDisk]
  syncDefaultIsoDiskPath()

  const primaryNetwork = createForm.value.networks[0] || createNetworkForm()
  const networkMode = resolveNetworkMode(primaryNetwork.mode)
  createForm.value.networks = [
    {
      ...primaryNetwork,
      mode: networkMode,
      source: resolveNetworkSource(networkMode, primaryNetwork.source),
    },
  ]
}

const loadCapabilities = async (force = false) => {
  if (!force && capabilities.value) return
  capabilitiesLoading.value = true
  capabilitiesError.value = ''
  try {
    capabilities.value = await virtualMachinesApi.getVmCapabilities()
    applyCapabilitiesDefaults()
  } catch (error: any) {
    console.error('获取虚机能力失败:', error)
    capabilitiesError.value = error?.error || error?.message || '获取宿主机虚机能力失败'
  } finally {
    capabilitiesLoading.value = false
  }
}

const resetCreateState = () => {
  createForm.value = defaultCreateForm()
  creationJob.value = null
  applyCapabilitiesDefaults()
}

const stopCreateJobPolling = () => {
  if (createJobPollInterval) {
    clearInterval(createJobPollInterval)
    createJobPollInterval = undefined
  }
}

const pollCreateJob = async (jobId: string) => {
  try {
    const job = await virtualMachinesApi.getVMCreationJob(jobId)
    creationJob.value = job
    if (job.status === 'succeeded') {
      stopCreateJobPolling()
      alert(job.message || '虚拟机创建成功')
      showCreateDialog.value = false
      resetCreateState()
      await refreshVMs()
    } else if (job.status === 'failed') {
      stopCreateJobPolling()
    }
  } catch (error: any) {
    console.error('获取虚机创建任务失败:', error)
    stopCreateJobPolling()
    if (!creationJob.value || creationJob.value.status === 'queued' || creationJob.value.status === 'running') {
      creationJob.value = {
        id: jobId,
        vmName: createForm.value.name,
        status: 'failed',
        stage: 'failed',
        message: error?.error || error?.message || '获取创建任务状态失败',
        error: error?.error || error?.message || '获取创建任务状态失败',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: null,
        finishedAt: new Date().toISOString(),
        logs: [],
        result: null,
      }
    }
  }
}

const startCreateJobPolling = async (jobId: string) => {
  stopCreateJobPolling()
  await pollCreateJob(jobId)
  createJobPollInterval = setInterval(() => {
    void pollCreateJob(jobId)
  }, 1500) as unknown as number
}

const openCreateDialog = async () => {
  showCreateDialog.value = true
  await loadCapabilities()
  if (!creationJobRunning.value && !creationJob.value) {
    applyCapabilitiesDefaults()
  }
}

const closeCreateDialog = () => {
  showCreateDialog.value = false
  stopCreateJobPolling()
}

const handleInstallSourceTypeChange = () => {
  const diskKind =
    createForm.value.installSourceType === 'existing_disk' ? 'existing_disk' : 'new_disk_at_path'
  const primaryDisk = normalizeDiskForm(createForm.value.disks[0], diskKind)
  primaryDisk.path = ''
  createForm.value.disks = [primaryDisk]

  if (createForm.value.installSourceType === 'existing_disk') {
    createForm.value.isoPath = ''
  }

  syncDefaultIsoDiskPath(true)
}

const handleNetworkModeChange = () => {
  const current = createForm.value.networks[0]
  if (!current) return

  const mode = resolveNetworkMode(current.mode)
  createForm.value.networks = [
    {
      ...current,
      mode,
      source: resolveNetworkSource(mode),
    },
  ]
}

watch(
  () => [createForm.value.installSourceType, createForm.value.name.trim(), primaryDisk.value.format],
  () => {
    syncDefaultIsoDiskPath()
  }
)

const buildCreateRequest = (startMode: CreateVMRequest['startMode']): CreateVMRequest => {
  const memoryMiB =
    createForm.value.memoryUnit === 'GiB'
      ? Math.round(createForm.value.memoryValue * 1024)
      : Math.round(createForm.value.memoryValue)

  const installSource: CreateVMRequest['installSource'] =
    createForm.value.installSourceType === 'local_iso'
      ? {
          type: 'local_iso',
          path: createForm.value.isoPath.trim(),
        }
      : {
          type: 'existing_disk',
        }

  const disk = primaryDisk.value
  const disks: CreateVMRequest['disks'] = [
    disk.kind === 'existing_disk'
      ? {
          kind: 'existing_disk',
          path: disk.path.trim(),
          bus: disk.bus,
        }
        : {
            kind: 'new_disk_at_path',
            path: disk.path.trim(),
            sizeGiB: Math.round(disk.sizeGiB),
            format: disk.format,
            bus: disk.bus,
          }
  ]

  const network = primaryNetwork.value
  const networks: CreateVMRequest['networks'] = [
    !network || network.mode === 'none'
      ? {
          mode: 'none',
        }
      : network.mode === 'bridge'
        ? {
            mode: 'bridge',
            source: network.source,
          }
        : {
            mode: 'network',
            source: network.source,
          },
  ]

  return {
    name: createForm.value.name.trim(),
    osId: createForm.value.osId.trim() || 'generic',
    vcpu: totalVcpu.value,
    memoryMiB,
    installSource,
    disks,
    networks,
    firmware: createForm.value.firmware,
    tpm: false,
    graphics: createForm.value.graphics,
    startMode,
  }
}

const handleCreateVM = async (startMode: CreateVMRequest['startMode']) => {
  if (!capabilities.value) {
    alert('宿主机能力尚未加载完成')
    return
  }

  creating.value = true
  try {
    const response = await virtualMachinesApi.createVM(buildCreateRequest(startMode))
    creationJob.value = {
      id: response.jobId,
      vmName: response.vmName,
      status: 'queued',
      stage: 'queued',
      message: response.message,
      error: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      logs: [],
      result: null,
    }
    await startCreateJobPolling(response.jobId)
  } catch (error: any) {
    console.error('创建虚拟机失败:', error)
    creationJob.value = null
    alert(error?.error || error?.message || '创建虚拟机失败，请重试')
  } finally {
    creating.value = false
  }
}

const describeJobStatus = (status: string) => {
  if (status === 'succeeded') return '已完成'
  if (status === 'failed') return '失败'
  if (status === 'running') return '执行中'
  return '排队中'
}

const describeJobStage = (stage: string) => {
  const labels: Record<string, string> = {
    queued: '已入队',
    validating: '校验参数',
    creating_storage: '准备磁盘',
    generating_definition: '生成定义',
    defining_domain: '写入 libvirt',
    starting_domain: '启动虚机',
    completed: '已完成',
    failed: '失败',
  }
  return labels[stage] || stage
}

const formatJobTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString()
}

const startVM = async (name: string) => {
  try {
    await virtualMachinesApi.startVM(name)
    alert('虚拟机启动成功')
    await refreshVMs()
  } catch (error: any) {
    console.error('启动虚拟机失败:', error)
    const errorMsg =
      error?.error || error?.message || (typeof error === 'string' ? error : '启动虚拟机失败')
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

const powerOffVM = async (name: string) => {
  if (!confirm(`确定要强制断电虚拟机 ${name} 吗？`)) {
    return
  }

  try {
    await virtualMachinesApi.powerOffVM(name)
    alert('虚拟机已断电')
    await refreshVMs()
  } catch (error: any) {
    console.error('断电虚拟机失败:', error)
    alert(error?.error || '虚拟机断电失败')
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

const openDeleteVMDialog = (name: string) => {
  deleteTargetVmName.value = name
  deleteVmRemoveFiles.value = false
  deleteVmDialogOpen.value = true
}

const cancelDeleteVMDialog = () => {
  deleteVmDialogOpen.value = false
  deleteTargetVmName.value = ''
  deleteVmRemoveFiles.value = false
}

const confirmDeleteVM = async () => {
  if (!deleteTargetVmName.value) return
  deleteVmSaving.value = true
  try {
    const result = await virtualMachinesApi.deleteVM(deleteTargetVmName.value, {
      deleteFile: deleteVmRemoveFiles.value,
    })
    cancelDeleteVMDialog()
    if (result?.message && result.message !== '虚拟机删除成功') {
      alert(result.message)
    } else {
      alert('虚拟机删除成功')
    }
    await refreshVMs()
  } catch (error: any) {
    console.error('删除虚拟机失败:', error)
    alert(error?.error || '删除虚拟机失败')
  } finally {
    deleteVmSaving.value = false
  }
}

const openConsole = async (name: string) => {
  try {
    const consoleInfo = await virtualMachinesApi.getVMConsole(name)
    const url = consoleInfo?.consoleUrl || `/virtual-machines/${name}/console`
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (error: any) {
    console.error('打开控制台失败:', error)
    const errorMsg =
      error?.error || error?.message || (typeof error === 'string' ? error : '打开控制台失败')
    alert(`打开控制台失败: ${errorMsg}`)
  }
}

onMounted(() => {
  void refreshVMs()
  void loadCapabilities()
  refreshInterval = setInterval(() => {
    void refreshVMs()
  }, 30000) as unknown as number
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  stopCreateJobPolling()
})
</script>
