<template>
  <button
    v-if="hasAccess"
    :class="buttonClasses"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot />
  </button>
  <div v-else-if="showFallback">
    <slot name="fallback" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePermissions } from '@/composables/usePermissions'

interface Props {
  permission: string
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  showFallback?: boolean
  class?: string
}

interface Emits {
  click: []
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  showFallback: false,
  class: ''
})

const emit = defineEmits<Emits>()

const { hasPermission } = usePermissions()

const hasAccess = computed(() => hasPermission(props.permission))

const buttonClasses = computed(() => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background'

  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    success: 'bg-green-600 text-white hover:bg-green-700'
  }

  const sizeClasses = {
    sm: 'h-9 px-3',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-8'
  }

  return `${baseClasses} ${variantClasses[props.variant]} ${sizeClasses[props.size]} ${props.class}`
})

const handleClick = () => {
  if (!props.disabled) {
    emit('click')
  }
}
</script>
