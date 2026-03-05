<script setup>
import { CalendarDate, DateFormatter, getLocalTimeZone, parseDate } from '@internationalized/date'
import { Calendar as CalendarIcon } from 'lucide-vue-next'

const props = defineProps({
  /** Field label */
  label: String,
  /** Input value (YYYY-MM-DD) */
  value: String,
  /** Input value (for v-model support) */
  modelValue: String,
  /** Placeholder text */
  placeholder: {
    type: String,
    default: 'Pilih tanggal'
  },
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
  /** Allow clearing the value */
  clearable: {
    type: Boolean,
    default: false
  },
  /** Custom class */
  class: String,
  /** Field ID */
  id: String,
})

const emit = defineEmits(['input', 'update:modelValue'])

const hasError = computed(() => props.errorname === 'failed')

const df = new DateFormatter('id-ID', { dateStyle: 'long' })

const dateValue = computed({
  get: () => {
    const currentValue = props.modelValue ?? props.value
    if (!currentValue) return undefined
    try {
      return parseDate(currentValue)
    } catch {
      return undefined
    }
  },
  set: (val) => {
    if (val) {
      const formatted = `${val.year}-${String(val.month).padStart(2, '0')}-${String(val.day).padStart(2, '0')}`
      emit('input', formatted)
      emit('update:modelValue', formatted)
    } else {
      emit('input', '')
      emit('update:modelValue', '')
    }
  }
})

const displayValue = computed(() => {
  if (!dateValue.value) return props.placeholder
  return df.format(dateValue.value.toDate(getLocalTimeZone()))
})

const handleClear = (e) => {
  e.stopPropagation()
  dateValue.value = undefined
}
</script>

<template>
  <div :class="props.class">
    <label
      v-if="label"
      :for="id"
      class="mb-2 block text-sm font-medium"
      :class="{ 'required': required }"
    >
      {{ label }}
    </label>

    <Popover>
      <PopoverTrigger as-child>
        <button
          type="button"
          :id="id"
          :disabled="disabled || readonly"
          class="inline-flex h-10 w-full items-center justify-start rounded-md border bg-background px-3 text-sm font-normal ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          :class="[
            hasError ? 'border-destructive' : 'border-input',
            !dateValue && 'text-muted-foreground',
            readonly && 'bg-muted/50 cursor-default font-medium opacity-90'
          ]"
        >
          <CalendarIcon class="mr-2 h-4 w-4 shrink-0" />
          <span class="truncate">{{ displayValue }}</span>
          <span
            v-if="clearable && dateValue && !readonly && !disabled"
            class="ml-auto text-muted-foreground hover:text-foreground"
            @click="handleClear"
          >
            ×
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0" align="start">
        <Calendar v-model="dateValue" initial-focus />
      </PopoverContent>
    </Popover>

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
