<template>
  <div class="relative">
    <div @click="toggle" ref="buttonRef">
      <button class="text-gray-500 dark:text-gray-400">
        <svg
          class="fill-current"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M5.99902 10.245C6.96552 10.245 7.74902 11.0285 7.74902 11.995V12.005C7.74902 12.9715 6.96552 13.755 5.99902 13.755C5.03253 13.755 4.24902 12.9715 4.24902 12.005V11.995C4.24902 11.0285 5.03253 10.245 5.99902 10.245ZM17.999 10.245C18.9655 10.245 19.749 11.0285 19.749 11.995V12.005C19.749 12.9715 18.9655 13.755 17.999 13.755C17.0325 13.755 16.249 12.9715 16.249 12.005V11.995C16.249 11.0285 17.0325 10.245 17.999 10.245ZM13.749 11.995C13.749 11.0285 12.9655 10.245 11.999 10.245C11.0325 10.245 10.249 11.0285 10.249 11.995V12.005C10.249 12.9715 11.0325 13.755 11.999 13.755C12.9655 13.755 13.749 12.9715 13.749 12.005V11.995Z"
            fill=""
          />
        </svg>
      </button>
    </div>
    <div v-if="isOpen" ref="contentRef" class="absolute z-10 right-0 mt-1">
      <div class="p-2 bg-white border border-gray-200 rounded-2xl shadow-lg dark:border-gray-800 dark:bg-gray-900 w-40">
        <div
          class="space-y-1"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="options-menu"
        >
          <slot></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isOpen = ref(false)
const buttonRef = ref<HTMLElement>()
const contentRef = ref<HTMLElement>()

const toggle = () => {
  isOpen.value = !isOpen.value
}

const close = (event: MouseEvent) => {
  const target = event.target as Node
  if (buttonRef.value && contentRef.value) {
    const dropdown = buttonRef.value.closest('div')
    if (dropdown && !dropdown.contains(target)) {
      isOpen.value = false
    }
  }
}

onMounted(() => {
  document.addEventListener('click', close)
})

onUnmounted(() => {
  document.removeEventListener('click', close)
})
</script>
