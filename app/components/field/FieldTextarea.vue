<script setup>
import { computed } from 'vue'
import { Textarea } from '~/components/ui/textarea'
import { Label } from '~/components/ui/label'

const props = defineProps({
  /** Field label */
  label: String,
  /** Input value */
  value: String,
  /** Input value (for v-model support) */
  modelValue: String,
  /** Placeholder text */
  placeholder: String,
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
  /** Number of rows */
  rows: {
    type: Number,
    default: 3
  }
})

const emit = defineEmits(['input', 'update:modelValue'])

const hasError = computed(() => props.errorname === 'failed')

// Support both value prop and modelValue prop
const currentValue = computed(() => props.modelValue ?? props.value ?? '')

const handleInput = (event) => {
  const target = event.target
  const newValue = target.value
  
  // Emit both events for backward compatibility
  emit('input', newValue)
  emit('update:modelValue', newValue)
}
</script>

<template>
  <div :class="props.class">
    <Label 
      v-if="label" 
      :for="id"
      :class="{ 'required': required }"
      class="mb-2 block"
    >
      {{ label }}
    </Label>
    <Textarea
      :id="id"
      :value="currentValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :rows="rows"
      :class="{ 'border-destructive': hasError }"
      @input="handleInput"
    />
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
