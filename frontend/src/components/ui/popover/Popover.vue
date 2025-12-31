<template>
  <div class="relative inline-block">
    <div ref="triggerRef" @click="togglePopover">
      <slot name="trigger"></slot>
    </div>
    <Transition name="fade">
      <div
        v-if="isOpen"
        ref="popoverRef"
        :class="['absolute w-[300px] z-99999', positionClasses[position]]"
      >
        <div class="w-full bg-white rounded-xl shadow-theme-lg dark:bg-[#1E2634]">
          <slot></slot>
          <div
            :class="[
              'absolute w-3 h-3 bg-white shadow-theme-lg dark:bg-[#1E2634]',
              arrowClasses[position],
            ]"
          ></div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

type Position = 'top' | 'right' | 'bottom' | 'left'

const props = defineProps<{
  position: Position
}>()

const isOpen = ref(false)
const popoverRef = ref<HTMLDivElement | null>(null)
const triggerRef = ref<HTMLDivElement | null>(null)

const togglePopover = () => {
  isOpen.value = !isOpen.value
}

const handleClickOutside = (event: MouseEvent) => {
  if (
    popoverRef.value &&
    !popoverRef.value.contains(event.target as Node) &&
    triggerRef.value &&
    !triggerRef.value.contains(event.target as Node)
  ) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})

const positionClasses = computed(() => ({
  top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
  right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
}))

const arrowClasses = computed(() => ({
  top: 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45',
  right: 'left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2 rotate-45',
  bottom: 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-45',
  left: 'right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 rotate-45',
}))
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
