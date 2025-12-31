<template>
  <button
    :class="buttonClasses"
    @click="handleClick"
    :disabled="disabled"
  >
    <span v-if="startIcon" class="flex items-center">
      <slot name="startIcon"></slot>
    </span>
    <slot></slot>
    <span v-if="endIcon" class="flex items-center">
      <slot name="endIcon"></slot>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface ButtonProps {
  size?: 'sm' | 'md'
  variant?: 'primary' | 'outline'
  disabled?: boolean
  className?: string
  startIcon?: boolean
  endIcon?: boolean
}

const props = withDefaults(defineProps<ButtonProps>(), {
  size: 'md',
  variant: 'primary',
  disabled: false,
  className: '',
  startIcon: false,
  endIcon: false
})

const emit = defineEmits<{
  click: []
}>()

// Size Classes
const sizeClasses = {
  sm: 'px-4 py-3 text-sm',
  md: 'px-5 py-3.5 text-sm'
}

// Variant Classes
const variantClasses = {
  primary: 'bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300',
  outline: 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300'
}

const buttonClasses = computed(() => {
  const baseClasses = 'inline-flex items-center justify-center font-medium gap-2 rounded-lg transition'
  const disabledClasses = props.disabled ? 'cursor-not-allowed opacity-50' : ''

  return `${baseClasses} ${props.className} ${sizeClasses[props.size]} ${variantClasses[props.variant]} ${disabledClasses}`
})

const handleClick = () => {
  if (!props.disabled) {
    emit('click')
  }
}
</script>
