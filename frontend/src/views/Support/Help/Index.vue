<template>
  <AdminLayout>
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-800 dark:text-white/90">帮助与支持</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">获取帮助、提交问题或联系支持团队</p>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- 常见问题 -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">常见问题</h2>
          <div class="space-y-4">
            <div>
              <h3 class="text-sm font-medium text-gray-800 dark:text-white/90 mb-2">如何安装 InfiniteOS？</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                请参考技术文档中的"快速开始"章节，包含详细的安装步骤和系统要求。
              </p>
            </div>
            <div>
              <h3 class="text-sm font-medium text-gray-800 dark:text-white/90 mb-2">如何配置 GPU 算力资源？</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                在"算力管理"页面可以查看和管理 GPU/TPU 资源，详细配置请参考部署指南。
              </p>
            </div>
            <div>
              <h3 class="text-sm font-medium text-gray-800 dark:text-white/90 mb-2">如何部署 AI 模型？</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                在"模型管理"页面可以上传和部署 AI 模型，支持多种模型格式和推理框架。
              </p>
            </div>
          </div>
        </div>

        <!-- 联系方式 -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">联系方式</h2>
          <div class="space-y-4">
            <div>
              <h3 class="text-sm font-medium text-gray-800 dark:text-white/90 mb-2">GitHub</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                提交 Issue 或 Pull Request
              </p>
              <a href="#" class="text-brand-500 hover:text-brand-600 text-sm">github.com/ai.net/infiniteos</a>
            </div>
            <div>
              <h3 class="text-sm font-medium text-gray-800 dark:text-white/90 mb-2">社区论坛</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                参与讨论和获取社区支持
              </p>
              <a href="#" class="text-brand-500 hover:text-brand-600 text-sm">forum.ai.net</a>
            </div>
            <div>
              <h3 class="text-sm font-medium text-gray-800 dark:text-white/90 mb-2">邮件支持</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                发送邮件获取技术支持
              </p>
              <a href="mailto:support@ai.net" class="text-brand-500 hover:text-brand-600 text-sm">support@ai.net</a>
            </div>
          </div>
        </div>

        <!-- 提交问题 -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">提交问题</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            如果您遇到问题或发现 Bug，请通过以下方式提交：
          </p>
          <div class="space-y-3">
            <button class="w-full px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm font-medium">
              在 GitHub 提交 Issue
            </button>
            <button class="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.02] text-sm font-medium text-gray-800 dark:text-white/90">
              联系支持团队
            </button>
          </div>
        </div>

        <!-- 资源链接 -->
        <div class="rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 p-6">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">资源链接</h2>
          <div class="space-y-3">
            <a href="/docs" class="flex items-center text-brand-500 hover:text-brand-600 text-sm">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              技术文档
            </a>
            <a href="#" class="flex items-center text-brand-500 hover:text-brand-600 text-sm">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              社区讨论
            </a>
            <a href="#" class="flex items-center text-brand-500 hover:text-brand-600 text-sm">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              更新日志
            </a>
            <a href="/sponsor" class="flex items-center text-brand-500 hover:text-brand-600 text-sm">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              赞助项目
            </a>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '@/components/layout/AdminLayout.vue'
</script>

