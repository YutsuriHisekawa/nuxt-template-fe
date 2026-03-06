<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, default: '' },
  name: { type: String, default: '' },
  value: { type: [Boolean, Number], default: false },
  modelValue: { type: [Boolean, Number], default: undefined },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  activeText: { type: String, default: 'Aktif' },
  inactiveText: { type: String, default: 'Tidak Aktif' },
})

const emit = defineEmits(['input', 'update:modelValue'])

const isDisabled = computed(() => props.disabled || props.readonly)

const currentValue = computed(() => props.modelValue ?? props.value ?? false)

const isChecked = computed(() => {
  if (typeof currentValue.value === 'number') return currentValue.value === 1
  return Boolean(currentValue.value)
})

const handleToggle = () => {
  if (isDisabled.value) return
  const newValue = !isChecked.value
  emit('input', newValue)
  emit('update:modelValue', newValue)
}
</script>

<template>
  <div>
    <label v-if="label" class="block text-sm font-medium mb-1">{{ label }}</label>
    <div class="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        :aria-checked="isChecked"
        :disabled="isDisabled"
        @click="handleToggle"
        :class="[
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shadow-sm border-2 border-transparent',
          isChecked ? 'bg-primary' : 'bg-input',
          isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        ]"
      >
        <span
          :class="[
            'inline-block h-5 w-5 transform rounded-full bg-background shadow-lg transition-transform',
            isChecked ? 'translate-x-5' : 'translate-x-0'
          ]"
        />
      </button>

      <span class="text-sm font-semibold" :class="isChecked ? 'text-green-600' : 'text-red-600'">
        {{ isChecked ? activeText : inactiveText }}
      </span>
    </div>
  </div>
</template>
