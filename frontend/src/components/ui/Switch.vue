<template>
  <label
    :class="`flex cursor-pointer select-none items-center gap-3 text-sm font-medium ${
      disabled ? 'text-gray-400' : 'text-gray-700 dark:text-gray-400'
    }`"
  >
    <div class="relative">
      <input
        type="checkbox"
        :id="id"
        class="sr-only"
        :checked="modelValue"
        @change="handleChange"
        :disabled="disabled"
      />
      <div
        :class="`block transition duration-150 ease-linear h-6 w-11 rounded-full ${
          disabled
            ? 'bg-gray-100 pointer-events-none dark:bg-gray-800'
            : modelValue
              ? 'bg-brand-500'
              : 'bg-gray-200 dark:bg-white/10'
        }`"
      ></div>
      <div
        :class="`absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow-theme-sm duration-150 ease-linear transform ${
          modelValue ? 'translate-x-full bg-white' : 'translate-x-0 bg-white'
        }`"
      ></div>
    </div>
    <span v-if="label">{{ label }}</span>
  </label>
</template>

<script setup lang="ts">
interface SwitchProps {
  modelValue?: boolean
  id?: string
  disabled?: boolean
  label?: string
}

const props = withDefaults(defineProps<SwitchProps>(), {
  modelValue: false,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}
</script>
