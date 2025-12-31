<template>
  <div v-if="hasAccess">
    <slot />
  </div>
  <div v-else-if="showFallback">
    <slot name="fallback" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePermissions } from '@/composables/usePermissions'

interface Props {
  permission: string
  showFallback?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showFallback: false
})

const { hasPermission } = usePermissions()

const hasAccess = computed(() => hasPermission(props.permission))
</script>
