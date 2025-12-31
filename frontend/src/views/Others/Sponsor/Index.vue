<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">赞助 InfiniteOS</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">支持开源 AI 操作系统项目的发展</p>
      </div>

      <!-- 项目介绍 -->
      <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">关于 InfiniteOS 项目</h2>
        <div class="prose dark:prose-invert max-w-none">
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            <strong>InfiniteOS</strong> 是由 <strong>ai.net实验室</strong>发起的开源 AI 操作系统项目，旨在为 AI 应用提供完整的操作系统解决方案。
          </p>
          <p class="text-gray-600 dark:text-gray-400">
            InfiniteOS 专注于边缘算力设备的管理和 AI 模型部署，为边缘 AI 应用提供完整的操作系统支持。
          </p>
        </div>
      </div>

      <!-- 赞助方式 -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <!-- GitHub Sponsors -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow">
          <div class="flex items-center mb-4">
            <div class="h-12 w-12 rounded-lg bg-gray-900 dark:bg-white flex items-center justify-center mr-4">
              <svg class="w-6 h-6 text-white dark:text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">GitHub Sponsors</h3>
          </div>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            通过 GitHub Sponsors 支持项目，每月定期赞助
          </p>
          <button class="w-full px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 text-sm font-medium">
            前往 GitHub Sponsors
          </button>
        </div>

        <!-- 一次性捐赠 -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow">
          <div class="flex items-center mb-4">
            <div class="h-12 w-12 rounded-lg bg-brand-500/10 flex items-center justify-center mr-4">
              <svg class="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">一次性捐赠</h3>
          </div>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            通过 PayPal 或其他方式一次性捐赠
          </p>
          <button class="w-full px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm font-medium">
            进行捐赠
          </button>
        </div>

        <!-- 企业合作 -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow">
          <div class="flex items-center mb-4">
            <div class="h-12 w-12 rounded-lg bg-success-500/10 flex items-center justify-center mr-4">
              <svg class="w-6 h-6 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">企业合作</h3>
          </div>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            企业级支持和定制化服务
          </p>
          <button class="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.02] text-sm font-medium text-gray-800 dark:text-white/90">
            联系商务
          </button>
        </div>
      </div>

      <!-- 赞助者列表 -->
      <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">感谢我们的赞助者</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          感谢所有支持 InfiniteOS 项目的个人和组织！
        </p>
        <div class="text-center py-8">
          <p class="text-gray-500 dark:text-gray-500">成为第一个赞助者</p>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '@/components/layout/AdminLayout.vue'
</script>

