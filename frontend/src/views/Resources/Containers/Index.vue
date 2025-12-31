<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ $t('pages.containers.title') }}</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">{{ $t('pages.containers.description') }}</p>
        </div>
        <div class="flex gap-2">
          <button
            @click="showImportDialog = true"
            class="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {{ $t('common.importContainer') }}
          </button>
          <button
            @click="showCreateDialog = true"
            class="px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 transition-colors flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            {{ $t('common.createContainer') }}
          </button>
        </div>
      </div>

      <!-- 创建容器对话框 -->
      <div
        v-if="showCreateDialog"
        class="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 dark:bg-black/70"
        @click.self="showCreateDialog = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">{{ $t('common.createContainer') }}</h2>
            <button
              @click="showCreateDialog = false"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleCreateContainer" class="p-6 space-y-6">
            <!-- 基本信息 -->
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">基本信息</h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    容器名称 <span class="text-error-500">*</span>
                  </label>
                  <input
                    v-model="createForm.name"
                    type="text"
                    required
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: nginx-container"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    镜像名称 <span class="text-error-500">*</span>
                  </label>
                  <input
                    v-model="createForm.image"
                    type="text"
                    required
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: nginx:latest"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    标签/版本
                  </label>
                  <input
                    v-model="createForm.tag"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: latest, 1.0.0"
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
                    CPU 限制
                  </label>
                  <input
                    v-model="createForm.cpuLimit"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: 1.5 或 0.5"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    内存限制
                  </label>
                  <div class="flex gap-2">
                    <input
                      v-model.number="createForm.memoryLimit"
                      type="number"
                      min="64"
                      step="64"
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
              </div>
            </div>

            <!-- 网络配置 -->
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">网络配置</h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    端口映射
                  </label>
                  <div class="space-y-2">
                    <div
                      v-for="(port, index) in createForm.ports"
                      :key="index"
                      class="flex gap-2 items-center"
                    >
                      <input
                        v-model="port.host"
                        type="number"
                        placeholder="主机端口"
                        class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      />
                      <span class="text-gray-600 dark:text-gray-400">:</span>
                      <input
                        v-model="port.container"
                        type="number"
                        placeholder="容器端口"
                        class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        @click="removePort(index)"
                        class="px-3 py-2 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-colors"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <button
                      type="button"
                      @click="addPort"
                      class="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                      添加端口映射
                    </button>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    网络模式
                  </label>
                  <select
                    v-model="createForm.networkMode"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="bridge">桥接模式 (bridge)</option>
                    <option value="host">主机模式 (host)</option>
                    <option value="none">无网络 (none)</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- 存储配置 -->
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">存储配置</h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    数据卷/挂载点
                  </label>
                  <div class="space-y-2">
                    <div
                      v-for="(volume, index) in createForm.volumes"
                      :key="index"
                      class="flex gap-2 items-center"
                    >
                      <input
                        v-model="volume.hostPath"
                        type="text"
                        placeholder="主机路径"
                        class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      />
                      <span class="text-gray-600 dark:text-gray-400">:</span>
                      <input
                        v-model="volume.containerPath"
                        type="text"
                        placeholder="容器路径"
                        class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      />
                      <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <input
                          v-model="volume.readOnly"
                          type="checkbox"
                          class="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                        />
                        只读
                      </label>
                      <button
                        type="button"
                        @click="removeVolume(index)"
                        class="px-3 py-2 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-colors"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <button
                      type="button"
                      @click="addVolume"
                      class="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                      添加数据卷
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 环境变量 -->
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">环境变量</h3>
              <div class="space-y-2">
                <div
                  v-for="(env, index) in createForm.environment"
                  :key="index"
                  class="flex gap-2 items-center"
                >
                  <input
                    v-model="env.key"
                    type="text"
                    placeholder="变量名"
                    class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                  <span class="text-gray-600 dark:text-gray-400">=</span>
                  <input
                    v-model="env.value"
                    type="text"
                    placeholder="变量值"
                    class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    @click="removeEnv(index)"
                    class="px-3 py-2 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-colors"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <button
                  type="button"
                  @click="addEnv"
                  class="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  添加环境变量
                </button>
              </div>
            </div>

            <!-- 启动选项 -->
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">启动选项</h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    启动命令
                  </label>
                  <input
                    v-model="createForm.command"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: nginx -g 'daemon off;'"
                  />
                </div>

                <div class="flex items-center">
                  <input
                    v-model="createForm.autoStart"
                    type="checkbox"
                    id="autoStart"
                    class="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <label for="autoStart" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    自动启动（随系统启动）
                  </label>
                </div>

                <div class="flex items-center">
                  <input
                    v-model="createForm.interactive"
                    type="checkbox"
                    id="interactive"
                    class="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <label for="interactive" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    交互式模式 (-it)
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
                <span v-else>创建容器</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- 导入容器对话框 -->
      <div
        v-if="showImportDialog"
        class="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 dark:bg-black/70"
        @click.self="() => { showImportDialog = false; imageNameError = '' }"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">导入容器</h2>
            <button
              @click="() => { showImportDialog = false; imageNameError = '' }"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleImportContainer" class="p-6 space-y-6">
            <!-- 导入方式 -->
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">导入方式</h3>
              <div class="space-y-3">
                <label class="flex items-center p-4 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <input
                    v-model="importForm.importType"
                    type="radio"
                    value="image"
                    class="w-4 h-4 text-brand-500 border-gray-300 focus:ring-brand-500"
                  />
                  <div class="ml-3">
                    <div class="text-sm font-medium text-gray-800 dark:text-white/90">从镜像导入</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">从本地或远程镜像创建容器</div>
                  </div>
                </label>

                <label class="flex items-center p-4 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <input
                    v-model="importForm.importType"
                    type="radio"
                    value="tar"
                    class="w-4 h-4 text-brand-500 border-gray-300 focus:ring-brand-500"
                  />
                  <div class="ml-3">
                    <div class="text-sm font-medium text-gray-800 dark:text-white/90">从tar文件导入</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">从tar归档文件导入容器镜像</div>
                  </div>
                </label>
              </div>
            </div>

            <!-- 从镜像导入 -->
            <div v-if="importForm.importType === 'image'">
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">镜像信息</h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    镜像名称 <span class="text-error-500">*</span>
                  </label>
                  <input
                    v-model="importForm.imageName"
                    type="text"
                    required
                    @input="validateImageName"
                    :class="[
                      'w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                      imageNameError ? 'border-warning-500 dark:border-warning-500' : 'border-gray-300 dark:border-gray-600'
                    ]"
                    placeholder="例如: nginx:latest 或 registry.example.com/nginx:1.0"
                  />
                  <p v-if="imageNameError" class="mt-1 text-xs text-warning-600 dark:text-warning-400">
                    {{ imageNameError }}
                  </p>
                  <p v-else class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {{ $t('common.imageNameHint') }}
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    容器名称
                  </label>
                  <input
                    v-model="importForm.containerName"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="留空则自动生成"
                  />
                </div>

                <div class="flex items-center">
                  <input
                    v-model="importForm.pullIfNotExists"
                    type="checkbox"
                    id="pullIfNotExists"
                    class="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <label for="pullIfNotExists" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    如果镜像不存在则自动拉取
                  </label>
                </div>
              </div>
            </div>

            <!-- 从tar文件导入 -->
            <div v-if="importForm.importType === 'tar'">
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">文件信息</h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    tar文件路径 <span class="text-error-500">*</span>
                  </label>
                  <input
                    v-model="importForm.tarPath"
                    type="text"
                    required
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: /path/to/container.tar 或 /path/to/image.tar.gz"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    导入后的镜像名称
                  </label>
                  <input
                    v-model="importForm.importedImageName"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: my-imported-image:latest"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    容器名称
                  </label>
                  <input
                    v-model="importForm.containerName"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="留空则自动生成"
                  />
                </div>
              </div>
            </div>

            <!-- 通用选项 -->
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">选项</h3>
              <div class="space-y-3">
                <div class="flex items-center">
                  <input
                    v-model="importForm.startAfterImport"
                    type="checkbox"
                    id="startAfterImport"
                    class="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <label for="startAfterImport" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    导入后立即启动容器
                  </label>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                @click="() => { showImportDialog = false; imageNameError = '' }"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="importing"
                class="px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="importing">{{ $t('common.importing') }}</span>
                <span v-else>{{ $t('common.importContainer') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- 端口映射管理对话框 -->
      <div
        v-if="showPortMappingDialog"
        class="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 dark:bg-black/70"
        @click.self="showPortMappingDialog = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
          <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">{{ $t('common.portMapping') }} - {{ currentContainer?.name }}</h2>
            <button
              @click="showPortMappingDialog = false"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-6">
            <!-- 当前端口映射列表 -->
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">{{ $t('common.portMapping') }}</h3>
              <div v-if="portMappings.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4">
                暂无端口映射
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="(port, index) in portMappings"
                  :key="index"
                  class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div class="flex items-center gap-4">
                    <div>
                      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ $t('common.hostPort') }}:</span>
                      <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">{{ port.host || '-' }}</span>
                    </div>
                    <div class="text-gray-400">→</div>
                    <div>
                      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ $t('common.containerPort') }}:</span>
                      <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">{{ port.container?.split('/')[0] || '-' }}</span>
                    </div>
                    <div>
                      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ $t('common.portType') }}:</span>
                      <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">{{ port.type || 'tcp' }}</span>
                    </div>
                    <div v-if="port.host" class="ml-4">
                      <a
                        :href="`http://${hostIp}:${port.host}`"
                        target="_blank"
                        class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {{ $t('common.accessUrl') }}: http://{{ hostIp }}:{{ port.host }}
                      </a>
                      <button
                        @click="copyToClipboard(`http://${hostIp}:${port.host}`)"
                        class="ml-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        :title="$t('common.copyUrl')"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                  <button
                    @click="removePortMapping(index)"
                    class="px-2 py-1 text-xs text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10 rounded transition-colors"
                  >
                    {{ $t('common.delete') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 添加新端口映射 -->
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">{{ $t('common.addPortMapping') }}</h3>
              <div class="space-y-4">
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {{ $t('common.hostPort') }} <span class="text-error-500">*</span>
                    </label>
                    <input
                      v-model.number="newPortMapping.host"
                      type="number"
                      min="1"
                      max="65535"
                      class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      placeholder="例如: 8080"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {{ $t('common.containerPort') }} <span class="text-error-500">*</span>
                    </label>
                    <input
                      v-model.number="newPortMapping.container"
                      type="number"
                      min="1"
                      max="65535"
                      class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      placeholder="例如: 80"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {{ $t('common.portType') }}
                    </label>
                    <select
                      v-model="newPortMapping.type"
                      class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    >
                      <option value="tcp">TCP</option>
                      <option value="udp">UDP</option>
                    </select>
                  </div>
                </div>
                <button
                  @click="addPortMapping"
                  class="px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 transition-colors"
                >
                  {{ $t('common.add') }}
                </button>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                @click="showPortMappingDialog = false"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                @click="savePortMappings"
                :disabled="savingPorts"
                class="px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="savingPorts">{{ $t('common.saving') }}</span>
                <span v-else>{{ $t('common.save') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 容器列表 -->
      <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div class="p-6">
          <!-- 加载状态 -->
          <div v-if="loading" class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            <p class="mt-4 text-gray-600 dark:text-gray-400">{{ $t('common.loading') }}</p>
          </div>
          <!-- 无数据状态 -->
          <div v-else-if="containers.length === 0" class="text-center py-12">
            <p class="text-gray-600 dark:text-gray-400">{{ $t('common.noContainers') }}</p>
            <div class="mt-4 flex gap-2 justify-center">
              <button
                @click="showImportDialog = true"
                class="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
              >
                {{ $t('common.importContainer') }}
              </button>
              <button
                @click="showCreateDialog = true"
                class="px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 transition-colors"
              >
                {{ $t('common.createFirstContainer') }}
              </button>
            </div>
          </div>
          <div v-else class="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]">
            <table class="w-full min-w-[800px]">
              <thead class="bg-gray-50 dark:bg-white/[0.02]">
                <tr>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap w-[120px]">{{ $t('common.name') }}</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap w-[200px]">{{ $t('pages.containers.image') }}</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap w-[80px]">{{ $t('common.status') }}</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap w-[150px]">{{ $t('pages.containers.ports') }}</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap w-[180px]">创建时间</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">{{ $t('common.actions') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                <tr v-for="container in containers" :key="container.id" class="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <td class="px-3 py-2 text-sm">
                    <router-link
                      :to="`/containers/${container.name}`"
                      class="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 font-medium block truncate max-w-[120px]"
                      :title="container.name"
                    >
                      {{ container.name }}
                    </router-link>
                  </td>
                  <td class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                    <div class="truncate max-w-[200px]" :title="container.image">
                      {{ container.image }}
                    </div>
                  </td>
                  <td class="px-3 py-2 whitespace-nowrap">
                    <span
                      :class="[
                        'px-2 py-0.5 text-xs rounded whitespace-nowrap',
                        isContainerRunning(container)
                          ? 'bg-success-500/10 text-success-500'
                          : 'bg-gray-500/10 text-gray-500',
                      ]"
                    >
                      {{ isContainerRunning(container) ? $t('common.running') : $t('common.stopped') }}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                    <div class="truncate max-w-[150px]" :title="container.ports || '-'">
                      {{ container.ports || '-' }}
                    </div>
                  </td>
                  <td class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                    <div class="truncate max-w-[180px]" :title="formatCreatedTime(container.created)">
                      {{ formatCreatedTime(container.created) }}
                    </div>
                  </td>
                  <td class="px-3 py-2 text-sm whitespace-nowrap">
                    <div class="flex gap-0.5 flex-wrap">
                      <button
                        v-if="!isContainerRunning(container)"
                        @click.stop="startContainer(container.name)"
                        :title="$t('common.start')"
                        class="px-1.5 py-0.5 text-xs bg-success-600 dark:bg-success-500 text-white rounded hover:bg-success-700 dark:hover:bg-success-600 transition-colors cursor-pointer"
                      >
                        {{ $t('common.start') }}
                      </button>
                      <button
                        v-if="isContainerRunning(container)"
                        @click.stop="stopContainer(container.name)"
                        :title="$t('common.stop')"
                        class="px-1.5 py-0.5 text-xs bg-error-600 dark:bg-error-500 text-white rounded hover:bg-error-700 dark:hover:bg-error-600 transition-colors cursor-pointer"
                      >
                        {{ $t('common.stop') }}
                      </button>
                      <button
                        @click.stop="openPortMappingDialog(container)"
                        :title="$t('common.managePorts')"
                        class="px-1.5 py-0.5 text-xs bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors cursor-pointer"
                      >
                        {{ $t('common.managePorts') }}
                      </button>
                      <button
                        @click.stop="restartContainer(container.name)"
                        :title="$t('common.restart')"
                        class="px-1.5 py-0.5 text-xs bg-warning-600 dark:bg-warning-500 text-white rounded hover:bg-warning-700 dark:hover:bg-warning-600 transition-colors cursor-pointer"
                      >
                        {{ $t('common.restart') }}
                      </button>
                      <button
                        @click.stop="deleteContainer(container.name)"
                        :title="$t('common.delete')"
                        class="px-1.5 py-0.5 text-xs bg-error-600 dark:bg-error-500 text-white rounded hover:bg-error-700 dark:hover:bg-error-600 transition-colors cursor-pointer"
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
import { containersApi } from '@/api/containers'
import type { Container } from '@/api/containers'

const { t: $t, t } = useI18n()

const router = useRouter()

const loading = ref(false)
const containers = ref<Container[]>([])

// 判断容器是否运行中
const isContainerRunning = (container: Container): boolean => {
  const state = (container.state || '').toLowerCase()
  const status = (container.status || '').toLowerCase()
  
  // 检查多种运行状态标识
  return (
    state === 'running' ||
    status.includes('up') ||
    status.startsWith('up ') ||
    (status.includes('running') && !status.includes('exited'))
  )
}

// 刷新容器列表
let refreshInterval: number | undefined

const refreshContainers = async () => {
  loading.value = true
  try {
    const data = await containersApi.getContainers()
    // 确保数据更新，使用响应式赋值
    if (data && Array.isArray(data)) {
      containers.value = [...data] // 创建新数组确保响应式更新
    } else {
      containers.value = []
    }
  } catch (error: any) {
    console.error('获取容器列表失败:', error)
    containers.value = []
    // 如果是认证错误，响应拦截器应该已经处理了跳转
    if (error?.error?.includes('未提供认证令牌') || error?.error?.includes('无效的认证令牌')) {
      return
    }
  } finally {
    loading.value = false
  }
}

// 创建容器对话框
const showCreateDialog = ref(false)
const creating = ref(false)

const createForm = ref({
  name: '',
  image: '',
  tag: '',
  cpuLimit: '',
  memoryLimit: 512,
  memoryUnit: 'MB',
  ports: [{ host: '', container: '' }],
  networkMode: 'bridge',
  volumes: [{ hostPath: '', containerPath: '', readOnly: false }],
  environment: [{ key: '', value: '' }],
  command: '',
  autoStart: false,
  interactive: false,
})

const addPort = () => {
  createForm.value.ports.push({ host: '', container: '' })
}

const removePort = (index: number) => {
  if (createForm.value.ports.length > 1) {
    createForm.value.ports.splice(index, 1)
  }
}

const addVolume = () => {
  createForm.value.volumes.push({ hostPath: '', containerPath: '', readOnly: false })
}

const removeVolume = (index: number) => {
  if (createForm.value.volumes.length > 1) {
    createForm.value.volumes.splice(index, 1)
  }
}

const addEnv = () => {
  createForm.value.environment.push({ key: '', value: '' })
}

const removeEnv = (index: number) => {
  if (createForm.value.environment.length > 1) {
    createForm.value.environment.splice(index, 1)
  }
}

const handleCreateContainer = async () => {
  if (!createForm.value.name || !createForm.value.image) {
    alert('请填写必填项')
    return
  }

  creating.value = true

  try {
    // 构建镜像名称
    const fullImage = createForm.value.tag
      ? `${createForm.value.image}:${createForm.value.tag}`
      : createForm.value.image

    await containersApi.createContainer({
      name: createForm.value.name,
      image: fullImage,
      cpuLimit: createForm.value.cpuLimit,
      memoryLimit: createForm.value.memoryLimit,
      memoryUnit: createForm.value.memoryUnit as 'MB' | 'GB',
      ports: createForm.value.ports.filter(p => p.host && p.container),
      networkMode: createForm.value.networkMode,
      volumes: createForm.value.volumes.filter(v => v.hostPath && v.containerPath),
      environment: createForm.value.environment.filter(e => e.key && e.value),
      command: createForm.value.command,
      autoStart: createForm.value.autoStart,
      interactive: createForm.value.interactive,
    })

    // 重置表单
    createForm.value = {
      name: '',
      image: '',
      tag: '',
      cpuLimit: '',
      memoryLimit: 512,
      memoryUnit: 'MB',
      ports: [{ host: '', container: '' }],
      networkMode: 'bridge',
      volumes: [{ hostPath: '', containerPath: '', readOnly: false }],
      environment: [{ key: '', value: '' }],
      command: '',
      autoStart: false,
      interactive: false,
    }

    showCreateDialog.value = false
    alert('容器创建成功！')
    
    // 刷新列表
    await refreshContainers()
  } catch (error: any) {
    console.error('创建容器失败:', error)
    alert(error?.error || '创建容器失败，请重试')
  } finally {
    creating.value = false
  }
}

// 导入容器对话框
const showImportDialog = ref(false)
const importing = ref(false)
const imageNameError = ref('')

const importForm = ref({
  importType: 'image',
  imageName: '',
  tarPath: '',
  importedImageName: '',
  containerName: '',
  pullIfNotExists: true,
  startAfterImport: false,
})

// 验证镜像名称格式
const validateImageName = () => {
  const imageName = importForm.value.imageName?.trim() || ''
  imageNameError.value = ''
  
  if (!imageName) {
    return
  }
  
  // 检测是否包含命令前缀
  if (/^(docker|podman)\s+pull\s+/i.test(imageName)) {
    imageNameError.value = t('common.imageNameFormatError')
  }
}

const handleImportContainer = async () => {
  if (importForm.value.importType === 'image' && !importForm.value.imageName) {
    alert(t('common.imageNameRequired') || '请填写镜像名称')
    return
  }

  if (importForm.value.importType === 'tar' && !importForm.value.tarPath) {
    alert('请填写tar文件路径')
    return
  }

  importing.value = true
  imageNameError.value = ''

  try {
    // 清理镜像名称：如果用户输入了完整的 docker pull 命令，只提取镜像名称部分
    let cleanedImageName = importForm.value.imageName?.trim() || ''
    const hadCommandPrefix = /^(docker|podman)\s+pull\s+/i.test(cleanedImageName)
    
    if (cleanedImageName) {
      // 移除 "docker pull" 或 "podman pull" 前缀
      cleanedImageName = cleanedImageName.replace(/^(docker|podman)\s+pull\s+/i, '').trim()
      // 移除可能的引号
      cleanedImageName = cleanedImageName.replace(/^["']|["']$/g, '')
    }
    
    // 如果检测到命令前缀，给用户一个友好的提示
    if (hadCommandPrefix) {
      console.log(t('common.imageNameFormatError'))
    }

    await containersApi.importContainer({
      importType: importForm.value.importType as 'image' | 'tar',
      imageName: cleanedImageName,
      tarPath: importForm.value.tarPath,
      importedImageName: importForm.value.importedImageName,
      containerName: importForm.value.containerName,
      pullIfNotExists: importForm.value.pullIfNotExists,
      startAfterImport: importForm.value.startAfterImport,
    })

    // 重置表单
    importForm.value = {
      importType: 'image',
      imageName: '',
      tarPath: '',
      importedImageName: '',
      containerName: '',
      pullIfNotExists: true,
      startAfterImport: false,
    }
    imageNameError.value = ''

    showImportDialog.value = false
    alert('容器导入成功！')
    
    // 刷新列表
    await refreshContainers()
  } catch (error: any) {
    console.error('导入容器失败:', error)
    const errorMessage = error?.error || error?.message || '导入容器失败，请重试'
    
    // 如果错误信息包含换行符，使用更友好的显示方式
    if (errorMessage.includes('\n')) {
      // 将多行错误信息格式化为更易读的形式
      const formattedError = errorMessage.replace(/\n\n/g, '\n').split('\n')
      const title = formattedError[0]
      const details = formattedError.slice(1).join('\n')
      
      // 使用 confirm 显示详细错误，用户可以选择查看详情
      const showDetails = confirm(`${title}\n\n点击"确定"查看详细错误信息和解决建议，点击"取消"关闭。`)
      if (showDetails) {
        alert(details)
      }
    } else {
      alert(errorMessage)
    }
  } finally {
    importing.value = false
  }
}

const startContainer = async (name: string) => {
  console.log('启动容器:', name)
  const container = containers.value.find((c) => c.name === name)
  if (!container) {
    console.error('未找到容器:', name)
    alert('未找到容器: ' + name)
    return
  }
  
  console.log('容器信息:', container)
  
  try {
    console.log('调用启动API，容器ID:', container.id)
    const result = await containersApi.startContainer(container.id)
    console.log('启动API返回:', result)
    
    // 等待容器启动完成
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 多次刷新以确保状态同步
    for (let i = 0; i < 3; i++) {
      console.log(`第 ${i + 1} 次刷新列表`)
      await refreshContainers()
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 检查容器状态是否已更新
      const updatedContainer = containers.value.find((c) => c.name === name)
      if (updatedContainer && isContainerRunning(updatedContainer)) {
        console.log('容器状态已更新为运行中')
        break
      }
    }
    
    // 最终检查并显示状态
    const finalContainer = containers.value.find((c) => c.name === name)
    if (finalContainer) {
      console.log('最终容器状态:', {
        name: finalContainer.name,
        state: finalContainer.state,
        status: finalContainer.status,
        isRunning: isContainerRunning(finalContainer)
      })
    }
    
    console.log('容器启动完成，当前列表:', containers.value)
  } catch (error: any) {
    console.error('启动容器失败:', error)
    // 提取错误信息：可能是 error.error 或 error.message 或直接是字符串
    const errorMsg = error?.error || error?.message || (typeof error === 'string' ? error : '启动容器失败')
    alert(`启动容器失败: ${errorMsg}`)
    // 即使失败也刷新列表，确保显示最新状态
    await refreshContainers()
  }
}

const stopContainer = async (name: string) => {
  const container = containers.value.find((c) => c.name === name)
  if (!container) return
  
  try {
    await containersApi.stopContainer(container.id)
    // 等待一小段时间确保容器状态已更新
    await new Promise(resolve => setTimeout(resolve, 500))
    // 刷新列表
    await refreshContainers()
    // 再次等待并刷新，确保状态同步
    await new Promise(resolve => setTimeout(resolve, 500))
    await refreshContainers()
  } catch (error: any) {
    console.error('停止容器失败:', error)
    alert(error?.error || '停止容器失败')
    // 即使失败也刷新列表，确保显示最新状态
    await refreshContainers()
  }
}

const restartContainer = async (name: string) => {
  const container = containers.value.find((c) => c.name === name)
  if (!container) return
  
  try {
    await containersApi.restartContainer(container.id)
    // 等待一小段时间确保容器状态已更新
    await new Promise(resolve => setTimeout(resolve, 500))
    // 刷新列表
    await refreshContainers()
    // 再次等待并刷新，确保状态同步
    await new Promise(resolve => setTimeout(resolve, 500))
    await refreshContainers()
  } catch (error: any) {
    console.error('重启容器失败:', error)
    alert(error?.error || '重启容器失败')
    // 即使失败也刷新列表，确保显示最新状态
    await refreshContainers()
  }
}

const deleteContainer = async (name: string) => {
  const container = containers.value.find((c) => c.name === name)
  if (!container) return
  
  if (confirm(`${$t('common.confirmDeleteContainer')} ${name} ${$t('common.questionMark')}`)) {
    try {
      await containersApi.deleteContainer(container.id)
      // 等待一小段时间确保容器已删除
      await new Promise(resolve => setTimeout(resolve, 300))
      // 刷新列表
      await refreshContainers()
    } catch (error: any) {
      console.error('删除容器失败:', error)
      alert(error?.error || '删除容器失败')
      // 即使失败也刷新列表，确保显示最新状态
      await refreshContainers()
    }
  }
}

// 端口映射管理
const showPortMappingDialog = ref(false)
const currentContainer = ref<Container | null>(null)
const portMappings = ref<Array<{ host: string; container: string; type: string }>>([])
const newPortMapping = ref({ host: '', container: '', type: 'tcp' })
const savingPorts = ref(false)
const hostIp = ref('localhost')

// 格式化创建时间
const formatCreatedTime = (created: string | undefined): string => {
  if (!created || created === '-') return '-'
  try {
    // 尝试解析 ISO 格式的时间
    const date = new Date(created)
    if (isNaN(date.getTime())) {
      // 如果不是有效日期，返回原始值
      return created
    }
    // 格式化完整时间：YYYY-MM-DD HH:mm:ss
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    // 如果解析失败，返回原始值
    return created
  }
}

const openPortMappingDialog = async (container: Container) => {
  currentContainer.value = container
  showPortMappingDialog.value = true
  
  // 获取容器详情以获取当前端口映射
  try {
    const details = await containersApi.getContainerDetails(container.id)
    if (details && details.ports) {
      portMappings.value = details.ports.map(p => ({
        host: p.host || '',
        container: p.container || '',
        type: p.type || 'tcp',
      }))
    } else {
      portMappings.value = []
    }
  } catch (error) {
    console.error('获取容器详情失败:', error)
    portMappings.value = []
  }
  
  // 获取主机IP（使用当前页面的hostname）
  hostIp.value = window.location.hostname || 'localhost'
  
  // 如果是localhost，尝试获取实际IP
  if (hostIp.value === 'localhost' || hostIp.value === '127.0.0.1') {
    try {
      const response = await fetch('/api/system/info')
      const data = await response.json()
      if (data.networkInterfaces && data.networkInterfaces.length > 0) {
        const mainInterface = data.networkInterfaces.find((iface: any) => 
          !iface.name.includes('lo') && !iface.name.includes('docker') && !iface.name.includes('virbr')
        )
        if (mainInterface && mainInterface.addresses && mainInterface.addresses.length > 0) {
          hostIp.value = mainInterface.addresses[0].address
        }
      }
    } catch (error) {
      console.error('获取主机IP失败:', error)
    }
  }
}

const addPortMapping = () => {
  if (!newPortMapping.value.host || !newPortMapping.value.container) {
    alert('请填写主机端口和容器端口')
    return
  }
  
  // 检查是否已存在相同的主机端口
  if (portMappings.value.some(p => p.host === String(newPortMapping.value.host))) {
    alert('该主机端口已被使用')
    return
  }
  
  portMappings.value.push({
    host: String(newPortMapping.value.host),
    container: `${newPortMapping.value.container}/${newPortMapping.value.type}`,
    type: newPortMapping.value.type,
  })
  
  // 重置表单
  newPortMapping.value = { host: '', container: '', type: 'tcp' }
}

const removePortMapping = (index: number) => {
  portMappings.value.splice(index, 1)
}

const savePortMappings = async () => {
  if (!currentContainer.value) return
  
  if (!confirm('更新端口映射将重新创建容器，容器将短暂停止。是否继续？')) {
    return
  }
  
  // 验证端口映射
  if (portMappings.value.length === 0) {
    alert('请至少添加一个端口映射')
    return
  }
  
  for (const port of portMappings.value) {
    if (!port.host || !port.container) {
      alert('请确保所有端口映射都填写完整')
      return
    }
  }
  
  savingPorts.value = true
  
  try {
    const ports = portMappings.value.map(p => {
      const containerPort = typeof p.container === 'string' ? p.container.split('/')[0] : String(p.container)
      return {
        host: String(p.host),
        container: containerPort,
        type: p.type || 'tcp',
      }
    })
    
    console.log('保存端口映射:', ports)
    const result = await containersApi.updateContainerPorts(currentContainer.value.id, ports)
    console.log('更新结果:', result)
    
    alert('端口映射更新成功')
    showPortMappingDialog.value = false
    
    // 等待一小段时间确保容器已创建
    await new Promise(resolve => setTimeout(resolve, 1000))
    // 刷新列表
    await refreshContainers()
  } catch (error: any) {
    console.error('更新端口映射失败:', error)
    const errorMessage = error?.error || error?.message || '更新端口映射失败'
    
    // 如果错误信息包含换行符，使用更友好的显示方式
    if (errorMessage.includes('\n')) {
      const formattedError = errorMessage.replace(/\n\n/g, '\n').split('\n')
      const title = formattedError[0]
      const details = formattedError.slice(1).join('\n')
      
      const showDetails = confirm(`${title}\n\n点击"确定"查看详细错误信息，点击"取消"关闭。`)
      if (showDetails) {
        alert(details)
      }
    } else {
      alert(`更新端口映射失败: ${errorMessage}`)
    }
    
    // 即使失败也刷新列表
    await refreshContainers()
  } finally {
    savingPorts.value = false
  }
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    alert('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    alert('复制失败')
  }
}

onMounted(() => {
  // 立即加载数据
  refreshContainers()
  
  // 每30秒刷新一次数据
  refreshInterval = setInterval(() => {
    refreshContainers()
  }, 30000) as unknown as number
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>
