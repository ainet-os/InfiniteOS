<template>
  <div class="relative inline-block group">
    <slot></slot>
    <div
      :class="[
        'invisible absolute z-30 opacity-0 transition-opacity duration-300 group-hover:visible group-hover:opacity-100',
        getPositionClasses(position),
      ]"
    >
      <div class="relative">
        <div
          :class="[
            getThemeClasses(theme),
            'whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-gray-700 drop-shadow-4xl dark:bg-[#1E2634] dark:text-white',
          ]"
        >
          {{ content }}
        </div>
        <div
          :class="['absolute h-3 w-4 rotate-45', getThemeClasses(theme), getArrowClasses(position)]"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type TooltipPosition = 'top' | 'right' | 'bottom' | 'left'
type TooltipTheme = 'light' | 'dark'

interface Props {
  content: string
  position?: TooltipPosition
  theme?: TooltipTheme
}

const props = withDefaults(defineProps<Props>(), {
  position: 'top',
  theme: 'light',
})

const getPositionClasses = computed(() => (pos: TooltipPosition) => {
  switch (pos) {
    case 'top':
      return 'bottom-full left-1/2 mb-2.5 -translate-x-1/2'
    case 'right':
      return 'left-full top-1/2 ml-2.5 -translate-y-1/2'
    case 'bottom':
      return 'top-full left-1/2 mt-2.5 -translate-x-1/2'
    case 'left':
      return 'right-full top-1/2 mr-2.5 -translate-y-1/2'
  }
})

const getArrowClasses = computed(() => (pos: TooltipPosition) => {
  switch (pos) {
    case 'top':
      return '-bottom-1 left-1/2 -translate-x-1/2'
    case 'right':
      return '-left-1.5 top-1/2 -translate-y-1/2'
    case 'bottom':
      return '-top-1 left-1/2 -translate-x-1/2'
    case 'left':
      return '-right-1.5 top-1/2 -translate-y-1/2'
  }
})

const getThemeClasses = computed(() => (themeType: TooltipTheme) => {
  return themeType === 'light'
    ? 'bg-white text-gray-700 dark:bg-[#1E2634] dark:text-white'
    : 'text-white bg-[#1E2634]'
})
</script>
