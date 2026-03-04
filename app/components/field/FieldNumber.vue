<script setup>
import { computed, ref } from 'vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const props = defineProps({
  /** Field label */
  label: String,
  /** Input value */
  value: [String, Number],
  /** Input value (for v-model support) */
  modelValue: [String, Number],
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
  /** Min value */
  min: Number,
  /** Max value */
  max: Number,
  /** Step value */
  step: {
    type: Number,
    default: 1
  },
  /** Input type: 'integer' (default) or 'decimal' for decimal numbers */
  type: {
    type: String,
    default: 'integer',
    validator: (val) => ['integer', 'decimal'].includes(val)
  }
})

const emit = defineEmits(['input', 'update:modelValue'])

const hasError = computed(() => props.errorname === 'failed')

// Support both value prop and modelValue prop
const currentValue = computed(() => props.modelValue ?? props.value ?? '')

// Check if decimal mode
const isDecimal = computed(() => props.type === 'decimal')

// Format number with thousand separators (1000 -> 1.000)
// For decimal type, preserve the decimal part (1000,32 -> 1.000,32)
const formatNumber = (value) => {
  if (value === '' || value === null || value === undefined) return ''
  
  const strValue = String(value)
  
  // For decimal type, format with thousand separators AND comma as decimal separator
  if (isDecimal.value) {
    // Parse the number (handles both dot and comma as decimal separator)
    const cleanValue = strValue.replace(',', '.')
    const num = parseFloat(cleanValue)
    if (isNaN(num)) return ''
    
    // Split into integer and decimal parts
    const parts = num.toFixed(10).split('.') // Use high precision to preserve decimals
    const integerPart = parts[0] || '0'
    let decimalPart = parts[1] || ''
    
    // Remove trailing zeros from decimal part
    decimalPart = decimalPart.replace(/0+$/, '')
    
    // Format integer part with thousand separators (Indonesian format: dot)
    const formattedInteger = parseInt(integerPart).toLocaleString('id-ID')
    
    // Combine with comma as decimal separator
    if (decimalPart && decimalPart.length > 0) {
      return `${formattedInteger},${decimalPart}`
    }
    return formattedInteger
  }
  
  // Integer mode: format with thousand separators
  const numStr = strValue.replace(/\./g, '') // Remove existing dots
  const num = parseFloat(numStr)
  if (isNaN(num)) return ''
  return num.toLocaleString('id-ID') // Indonesian format uses dot for thousands
}

// Display value with formatting
const displayValue = computed(() => {
  const val = formatNumber(currentValue.value)
  return val
})

const handleInput = (val) => {
  // Block input if readonly
  if (props.readonly) {
    return
  }
  
  let inputValue = String(val)
  
  if (isDecimal.value) {
    // Decimal mode: remove thousand separators (dots), replace comma with dot for internal storage
    inputValue = inputValue.replace(/\./g, '').replace(',', '.')
    
    // Validate it's a valid decimal number
    if (inputValue === '' || inputValue === '-' || inputValue === '.') {
      emit('input', inputValue === '.' ? '0.' : inputValue)
      emit('update:modelValue', inputValue === '.' ? '0.' : inputValue)
      return
    }
    
    // Allow partial decimal input like "1." or "1.2"
    const isPartialDecimal = /^-?\d*\.?\d*$/.test(inputValue)
    if (isPartialDecimal) {
      emit('input', inputValue)
      emit('update:modelValue', inputValue)
    }
  } else {
    // Integer mode: remove all dots (thousand separators) and keep only digits and minus
    inputValue = inputValue.replace(/\./g, '')
    
    // Validate it's a valid number
    if (inputValue === '' || inputValue === '-') {
      emit('input', '')
      emit('update:modelValue', '')
      return
    }
    
    // Parse and emit clean numeric value
    const numValue = parseFloat(inputValue)
    if (!isNaN(numValue)) {
      // Check min/max bounds
      let finalValue = numValue
      if (props.min !== undefined && finalValue < props.min) finalValue = props.min
      if (props.max !== undefined && finalValue > props.max) finalValue = props.max
      
      const stringValue = String(finalValue)
      emit('input', stringValue)
      emit('update:modelValue', stringValue)
    }
  }
}

const handleBlur = (event) => {
  // Skip if readonly or disabled
  if (props.readonly || props.disabled) {
    return
  }
  
  const target = event.target
  
  if (isDecimal.value) {
    // Decimal mode: clean up and format with thousand separators
    let cleanValue = target.value.replace(/\./g, '').replace(',', '.')
    
    if (cleanValue === '' || cleanValue === '-') {
      target.value = ''
      return
    }
    
    // Parse and validate
    const numValue = parseFloat(cleanValue)
    if (!isNaN(numValue)) {
      // Check min/max bounds
      let finalValue = numValue
      if (props.min !== undefined && finalValue < props.min) finalValue = props.min
      if (props.max !== undefined && finalValue > props.max) finalValue = props.max
      
      // Emit the clean value
      const stringValue = String(finalValue)
      emit('input', stringValue)
      emit('update:modelValue', stringValue)
      
      // Format display with thousand separators and comma as decimal separator
      target.value = formatNumber(stringValue)
    }
  } else {
    // Integer mode: clean input by removing dots first
    let cleanValue = target.value.replace(/\./g, '')
    
    if (cleanValue === '' || cleanValue === '-') {
      target.value = ''
      return
    }
    
    // Parse and reformat
    const numValue = parseFloat(cleanValue)
    if (!isNaN(numValue)) {
      // Check min/max bounds
      let finalValue = numValue
      if (props.min !== undefined && finalValue < props.min) finalValue = props.min
      if (props.max !== undefined && finalValue > props.max) finalValue = props.max
      
      // Emit the clean value
      const stringValue = String(finalValue)
      emit('input', stringValue)
      emit('update:modelValue', stringValue)
      
      // Format the display with thousand separators
      target.value = formatNumber(stringValue)
    }
  }
}

const handleKeyDown = (event) => {
  // Allow navigation keys and control keys
  if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
    return
  }
  
  // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
  if (event.ctrlKey || event.metaKey) {
    return
  }
  
  // For decimal mode, allow: digits, comma (as decimal separator), minus (for negative)
  if (isDecimal.value) {
    if ((event.key >= '0' && event.key <= '9') || event.key === ',' || event.key === '-') {
      return
    }
    event.preventDefault()
    return
  }
  
  // Integer mode: only allow digits and minus
  if ((event.key >= '0' && event.key <= '9') || event.key === '-') {
    return
  }
  
  event.preventDefault()
}

const handleFocus = (event) => {
  // On focus, show raw value without formatting for easier editing
  if (props.readonly || props.disabled) return
  
  const target = event.target
  const raw = currentValue.value
  
  if (isDecimal.value && raw) {
    // Show with comma as decimal separator but without thousand separators
    target.value = String(raw).replace('.', ',')
  } else if (raw) {
    // Show raw value without thousand separators
    target.value = String(raw)
  }
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
    <Input
      :id="id"
      type="text"
      inputmode="numeric"
      :value="displayValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :class="{ 'border-destructive': hasError }"
      class="h-10"
      @input="(e) => handleInput(e.target.value)"
      @blur="handleBlur"
      @keydown="handleKeyDown"
      @focus="handleFocus"
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
