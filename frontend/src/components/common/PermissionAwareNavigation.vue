<template>
  <div :class="className">
    <template v-for="(item, index) in filteredItems" :key="index">
      <slot name="item" :item="item" :index="index" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePermissions } from '@/composables/usePermissions'

interface NavigationItem {
  name: string
  path: string
  icon?: string
  permission?: string
  subItems?: NavigationItem[]
  new?: boolean
  pro?: boolean
}

interface Props {
  items: NavigationItem[]
  className?: string
}

const props = withDefaults(defineProps<Props>(), {
  className: ''
})

const { hasPermission } = usePermissions()

const filterItemsByPermission = (items: NavigationItem[]): NavigationItem[] => {
  return items.filter(item => {
    // If no permission required, show item
    if (!item.permission) {
      return true
    }

    // Check if user has permission
    if (!hasPermission(item.permission)) {
      return false
    }

    // If item has sub-items, filter them too
    if (item.subItems) {
      const filteredSubItems = filterItemsByPermission(item.subItems)
      if (filteredSubItems.length === 0) {
        return false // Hide parent if no sub-items are accessible
      }
      item.subItems = filteredSubItems
    }

    return true
  })
}

const filteredItems = computed(() => filterItemsByPermission(props.items))
</script>
