<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">{{ $t('pages.models.title') }}</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">{{ $t('pages.models.description') }}</p>
        </div>
        <div class="flex gap-2">
          <button
            @click="showConfigDialog = true"
            class="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {{ $t('common.config') }}
          </button>
          <button
            @click="handleSync"
            :disabled="syncing"
            class="px-4 py-2 bg-success-600 dark:bg-success-500 text-white rounded-lg hover:bg-success-700 dark:hover:bg-success-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span v-if="syncing">{{ $t('common.syncing') }}</span>
            <span v-else>{{ $t('common.sync') }}</span>
          </button>
          <button
            @click="showUploadDialog = true"
            class="px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 transition-colors flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {{ $t('common.upload') }}
          </button>
        </div>
      </div>

      <!-- 配置对话框 -->
      <div
        v-if="showConfigDialog"
        class="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 dark:bg-black/70"
        @click.self="showConfigDialog = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">配置云端模型仓库</h2>
            <button
              @click="showConfigDialog = false"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleSaveConfig" class="p-6 space-y-6">
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">云端仓库配置</h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API端点 <span class="text-error-500">*</span>
                  </label>
                  <input
                    v-model="configForm.apiEndpoint"
                    type="text"
                    required
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: https://100.93.0.38:9000"
                  />
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    云端仓库API服务端点（IP:端口）
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Web控制台（可选）
                  </label>
                  <input
                    v-model="configForm.webConsole"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: https://100.93.0.38:9001"
                  />
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    云端仓库Web控制台地址（可选，用于访问Web界面）
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      用户名 (Access Key) <span class="text-error-500">*</span>
                    </label>
                    <input
                      v-model="configForm.accessKey"
                      type="text"
                      required
                      class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      placeholder="例如: infiniteos"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      密码 (Secret Key) <span class="text-error-500">*</span>
                    </label>
                    <input
                      v-model="configForm.secretKey"
                      type="password"
                      required
                      class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      placeholder="例如: infiniteos"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    存储桶名称 <span class="text-error-500">*</span>
                  </label>
                  <input
                    v-model="configForm.bucket"
                    type="text"
                    required
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: pubmodels"
                  />
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    云端仓库存储桶名称，模型文件将存储在此桶中
                  </p>
                </div>

                <div class="flex items-center">
                  <input
                    v-model="configForm.useSSL"
                    type="checkbox"
                    id="useSSL"
                    class="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <label for="useSSL" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    使用SSL/TLS连接
                  </label>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    同步间隔
                  </label>
                  <select
                    v-model="configForm.syncInterval"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="manual">手动同步</option>
                    <option value="hourly">每小时</option>
                    <option value="daily">每天</option>
                    <option value="weekly">每周</option>
                  </select>
                </div>

                <div class="flex items-center">
                  <input
                    v-model="configForm.autoSync"
                    type="checkbox"
                    id="autoSync"
                    class="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <label for="autoSync" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    自动同步（系统加入算力网络时自动获取并同步）
                  </label>
                </div>
              </div>
            </div>

            <div class="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
              <div class="flex items-start">
                <svg class="w-5 h-5 text-blue-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div class="text-sm text-blue-700 dark:text-blue-300">
                  <p class="font-medium mb-1">提示</p>
                  <p>配置云端仓库作为模型仓库。请确保API端点、用户名、密码和存储桶名称配置正确，系统将使用这些信息连接云端仓库并同步/上传模型。</p>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                @click="showConfigDialog = false"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 transition-colors"
              >
                保存配置
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- 上传对话框 -->
      <div
        v-if="showUploadDialog"
        class="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 dark:bg-black/70"
        @click.self="showUploadDialog = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">{{ $t('common.uploadModel') }}</h2>
            <button
              @click="showUploadDialog = false"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleUpload" class="p-6 space-y-6">
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">模型信息</h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ $t('common.modelName') }} <span class="text-error-500">*</span>
                  </label>
                  <input
                    v-model="uploadForm.name"
                    type="text"
                    required
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: llama-2-7b-chat"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    模型版本
                  </label>
                  <input
                    v-model="uploadForm.version"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: v1.0.0"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    模型类型
                  </label>
                  <select
                    v-model="uploadForm.type"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="llm">大语言模型 (LLM)</option>
                    <option value="embedding">嵌入模型 (Embedding)</option>
                    <option value="vision">视觉模型 (Vision)</option>
                    <option value="multimodal">多模态模型 (Multimodal)</option>
                    <option value="other">其他</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    模型文件 <span class="text-error-500">*</span>
                  </label>
                  <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:border-brand-500 dark:hover:border-brand-500 transition-colors">
                    <div class="space-y-1 text-center">
                      <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                      <div class="flex text-sm text-gray-600 dark:text-gray-400">
                        <label class="relative cursor-pointer rounded-md font-medium text-brand-500 hover:text-brand-600">
                          <span>选择文件</span>
                          <input
                            ref="fileInput"
                            type="file"
                            @change="handleFileSelect"
                            class="sr-only"
                            accept=".bin,.safetensors,.pt,.pth,.onnx,.gguf,.ggml"
                            multiple
                          />
                        </label>
                        <p class="pl-1">或拖拽文件到此处</p>
                      </div>
                      <p class="text-xs text-gray-500 dark:text-gray-500">
                        支持 .bin, .safetensors, .pt, .pth, .onnx, .gguf, .ggml 等格式
                      </p>
                      <div v-if="uploadForm.files.length > 0" class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <p>已选择 {{ uploadForm.files.length }} 个文件</p>
                        <ul class="mt-1 text-xs text-left space-y-1">
                          <li v-for="(file, index) in uploadForm.files" :key="index" class="truncate">
                            {{ file.name }} ({{ formatFileSize(file.size) }})
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    描述
                  </label>
                  <textarea
                    v-model="uploadForm.description"
                    rows="3"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="模型的描述信息..."
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                @click="showUploadDialog = false"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="uploading || uploadForm.files.length === 0"
                class="px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="uploading">{{ $t('common.uploading') }}</span>
                <span v-else>{{ $t('common.uploadModel') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- 部署对话框 -->
      <div
        v-if="showDeployDialogFlag"
        class="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 dark:bg-black/70"
        @click.self="showDeployDialogFlag = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">部署模型</h2>
            <button
              @click="showDeployDialogFlag = false"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleDeploy" class="p-6 space-y-6">
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">部署配置</h3>
              <div class="space-y-4">
                <div class="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
                  <p class="text-sm text-blue-700 dark:text-blue-300">
                    <span class="font-medium">模型:</span> {{ deployForm.modelName }}
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ $t('common.serviceName') }} <span class="text-error-500">*</span>
                  </label>
                  <input
                    v-model="deployForm.serviceName"
                    type="text"
                    required
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: llama-2-7b-inference"
                  />
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    部署后的服务名称，将用于访问推理服务
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    推理框架
                  </label>
                  <select
                    v-model="deployForm.framework"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="vllm">vLLM (推荐)</option>
                    <option value="ollama">Ollama</option>
                    <option value="tgi">Text Generation Inference (TGI)</option>
                    <option value="transformers">Transformers</option>
                  </select>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    选择用于运行模型的推理框架
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      API端口 <span class="text-error-500">*</span>
                    </label>
                    <input
                      v-model.number="deployForm.apiPort"
                      type="number"
                      required
                      min="1024"
                      max="65535"
                      class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      placeholder="8000"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      健康检查端口
                    </label>
                    <input
                      v-model.number="deployForm.healthPort"
                      type="number"
                      min="1024"
                      max="65535"
                      class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      placeholder="8001"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    GPU设备 (可选)
                  </label>
                  <input
                    v-model="deployForm.gpuDevices"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: 0 或 0,1 (留空则使用CPU)"
                  />
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    指定使用的GPU设备ID，多个用逗号分隔，留空则使用CPU
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CPU限制
                    </label>
                    <input
                      v-model="deployForm.cpuLimit"
                      type="text"
                      class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      placeholder="例如: 4 或 2.5"
                    />
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      限制使用的CPU核心数
                    </p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      内存限制
                    </label>
                    <input
                      v-model="deployForm.memoryLimit"
                      type="text"
                      class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      placeholder="例如: 8Gi 或 4096Mi"
                    />
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      限制使用的内存大小
                    </p>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    环境变量 (可选)
                  </label>
                  <textarea
                    v-model="deployForm.envVars"
                    rows="3"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono text-sm"
                    placeholder="KEY1=value1&#10;KEY2=value2"
                  ></textarea>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    每行一个环境变量，格式: KEY=value
                  </p>
                </div>

                <div class="flex items-center">
                  <input
                    v-model="deployForm.autoStart"
                    type="checkbox"
                    id="autoStart"
                    class="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <label for="autoStart" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    部署后自动启动服务
                  </label>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                @click="showDeployDialogFlag = false"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="deploying"
                class="px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="deploying">部署中...</span>
                <span v-else>开始部署</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- 本地模型 / 云端模型 双列表（分块加载，先出本地再出云端） -->
      <div class="space-y-6">
        <!-- 本地模型（/var/data/pubmodels 下目录名为模型名） -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-medium text-gray-800 dark:text-white/90">本地模型</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">目录 /var/data/pubmodels 下每个子目录对应一个模型，目录名为模型名称</p>
          </div>
          <div class="p-6">
            <div v-if="localLoading" class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500"></div>
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">加载中...</p>
            </div>
            <div v-else-if="localModels.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">暂无本地模型</div>
            <div v-else class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-50 dark:bg-white/[0.02]">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">模型名称</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">大小</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                    <tr v-for="m in localModels" :key="'local-' + m.name" class="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td class="px-6 py-4">
                        <router-link
                          :to="{ name: 'ModelDetail', params: { source: 'local', name: m.name } }"
                          class="text-brand-500 dark:text-brand-400 hover:underline font-medium"
                        >
                          {{ m.name }}
                        </router-link>
                      </td>
                      <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ m.size }}</td>
                      <td class="px-6 py-4">
                        <button
                          @click="handleDeleteLocal(m.name)"
                          class="px-2.5 py-1.5 text-xs bg-error-600 dark:bg-error-500 text-white rounded hover:bg-error-700 dark:hover:bg-error-600 transition-colors"
                        >
                          {{ $t('common.delete') }}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        <!-- 云端模型（存储桶中按前缀，每个顶层前缀为模型名） -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-medium text-gray-800 dark:text-white/90">云端模型</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">所配置存储桶中的模型，按目录（前缀）划分，目录名为模型名称</p>
          </div>
          <div class="p-6">
            <div v-if="cloudLoading" class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500"></div>
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">加载中...</p>
            </div>
            <div v-else-if="cloudModels.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">暂无云端模型，请先保存仓库配置后刷新</div>
            <div v-else class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-50 dark:bg-white/[0.02]">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">模型名称</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">大小</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                    <tr v-for="m in cloudModels" :key="'cloud-' + m.name" class="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td class="px-6 py-4">
                        <router-link
                          :to="{ name: 'ModelDetail', params: { source: 'cloud', name: m.name } }"
                          class="text-brand-500 dark:text-brand-400 hover:underline font-medium"
                        >
                          {{ m.name }}
                        </router-link>
                      </td>
                      <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{{ m.size }}</td>
                      <td class="px-6 py-4">
                        <button
                          @click="handleSyncOne(m.name)"
                          :disabled="syncingOne === m.name"
                          class="px-2.5 py-1.5 text-xs bg-success-600 dark:bg-success-500 text-white rounded hover:bg-success-700 dark:hover:bg-success-600 disabled:opacity-50 transition-colors"
                        >
                          {{ syncingOne === m.name ? '同步中...' : '同步' }}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
      </div>

      <!-- 编辑模型对话框 -->
      <div
        v-if="showEditDialogFlag && currentEditModel"
        class="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 dark:bg-black/70"
        @click.self="showEditDialogFlag = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">编辑模型</h2>
            <button
              @click="showEditDialogFlag = false"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleUpdateModel" class="p-6 space-y-6">
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">模型信息</h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ $t('common.modelName') }} <span class="text-error-500">*</span>
                  </label>
                  <input
                    v-model="editForm.name"
                    type="text"
                    required
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: llama-2-7b-chat"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ $t('common.version') }}
                  </label>
                  <input
                    v-model="editForm.version"
                    type="text"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="例如: v1.0.0"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ $t('common.type') }} <span class="text-error-500">*</span>
                  </label>
                  <select
                    v-model="editForm.type"
                    required
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="llm">{{ $t('common.modelTypeLLM') }}</option>
                    <option value="embedding">{{ $t('common.modelTypeEmbedding') }}</option>
                    <option value="vision">{{ $t('common.modelTypeVision') }}</option>
                    <option value="multimodal">{{ $t('common.modelTypeMultimodal') }}</option>
                    <option value="other">{{ $t('common.modelTypeOther') }}</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {{ $t('common.description') }}
                  </label>
                  <textarea
                    v-model="editForm.description"
                    rows="4"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="输入模型描述信息..."
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                @click="showEditDialogFlag = false"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="updating"
                class="px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="updating">{{ $t('common.saving') }}</span>
                <span v-else>{{ $t('common.save') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- 模型详情对话框 -->
      <div
        v-if="showModelDetailDialog && currentModel"
        class="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 dark:bg-black/70"
        @click.self="showModelDetailDialog = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">{{ $t('common.modelDetails') }}</h2>
            <button
              @click="showModelDetailDialog = false"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-6">
            <!-- 基本信息 -->
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">{{ $t('common.basicInfo') }}</h3>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('common.modelName') }}</label>
                  <p class="text-sm text-gray-800 dark:text-white/90">{{ currentModel.name }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('common.version') }}</label>
                  <p class="text-sm text-gray-800 dark:text-white/90">{{ currentModel.version || '-' }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('common.type') }}</label>
                  <p class="text-sm text-gray-800 dark:text-white/90">{{ getTypeLabel(currentModel.type) }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('common.size') }}</label>
                  <p class="text-sm text-gray-800 dark:text-white/90">{{ currentModel.size || '-' }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('common.source') }}</label>
                  <p class="text-sm">
                    <span
                      :class="[
                        'px-2 py-1 text-xs rounded',
                        currentModel.source === 'cloud'
                          ? 'bg-blue-500/10 text-blue-500'
                          : 'bg-green-500/10 text-green-500',
                      ]"
                    >
                      {{ currentModel.source === 'cloud' ? $t('common.cloudSync') : $t('common.localUpload') }}
                    </span>
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('common.status') }}</label>
                  <p class="text-sm">
                    <span
                      :class="[
                        'px-2 py-1 text-xs rounded',
                        currentModel.status === 'ready'
                          ? 'bg-success-500/10 text-success-500'
                          : currentModel.status === 'syncing'
                          ? 'bg-warning-500/10 text-warning-500'
                          : 'bg-gray-500/10 text-gray-500',
                      ]"
                    >
                      {{ getStatusLabel(currentModel.status) }}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <!-- 描述 -->
            <div v-if="currentModel.description">
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">{{ $t('common.description') }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{ currentModel.description }}</p>
            </div>

            <!-- 文件列表 -->
            <div v-if="currentModel.files && currentModel.files.length > 0">
              <h3 class="text-lg font-medium text-gray-800 dark:text-white/90 mb-4">模型文件</h3>
              <div class="space-y-2">
                <div
                  v-for="(file, index) in currentModel.files"
                  :key="index"
                  class="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                >
                  {{ file }}
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                @click="showModelDetailDialog = false"
                class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {{ $t('common.close') }}
              </button>
              <button
                v-if="currentModel.status === 'ready'"
                type="button"
                @click="showModelDetailDialog = false; showDeployDialog(currentModel)"
                class="px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 transition-colors"
              >
                {{ $t('common.deploy') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { modelsApi } from '@/api/models'
import type { Model, ModelListItem } from '@/api/models'

const { t: $t } = useI18n()
const loading = ref(false)
const models = ref<Model[]>([])

// 部署对话框
const showDeployDialogFlag = ref(false)
const deploying = ref(false)
const deployForm = ref({
  modelId: 0,
  modelName: '',
  serviceName: '',
  framework: 'vllm',
  apiPort: 8000,
  healthPort: 8001,
  gpuDevices: '',
  cpuLimit: '',
  memoryLimit: '',
  envVars: '',
  autoStart: true,
})

const showDeployDialog = (model: Model) => {
  deployForm.value = {
    modelId: model.id,
    modelName: model.name,
    serviceName: `${model.name}-inference`,
    framework: 'vllm',
    apiPort: 8000,
    healthPort: 8001,
    gpuDevices: '',
    cpuLimit: '',
    memoryLimit: '',
    envVars: '',
    autoStart: true,
  }
  showDeployDialogFlag.value = true
}

const handleDeploy = async () => {
  if (!deployForm.value.serviceName || !deployForm.value.apiPort) {
    alert('请填写必填项')
    return
  }

  deploying.value = true

  try {
    // 解析环境变量
    const envVars: Record<string, string> = {}
    if (deployForm.value.envVars) {
      deployForm.value.envVars.split('\n').forEach(line => {
        const trimmed = line.trim()
        if (trimmed && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=')
          envVars[key.trim()] = valueParts.join('=').trim()
        }
      })
    }

    await modelsApi.deployModel({
      modelId: deployForm.value.modelId,
      serviceName: deployForm.value.serviceName,
      framework: deployForm.value.framework,
      apiPort: deployForm.value.apiPort,
      healthPort: deployForm.value.healthPort || undefined,
      gpuDevices: deployForm.value.gpuDevices || undefined,
      cpuLimit: deployForm.value.cpuLimit || undefined,
      memoryLimit: deployForm.value.memoryLimit || undefined,
      envVars: Object.keys(envVars).length > 0 ? envVars : undefined,
      autoStart: deployForm.value.autoStart,
    })

    alert('模型部署成功！')
    showDeployDialogFlag.value = false
    
    // 刷新列表
    await loadModels()
  } catch (error: any) {
    console.error('部署模型失败:', error)
    alert(error?.error || '部署模型失败，请重试')
  } finally {
    deploying.value = false
  }
}

// 本地模型列表、云端模型列表（分开加载，先展示本地再展示云端，减少首屏等待）
const localModels = ref<ModelListItem[]>([])
const cloudModels = ref<ModelListItem[]>([])
const localLoading = ref(true)
const cloudLoading = ref(true)

const loadLocalModels = async () => {
  try {
    const data = await modelsApi.getLocalModels()
    localModels.value = data || []
  } catch (error) {
    console.error('获取本地模型列表失败:', error)
    localModels.value = []
  } finally {
    localLoading.value = false
  }
}

const loadCloudModels = async () => {
  try {
    const data = await modelsApi.getCloudModels()
    cloudModels.value = data || []
  } catch (error) {
    console.error('获取云端模型列表失败:', error)
    cloudModels.value = []
  } finally {
    cloudLoading.value = false
  }
}

const loadModels = async () => {
  loading.value = true
  localLoading.value = true
  cloudLoading.value = true
  try {
    await loadLocalModels()
    loading.value = false
    loadCloudModels()
  } catch (_) {
    loading.value = false
    cloudLoading.value = false
  }
}

// 同步单个云端模型到本地
const syncingOne = ref<string | null>(null)
const handleSyncOne = async (name: string) => {
  syncingOne.value = name
  try {
    await modelsApi.syncModelByName(name)
    alert('同步成功')
    await loadLocalModels()
  } catch (error: any) {
    alert(error?.response?.data?.error || error?.message || '同步失败')
  } finally {
    syncingOne.value = null
  }
}

// 删除本地模型
const handleDeleteLocal = async (name: string) => {
  if (!confirm(`确定删除本地模型「${name}」？此操作不可恢复。`)) return
  try {
    await modelsApi.deleteLocalModel(name)
    alert('删除成功')
    await loadLocalModels()
  } catch (error: any) {
    alert(error?.response?.data?.error || error?.message || '删除失败')
  }
}

// 配置对话框
const showConfigDialog = ref(false)

const configForm = ref({
  apiEndpoint: 'https://100.93.0.38:9000',
  webConsole: 'https://100.93.0.38:9001',
  accessKey: '',
  secretKey: '',
  bucket: 'pubmodels',
  useSSL: true,
  syncInterval: 'manual',
  autoSync: true,
})

const handleSaveConfig = async () => {
  try {
    // 验证必填字段
    if (!configForm.value.apiEndpoint || !configForm.value.accessKey || !configForm.value.secretKey || !configForm.value.bucket) {
      alert('请填写所有必填字段（API端点、用户名、密码、存储桶）')
      return
    }
    
    console.log('保存配置:', {
      apiEndpoint: configForm.value.apiEndpoint,
      bucket: configForm.value.bucket,
      accessKey: configForm.value.accessKey ? '***' + configForm.value.accessKey.slice(-3) : '未设置',
    })
    
    await modelsApi.updateModelConfig(configForm.value)
    alert('配置已保存！')
    showConfigDialog.value = false
    await loadModels()
  } catch (error: any) {
    console.error('保存配置失败:', error)
    // 处理不同类型的错误
    let errorMsg = '保存配置失败'
    if (typeof error === 'string') {
      errorMsg = error
    } else if (error?.error) {
      errorMsg = error.error
    } else if (error?.message) {
      errorMsg = error.message
    }
    alert(errorMsg)
  }
}

// 上传对话框
const showUploadDialog = ref(false)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const uploadForm = ref({
  name: '',
  version: '',
  type: 'llm',
  files: [] as File[],
  description: '',
})

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    uploadForm.value.files = Array.from(target.files)
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const handleUpload = async () => {
  if (!uploadForm.value.name || uploadForm.value.files.length === 0) {
    alert('请填写模型名称并选择文件')
    return
  }

  uploading.value = true

  try {
    await modelsApi.uploadModel({
      name: uploadForm.value.name,
      version: uploadForm.value.version,
      type: uploadForm.value.type,
      files: uploadForm.value.files,
      description: uploadForm.value.description,
    })

    // 重置表单
    uploadForm.value = {
      name: '',
      version: '',
      type: 'llm',
      files: [],
      description: '',
    }
    if (fileInput.value) {
      fileInput.value.value = ''
    }

    showUploadDialog.value = false
    alert('模型上传成功！')
    
    // 刷新列表
    await loadModels()
  } catch (error: any) {
    console.error('上传模型失败:', error)
    alert(error?.error || '上传模型失败，请重试')
  } finally {
    uploading.value = false
  }
}

// 同步操作
const syncing = ref(false)

const handleSync = async () => {
  syncing.value = true

  try {
    const result = await modelsApi.syncModels()
    alert(`同步完成！已同步 ${result.synced} 个模型`)
    
    // 刷新列表
    await loadModels()
  } catch (error: any) {
    console.error('同步失败:', error)
    alert(error?.error || '同步失败，请检查仓库配置')
  } finally {
    syncing.value = false
  }
}

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    llm: $t('common.modelTypeLLM'),
    embedding: $t('common.modelTypeEmbedding'),
    vision: $t('common.modelTypeVision'),
    multimodal: $t('common.modelTypeMultimodal'),
    other: $t('common.modelTypeOther'),
  }
  return labels[type] || type
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    ready: $t('common.modelStatusReady'),
    syncing: $t('common.modelStatusSyncing'),
    error: $t('common.modelStatusError'),
  }
  return labels[status] || $t('common.modelStatusUnknown')
}

