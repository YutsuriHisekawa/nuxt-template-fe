<script setup>
import { DateFormatter, getLocalTimeZone, parseDate } from '@internationalized/date'
import { Calendar as CalendarIcon, Clock } from 'lucide-vue-next'

const props = defineProps({
  /** Field label */
  label: String,
  /** Input value (ISO datetime, e.g. 2025-12-09T13:03) */
  value: String,
  /** Input value (for v-model support) */
  modelValue: String,
  /** Placeholder text */
  placeholder: {
    type: String,
    default: 'Pilih tanggal & jam'
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

const hours = ref('00')
const minutes = ref('00')
const selectedDate = ref(undefined)

// Initialize time with current device time on mount
onMounted(() => {
  const now = new Date()
  hours.value = String(now.getHours()).padStart(2, '0')
  minutes.value = String(now.getMinutes()).padStart(2, '0')
})

// Parse ISO datetime string into date + time parts
const parseDateTime = (iso) => {
  if (!iso) return { date: undefined, hours: '00', minutes: '00' }
  try {
    const dt = new Date(iso)
    const h = String(dt.getHours()).padStart(2, '0')
    const m = String(dt.getMinutes()).padStart(2, '0')
    const dateStr = iso.split('T')[0]
    return { date: parseDate(dateStr || ''), hours: h, minutes: m }
  } catch {
    return { date: undefined, hours: '00', minutes: '00' }
  }
}

const initializeDateTime = () => {
  const currentValue = props.modelValue ?? props.value
  if (!currentValue) {
    selectedDate.value = undefined
    const now = new Date()
    hours.value = String(now.getHours()).padStart(2, '0')
    minutes.value = String(now.getMinutes()).padStart(2, '0')
    return
  }
  const parsed = parseDateTime(currentValue)
  selectedDate.value = parsed.date
  hours.value = parsed.hours
  minutes.value = parsed.minutes
}

const displayValue = computed(() => {
  const currentValue = props.modelValue ?? props.value
  if (!currentValue) return props.placeholder

  initializeDateTime()

  if (!selectedDate.value) return props.placeholder
  const dateStr = df.format(selectedDate.value.toDate(getLocalTimeZone()))
  return `${dateStr} ${hours.value}:${minutes.value}`
})

const emitDateTime = () => {
  if (!selectedDate.value) return
  const dateStr = `${selectedDate.value.year}-${String(selectedDate.value.month).padStart(2, '0')}-${String(selectedDate.value.day).padStart(2, '0')}`
  const formatted = `${dateStr}T${hours.value}:${minutes.value}`
  emit('input', formatted)
  emit('update:modelValue', formatted)
}

const handleDateSelect = (day) => {
  if (day) {
    selectedDate.value = day
    emitDateTime()
  }
}

const handleTimeChange = () => {
  emitDateTime()
}

const handleClear = (e) => {
  e.stopPropagation()
  selectedDate.value = undefined
  hours.value = '00'
  minutes.value = '00'
  emit('input', '')
  emit('update:modelValue', '')
}

const onHoursInput = (e) => {
  const val = parseInt(e.target.value) || 0
  hours.value = String(Math.min(23, Math.max(0, val))).padStart(2, '0')
  handleTimeChange()
}

const onMinutesInput = (e) => {
  const val = parseInt(e.target.value) || 0
  minutes.value = String(Math.min(59, Math.max(0, val))).padStart(2, '0')
  handleTimeChange()
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
            !selectedDate && 'text-muted-foreground',
            readonly && 'bg-muted/50 cursor-default font-medium opacity-90'
          ]"
        >
          <CalendarIcon class="mr-2 h-4 w-4 shrink-0" />
          <span class="truncate">{{ displayValue }}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent class="w-auto p-0" align="start">
        <div class="flex gap-4 p-4">
          <!-- Calendar -->
          <div>
            <Calendar v-model="selectedDate" @update:model-value="handleDateSelect" />
          </div>

          <!-- Time Input -->
          <div class="flex flex-col gap-4 justify-start">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <Clock class="h-4 w-4 text-muted-foreground" />
                <span class="text-xs font-medium">Waktu</span>
              </div>
              <div class="flex items-end gap-2">
                <!-- Hours -->
                <div class="flex flex-col gap-1 flex-1">
                  <span class="text-xs text-muted-foreground">Jam</span>
                  <input
                    :value="hours"
                    type="number"
                    min="0"
                    max="23"
                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-center text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    @input="onHoursInput"
                  />
                </div>
                <!-- Separator -->
                <div class="pb-1 text-muted-foreground font-bold">:</div>
                <!-- Minutes -->
                <div class="flex flex-col gap-1 flex-1">
                  <span class="text-xs text-muted-foreground">Menit</span>
                  <input
                    :value="minutes"
                    type="number"
                    min="0"
                    max="59"
                    class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-center text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    @input="onMinutesInput"
                  />
                </div>
              </div>
            </div>

            <!-- Clear button -->
            <button
              v-if="clearable || selectedDate"
              type="button"
              class="inline-flex h-8 w-full items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
              @click="handleClear"
            >
              Bersihkan
            </button>
          </div>
        </div>
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

/* Hide number input spinners */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
}
</style>
