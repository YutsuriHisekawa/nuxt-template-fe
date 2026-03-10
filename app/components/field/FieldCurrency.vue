<script setup>
import { computed, ref } from 'vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const props = defineProps({
  /** Field label */
  label: String,
  /** Input value (raw number, e.g. 1500000) */
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
  /** Currency prefix (e.g. 'Rp', 'USD', '$') */
  prefix: {
    type: String,
    default: 'Rp'
  },
  /** Allow decimal input */
  allowDecimal: {
    type: Boolean,
    default: true
  },
  /** Maximum decimal digits */
  decimalPlaces: {
    type: Number,
    default: 2
  },
})

const emit = defineEmits(['input', 'update:modelValue'])

const hasError = computed(() => props.errorname === 'failed')

const currentValue = computed(() => props.modelValue ?? props.value ?? '')
const normalizedDecimalPlaces = computed(() => {
  const parsed = Number.parseInt(props.decimalPlaces, 10)
  if (!Number.isFinite(parsed)) return 2
  return Math.min(6, Math.max(0, parsed))
})

const sanitizeDecimalValue = (value) => {
  const raw = String(value ?? '').replace(/,/g, '.').replace(/[^0-9.\-]/g, '')
  const negative = raw.startsWith('-') ? '-' : ''
  const unsigned = raw.replace(/-/g, '')
  const [integerPart = '', ...decimalParts] = unsigned.split('.')
  const decimalPart = decimalParts.join('').slice(0, normalizedDecimalPlaces.value)

  if (!integerPart && !decimalPart) {
    return negative || ''
  }
  if (unsigned.endsWith('.') && normalizedDecimalPlaces.value > 0 && decimalParts.length === 0) {
    return `${negative}${integerPart || '0'}.`
  }
  if (decimalPart.length > 0) {
    return `${negative}${integerPart || '0'}.${decimalPart}`
  }
  return `${negative}${integerPart}`
}

const roundDecimalValue = (value) => {
  const num = Number.parseFloat(String(value ?? '').replace(',', '.'))
  if (!Number.isFinite(num)) return ''
  if (normalizedDecimalPlaces.value <= 0) return String(Math.round(num))
  return String(Number(num.toFixed(normalizedDecimalPlaces.value)))
}

// Format number with thousand separators (Indonesian: dot) and optional comma decimal
const formatNumber = (value) => {
  if (value === '' || value === null || value === undefined) return ''
  const strValue = String(value).replace(',', '.')
  const num = parseFloat(strValue)
  if (isNaN(num)) return ''

  if (props.allowDecimal) {
    const cleanValue = sanitizeDecimalValue(strValue)
    if (!cleanValue || cleanValue === '-' || cleanValue === '0.') return cleanValue === '0.' ? '0,' : cleanValue

    const negative = cleanValue.startsWith('-') ? '-' : ''
    const unsigned = cleanValue.replace('-', '')
    const [integerPart = '0', decimalPart = ''] = unsigned.split('.')
    const formattedInteger = Number.parseInt(integerPart || '0', 10).toLocaleString('id-ID')
    if (decimalPart.length > 0 || unsigned.endsWith('.')) {
      return `${negative}${formattedInteger},${decimalPart}`
    }
    return `${negative}${formattedInteger}`
  }

  return Math.round(num).toLocaleString('id-ID')
}

const displayValue = computed(() => formatNumber(currentValue.value))

const handleInput = (val) => {
  if (props.readonly) return
  let inputValue = String(val)

  if (props.allowDecimal) {
    inputValue = sanitizeDecimalValue(inputValue.replace(/\./g, '').replace(',', '.'))
    if (inputValue === '' || inputValue === '-' || inputValue === '.') {
      emit('input', inputValue === '.' ? '0.' : inputValue)
      emit('update:modelValue', inputValue === '.' ? '0.' : inputValue)
      return
    }
    const isPartialDecimal = /^-?\d*\.?\d*$/.test(inputValue)
    if (isPartialDecimal) {
      emit('input', inputValue)
      emit('update:modelValue', inputValue)
    }
  } else {
    inputValue = inputValue.replace(/\./g, '')
    if (inputValue === '' || inputValue === '-') {
      emit('input', '')
      emit('update:modelValue', '')
      return
    }
    const numValue = parseFloat(inputValue)
    if (!isNaN(numValue)) {
      emit('input', String(numValue))
      emit('update:modelValue', String(numValue))
    }
  }
}

const handleBlur = (event) => {
  if (props.readonly || props.disabled) return
  const target = event.target
  let cleanValue = target.value.replace(/\./g, '').replace(',', '.')
  if (props.allowDecimal) {
    cleanValue = sanitizeDecimalValue(cleanValue)
  }

  if (cleanValue === '' || cleanValue === '-') {
    target.value = ''
    return
  }

  const normalizedValue = props.allowDecimal ? roundDecimalValue(cleanValue) : cleanValue
  const numValue = parseFloat(normalizedValue)
  if (!isNaN(numValue)) {
    const stringValue = props.allowDecimal
      ? normalizedValue
      : String(numValue)
    emit('input', stringValue)
    emit('update:modelValue', stringValue)
    target.value = formatNumber(stringValue)
  }
}

const handleKeyDown = (event) => {
  if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  if (event.ctrlKey || event.metaKey) return

  if (props.allowDecimal) {
    if ((event.key >= '0' && event.key <= '9') || event.key === ',' || event.key === '-') return
    event.preventDefault()
    return
  }

  if ((event.key >= '0' && event.key <= '9') || event.key === '-') return
  event.preventDefault()
}

const handlePaste = (event) => {
  if (props.readonly) {
    event.preventDefault()
    return
  }
  const paste = (event.clipboardData || window.clipboardData).getData('text')
  const cleaned = paste.replace(/[^\d.,-]/g, '')
  if (cleaned !== paste) {
    event.preventDefault()
    handleInput(cleaned)
  }
}
</script>

<template>
  <div :class="props.class">
    <Label v-if="label" :for="id" class="text-sm font-medium" :class="{ 'text-destructive': hasError }">
      {{ label }}
      <span v-if="required" class="text-destructive">*</span>
    </Label>
    <div class="relative mt-1">
      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none pointer-events-none">
        {{ prefix }}
      </span>
      <Input
        :id="id"
        type="text"
        inputmode="decimal"
        :value="displayValue"
        :placeholder="placeholder || label"
        :disabled="disabled"
        :readonly="readonly"
        :class="[
          'pl-[calc(0.75rem+' + (prefix.length * 0.55) + 'em)] text-right',
          hasError ? 'border-destructive focus-visible:ring-destructive' : ''
        ]"
        @input="handleInput($event.target.value)"
        @blur="handleBlur"
        @keydown="handleKeyDown"
        @paste="handlePaste"
      />
    </div>
    <p v-if="hints" class="text-xs mt-1" :class="hasError ? 'text-destructive' : 'text-muted-foreground'">
      {{ hints }}
    </p>
  </div>
</template>
