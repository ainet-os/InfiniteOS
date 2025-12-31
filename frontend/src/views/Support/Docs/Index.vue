<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">技术文档</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">InfiniteOS 技术文档和开发指南</p>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <!-- 快速开始 -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow">
          <div class="flex items-center mb-4">
            <div class="h-12 w-12 rounded-lg bg-brand-500/10 flex items-center justify-center mr-4">
              <svg class="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">快速开始</h3>
          </div>
          <p class="text-gray-600 dark:text-gray-400 mb-4">了解如何快速部署和使用 InfiniteOS</p>
          <a href="#" class="text-brand-500 hover:text-brand-600 text-sm font-medium">查看文档 →</a>
        </div>

        <!-- 架构设计 -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow">
          <div class="flex items-center mb-4">
            <div class="h-12 w-12 rounded-lg bg-success-500/10 flex items-center justify-center mr-4">
              <svg class="w-6 h-6 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">架构设计</h3>
          </div>
          <p class="text-gray-600 dark:text-gray-400 mb-4">深入了解 InfiniteOS 的系统架构</p>
          <a href="#" class="text-brand-500 hover:text-brand-600 text-sm font-medium">查看文档 →</a>
        </div>

        <!-- API 参考 -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow">
          <div class="flex items-center mb-4">
            <div class="h-12 w-12 rounded-lg bg-warning-500/10 flex items-center justify-center mr-4">
              <svg class="w-6 h-6 text-warning-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">API 参考</h3>
          </div>
          <p class="text-gray-600 dark:text-gray-400 mb-4">完整的 API 接口文档和示例</p>
          <a href="#" class="text-brand-500 hover:text-brand-600 text-sm font-medium">查看文档 →</a>
        </div>

        <!-- 开发指南 -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow">
          <div class="flex items-center mb-4">
            <div class="h-12 w-12 rounded-lg bg-info-500/10 flex items-center justify-center mr-4">
              <svg class="w-6 h-6 text-info-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">开发指南</h3>
          </div>
          <p class="text-gray-600 dark:text-gray-400 mb-4">开发者指南和最佳实践</p>
          <a href="#" class="text-brand-500 hover:text-brand-600 text-sm font-medium">查看文档 →</a>
        </div>

        <!-- 部署指南 -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow">
          <div class="flex items-center mb-4">
            <div class="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mr-4">
              <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">部署指南</h3>
          </div>
          <p class="text-gray-600 dark:text-gray-400 mb-4">生产环境部署和配置指南</p>
          <a href="#" class="text-brand-500 hover:text-brand-600 text-sm font-medium">查看文档 →</a>
        </div>

        <!-- 故障排除 -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow">
          <div class="flex items-center mb-4">
            <div class="h-12 w-12 rounded-lg bg-error-500/10 flex items-center justify-center mr-4">
              <svg class="w-6 h-6 text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">故障排除</h3>
          </div>
          <p class="text-gray-600 dark:text-gray-400 mb-4">常见问题和解决方案</p>
          <a href="#" class="text-brand-500 hover:text-brand-600 text-sm font-medium">查看文档 →</a>
        </div>
      </div>

      <!-- 项目信息 -->
      <div class="mt-8 rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">关于 InfiniteOS</h2>
        <div class="prose dark:prose-invert max-w-none">
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            <strong>InfiniteOS</strong> 是由 <strong>ai.net实验室</strong>发起的开源智算操作系统，面向云边端一体化场景。
          </p>
          <p class="text-gray-600 dark:text-gray-400">
            InfiniteOS 面向云边端一体化场景，提供完整的算力资源管理、虚拟化、容器化和 AI 模型部署能力。
          </p>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '@/components/layout/AdminLayout.vue'
</script>

