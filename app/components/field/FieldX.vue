<script setup>
import { computed, ref } from 'vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-vue-next'

const props = defineProps({
  /** Field label */
  label: String,
  /** Input value */
  value: [String, Number],
  /** Input value (for v-model support) */
  modelValue: [String, Number],
  /** Input type */
  type: {
    type: String,
    default: 'text',
    validator: (val) => ['text', 'email', 'password', 'url', 'tel', 'number', 'decimal', 'textarea'].includes(val)
  },
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
  /** Textarea rows (only for textarea type) */
  rows: {
    type: Number,
    default: 3
  }
})

const emit = defineEmits(['input', 'update:modelValue'])

const hasError = computed(() => props.errorname === 'failed')
const showPassword = ref(false)

// Support both value prop and modelValue prop
// Convert to string to preserve leading zeros for tel type
const currentValue = computed(() => {
  const val = props.modelValue ?? props.value ?? ''
  // For tel type, always return as string to preserve leading zeros
  if (props.type === 'tel' && val !== null && val !== undefined) {
    return String(val)
  }
  return val
})

// Computed type for password toggle
const inputType = computed(() => {
  if (props.type === 'password' && showPassword.value) {
    return 'text'
  }
  return props.type
})

const handleInput = (event) => {
  const target = event.target
  let newValue = target.value
  
  // For decimal type, only allow: digits, e, E, ., -, +, ,
  if (props.type === 'decimal') {
    newValue = newValue.replace(/[^0-9eE.\-+,]/g, '')
    target.value = newValue
  }
  
  // For number type, only allow digits
  if (props.type === 'number') {
    newValue = newValue.replace(/[^0-9]/g, '')
    target.value = newValue
  }
  
  // For tel type, only allow digits, +, -, space, and parentheses
  if (props.type === 'tel') {
    newValue = newValue.replace(/[^0-9+\-\s()]/g, '')
    target.value = newValue
  }
  
  // Emit both events for backward compatibility
  emit('input', newValue)
  emit('update:modelValue', newValue)
}

const handleKeyDown = (event) => {
  // Apply to decimal, number, and tel type
  if (props.type !== 'tel' && props.type !== 'number' && props.type !== 'decimal') return
  
  const key = event.key
  
  // Allow: backspace, delete, tab, escape, enter
  if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'].includes(key)) {
    return
  }
  
  // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
  if (event.ctrlKey || event.metaKey) {
    return
  }
  
  // Allow: home, end, left, right, up, down
  if (['Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
    return
  }
  
  // For decimal type, allow: digits, e, E, ., -, +, ,
  if (props.type === 'decimal') {
    if ((key >= '0' && key <= '9') || ['e', 'E', '.', '-', '+', ','].includes(key)) {
      return
    }
    event.preventDefault()
    return
  }
  
  // For number type, only allow digits
  if (props.type === 'number') {
    if (key >= '0' && key <= '9') {
      return
    }
    event.preventDefault()
    return
  }
  
  // For tel type, allow: digits, +, -, space, (, )
  if (props.type === 'tel') {
    if ((key >= '0' && key <= '9') || ['+', '-', ' ', '(', ')'].includes(key)) {
      return
    }
  }
  
  // Block everything else (letters, special chars)
  event.preventDefault()
}

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

// Check if textarea
const isTextarea = computed(() => props.type === 'textarea')
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
    <div class="relative">
      <!-- Textarea -->
      <textarea
        v-if="isTextarea"
        :id="id"
        :value="currentValue"
        @input="handleInput"
        :disabled="disabled"
        :readonly="readonly"
        :placeholder="placeholder"
        :rows="rows"
        :class="[
          'flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          { 'border-destructive': hasError },
          { 'bg-muted/50 text-foreground cursor-default font-medium opacity-90': readonly }
        ]"
      />
      <!-- Input -->
      <Input
        v-else
        :id="id"
        :type="inputType"
        :inputmode="type === 'tel' ? 'tel' : undefined"
        :model-value="currentValue"
        :placeholder="placeholder"
        :disabled="disabled && !readonly"
        :readonly="readonly"
        :class="[
          { 'border-destructive': hasError },
          type === 'password' && 'pr-10',
          readonly && 'bg-muted/50 !text-foreground cursor-default font-medium !opacity-100'
        ]"
        class="h-10"
        @input="handleInput"
        @keydown="handleKeyDown"
        @update:model-value="(val) => {
          emit('input', String(val))
          emit('update:modelValue', String(val))
        }"
      />
      <!-- Password toggle -->
      <button
        v-if="type === 'password'"
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        @click="togglePasswordVisibility"
        tabindex="-1"
      >
        <Eye v-if="!showPassword" class="h-4 w-4" />
        <EyeOff v-else class="h-4 w-4" />
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
