<script setup>
import { computed } from 'vue'
import { Label } from '@/components/ui/label'

const props = defineProps({
  label: String,
  value: String,
  modelValue: String,
  placeholder: { type: String, default: '#000000' },
  hints: String,
  errorname: { type: String, default: '', validator: (val) => ['failed', ''].includes(val) },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  class: String,
  id: String,
})

const emit = defineEmits(['input', 'update:modelValue'])

const hasError = computed(() => props.errorname === 'failed')
const currentValue = computed(() => props.modelValue ?? props.value ?? '#000000')

const handleInput = (event) => {
  const v = event.target.value
  emit('input', v)
  emit('update:modelValue', v)
}
</script>

<template>
  <div :class="props.class">
    <Label v-if="label" :for="id" :class="{ required }" class="mb-2 block">
      {{ label }}
    </Label>

    <div class="flex items-center gap-3">
      <input
        :id="id"
        type="color"
        :value="currentValue"
        :disabled="disabled || readonly"
        class="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1 disabled:cursor-not-allowed disabled:opacity-50"
        :class="[
          hasError && 'border-destructive',
          readonly && 'bg-muted/50 cursor-default opacity-90'
        ]"
        @input="handleInput"
      />
      <span class="text-sm font-mono text-muted-foreground select-all">{{ currentValue }}</span>
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
