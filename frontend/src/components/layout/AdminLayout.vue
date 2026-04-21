<template>
  <div class="h-screen overflow-hidden xl:flex">
    <app-sidebar />
    <Backdrop />
    <div
      class="flex h-screen min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out"
      :class="[isExpanded || isHovered ? 'lg:ml-[290px]' : 'lg:ml-[90px]']"
    >
      <app-header class="shrink-0" />
      <div ref="contentContainer" class="app-content-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div :class="contentClasses">
          <slot></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import { useSidebar } from '@/composables/useSidebar'
import Backdrop from './Backdrop.vue'

const { isExpanded, isHovered } = useSidebar()
const route = useRoute()
const contentContainer = ref<HTMLElement | null>(null)

// 检查是否是AI页面
const isAiPage = computed(() => {
  return route.path.startsWith('/ai/')
})

// 根据页面类型决定是否添加padding
const contentClasses = computed(() => {
  return isAiPage.value ? '' : 'p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6'
})

watch(
  () => route.fullPath,
  () => {
    contentContainer.value?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  },
  { flush: 'post' },
)
</script>