// 查看模型详情
const showModelDetailDialog = ref(false)
const currentModel = ref<Model | null>(null)

// 编辑模型
const showEditDialogFlag = ref(false)
const currentEditModel = ref<Model | null>(null)
const updating = ref(false)
const editForm = ref({
  name: '',
  version: '',
  type: 'llm',
  description: '',
})

const showEditDialog = (model: Model) => {
  currentEditModel.value = model
  editForm.value = {
    name: model.name,
    version: model.version || '',
    type: model.type || 'llm',
    description: model.description || '',
  }
  showEditDialogFlag.value = true
}

const handleUpdateModel = async () => {
  if (!currentEditModel.value) return
  
  updating.value = true
  try {
    await modelsApi.updateModel(currentEditModel.value.id, {
      name: editForm.value.name,
      version: editForm.value.version,
      type: editForm.value.type,
      description: editForm.value.description,
    })
    alert('模型信息更新成功')
    showEditDialogFlag.value = false
    await loadModels()
  } catch (error: any) {
    console.error('更新模型失败:', error)
    alert(error?.error || '更新模型失败')
  } finally {
    updating.value = false
  }
}

const viewModel = async (id: number) => {
  try {
    const model = models.value.find(m => m.id === id)
    if (model) {
      // 尝试获取更详细的模型信息
      try {
        const details = await modelsApi.getModelDetails(id)
        currentModel.value = details || model
      } catch (error) {
        console.error('获取模型详情失败:', error)
        currentModel.value = model
      }
      showModelDetailDialog.value = true
    }
  } catch (error) {
    console.error('查看模型失败:', error)
  }
}

const deleteModel = async (id: number) => {
  if (confirm($t('common.confirmDeleteModel'))) {
    try {
      await modelsApi.deleteModel(id)
      alert('模型删除成功')
      await loadModels()
    } catch (error: any) {
      console.error('删除模型失败:', error)
      alert(error?.error || '删除模型失败')
    }
  }
}

// 加载配置
const loadConfig = async () => {
  try {
    const config = await modelsApi.getModelConfig()
    configForm.value = config
  } catch (error) {
    console.error('获取配置失败:', error)
  }
}

onMounted(() => {
  loadModels()
  loadConfig()
})
</script>
