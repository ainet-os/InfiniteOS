<template>
  <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
    <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      每页
      <select
        :value="pageSize"
        class="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
        @change="handlePageSizeChange"
      >
        <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
      </select>
      条，共 {{ totalItems }} 条
    </label>

    <PaginationWithText
      :total-pages="totalPages"
      :initial-page="currentPage"
      @page-change="(page) => emit('pageChange', page)"
    />
  </div>
</template>

<script setup lang="ts">
import PaginationWithText from './PaginationWithText.vue'

withDefaults(defineProps<{
  totalItems: number
  totalPages: number
  currentPage: number
  pageSize: number
  pageSizeOptions?: number[]
}>(), {
  pageSizeOptions: () => [10, 20, 50, 100],
})

const emit = defineEmits<{
  pageChange: [page: number]
  pageSizeChange: [pageSize: number]
}>()

const handlePageSizeChange = (event: Event) => {
  const value = Number((event.target as HTMLSelectElement).value)
  if (Number.isFinite(value) && value > 0) {
    emit('pageSizeChange', value)
  }
}
</script>
