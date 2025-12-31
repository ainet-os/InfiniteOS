<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <button
              @click="$router.back()"
              class="mb-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white/90 flex items-center"
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              返回列表
            </button>
            <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">容器详情</h1>
            <p class="text-gray-600 dark:text-gray-400 mt-1">{{ containerName }}</p>
          </div>
          <div class="flex gap-2">
            <button
              v-if="container.status === 'stopped' || container.status === 'exited'"
              @click="startContainer"
              class="px-4 py-2 bg-success-600 dark:bg-success-500 text-white rounded-lg hover:bg-success-700 dark:hover:bg-success-600"
            >
              启动
            </button>
            <button
              v-if="container.status === 'running'"
              @click="stopContainer"
              class="px-4 py-2 bg-error-600 dark:bg-error-500 text-white rounded-lg hover:bg-error-700 dark:hover:bg-error-600"
            >
              停止
            </button>
            <button
              v-if="container.status === 'running'"
              @click="restartContainer"
              class="px-4 py-2 bg-warning-600 dark:bg-warning-500 text-white rounded-lg hover:bg-warning-700 dark:hover:bg-warning-600"
            >
              重启
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- 基本信息 -->
        <div class="lg:col-span-2 space-y-6">
          <!-- 状态卡片 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">状态信息</h2>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">状态</p>
                <span
                  :class="[
                    'mt-1 inline-block px-3 py-1 text-sm rounded',
                    container.status === 'running'
                      ? 'bg-success-500/10 text-success-500'
                      : 'bg-gray-500/10 text-gray-500',
                  ]"
                >
                  {{ container.status === 'running' ? '运行中' : '已停止' }}
                </span>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">容器ID</p>
                <p class="mt-1 text-gray-800 dark:text-white/90 font-mono text-sm">{{ container.id }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">镜像</p>
                <p class="mt-1 text-gray-800 dark:text-white/90">{{ container.image }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">创建时间</p>
                <p class="mt-1 text-gray-800 dark:text-white/90">{{ container.created }}</p>
              </div>
            </div>
          </div>

          <!-- 配置信息 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">配置信息</h2>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">容器名称</span>
                <span class="text-gray-800 dark:text-white/90">{{ container.name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">镜像名称</span>
                <span class="text-gray-800 dark:text-white/90">{{ container.image }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">启动命令</span>
                <span class="text-gray-800 dark:text-white/90 font-mono text-sm">{{ container.command || '-' }}</span>
              </div>
            </div>
          </div>

          <!-- 端口映射 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">端口映射</h2>
            <div v-if="container.ports && container.ports.length > 0" class="space-y-3">
              <div
                v-for="(port, index) in container.ports"
                :key="index"
                class="flex justify-between items-center p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg"
              >
                <div>
                  <p class="text-sm font-medium text-gray-800 dark:text-white/90">
                    {{ port.hostPort }}:{{ port.containerPort }}
                  </p>
                  <p class="text-xs text-gray-600 dark:text-gray-400">{{ port.protocol || 'tcp' }}</p>
                </div>
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ port.type || 'tcp' }}</span>
              </div>
            </div>
            <p v-else class="text-gray-600 dark:text-gray-400">暂无端口映射</p>
          </div>

          <!-- 环境变量 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">环境变量</h2>
            <div v-if="container.env && container.env.length > 0" class="space-y-2">
              <div
                v-for="(env, index) in container.env"
                :key="index"
                class="p-2 bg-gray-50 dark:bg-white/[0.02] rounded text-sm font-mono"
              >
                <span class="text-gray-800 dark:text-white/90">{{ env.key }}</span>=
                <span class="text-gray-600 dark:text-gray-400">{{ env.value }}</span>
              </div>
            </div>
            <p v-else class="text-gray-600 dark:text-gray-400">暂无环境变量</p>
          </div>

          <!-- 数据卷 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">数据卷</h2>
            <div v-if="container.volumes && container.volumes.length > 0" class="space-y-3">
              <div
                v-for="(volume, index) in container.volumes"
                :key="index"
                class="flex justify-between items-center p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg"
              >
                <div>
                  <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ volume.hostPath }}</p>
                  <p class="text-xs text-gray-600 dark:text-gray-400">{{ volume.containerPath }}</p>
                </div>
                <span
                  v-if="volume.readOnly"
                  class="text-xs px-2 py-1 bg-gray-500/10 text-gray-500 rounded"
                >
                  只读
                </span>
              </div>
            </div>
            <p v-else class="text-gray-600 dark:text-gray-400">暂无数据卷</p>
          </div>
        </div>

        <!-- 侧边栏 -->
        <div class="space-y-6">
          <!-- 操作 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">操作</h2>
            <div class="space-y-2">
              <button
                @click="viewLogs"
                class="w-full px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600"
              >
                查看日志
              </button>
              <button
                @click="viewMonitoring"
                class="w-full px-4 py-2 bg-brand-500 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600"
              >
                监控
              </button>
              <button
                @click="deleteContainer"
                class="w-full px-4 py-2 bg-error-600 dark:bg-error-500 text-white rounded-lg hover:bg-error-700 dark:hover:bg-error-600"
              >
                删除
              </button>
            </div>
          </div>

          <!-- 资源使用 -->
          <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">资源使用</h2>
            <div class="space-y-4">
              <div>
                <div class="flex justify-between mb-1">
                  <span class="text-sm text-gray-600 dark:text-gray-400">CPU使用率</span>
                  <span class="text-sm text-gray-800 dark:text-white/90">{{ container.cpuUsage || 0 }}%</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    class="bg-brand-500 h-2 rounded-full"
                    :style="{ width: (container.cpuUsage || 0) + '%' }"
                  ></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between mb-1">
                  <span class="text-sm text-gray-600 dark:text-gray-400">内存使用率</span>
                  <span class="text-sm text-gray-800 dark:text-white/90">{{ container.memoryUsage || 0 }}%</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    class="bg-success-500 h-2 rounded-full"
                    :style="{ width: (container.memoryUsage || 0) + '%' }"
                  ></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between mb-1">
                  <span class="text-sm text-gray-600 dark:text-gray-400">网络I/O</span>
                  <span class="text-sm text-gray-800 dark:text-white/90">{{ container.networkIO || '0 B/s' }}</span>
                </div>
              </div>
              <div>
                <div class="flex justify-between mb-1">
                  <span class="text-sm text-gray-600 dark:text-gray-400">磁盘I/O</span>
                  <span class="text-sm text-gray-800 dark:text-white/90">{{ container.diskIO || '0 B/s' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'

const route = useRoute()
const router = useRouter()

const containerName = ref(route.params.name as string)

// Mock数据
const container = ref({
  id: 'c1a2b3c4d5e6',
  name: containerName.value,
  image: 'nginx:latest',
  status: 'running',
  created: '2024-12-10 10:30:00',
  command: 'nginx -g "daemon off;"',
  cpuUsage: 12,
  memoryUsage: 45,
  networkIO: '125 KB/s',
  diskIO: '50 KB/s',
  ports: [
    {
      hostPort: '80',
      containerPort: '80',
      protocol: 'tcp',
      type: 'tcp',
    },
    {
      hostPort: '443',
      containerPort: '443',
      protocol: 'tcp',
      type: 'tcp',
    },
  ],
  env: [
    {
      key: 'NGINX_HOST',
      value: 'localhost',
    },
    {
      key: 'NGINX_PORT',
      value: '80',
    },
  ],
  volumes: [
    {
      hostPath: '/var/www/html',
      containerPath: '/usr/share/nginx/html',
      readOnly: false,
    },
  ],
})

const startContainer = () => {
  console.log('启动容器:', containerName.value)
  container.value.status = 'running'
}

const stopContainer = () => {
  console.log('停止容器:', containerName.value)
  container.value.status = 'stopped'
}

const restartContainer = () => {
  console.log('重启容器:', containerName.value)
}

const viewLogs = () => {
  console.log('查看日志:', containerName.value)
  // 可以跳转到日志页面或打开日志模态框
}

const viewMonitoring = () => {
  console.log('查看监控:', containerName.value)
}

const deleteContainer = () => {
  if (confirm('确定要删除这个容器吗？')) {
    console.log('删除容器:', containerName.value)
    router.push('/containers')
  }
}

onMounted(() => {
  console.log('加载容器详情:', containerName.value)
})
</script>

