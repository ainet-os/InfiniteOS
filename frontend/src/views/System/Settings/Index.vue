<template>
  <AdminLayout>
    <div class="w-full max-w-none">
      <!-- 与布局区同宽，避免再套一层窄列导致两侧大留白 -->
      <div class="mb-5">
        <h1 class="text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
          {{ $t('pages.about.title') }}
        </h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {{ $t('pages.about.description') }}
        </p>
      </div>

      <div class="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6 lg:items-stretch">
        <!-- InfiniteOS -->
        <div
          class="flex min-h-0 flex-col rounded-lg border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-5">
            <h2 class="text-base font-semibold text-gray-800 dark:text-white/90">
              {{ $t('pages.about.infiniteOS.title') }}
            </h2>
          </div>
          <div class="flex flex-1 flex-col px-4 py-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300 sm:px-5">
            <p class="flex-1 whitespace-pre-line">{{ $t('pages.about.infiniteOS.body') }}</p>
            <p class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <a
                :href="$t('pages.about.infiniteOS.repoUrl')"
                target="_blank"
                rel="noopener noreferrer"
                class="text-brand-500 hover:text-brand-600 font-medium text-sm"
              >
                {{ $t('pages.about.infiniteOS.repoLink') }}
              </a>
            </p>
          </div>
        </div>

        <!-- InfiniteAgent -->
        <div
          class="flex min-h-0 flex-col rounded-lg border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-5">
            <h2 class="text-base font-semibold text-gray-800 dark:text-white/90">
              {{ $t('pages.about.infiniteAgent.title') }}
            </h2>
          </div>
          <div class="flex flex-1 flex-col px-4 py-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300 sm:px-5">
            <p class="flex-1 whitespace-pre-line">{{ $t('pages.about.infiniteAgent.body') }}</p>
            <p class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <a
                :href="$t('pages.about.infiniteAgent.repoUrl')"
                target="_blank"
                rel="noopener noreferrer"
                class="text-brand-500 hover:text-brand-600 font-medium text-sm"
              >
                {{ $t('pages.about.infiniteAgent.repoLink') }}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '@/components/layout/AdminLayout.vue'
</script>
