<template>
  <div
    v-if="hasAccess"
    :class="`rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark ${props.class}`"
  >
    <div
      v-if="title || subtitle"
      class="border-b border-stroke px-6.5 py-4 dark:border-strokedark"
    >
      <h3 v-if="title" class="font-medium text-black dark:text-white">
        {{ title }}
      </h3>
      <p v-if="subtitle" class="text-sm text-bodydark2">
        {{ subtitle }}
      </p>
    </div>
    <div class="p-6.5">
      <slot />
    </div>
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
  title?: string
  subtitle?: string
  showFallback?: boolean
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  showFallback: false,
  class: ''
})

const { hasPermission } = usePermissions()

const hasAccess = computed(() => hasPermission(props.permission))
</script>
