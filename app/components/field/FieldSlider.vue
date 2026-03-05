<script setup>
import { computed } from 'vue'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'

const props = defineProps({
  /** Field label */
  label: String,
  /** Input value (number) */
  value: [String, Number],
  /** Input value (for v-model support) */
  modelValue: [String, Number],
  /** Error message or hint */
  hints: String,
  /** Error state name */
  errorname: {
    type: String,
    default: '',
    validator: (val) => ['failed', ''].includes(val)
  },
  /** Is field required */
  required: {
    type: Boolean,
    default: false
  },
  /** Is field disabled */
  disabled: {
    type: Boolean,
    default: false
  },
  /** Is field readonly */
  readonly: {
    type: Boolean,
    default: false
  },
  /** Custom class */
  class: String,
  /** Field ID */
  id: String,
  /** Minimum value */
  min: {
    type: Number,
    default: 0
  },
  /** Maximum value */
  max: {
    type: Number,
    default: 100
  },
  /** Step increment */
  step: {
    type: Number,
    default: 1
  },
  /** Unit suffix (e.g. '%', 'pcs', 'kg') */
  unit: {
    type: String,
    default: ''
  },
})

const emit = defineEmits(['input', 'update:modelValue'])

const hasError = computed(() => props.errorname === 'failed')

const currentValue = computed(() => {
  const val = props.modelValue ?? props.value
  if (val === '' || val === null || val === undefined) return props.min
  const num = Number(val)
  return isNaN(num) ? props.min : num
})

const sliderModel = computed({
  get: () => [currentValue.value],
  set: (arr) => {
    if (props.readonly || props.disabled) return
    const v = arr[0]
    const strVal = String(v)
    emit('input', strVal)
    emit('update:modelValue', strVal)
  }
})

const displayValue = computed(() => {
  const val = currentValue.value
  return props.unit ? `${val}${props.unit}` : String(val)
})
</script>

<template>
  <div :class="props.class">
    <div class="flex items-center justify-between mb-1">
      <Label v-if="label" :for="id" class="text-sm font-medium" :class="{ 'text-destructive': hasError }">
        {{ label }}
        <span v-if="required" class="text-destructive">*</span>
      </Label>
      <span class="text-sm font-semibold tabular-nums text-foreground">{{ displayValue }}</span>
    </div>
    <div class="flex items-center gap-3 mt-2">
      <span class="text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0">{{ min }}</span>
      <Slider
        :id="id"
        v-model="sliderModel"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled || readonly"
        class="flex-1"
      />
      <span class="text-xs text-muted-foreground tabular-nums w-8 shrink-0">{{ max }}</span>
    </div>
    <p v-if="hints" class="text-xs mt-1" :class="hasError ? 'text-destructive' : 'text-muted-foreground'">
      {{ hints }}
    </p>
  </div>
</template>
