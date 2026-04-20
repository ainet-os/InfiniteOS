import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

type MaybeReadonlyItems<T> = Ref<T[]> | ComputedRef<T[]>

export interface UsePaginationOptions {
  initialPageSize?: number
  pageSizeOptions?: number[]
}

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export function usePagination<T>(items: MaybeReadonlyItems<T>, options: UsePaginationOptions = {}) {
  const pageSizeOptions = options.pageSizeOptions || DEFAULT_PAGE_SIZE_OPTIONS
  const currentPage = ref(1)
  const pageSize = ref(options.initialPageSize || pageSizeOptions[0] || 10)

  const totalItems = computed(() => items.value.length)
  const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)))
  const pagedItems = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return items.value.slice(start, start + pageSize.value)
  })

  const setPage = (page: number) => {
    currentPage.value = Math.min(Math.max(page, 1), totalPages.value)
  }

  watch(pageSize, () => {
    currentPage.value = 1
  })

  watch(totalPages, () => {
    setPage(currentPage.value)
  })

  return {
    currentPage,
    pageSize,
    pageSizeOptions,
    totalItems,
    totalPages,
    pagedItems,
    setPage,
  }
}
