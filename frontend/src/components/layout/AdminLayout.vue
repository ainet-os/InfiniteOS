<template>
  <div class="min-h-screen xl:flex">
    <app-sidebar />
    <Backdrop />
    <div
      class="flex-1 transition-all duration-300 ease-in-out"
      :class="[isExpanded || isHovered ? 'lg:ml-[290px]' : 'lg:ml-[90px]']"
    >
      <app-header />
      <div :class="contentClasses">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import { useSidebar } from '@/composables/useSidebar'
import Backdrop from './Backdrop.vue'
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const { isExpanded, isHovered } = useSidebar()
const route = useRoute()

// 检查是否是AI页面
const isAiPage = computed(() => {
  return route.path.startsWith('/ai/')
})

// 根据页面类型决定是否添加padding
const contentClasses = computed(() => {
  return isAiPage.value ? '' : 'p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6'
})
</script>
