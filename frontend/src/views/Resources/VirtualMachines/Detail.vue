<template>
  <AdminLayout>
    <div class="p-4 xl:p-5">
      <div class="space-y-4">
        <section
          class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-100/70 dark:border-gray-800 dark:bg-white/[0.03] dark:shadow-none"
        >
          <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div class="min-w-0">
              <button
                @click="$router.back()"
                class="mb-2 flex items-center text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
              >
                <svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                返回列表
              </button>

              <div class="flex flex-wrap items-center gap-3">
                <h1 class="truncate text-2xl font-semibold tracking-tight text-gray-800 dark:text-white/90">
                  {{ vmName }}
                </h1>
                <span
                  v-if="detailHeaderReady"
                  :class="[
                    'inline-flex rounded-full px-3 py-1 text-sm font-medium',
                    vm.status === 'running'
                      ? 'bg-success-500/10 text-success-600 dark:text-success-400'
                      : vm.status === 'paused'
                        ? 'bg-warning-500/10 text-warning-600 dark:text-warning-400'
                        : 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
                  ]"
                >
                  {{ statusLabel }}
                </span>
                <span
                  v-if="detailHeaderReady && !canEditConfig"
                  class="inline-flex rounded-full bg-warning-500/10 px-3 py-1 text-sm text-warning-700 dark:text-warning-300"
                >
                  运行中仅可查看配置
                </span>
              </div>
            </div>

            <div v-if="detailHeaderReady" class="flex flex-wrap justify-end gap-2">
              <button
                v-if="vm.status === 'stopped'"
                @click="startVM"
                class="rounded-lg bg-success-600 px-3.5 py-2 text-sm text-white hover:bg-success-700 dark:bg-success-500 dark:hover:bg-success-600"
              >
                启动
              </button>
              <button
                v-if="vm.status === 'running'"
                @click="stopVM"
                class="rounded-lg bg-error-600 px-3.5 py-2 text-sm text-white hover:bg-error-700 dark:bg-error-500 dark:hover:bg-error-600"
              >
                停止
              </button>
              <button
                v-if="vm.status !== 'stopped'"
                @click="powerOffVM"
                class="rounded-lg bg-error-800 px-3.5 py-2 text-sm text-white hover:bg-error-900 dark:bg-error-700 dark:hover:bg-error-800"
              >
                断电
              </button>
              <button
                v-if="vm.status === 'running'"
                @click="restartVM"
                class="rounded-lg bg-warning-600 px-3.5 py-2 text-sm text-white hover:bg-warning-700 dark:bg-warning-500 dark:hover:bg-warning-600"
              >
                重启
              </button>
              <button
                v-if="vm.status === 'running'"
                @click="suspendVM"
                class="rounded-lg bg-warning-600 px-3.5 py-2 text-sm text-white hover:bg-warning-700 dark:bg-warning-500 dark:hover:bg-warning-600"
              >
                暂停
              </button>
              <button
                v-if="vm.status === 'paused'"
                @click="resumeVM"
                class="rounded-lg bg-success-600 px-3.5 py-2 text-sm text-white hover:bg-success-700 dark:bg-success-500 dark:hover:bg-success-600"
              >
                恢复
              </button>
              <button
                v-if="vm.status !== 'stopped'"
                @click="openConsole"
                class="rounded-lg bg-brand-500 px-3.5 py-2 text-sm text-white hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-600"
              >
                控制台
              </button>
              <button
                @click="openDeleteVMDialog"
                class="rounded-lg bg-error-600 px-3.5 py-2 text-sm text-white hover:bg-error-700 dark:bg-error-500 dark:hover:bg-error-600"
              >
                删除
              </button>
            </div>
          </div>

        </section>

        <div
          v-if="loading"
          class="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
        >
          正在加载虚机详情...
        </div>

        <div
          v-else-if="loadError"
          class="rounded-xl border border-error-200 bg-error-50 p-6 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
        >
          {{ loadError }}
        </div>

        <div v-else class="space-y-4">
          <div class="grid gap-4 xl:items-start xl:grid-cols-[500px_minmax(0,1fr)]">
            <section
              ref="leftSummaryPanel"
              class="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm shadow-gray-100/60 dark:border-gray-800 dark:bg-white/[0.03] dark:shadow-none xl:self-start"
            >
              <div class="p-4">
                <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">基本信息</h2>
                <div class="mt-4 space-y-3">
                  <div
                    v-for="item in basicInfoItems"
                    :key="item.label"
                    class="flex items-start gap-4 text-sm"
                  >
                    <span class="w-24 shrink-0 text-gray-600 dark:text-gray-400">{{ item.label }}</span>
                    <span
                      :class="[
                        'min-w-0 flex-1 break-all text-right font-medium text-gray-800 dark:text-white/90',
                        item.label === 'UUID' ? 'font-mono text-[13px] leading-5' : '',
                      ]"
                    >
                      {{ item.value }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="border-t border-gray-200 p-4 dark:border-gray-800">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">配置</h2>
                  </div>
                  <span
                    class="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-white/5 dark:text-gray-400"
                  >
                    {{ editStatusLabel }}
                  </span>
                </div>

                <div class="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
                  <div class="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 py-3">
                    <p class="text-sm font-medium text-gray-800 dark:text-white/90">内存</p>
                    <p class="min-w-0 text-sm text-gray-600 dark:text-gray-400">{{ memoryLabel }}</p>
                    <button
                      :disabled="!canEditConfig"
                      @click="openMemoryEditor"
                      class="text-sm text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-brand-400"
                    >
                      编辑
                    </button>
                  </div>

                  <div class="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 py-3">
                    <p class="text-sm font-medium text-gray-800 dark:text-white/90">CPU</p>
                    <p class="min-w-0 text-sm text-gray-600 dark:text-gray-400">{{ cpuTopologyLabel }}</p>
                    <button
                      :disabled="!canEditConfig"
                      @click="openCpuEditor"
                      class="text-sm text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-brand-400"
                    >
                      编辑
                    </button>
                  </div>

                  <div class="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 py-3">
                    <p class="text-sm font-medium text-gray-800 dark:text-white/90">启动顺序</p>
                    <p class="min-w-0 text-sm text-gray-600 dark:text-gray-400">{{ bootOrderLabel }}</p>
                    <button
                      :disabled="!canEditConfig || bootDevices.length === 0"
                      @click="openBootEditor"
                      class="text-sm text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-brand-400"
                    >
                      编辑
                    </button>
                  </div>
                </div>

              </div>

              <div class="border-t border-gray-200 p-4 dark:border-gray-800">
                <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">使用</h2>

                <div class="mt-4 space-y-5">
                  <div>
                    <div class="flex items-center justify-between gap-3">
                      <span class="text-sm font-medium text-gray-800 dark:text-white/90">内存</span>
                      <span class="text-sm text-gray-600 dark:text-gray-400">{{ memoryUsageValueLabel }}</span>
                    </div>
                    <div class="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div class="h-full rounded-full bg-brand-500" :style="{ width: memoryUsageWidth }"></div>
                    </div>
                  </div>

                  <div>
                    <div class="flex items-center justify-between gap-3">
                      <span class="text-sm font-medium text-gray-800 dark:text-white/90">CPU</span>
                      <span class="text-sm text-gray-600 dark:text-gray-400">{{ cpuUsageValueLabel }}</span>
                    </div>
                    <div class="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div class="h-full rounded-full bg-success-500" :style="{ width: cpuUsageWidth }"></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section
              :style="monitorPanelStyle"
              class="box-border overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm shadow-gray-100/60 dark:border-gray-800 dark:bg-white/[0.03] dark:shadow-none xl:grid xl:self-start xl:grid-rows-[auto_minmax(0,1fr)] xl:gap-3"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">运行监控</h2>
                  <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">每 5 秒刷新一次资源状态</p>
                </div>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ vm.status === 'running' ? '虚机运行中' : '虚机未运行，监控数据已清空' }}
                </span>
              </div>

              <div class="mt-3 space-y-3 xl:mt-0 xl:grid xl:h-full xl:min-h-0 xl:gap-3 xl:space-y-0 xl:[grid-template-rows:repeat(3,minmax(0,1fr))]">
                <div class="rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-white/[0.02] xl:flex xl:min-h-0 xl:flex-col">
                  <div class="mb-2 flex items-center justify-between">
                    <h3 class="text-sm font-semibold text-gray-800 dark:text-white/90">CPU 状态</h3>
                    <span class="text-sm font-medium text-gray-800 dark:text-white/90">{{ vm.cpuUsage || 0 }}%</span>
                  </div>
                  <div class="min-h-[72px] xl:min-h-0 xl:flex-1">
                    <VueApexCharts type="area" height="100%" :options="cpuChartOptions" :series="cpuChartSeries" />
                  </div>
                </div>

                <div class="rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-white/[0.02] xl:flex xl:min-h-0 xl:flex-col">
                  <div class="mb-2 flex items-center justify-between">
                    <h3 class="text-sm font-semibold text-gray-800 dark:text-white/90">内存状态</h3>
                    <span class="text-sm font-medium text-gray-800 dark:text-white/90">{{ memoryMonitorValueLabel }}</span>
                  </div>
                  <div class="min-h-[72px] xl:min-h-0 xl:flex-1">
                    <VueApexCharts type="area" height="100%" :options="memoryChartOptions" :series="memoryChartSeries" />
                  </div>
                </div>

                <div class="rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-white/[0.02] xl:flex xl:min-h-0 xl:flex-col">
                  <div class="mb-2 flex items-center justify-between">
                    <h3 class="text-sm font-semibold text-gray-800 dark:text-white/90">网络状态</h3>
                    <span class="text-sm font-medium text-gray-800 dark:text-white/90">{{ vm.networkUsage || 0 }}%</span>
                  </div>
                  <div class="min-h-[72px] xl:min-h-0 xl:flex-1">
                    <VueApexCharts type="area" height="100%" :options="networkChartOptions" :series="networkChartSeries" />
                  </div>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-500">近 5 秒吞吐：{{ networkMbps.toFixed(2) }} Mbps</p>
                </div>
              </div>
            </section>
          </div>

          <section
            class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-100/60 dark:border-gray-800 dark:bg-white/[0.03] dark:shadow-none"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">磁盘</h2>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">磁盘和光驱设备</p>
              </div>
              <button
                :disabled="!canEditConfig"
                @click="openNewDiskDialog"
                class="rounded-lg border border-brand-200 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500/10"
              >
                添加磁盘
              </button>
            </div>

            <div class="mt-4 overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <th class="px-4 py-3 font-medium">设备</th>
                    <th class="px-4 py-3 font-medium">已使用</th>
                    <th class="px-4 py-3 font-medium">容量</th>
                    <th class="px-4 py-3 font-medium">总线</th>
                    <th class="px-4 py-3 font-medium">访问</th>
                    <th class="px-4 py-3 font-medium">源</th>
                    <th class="px-4 py-3 font-medium">路径</th>
                    <th class="px-4 py-3 font-medium">格式</th>
                    <th class="px-4 py-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                  <tr v-for="cdrom in cdromDevices" :key="`cdrom-${cdrom.target}`">
                    <td class="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                      <div class="flex flex-wrap items-center gap-2">
                        <span>{{ cdrom.target || '光驱' }}</span>
                        <span class="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-white/5 dark:text-gray-400">
                          光驱
                        </span>
                        <span
                          v-if="isBootTarget(cdrom.target)"
                          class="inline-flex rounded-full bg-brand-500/10 px-2 py-0.5 text-xs text-brand-600 dark:text-brand-300"
                        >
                          启动盘
                        </span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {{ formatStorageBytes(cdrom.actualSizeBytes) }}
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {{ formatStorageBytes(cdrom.capacityBytes) }}
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ cdrom.bus || 'sata' }}</td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">只读</td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">ISO</td>
                    <td class="px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-400">{{ cdrom.source || '-' }}</td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ cdrom.format || '-' }}</td>
                    <td class="px-4 py-3">
                      <div class="flex justify-end gap-2">
                        <button
                          :disabled="!canEditConfig || cdromSaving"
                          @click="cdrom.source ? openCdromEjectDialog(cdrom.target) : openCdromInsertDialog(cdrom.target)"
                          class="rounded-lg border border-brand-200 px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500/10"
                        >
                          {{ cdrom.source ? '弹出' : '插入' }}
                        </button>
                        <button
                          :disabled="!canEditConfig || cdromSaving"
                          @click="openCdromDeleteDialog(cdrom.target)"
                          class="rounded-lg border border-error-300 px-3 py-1.5 text-sm text-error-600 hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-error-500/40 dark:text-error-300 dark:hover:bg-error-500/10"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>

                  <tr v-for="disk in diskDevices" :key="disk.target">
                    <td class="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                      <div class="flex flex-wrap items-center gap-2">
                        <span>{{ disk.target }}</span>
                        <span class="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-white/5 dark:text-gray-400">
                          {{ diskRoleLabel(disk.role) }}
                        </span>
                        <span
                          v-if="isBootTarget(disk.target)"
                          class="inline-flex rounded-full bg-brand-500/10 px-2 py-0.5 text-xs text-brand-600 dark:text-brand-300"
                        >
                          启动盘
                        </span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ formatStorageBytes(disk.actualSizeBytes) }}</td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ formatStorageBytes(disk.capacityBytes) }}</td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ disk.bus }}</td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ storageAccessLabel(disk.readonly) }}</td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ storageSourceLabel(disk.sourceType) }}</td>
                    <td class="px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-400">{{ disk.source || '-' }}</td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ disk.format || '-' }}</td>
                    <td class="px-4 py-3">
                      <div class="flex justify-end gap-2">
                        <button
                          :disabled="!canEditConfig"
                          @click="openDiskEditor(disk.target)"
                          class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:border-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                        >
                          编辑
                        </button>
                        <button
                          :disabled="!canEditConfig"
                          @click="openDiskDeleteDialog(disk.target)"
                          class="rounded-lg border border-error-300 px-3 py-1.5 text-sm text-error-600 hover:bg-error-50 dark:border-error-500/40 dark:text-error-300 dark:hover:bg-error-500/10"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>

                  <tr v-if="cdromDevices.length === 0 && diskDevices.length === 0">
                    <td colspan="9" class="px-4 py-8 text-center text-sm text-gray-600 dark:text-gray-400">暂无磁盘设备</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section
            class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-100/60 dark:border-gray-800 dark:bg-white/[0.03] dark:shadow-none"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">网络接口</h2>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">桥接网卡和现有接口</p>
              </div>
              <button
                :disabled="!canEditConfig"
                @click="openNewNetworkDialog"
                class="rounded-lg border border-brand-200 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500/10"
              >
                添加网络接口
              </button>
            </div>

            <div class="mt-4 overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <th class="px-4 py-3 font-medium">类型</th>
                    <th class="px-4 py-3 font-medium">型号类型</th>
                    <th class="px-4 py-3 font-medium">MAC 地址</th>
                    <th class="px-4 py-3 font-medium">源</th>
                    <th class="px-4 py-3 font-medium">IP 地址</th>
                    <th class="px-4 py-3 font-medium">状态</th>
                    <th class="px-4 py-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                  <tr v-for="iface in vm.networkInterfaces" :key="iface.mac || iface.name">
                    <td class="px-4 py-3 text-gray-800 dark:text-white/90">{{ interfaceModeLabel(iface.mode) }}</td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ iface.model || iface.type || 'virtio' }}</td>
                    <td class="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{{ iface.mac || '-' }}</td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ iface.source || '-' }}</td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                      <div v-if="iface.ips?.length" class="space-y-1">
                        <div v-for="ip in iface.ips" :key="(iface.mac || iface.name || 'nic') + '-' + ip">{{ ip }}</div>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ networkStateLabel() }}</td>
                    <td class="px-4 py-3">
                      <div class="flex justify-end gap-2">
                        <button
                          v-if="iface.mode === 'bridge' && iface.mac"
                          :disabled="!canEditConfig"
                          @click="openNetworkEditor(iface.mac)"
                          class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:border-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                        >
                          编辑
                        </button>
                        <button
                          v-if="canEditConfig && iface.mac"
                          @click="removeNetworkInterface(iface.mac)"
                          class="rounded-lg border border-error-300 px-3 py-1.5 text-sm text-error-600 hover:bg-error-50 dark:border-error-500/40 dark:text-error-300 dark:hover:bg-error-500/10"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>

                  <tr v-if="vm.networkInterfaces.length === 0">
                    <td colspan="7" class="px-4 py-8 text-center text-sm text-gray-600 dark:text-gray-400">暂无网络接口</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>

    <Modal
      :is-open="cpuEditing"
      class-name="mx-4 max-w-xl overflow-hidden"
      overlay-class-name="bg-black/45"
      @close="cancelCpuEditor"
    >
      <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">编辑 CPU</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">修改 CPU 拓扑后会直接写入当前虚机配置</p>
      </div>

      <div class="px-5 py-5">
        <div class="grid gap-3 sm:grid-cols-[52px_88px_52px_88px_52px_88px] sm:items-center sm:gap-x-4">
          <label class="text-sm text-gray-600 dark:text-gray-400">插槽</label>
          <input
            v-model.number="cpuMemoryForm.sockets"
            type="number"
            min="1"
            max="64"
            class="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm text-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
          />
          <label class="text-sm text-gray-600 dark:text-gray-400">核心</label>
          <input
            v-model.number="cpuMemoryForm.cores"
            type="number"
            min="1"
            max="64"
            class="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm text-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
          />
          <label class="text-sm text-gray-600 dark:text-gray-400">线程</label>
          <input
            v-model.number="cpuMemoryForm.threads"
            type="number"
            min="1"
            max="64"
            class="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm text-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
          />
        </div>
      </div>

      <div class="flex justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
        <button
          @click="cancelCpuEditor"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300"
        >
          取消
        </button>
        <button
          @click="saveCpuConfig"
          :disabled="cpuSaving"
          class="rounded-lg bg-brand-500 px-3 py-2 text-sm text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          保存
        </button>
      </div>
    </Modal>

    <Modal
      :is-open="memoryEditing"
      class-name="mx-4 max-w-md overflow-hidden"
      overlay-class-name="bg-black/45"
      @close="cancelMemoryEditor"
    >
      <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">编辑内存</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">修改后会直接写入当前虚机配置</p>
      </div>

      <div class="px-5 py-5">
        <div class="flex flex-wrap items-center gap-3">
          <label class="text-sm text-gray-600 dark:text-gray-400">内存</label>
          <input
            v-model.number="cpuMemoryForm.memoryGiB"
            type="number"
            min="1"
            step="1"
            class="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm text-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
          />
          <span class="text-sm text-gray-600 dark:text-gray-400">GiB</span>
        </div>
      </div>

      <div class="flex justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
        <button
          @click="cancelMemoryEditor"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300"
        >
          取消
        </button>
        <button
          @click="saveMemoryConfig"
          :disabled="memorySaving"
          class="rounded-lg bg-brand-500 px-3 py-2 text-sm text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          保存
        </button>
      </div>
    </Modal>

    <Modal
      :is-open="bootEditing"
      class-name="mx-4 max-w-lg overflow-hidden"
      overlay-class-name="bg-black/45"
      @close="cancelBootEditor"
    >
      <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">编辑启动顺序</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">选择虚机开机时优先尝试的引导设备</p>
      </div>

      <div class="space-y-3 px-5 py-5">
        <div class="flex flex-wrap items-center gap-3">
          <label class="text-sm text-gray-600 dark:text-gray-400">启动顺序</label>
          <select
            v-model="bootTargetForm"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 sm:w-72 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
          >
            <option v-for="device in bootDevices" :key="device.target" :value="device.target">
              {{ device.label }}
            </option>
          </select>
        </div>
        <p v-if="selectedBootDevice" class="text-sm text-gray-600 dark:text-gray-400">
          当前将优先从 {{ selectedBootDevice.label }} 引导，其余设备按现有顺序继续尝试。
        </p>
        <p v-if="selectedBootDevice?.hint" class="text-xs text-gray-500 dark:text-gray-400">
          {{ selectedBootDevice.hint }}
        </p>
        <p v-else-if="!selectedBootDevice" class="text-sm text-gray-500 dark:text-gray-400">当前没有可引导设备。</p>
      </div>

      <div class="flex justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
        <button
          @click="cancelBootEditor"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          取消
        </button>
        <button
          @click="saveBootOrder"
          :disabled="bootSaving || !bootTargetForm"
          class="rounded-lg bg-brand-500 px-3 py-2 text-sm text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          保存
        </button>
      </div>
    </Modal>

    <Modal
      :is-open="Boolean(diskEditingTarget)"
      class-name="mx-4 max-w-lg overflow-hidden"
      overlay-class-name="bg-black/45"
      @close="cancelDiskEditor"
    >
      <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">编辑磁盘</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ editingDisk ? `设备 ${editingDisk.target}` : '修改当前磁盘配置' }}
        </p>
      </div>

      <div class="space-y-4 px-5 py-5">
        <div>
          <label class="mb-2 block text-sm text-gray-600 dark:text-gray-400">磁盘总线</label>
          <select
            v-model="systemDiskForm.bus"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
          >
            <option value="virtio">virtio</option>
            <option value="sata">sata</option>
            <option value="scsi">scsi</option>
          </select>
        </div>

        <div>
          <label class="mb-2 block text-sm text-gray-600 dark:text-gray-400">磁盘容量</label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="systemDiskForm.sizeGiB"
              type="number"
              min="1"
              step="1"
              :disabled="!editingDisk?.resizable"
              class="w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm text-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
            />
            <span class="text-sm text-gray-600 dark:text-gray-400">GiB</span>
          </div>
          <p v-if="editingDisk && !editingDisk.resizable" class="mt-2 text-xs text-warning-600 dark:text-warning-400">
            当前磁盘不支持扩容
          </p>
        </div>
      </div>

      <div class="flex justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
        <button
          @click="cancelDiskEditor"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          取消
        </button>
        <button
          @click="saveDiskConfig"
          :disabled="diskSaving"
          class="rounded-lg bg-brand-500 px-3 py-2 text-sm text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          保存
        </button>
      </div>
    </Modal>

    <Modal
      :is-open="Boolean(diskDeleteTarget)"
      class-name="mx-4 max-w-md overflow-hidden"
      overlay-class-name="bg-black/45"
      @close="cancelDiskDeleteDialog"
    >
      <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">删除磁盘</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ deletingDisk ? `确定删除磁盘 ${deletingDisk.target} 吗？` : '确定删除当前磁盘吗？' }}
        </p>
      </div>

      <div class="px-5 py-5 text-sm text-gray-600 dark:text-gray-400">
        <p>默认只会从虚机配置中移除该磁盘。</p>
        <label
          v-if="deletingDisk?.sourceType === 'file' && deletingDisk?.source"
          class="mt-4 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"
        >
          <input
            v-model="diskDeleteRemoveFile"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-error-600 focus:ring-error-500 dark:border-gray-600 dark:bg-gray-700"
          />
          <span>同时删除磁盘文件</span>
        </label>
        <p
          v-else
          class="mt-4 text-xs text-gray-500 dark:text-gray-400"
        >
          当前磁盘不是文件型磁盘，不支持直接删除底层磁盘文件。
        </p>
      </div>

      <div class="flex justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
        <button
          @click="cancelDiskDeleteDialog"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          取消
        </button>
        <button
          @click="confirmDiskDelete"
          :disabled="diskDeleteSaving"
          class="rounded-lg bg-error-600 px-3 py-2 text-sm text-white hover:bg-error-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-error-500 dark:hover:bg-error-600"
        >
          删除
        </button>
      </div>
    </Modal>

    <Modal
      :is-open="deleteVmDialogOpen"
      class-name="mx-4 max-w-md overflow-hidden"
      overlay-class-name="bg-black/45"
      @close="cancelDeleteVMDialog"
    >
      <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">删除虚拟机</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          确定删除虚拟机 {{ vmName }} 吗？
        </p>
      </div>

      <div class="px-5 py-5 text-sm text-gray-600 dark:text-gray-400">
        <p>默认只会删除虚拟机定义，不会删除磁盘文件。</p>
        <label
          v-if="vmDeletableDiskFilesCount > 0"
          class="mt-4 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"
        >
          <input
            v-model="deleteVmRemoveFiles"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-error-600 focus:ring-error-500 dark:border-gray-600 dark:bg-gray-700"
          />
          <span>同时删除磁盘文件（{{ vmDeletableDiskFilesCount }} 个）</span>
        </label>
        <p v-else class="mt-4 text-xs text-gray-500 dark:text-gray-400">
          当前虚机没有可直接删除的文件型磁盘，光驱 ISO 文件不会删除。
        </p>
        <p v-if="vmDeletableDiskFilesCount > 0" class="mt-3 text-xs text-gray-500 dark:text-gray-400">
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
          :disabled="deleteVmSaving"
          class="rounded-lg bg-error-600 px-3 py-2 text-sm text-white hover:bg-error-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-error-500 dark:hover:bg-error-600"
        >
          删除
        </button>
      </div>
    </Modal>

    <Modal
      :is-open="newDiskOpen"
      class-name="mx-4 max-w-2xl overflow-hidden"
      overlay-class-name="bg-black/45"
      @close="cancelNewDisk"
    >
      <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">添加磁盘</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">选择要添加的设备类型</p>
      </div>

      <div class="space-y-4 px-5 py-5">
        <div>
          <label class="mb-2 block text-sm text-gray-600 dark:text-gray-400">设备</label>
          <select
            v-model="newDiskForm.device"
            @change="handleNewDeviceTypeChange"
            class="w-36 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
          >
            <option value="disk">磁盘镜像</option>
            <option value="cdrom">光驱</option>
          </select>
        </div>

        <div>
          <label class="mb-2 block text-sm text-gray-600 dark:text-gray-400">
            {{ newDiskForm.device === 'cdrom' ? 'ISO 路径' : '磁盘路径' }}
          </label>
          <input
            v-model="newDiskForm.path"
            type="text"
            :placeholder="
              newDiskForm.device === 'cdrom'
                ? '/var/lib/libvirt/images/installer.iso'
                : '/var/lib/libvirt/images/data-disk.qcow2'
            "
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
          />
        </div>

        <div
          class="grid gap-4 sm:items-end sm:justify-start"
          :class="newDiskForm.device === 'cdrom' ? 'sm:grid-cols-[auto]' : 'sm:grid-cols-[auto_auto_auto]'"
        >
          <div v-if="newDiskForm.device === 'disk'">
            <label class="mb-2 block text-sm text-gray-600 dark:text-gray-400">磁盘容量</label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="newDiskForm.sizeGiB"
                type="number"
                min="1"
                step="1"
                class="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm text-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
              />
              <span class="text-sm text-gray-600 dark:text-gray-400">GiB</span>
            </div>
          </div>

          <div>
            <label class="mb-2 block text-sm text-gray-600 dark:text-gray-400">
              {{ newDiskForm.device === 'cdrom' ? '设备总线' : '磁盘总线' }}
            </label>
            <select
              v-model="newDiskForm.bus"
              class="w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
            >
              <option v-if="newDiskForm.device === 'disk'" value="virtio">virtio</option>
              <option value="sata">sata</option>
              <option value="scsi">scsi</option>
            </select>
          </div>

          <div v-if="newDiskForm.device === 'disk'">
            <label class="mb-2 block text-sm text-gray-600 dark:text-gray-400">磁盘格式</label>
            <select
              v-model="newDiskForm.format"
              class="w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
            >
              <option value="qcow2">qcow2</option>
              <option value="raw">raw</option>
            </select>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
        <button
          @click="cancelNewDisk"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          取消
        </button>
        <button
          @click="submitNewDevice"
          :disabled="newDiskSaving"
          class="rounded-lg bg-brand-500 px-3 py-2 text-sm text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          添加
        </button>
      </div>
    </Modal>

    <Modal
      :is-open="Boolean(networkEditingMac)"
      class-name="mx-4 max-w-lg overflow-hidden"
      overlay-class-name="bg-black/45"
      @close="cancelNetworkEditor"
    >
      <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">编辑网络接口</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ editingNetworkInterface ? `修改网卡 ${editingNetworkInterface.mac} 的桥接网络` : '修改桥接网卡配置' }}
        </p>
      </div>

      <div class="space-y-4 px-5 py-5">
        <div>
          <label class="mb-2 block text-sm text-gray-600 dark:text-gray-400">MAC 地址</label>
          <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-700 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-300">
            {{ editingNetworkInterface?.mac || '-' }}
          </div>
        </div>

        <div>
          <label class="mb-2 block text-sm text-gray-600 dark:text-gray-400">桥接网卡</label>
          <select
            v-model="networkEditSource"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
          >
            <option value="" disabled>选择桥接网卡</option>
            <option v-for="item in bridgeInterfaces" :key="item.name" :value="item.name">
              {{ item.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="mb-2 block text-sm text-gray-600 dark:text-gray-400">设备型号</label>
          <select
            v-model="networkEditModel"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
          >
            <option v-for="item in networkModelOptions" :key="item" :value="item">
              {{ item }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
        <button
          @click="cancelNetworkEditor"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          取消
        </button>
        <button
          @click="saveNetworkInterface(networkEditingMac)"
          :disabled="!networkEditSource || networkSavingMac === networkEditingMac"
          class="rounded-lg bg-brand-500 px-3 py-2 text-sm text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          保存
        </button>
      </div>
    </Modal>

    <Modal
      :is-open="newNetworkOpen"
      class-name="mx-4 max-w-lg overflow-hidden"
      overlay-class-name="bg-black/45"
      @close="cancelNewNetworkDialog"
    >
      <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">添加网络接口</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">新增一块桥接网卡，并选择设备型号</p>
      </div>

      <div class="space-y-4 px-5 py-5">
        <div>
          <label class="mb-2 block text-sm text-gray-600 dark:text-gray-400">桥接网卡</label>
          <select
            v-model="newNetworkSource"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
          >
            <option value="" disabled>选择桥接网卡</option>
            <option v-for="item in bridgeInterfaces" :key="item.name" :value="item.name">
              {{ item.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="mb-2 block text-sm text-gray-600 dark:text-gray-400">设备型号</label>
          <select
            v-model="newNetworkModel"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
          >
            <option v-for="item in networkModelOptions" :key="item" :value="item">
              {{ item }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
        <button
          @click="cancelNewNetworkDialog"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          取消
        </button>
        <button
          @click="addNetworkInterface"
          :disabled="!newNetworkSource || newNetworkSaving"
          class="rounded-lg bg-brand-500 px-3 py-2 text-sm text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          添加
        </button>
      </div>
    </Modal>

    <Modal
      :is-open="cdromInsertDialogOpen"
      class-name="mx-4 max-w-xl overflow-hidden"
      overlay-class-name="bg-black/45"
      @close="cancelCdromInsertDialog"
    >
      <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">插入 ISO</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ activeCdrom ? `为设备 ${activeCdrom.target} 挂载 ISO 文件` : '输入 ISO 文件绝对路径' }}
        </p>
      </div>

      <div class="px-5 py-5">
        <label class="mb-2 block text-sm text-gray-600 dark:text-gray-400">ISO 路径</label>
        <input
          v-model="cdromForm.path"
          type="text"
          placeholder="/var/lib/libvirt/images/installer.iso"
          class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white/90"
        />
      </div>

      <div class="flex justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
        <button
          @click="cancelCdromInsertDialog"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          取消
        </button>
        <button
          @click="submitCdromInsert"
          :disabled="cdromSaving"
          class="rounded-lg bg-brand-500 px-3 py-2 text-sm text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          插入
        </button>
      </div>
    </Modal>

    <Modal
      :is-open="cdromEjectDialogOpen"
      class-name="mx-4 max-w-md overflow-hidden"
      overlay-class-name="bg-black/45"
      @close="cancelCdromEjectDialog"
    >
      <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">弹出 ISO</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ activeCdrom ? `确定要弹出设备 ${activeCdrom.target} 当前挂载的 ISO 吗？` : '确定要弹出当前 ISO 吗？' }}
        </p>
      </div>

      <div class="flex justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
        <button
          @click="cancelCdromEjectDialog"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          取消
        </button>
        <button
          @click="confirmCdromEject"
          :disabled="cdromSaving"
          class="rounded-lg bg-brand-500 px-3 py-2 text-sm text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          弹出
        </button>
      </div>
    </Modal>

    <Modal
      :is-open="cdromDeleteDialogOpen"
      class-name="mx-4 max-w-md overflow-hidden"
      overlay-class-name="bg-black/45"
      @close="cancelCdromDeleteDialog"
    >
      <div class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">删除光驱</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ activeCdrom ? `确定要删除光驱设备 ${activeCdrom.target} 吗？` : '确定要删除当前光驱设备吗？' }}
        </p>
      </div>

      <div class="flex justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
        <button
          @click="cancelCdromDeleteDialog"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          取消
        </button>
        <button
          @click="confirmCdromDelete"
          :disabled="cdromSaving"
          class="rounded-lg bg-error-600 px-3 py-2 text-sm text-white hover:bg-error-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-error-500 dark:hover:bg-error-600"
        >
          删除
        </button>
      </div>
    </Modal>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ApexOptions } from 'apexcharts'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import Modal from '@/components/ui/Modal.vue'
import {
  virtualMachinesApi,
  type VMCapabilities,
  type VMDetails,
  type VMMonitoring,
} from '@/api/virtualMachines'
import VueApexCharts from 'vue3-apexcharts'

const route = useRoute()
const router = useRouter()

const vmName = ref(route.params.name as string)

type NetworkModel = 'virtio' | 'e1000' | 'rtl8139'

type VMDetailViewModel = VMDetails & {
  cpuUsage?: number
  memoryUsage?: number
  networkUsage?: number
}

const networkModelOptions: NetworkModel[] = ['virtio', 'e1000', 'rtl8139']

const loading = ref(true)
const loadError = ref('')
const capabilities = ref<VMCapabilities | null>(null)
const leftSummaryPanel = ref<HTMLElement | null>(null)
const leftPanelHeight = ref(0)
const isWideLayout = ref(false)

const vm = ref<VMDetailViewModel>({
  id: null,
  name: vmName.value,
  status: 'stopped',
  osType: 'hvm',
  vcpu: 0,
  cpu: '-',
  ram: '-',
  memory: '-',
  memoryKiB: 0,
  memoryMiB: 0,
  cpuTopology: {
    sockets: 1,
    cores: 1,
    threads: 1,
  },
  storage: '-',
  storageBytes: 0,
  networkInterfaces: [],
  disks: [],
  cdrom: null,
  cdroms: [],
  bootOrder: 'unknown',
  bootTarget: null,
  bootDevices: [],
  editable: {
    cpuMemory: false,
    disks: false,
    networks: false,
    boot: false,
  },
  cpuUsage: 0,
  memoryUsage: 0,
  networkUsage: 0,
})

const cpuEditing = ref(false)
const memoryEditing = ref(false)
const diskEditingTarget = ref('')
const diskDeleteTarget = ref('')
const diskDeleteRemoveFile = ref(false)
const deleteVmDialogOpen = ref(false)
const deleteVmRemoveFiles = ref(false)
const activeCdromTarget = ref('')
const cdromInsertDialogOpen = ref(false)
const cdromEjectDialogOpen = ref(false)
const cdromDeleteDialogOpen = ref(false)
const newDiskOpen = ref(false)
const bootEditing = ref(false)
const newNetworkOpen = ref(false)
const networkEditingMac = ref('')

const cpuSaving = ref(false)
const memorySaving = ref(false)
const diskSaving = ref(false)
const diskDeleteSaving = ref(false)
const deleteVmSaving = ref(false)
const bootSaving = ref(false)
const cdromSaving = ref(false)
const newDiskSaving = ref(false)
const newNetworkSaving = ref(false)
const networkSavingMac = ref('')

const cpuMemoryForm = ref({
  sockets: 1,
  cores: 1,
  threads: 1,
  memoryGiB: 2,
})

const systemDiskForm = ref<{
  bus: 'virtio' | 'sata' | 'scsi'
  sizeGiB: number
}>({
  bus: 'virtio',
  sizeGiB: 20,
})

const cdromForm = ref({
  path: '',
})

const newDiskForm = ref<{
  device: 'disk' | 'cdrom'
  path: string
  sizeGiB: number
  format: 'qcow2' | 'raw'
  bus: 'virtio' | 'sata' | 'scsi'
}>({
  device: 'disk',
  path: '',
  sizeGiB: 20,
  format: 'qcow2',
  bus: 'virtio',
})

const bootTargetForm = ref('')
const newNetworkSource = ref('')
const newNetworkModel = ref<NetworkModel>('virtio')
const networkDrafts = ref<Record<string, string>>({})
const networkModelDrafts = ref<Record<string, NetworkModel>>({})

let monitorTimer: number | null = null
let prevCpuTimeNs: number | null = null
let prevAtMs: number | null = null
let prevNetBytes: number | null = null
let leftPanelObserver: ResizeObserver | null = null

const networkMbps = ref(0)
const memoryCurrentKiB = ref(0)
const memoryUsageSource = ref<'guest_agent' | 'configured' | 'cleared'>('cleared')

const resetMonitoringState = (clearHistory = false) => {
  vm.value.cpuUsage = 0
  vm.value.memoryUsage = 0
  vm.value.networkUsage = 0
  networkMbps.value = 0
  memoryCurrentKiB.value = 0
  memoryUsageSource.value = 'cleared'
  prevCpuTimeNs = null
  prevAtMs = null
  prevNetBytes = null

  if (clearHistory) {
    labels.value = []
    cpuSeriesData.value = []
    memorySeriesData.value = []
    networkSeriesData.value = []
  }
}

const pushPoint = (arr: number[], value: number, maxLen = 30) => {
  arr.push(value)
  if (arr.length > maxLen) {
    arr.splice(0, arr.length - maxLen)
  }
}

const labels = ref<string[]>([])
const pushLabel = () => {
  const date = new Date()
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  labels.value.push(`${hh}:${mm}:${ss}`)
  if (labels.value.length > 30) {
    labels.value.splice(0, labels.value.length - 30)
  }
}

const cpuSeriesData = ref<number[]>([])
const memorySeriesData = ref<number[]>([])
const networkSeriesData = ref<number[]>([])

const baseChartOptions = computed<ApexOptions>(() => {
  const isDark = document?.documentElement?.classList?.contains('dark')
  return {
    chart: {
      type: 'area',
      toolbar: { show: false },
      sparkline: { enabled: true },
      animations: { enabled: false },
      fontFamily: 'Outfit, sans-serif',
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.05,
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: labels.value,
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      max: 100,
      labels: { show: false },
    },
    grid: { show: false },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
    },
  }
})

const cpuChartSeries = computed(() => [{ name: 'CPU', data: cpuSeriesData.value }])
const memoryChartSeries = computed(() => [{ name: 'Memory', data: memorySeriesData.value }])
const networkChartSeries = computed(() => [{ name: 'Network', data: networkSeriesData.value }])

const cpuChartOptions = computed<ApexOptions>(() => ({
  ...baseChartOptions.value,
  colors: ['#3C50E0'],
}))
const memoryChartOptions = computed<ApexOptions>(() => ({
  ...baseChartOptions.value,
  colors: ['#22C55E'],
}))
const networkChartOptions = computed<ApexOptions>(() => ({
  ...baseChartOptions.value,
  colors: ['#F59E0B'],
}))

const monitorPanelStyle = computed(() => {
  if (!isWideLayout.value || !leftPanelHeight.value) {
    return {}
  }

  return {
    height: `${leftPanelHeight.value}px`,
  }
})

const bridgeInterfaces = computed(() => capabilities.value?.bridgeInterfaces || [])

const normalizeDiskBusValue = (bus?: string): 'virtio' | 'sata' | 'scsi' => {
  if (bus === 'sata' || bus === 'scsi') return bus
  return 'virtio'
}

const normalizeNetworkModelValue = (model?: string): NetworkModel => {
  if (model === 'e1000' || model === 'rtl8139') return model
  return 'virtio'
}

const canEditConfig = computed(() => {
  return Boolean(vm.value.editable?.cpuMemory)
})

const detailHeaderReady = computed(() => {
  return !loading.value && !loadError.value
})

const statusLabel = computed(() => {
  if (vm.value.status === 'running') return '运行中'
  if (vm.value.status === 'paused') return '已暂停'
  return '已停止'
})

const cpuTopologyLabel = computed(() => {
  const topology = vm.value.cpuTopology || { sockets: 1, cores: vm.value.vcpu || 1, threads: 1 }
  return `${vm.value.vcpu || 0} vCPU (${topology.sockets} 插槽 / ${topology.cores} 核心 / ${topology.threads} 线程)`
})

const memoryLabel = computed(() => {
  if (vm.value.memoryMiB && vm.value.memoryMiB > 0) {
    const gib = vm.value.memoryMiB / 1024
    return `${gib >= 10 ? gib.toFixed(0) : gib.toFixed(1)} GiB`
  }
  return vm.value.ram || '-'
})

const systemDisk = computed(() => {
  return vm.value.disks.find((disk) => disk.role === 'system') || null
})

const cdromDevices = computed(() => {
  if (Array.isArray(vm.value.cdroms) && vm.value.cdroms.length > 0) {
    return vm.value.cdroms
  }
  return vm.value.cdrom ? [vm.value.cdrom] : []
})

const diskDevices = computed(() => {
  return vm.value.disks
})

const editingDisk = computed(() => {
  return vm.value.disks.find((disk) => disk.target === diskEditingTarget.value) || null
})

const deletingDisk = computed(() => {
  return vm.value.disks.find((disk) => disk.target === diskDeleteTarget.value) || null
})

const vmDeletableDiskFilesCount = computed(() => {
  return diskDevices.value.filter((disk) => disk.sourceType === 'file' && disk.source).length
})

const activeCdrom = computed(() => {
  return cdromDevices.value.find((cdrom) => cdrom.target === activeCdromTarget.value) || null
})

const editingNetworkInterface = computed(() => {
  return vm.value.networkInterfaces.find((iface) => iface.mac === networkEditingMac.value) || null
})

const diskRoleLabel = (role?: string) => {
  return '磁盘'
}

const getBootDeviceLabel = (target: string, device?: 'disk' | 'cdrom') => {
  const disk = vm.value.disks.find((item) => item.target === target)
  if (disk) {
    return `${target} (磁盘)`
  }

  const cdrom = cdromDevices.value.find((item) => item.target === target)
  if (cdrom || device === 'cdrom') {
    return `${target} (光驱)`
  }

  return target
}

const getBootDeviceHint = (target: string, device?: 'disk' | 'cdrom') => {
  const disk = vm.value.disks.find((item) => item.target === target)
  if (disk) {
    return disk.source || '-'
  }

  const cdrom = cdromDevices.value.find((item) => item.target === target)
  if (cdrom || device === 'cdrom') {
    return cdrom?.source || '未插入 ISO'
  }

  return '-'
}

const bootDevices = computed(() => {
  const configuredDevices =
    Array.isArray(vm.value.bootDevices) && vm.value.bootDevices.length > 0
      ? vm.value.bootDevices
          .slice()
          .sort((left, right) => (left.order || 0) - (right.order || 0))
      : [
          ...vm.value.disks.map((disk, index) => ({
            target: disk.target,
            device: 'disk' as const,
            bus: disk.bus,
            order: index + 1,
          })),
          ...cdromDevices.value.map((cdrom, index) => ({
            target: cdrom.target,
            device: 'cdrom' as const,
            bus: cdrom.bus,
            order: vm.value.disks.length + index + 1,
          })),
        ]

  return configuredDevices
    .filter((device) => device.target)
    .map((device) => ({
      ...device,
      label: getBootDeviceLabel(device.target, device.device),
      hint: getBootDeviceHint(device.target, device.device),
    }))
})

const currentBootDevice = computed(() => {
  const currentTarget = vm.value.bootTarget || bootDevices.value[0]?.target || ''
  return bootDevices.value.find((device) => device.target === currentTarget) || null
})

const selectedBootDevice = computed(() => {
  return bootDevices.value.find((device) => device.target === bootTargetForm.value) || null
})

const bootOrderLabel = computed(() => {
  if (currentBootDevice.value) {
    return `${currentBootDevice.value.label} 优先`
  }
  if (vm.value.bootOrder === 'disk_first') return '磁盘优先'
  if (vm.value.bootOrder === 'cdrom_first') return '光驱优先'
  return '未配置'
})

const editStatusLabel = computed(() => {
  return canEditConfig.value ? '已关机，可直接修改配置' : '请先关机后修改 CPU、磁盘和网络配置'
})

const basicInfoItems = computed(() => [
  { label: '虚机名称', value: vm.value.name || vmName.value },
  { label: '操作系统', value: vm.value.osType || '-' },
  { label: '虚机 ID', value: vm.value.id || '-' },
  { label: 'UUID', value: vm.value.uuid || '-' },
  { label: '总存储', value: vm.value.storage || '-' },
  { label: '网卡 / 磁盘', value: `${vm.value.networkInterfaces.length} / ${diskDevices.value.length}` },
])

const memoryUsageWidth = computed(() => {
  if (memoryUsageSource.value !== 'guest_agent') {
    if (vm.value.status === 'stopped') {
      return '0%'
    }
    return totalMemoryKiB.value > 0 ? '100%' : '0%'
  }
  return `${Math.max(0, Math.min(100, Number(vm.value.memoryUsage) || 0))}%`
})

const cpuUsageWidth = computed(() => `${Math.max(0, Math.min(100, Number(vm.value.cpuUsage) || 0))}%`)

const formatMemoryGiBValue = (valueKiB: number) => {
  const gib = Math.max(0, Number(valueKiB) || 0) / 1024 / 1024
  const label = gib >= 10 ? gib.toFixed(0) : gib.toFixed(1)
  return label.replace(/\.0$/, '')
}

const totalMemoryKiB = computed(() => {
  if (vm.value.memoryKiB && vm.value.memoryKiB > 0) {
    return vm.value.memoryKiB
  }
  if (vm.value.memoryMiB && vm.value.memoryMiB > 0) {
    return vm.value.memoryMiB * 1024
  }
  return parseKiB(vm.value.ram) || 0
})

const memoryUsageValueLabel = computed(() => {
  const totalKiB = totalMemoryKiB.value
  if (!totalKiB) {
    if (memoryUsageSource.value === 'guest_agent') {
      return `${vm.value.memoryUsage || 0}%`
    }
    return memoryLabel.value
  }

  const usedKiB =
    memoryUsageSource.value === 'guest_agent' ? memoryCurrentKiB.value : vm.value.status === 'stopped' ? 0 : totalKiB
  return `${formatMemoryGiBValue(usedKiB)} / ${formatMemoryGiBValue(totalKiB)} GiB`
})

const networkEditSource = computed({
  get: () => {
    if (!networkEditingMac.value) return ''
    return networkDrafts.value[networkEditingMac.value] || ''
  },
  set: (value: string) => {
    if (!networkEditingMac.value) return
    networkDrafts.value[networkEditingMac.value] = value
  },
})

const networkEditModel = computed<NetworkModel>({
  get: () => {
    if (!networkEditingMac.value) return 'virtio'
    return networkModelDrafts.value[networkEditingMac.value] || 'virtio'
  },
  set: (value) => {
    if (!networkEditingMac.value) return
    networkModelDrafts.value[networkEditingMac.value] = normalizeNetworkModelValue(value)
  },
})

const memoryMonitorUsagePercent = computed(() => {
  if (vm.value.status !== 'running') {
    return 0
  }
  if (memoryUsageSource.value !== 'guest_agent') {
    return totalMemoryKiB.value > 0 ? 100 : 0
  }
  return Math.max(0, Math.min(100, Number(vm.value.memoryUsage) || 0))
})

const memoryMonitorValueLabel = computed(() => {
  return `${memoryMonitorUsagePercent.value}%`
})

const cpuUsageValueLabel = computed(() => {
  return `${vm.value.cpuUsage || 0}% of ${vm.value.vcpu || 0} vCPU`
})

const interfaceModeLabel = (mode?: string) => {
  if (mode === 'bridge') return '桥接'
  if (mode === 'network') return 'libvirt 网络'
  return '其他模式'
}

const storageSourceLabel = (sourceType?: string) => {
  if (sourceType === 'block') return '块设备'
  return '文件'
}

const storageAccessLabel = (readonly?: boolean) => {
  return readonly ? '只读' : '可写'
}

const formatStorageBytes = (bytes?: number | null) => {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value < 0) return '-'
  if (value === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = value
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  const fixed = size >= 10 || unitIndex === 0 ? 0 : 1
  return `${size.toFixed(fixed)} ${units[unitIndex]}`
}

const isBootTarget = (target?: string | null) => {
  return Boolean(target) && currentBootDevice.value?.target === target
}

const networkStateLabel = () => {
  if (vm.value.status === 'running') return 'up'
  if (vm.value.status === 'paused') return 'paused'
  return 'down'
}

const syncMonitorPanelHeight = () => {
  if (typeof window === 'undefined') {
    return
  }

  isWideLayout.value = window.innerWidth >= 1280
  if (!isWideLayout.value || !leftSummaryPanel.value) {
    leftPanelHeight.value = 0
    return
  }

  leftPanelHeight.value = Math.ceil(leftSummaryPanel.value.getBoundingClientRect().height)
}

const bindLeftPanelObserver = () => {
  if (leftPanelObserver) {
    leftPanelObserver.disconnect()
    leftPanelObserver = null
  }

  if (typeof ResizeObserver === 'undefined' || !leftSummaryPanel.value) {
    return
  }

  leftPanelObserver = new ResizeObserver(() => {
    syncMonitorPanelHeight()
  })
  leftPanelObserver.observe(leftSummaryPanel.value)
}

const handleViewportResize = () => {
  syncMonitorPanelHeight()
}

const parseKiB = (value?: string) => {
  if (!value) return null
  const matched = String(value).trim().match(/^(\d+(?:\.\d+)?)\s*(kib|kb|mib|mb|gib|gb)$/i)
  if (!matched) return null
  const [, rawValue, rawUnit] = matched
  if (!rawValue || !rawUnit) return null
  const numberValue = Number(rawValue)
  const unit = rawUnit.toLowerCase()
  if (!Number.isFinite(numberValue)) return null
  if (unit === 'kib' || unit === 'kb') return Math.round(numberValue)
  if (unit === 'mib' || unit === 'mb') return Math.round(numberValue * 1024)
  if (unit === 'gib' || unit === 'gb') return Math.round(numberValue * 1024 * 1024)
  return null
}

const syncFormsFromVm = () => {
  if (!cpuEditing.value && !memoryEditing.value) {
    const topology = vm.value.cpuTopology || {
      sockets: 1,
      cores: Math.max(1, vm.value.vcpu || 1),
      threads: 1,
    }
    cpuMemoryForm.value = {
      sockets: topology.sockets,
      cores: topology.cores,
      threads: topology.threads,
      memoryGiB: Math.max(1, Math.round((vm.value.memoryMiB || 2048) / 1024)),
    }
  }

  if (!diskEditingTarget.value && systemDisk.value) {
    systemDiskForm.value = {
      bus: normalizeDiskBusValue(systemDisk.value.bus),
      sizeGiB: Math.max(1, Math.round(systemDisk.value.sizeGiB || 20)),
    }
  }

  bootTargetForm.value = vm.value.bootTarget || bootDevices.value[0]?.target || ''
  newNetworkSource.value = bridgeInterfaces.value[0]?.name || ''
  newNetworkModel.value = 'virtio'
  networkDrafts.value = Object.fromEntries(
    vm.value.networkInterfaces
      .filter((iface) => iface.mac)
      .map((iface) => [iface.mac, iface.source || bridgeInterfaces.value[0]?.name || ''])
  )
  networkModelDrafts.value = Object.fromEntries(
    vm.value.networkInterfaces
      .filter((iface) => iface.mac)
      .map((iface) => [iface.mac, normalizeNetworkModelValue(iface.model || iface.type)])
  )
}

const resetNewDiskForm = () => {
  newDiskForm.value = {
    device: 'disk',
    path: '',
    sizeGiB: 20,
    format: 'qcow2',
    bus: 'virtio',
  }
}

const handleNewDeviceTypeChange = () => {
  if (newDiskForm.value.device === 'cdrom' && newDiskForm.value.bus === 'virtio') {
    newDiskForm.value.bus = 'sata'
  }
}

const loadCapabilities = async () => {
  try {
    capabilities.value = await virtualMachinesApi.getVmCapabilities()
    if (!newNetworkSource.value) {
      newNetworkSource.value = capabilities.value.bridgeInterfaces[0]?.name || ''
    }
  } catch (error) {
    console.warn('获取虚机能力失败:', error)
  }
}

const refreshDetails = async (showLoading = false) => {
  if (showLoading) {
    loading.value = true
  }
  loadError.value = ''
  try {
    const details = await virtualMachinesApi.getVMDetails(vmName.value)
    const isRunning = details?.status === 'running'
    vm.value = {
      ...vm.value,
      ...details,
      cpuUsage: isRunning ? (vm.value.cpuUsage ?? 0) : 0,
      memoryUsage: isRunning ? (vm.value.memoryUsage ?? 0) : 0,
      networkUsage: isRunning ? (vm.value.networkUsage ?? 0) : 0,
    }
    if (!isRunning) {
      resetMonitoringState(true)
    }
    syncFormsFromVm()
  } catch (error: any) {
    console.error('获取虚拟机详情失败:', error)
    loadError.value = error?.error || error?.message || '获取虚拟机详情失败'
  } finally {
    loading.value = false
  }

  await nextTick()
  bindLeftPanelObserver()
  syncMonitorPanelHeight()
}

const refreshMonitoring = async () => {
  if (!vm.value || vm.value.status !== 'running') {
    resetMonitoringState(true)
    return
  }

  try {
    const monitoring: VMMonitoring = await virtualMachinesApi.getVMMonitoring(vmName.value)
    const now = Date.now()
    const previousAtMs = prevAtMs
    const cpuTimeNs = Number(monitoring.cpuUsage) || 0
    const vcpu = Number(vm.value.vcpu) || 1

    if (prevCpuTimeNs !== null && previousAtMs !== null && cpuTimeNs >= prevCpuTimeNs) {
      const dtMs = now - previousAtMs
      const dCpuNs = cpuTimeNs - prevCpuTimeNs
      if (dtMs > 0) {
        const cpuPercent = (dCpuNs / (dtMs * 1e6 * vcpu)) * 100
        vm.value.cpuUsage = Math.max(0, Math.min(100, Math.round(cpuPercent)))
      }
    }
    prevCpuTimeNs = cpuTimeNs
    prevAtMs = now

    if (monitoring.memorySource === 'guest_agent') {
      memoryUsageSource.value = 'guest_agent'
      const currentMemoryKiB = Number(monitoring.memoryUsage) || 0
      memoryCurrentKiB.value = currentMemoryKiB
      const memoryLimitKiB = vm.value.memoryKiB ?? parseKiB(vm.value.ram) ?? 0
      if (memoryLimitKiB > 0) {
        const memoryPercent = (currentMemoryKiB / memoryLimitKiB) * 100
        vm.value.memoryUsage = Math.max(0, Math.min(100, Math.round(memoryPercent)))
      } else {
        vm.value.memoryUsage = 0
      }
    } else {
      memoryUsageSource.value = 'configured'
      memoryCurrentKiB.value = 0
      vm.value.memoryUsage = 0
    }

    const totalNetBytes = (Number(monitoring.networkRx) || 0) + (Number(monitoring.networkTx) || 0)
    if (prevNetBytes !== null && previousAtMs !== null) {
      const dtSec = (now - previousAtMs) / 1000
      const deltaBytes = totalNetBytes - prevNetBytes
      if (dtSec > 0 && deltaBytes >= 0) {
        const mbps = (deltaBytes * 8) / 1e6 / dtSec
        networkMbps.value = mbps
        vm.value.networkUsage = Math.max(0, Math.min(100, Math.round((mbps / 1000) * 100)))
      }
    }
    prevNetBytes = totalNetBytes

    pushLabel()
    pushPoint(cpuSeriesData.value, Number(vm.value.cpuUsage) || 0)
    pushPoint(memorySeriesData.value, memoryMonitorUsagePercent.value)
    pushPoint(networkSeriesData.value, Number(vm.value.networkUsage) || 0)
  } catch (error) {
    console.warn('获取虚机监控失败:', error)
  }
}

const openCpuEditor = () => {
  syncFormsFromVm()
  memoryEditing.value = false
  cpuEditing.value = true
}

const cancelCpuEditor = () => {
  cpuEditing.value = false
  syncFormsFromVm()
}

const openMemoryEditor = () => {
  syncFormsFromVm()
  cpuEditing.value = false
  memoryEditing.value = true
}

const cancelMemoryEditor = () => {
  memoryEditing.value = false
  syncFormsFromVm()
}

const openBootEditor = () => {
  syncFormsFromVm()
  bootEditing.value = true
}

const cancelBootEditor = () => {
  bootEditing.value = false
  bootTargetForm.value = vm.value.bootTarget || bootDevices.value[0]?.target || ''
}

const saveCpuConfig = async () => {
  cpuSaving.value = true
  try {
    await virtualMachinesApi.updateVMCpuMemory(vmName.value, {
      sockets: cpuMemoryForm.value.sockets,
      cores: cpuMemoryForm.value.cores,
      threads: cpuMemoryForm.value.threads,
      memoryMiB: Math.round(cpuMemoryForm.value.memoryGiB * 1024),
    })
    cpuEditing.value = false
    await refreshDetails()
  } catch (error: any) {
    alert(error?.error || '更新 CPU 失败')
  } finally {
    cpuSaving.value = false
  }
}

const saveMemoryConfig = async () => {
  memorySaving.value = true
  try {
    await virtualMachinesApi.updateVMCpuMemory(vmName.value, {
      sockets: cpuMemoryForm.value.sockets,
      cores: cpuMemoryForm.value.cores,
      threads: cpuMemoryForm.value.threads,
      memoryMiB: Math.round(cpuMemoryForm.value.memoryGiB * 1024),
    })
    memoryEditing.value = false
    await refreshDetails()
  } catch (error: any) {
    alert(error?.error || '更新内存失败')
  } finally {
    memorySaving.value = false
  }
}

const openDiskEditor = (target: string) => {
  const disk = vm.value.disks.find((item) => item.target === target)
  if (!disk) {
    return
  }

  systemDiskForm.value = {
    bus: normalizeDiskBusValue(disk.bus),
    sizeGiB: Math.max(1, Math.round(disk.sizeGiB || 20)),
  }
  diskEditingTarget.value = target
}

const cancelDiskEditor = () => {
  diskEditingTarget.value = ''
  syncFormsFromVm()
}

const saveDiskConfig = async () => {
  if (!diskEditingTarget.value || !editingDisk.value) return

  diskSaving.value = true
  try {
    await virtualMachinesApi.updateVMDisk(vmName.value, diskEditingTarget.value, {
      bus: systemDiskForm.value.bus,
      sizeGiB: editingDisk.value.resizable ? systemDiskForm.value.sizeGiB : undefined,
    })
    diskEditingTarget.value = ''
    await refreshDetails()
  } catch (error: any) {
    alert(error?.error || '更新磁盘失败')
  } finally {
    diskSaving.value = false
  }
}

const saveBootOrder = async () => {
  if (!bootTargetForm.value) return

  bootSaving.value = true
  try {
    await virtualMachinesApi.updateVMBootOrder(vmName.value, {
      target: bootTargetForm.value,
    })
    bootEditing.value = false
    await refreshDetails()
  } catch (error: any) {
    alert(error?.error || '更新引导顺序失败')
  } finally {
    bootSaving.value = false
  }
}

const openCdromInsertDialog = (target: string) => {
  activeCdromTarget.value = target
  cdromForm.value.path = activeCdrom.value?.source || ''
  cdromInsertDialogOpen.value = true
}

const cancelCdromInsertDialog = () => {
  cdromInsertDialogOpen.value = false
  cdromForm.value.path = ''
  activeCdromTarget.value = ''
}

const submitCdromInsert = async () => {
  if (!activeCdromTarget.value) return
  cdromSaving.value = true
  try {
    await virtualMachinesApi.insertVMCdrom(vmName.value, activeCdromTarget.value, {
      path: cdromForm.value.path.trim(),
    })
    cdromInsertDialogOpen.value = false
    activeCdromTarget.value = ''
    cdromForm.value.path = ''
    await refreshDetails()
  } catch (error: any) {
    alert(error?.error || '插入 ISO 失败')
  } finally {
    cdromSaving.value = false
  }
}

const openCdromEjectDialog = (target: string) => {
  activeCdromTarget.value = target
  cdromEjectDialogOpen.value = true
}

const cancelCdromEjectDialog = () => {
  cdromEjectDialogOpen.value = false
  activeCdromTarget.value = ''
}

const confirmCdromEject = async () => {
  if (!activeCdromTarget.value) return
  cdromSaving.value = true
  try {
    await virtualMachinesApi.ejectVMCdrom(vmName.value, activeCdromTarget.value)
    cdromEjectDialogOpen.value = false
    activeCdromTarget.value = ''
    await refreshDetails()
  } catch (error: any) {
    alert(error?.error || '弹出 ISO 失败')
  } finally {
    cdromSaving.value = false
  }
}

const openCdromDeleteDialog = (target: string) => {
  activeCdromTarget.value = target
  cdromDeleteDialogOpen.value = true
}

const cancelCdromDeleteDialog = () => {
  cdromDeleteDialogOpen.value = false
  activeCdromTarget.value = ''
}

const confirmCdromDelete = async () => {
  if (!activeCdromTarget.value) return
  cdromSaving.value = true
  try {
    await virtualMachinesApi.deleteVMCdrom(vmName.value, activeCdromTarget.value)
    cdromDeleteDialogOpen.value = false
    activeCdromTarget.value = ''
    await refreshDetails()
  } catch (error: any) {
    alert(error?.error || '删除光驱失败')
  } finally {
    cdromSaving.value = false
  }
}

const cancelNewDisk = () => {
  newDiskOpen.value = false
  resetNewDiskForm()
}

const openNewDiskDialog = () => {
  resetNewDiskForm()
  newDiskOpen.value = true
}

const addCdromDevice = async () => {
  await virtualMachinesApi.addVMCdrom(vmName.value, {
    path: newDiskForm.value.path.trim(),
    bus: newDiskForm.value.bus === 'scsi' ? 'scsi' : 'sata',
  })
}

const submitNewDevice = async () => {
  newDiskSaving.value = true
  try {
    if (newDiskForm.value.device === 'cdrom') {
      await addCdromDevice()
    } else {
      await virtualMachinesApi.addVMDataDisk(vmName.value, {
        path: newDiskForm.value.path.trim(),
        sizeGiB: Math.round(newDiskForm.value.sizeGiB),
        format: newDiskForm.value.format,
        bus: newDiskForm.value.bus,
      })
    }
    cancelNewDisk()
    await refreshDetails()
  } catch (error: any) {
    alert(error?.error || (newDiskForm.value.device === 'cdrom' ? '添加光驱失败' : '添加数据磁盘失败'))
  } finally {
    newDiskSaving.value = false
  }
}

const openDiskDeleteDialog = (target: string) => {
  diskDeleteTarget.value = target
  diskDeleteRemoveFile.value = false
}

const cancelDiskDeleteDialog = () => {
  diskDeleteTarget.value = ''
  diskDeleteRemoveFile.value = false
}

const confirmDiskDelete = async () => {
  if (!diskDeleteTarget.value) return

  diskDeleteSaving.value = true
  try {
    await virtualMachinesApi.deleteVMDisk(vmName.value, diskDeleteTarget.value, {
      deleteFile: diskDeleteRemoveFile.value,
    })
    diskDeleteTarget.value = ''
    diskDeleteRemoveFile.value = false
    await refreshDetails()
  } catch (error: any) {
    alert(error?.error || '删除磁盘失败')
  } finally {
    diskDeleteSaving.value = false
  }
}

const openNewNetworkDialog = () => {
  newNetworkSource.value = bridgeInterfaces.value[0]?.name || ''
  newNetworkModel.value = 'virtio'
  newNetworkOpen.value = true
}

const cancelNewNetworkDialog = () => {
  newNetworkOpen.value = false
  newNetworkSource.value = bridgeInterfaces.value[0]?.name || ''
  newNetworkModel.value = 'virtio'
}

const addNetworkInterface = async () => {
  newNetworkSaving.value = true
  try {
    await virtualMachinesApi.addVMNetworkInterface(vmName.value, {
      source: newNetworkSource.value,
      model: newNetworkModel.value,
    })
    cancelNewNetworkDialog()
    await refreshDetails()
  } catch (error: any) {
    alert(error?.error || '添加网卡失败')
  } finally {
    newNetworkSaving.value = false
  }
}

const openNetworkEditor = (mac: string) => {
  const iface = vm.value.networkInterfaces.find((item) => item.mac === mac)
  if (!iface) {
    return
  }
  networkDrafts.value[mac] = iface.source || bridgeInterfaces.value[0]?.name || ''
  networkModelDrafts.value[mac] = normalizeNetworkModelValue(iface.model || iface.type)
  networkEditingMac.value = mac
}

const cancelNetworkEditor = () => {
  networkEditingMac.value = ''
  syncFormsFromVm()
}

const saveNetworkInterface = async (mac: string) => {
  if (!mac) return
  networkSavingMac.value = mac
  try {
    await virtualMachinesApi.updateVMNetworkInterface(vmName.value, mac, {
      source: networkDrafts.value[mac] || '',
      model: networkModelDrafts.value[mac] || 'virtio',
    })
    networkEditingMac.value = ''
    await refreshDetails()
  } catch (error: any) {
    alert(error?.error || '更新网卡失败')
  } finally {
    networkSavingMac.value = ''
  }
}

const removeNetworkInterface = async (mac: string) => {
  if (!confirm('确定要删除这块网卡吗？')) {
    return
  }

  try {
    await virtualMachinesApi.deleteVMNetworkInterface(vmName.value, mac)
    if (networkEditingMac.value === mac) {
      networkEditingMac.value = ''
    }
    await refreshDetails()
  } catch (error: any) {
    alert(error?.error || '删除网卡失败')
  }
}

const startVM = async () => {
  try {
    await virtualMachinesApi.startVM(vmName.value)
    await refreshDetails()
    await refreshMonitoring()
  } catch (error: any) {
    alert(error?.error || '启动虚拟机失败')
  }
}

const stopVM = async () => {
  try {
    await virtualMachinesApi.stopVM(vmName.value)
    await refreshDetails()
    await refreshMonitoring()
  } catch (error: any) {
    alert(error?.error || '停止虚拟机失败')
  }
}

const powerOffVM = async () => {
  if (!confirm('确定要强制断电这个虚拟机吗？')) {
    return
  }
  try {
    await virtualMachinesApi.powerOffVM(vmName.value)
    await refreshDetails()
    await refreshMonitoring()
  } catch (error: any) {
    alert(error?.error || '虚拟机断电失败')
  }
}

const restartVM = async () => {
  try {
    await virtualMachinesApi.restartVM(vmName.value)
    await refreshDetails()
    await refreshMonitoring()
  } catch (error: any) {
    alert(error?.error || '重启虚拟机失败')
  }
}

const suspendVM = async () => {
  try {
    await virtualMachinesApi.suspendVM(vmName.value)
    await refreshDetails()
  } catch (error: any) {
    alert(error?.error || '暂停虚拟机失败')
  }
}

const resumeVM = async () => {
  try {
    await virtualMachinesApi.resumeVM(vmName.value)
    await refreshDetails()
  } catch (error: any) {
    alert(error?.error || '恢复虚拟机失败')
  }
}

const openDeleteVMDialog = () => {
  deleteVmRemoveFiles.value = false
  deleteVmDialogOpen.value = true
}

const cancelDeleteVMDialog = () => {
  deleteVmDialogOpen.value = false
  deleteVmRemoveFiles.value = false
}

const openConsole = async () => {
  try {
    const info = await virtualMachinesApi.getVMConsole(vmName.value)
    const url = info?.consoleUrl || `/virtual-machines/${encodeURIComponent(vmName.value)}/console`
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (error: any) {
    alert(error?.error || error?.message || '打开控制台失败')
  }
}

const confirmDeleteVM = async () => {
  deleteVmSaving.value = true
  try {
    const result = await virtualMachinesApi.deleteVM(vmName.value, {
      deleteFile: deleteVmRemoveFiles.value,
    })
    cancelDeleteVMDialog()
    if (result?.message && result.message !== '虚拟机删除成功') {
      alert(result.message)
    }
    router.push('/virtual-machines')
  } catch (error: any) {
    alert(error?.error || '删除虚拟机失败')
  } finally {
    deleteVmSaving.value = false
  }
}

const pollVmState = async () => {
  if (vm.value.status !== 'running') {
    return
  }
  if (
    cpuEditing.value ||
    memoryEditing.value ||
    Boolean(diskEditingTarget.value) ||
    Boolean(diskDeleteTarget.value) ||
    cdromInsertDialogOpen.value ||
    cdromEjectDialogOpen.value ||
    cdromDeleteDialogOpen.value ||
    deleteVmDialogOpen.value ||
    newDiskOpen.value ||
    bootEditing.value ||
    newNetworkOpen.value ||
    Boolean(networkEditingMac.value)
  ) {
    return
  }
  await refreshDetails()
  await refreshMonitoring()
}

onMounted(async () => {
  await Promise.all([loadCapabilities(), refreshDetails(true)])
  await refreshMonitoring()
  window.addEventListener('resize', handleViewportResize)
  await nextTick()
  bindLeftPanelObserver()
  syncMonitorPanelHeight()
  monitorTimer = window.setInterval(() => {
    void pollVmState()
  }, 5000)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleViewportResize)
  if (leftPanelObserver) {
    leftPanelObserver.disconnect()
    leftPanelObserver = null
  }
  if (monitorTimer) {
    window.clearInterval(monitorTimer)
    monitorTimer = null
  }
})
</script>
