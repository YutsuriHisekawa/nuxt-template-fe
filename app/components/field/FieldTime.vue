<script setup>
import { computed } from 'vue'
import { Label } from '@/components/ui/label'
import { Clock } from 'lucide-vue-next'

const props = defineProps({
  label: String,
  value: String,
  modelValue: String,
  placeholder: { type: String, default: 'Pilih waktu' },
  hints: String,
  errorname: { type: String, default: '', validator: (val) => ['failed', ''].includes(val) },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  clearable: { type: Boolean, default: false },
  class: String,
  id: String,
})

const emit = defineEmits(['input', 'update:modelValue'])

const hasError = computed(() => props.errorname === 'failed')
const currentValue = computed(() => props.modelValue ?? props.value ?? '')

const handleInput = (event) => {
  const v = event.target.value
  emit('input', v)
  emit('update:modelValue', v)
}

const handleClear = () => {
  emit('input', '')
  emit('update:modelValue', '')
}
</script>

<template>
  <div :class="props.class">
    <Label v-if="label" :for="id" :class="{ required }" class="mb-2 block">
      {{ label }}
    </Label>

    <div class="relative">
      <Clock class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        :id="id"
        type="time"
        :value="currentValue"
        :disabled="disabled || readonly"
        :placeholder="placeholder"
        class="flex h-10 w-full rounded-md border bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        :class="[
          hasError ? 'border-destructive' : 'border-input',
          readonly && 'bg-muted/50 cursor-default font-medium opacity-90'
        ]"
        @input="handleInput"
      />
      <button
        v-if="clearable && currentValue && !readonly && !disabled"
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
        @click="handleClear"
      >
        &times;
      </button>
    </div>

    <p v-if="hints" :class="hasError ? 'text-destructive' : 'text-muted-foreground'" class="text-sm mt-1">
      {{ hints }}
    </p>
  </div>
</template>

<style scoped>
.required::after {
  content: " *";
  color: #ef4444;
  font-weight: bold;
}
</style>
