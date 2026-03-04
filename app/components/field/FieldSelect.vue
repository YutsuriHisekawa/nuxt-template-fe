<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, Loader2, ChevronDown, Check } from 'lucide-vue-next'

const props = defineProps({
  /** Field label */
  label: String,
  /** Input value */
  value: [String, Number],
  /** Input value (for v-model support) */
  modelValue: [String, Number],
  /** Placeholder text */
  placeholder: {
    type: String,
    default: 'Pilih...'
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
  /** Custom class */
  class: String,
  /** Field ID */
  id: String,
  /** Display field name from API response */
  displayField: {
    type: String,
    default: 'label'
  },
  /** Value field name from API response */
  valueField: {
    type: String,
    default: 'value'
  },
  /** API endpoint (relative, e.g. "/api/dynamic/m_supplier") */
  apiUrl: String,
  /** Additional query params for API */
  apiParams: {
    type: Object,
    default: () => ({})
  },
  /** Static options (if not using API) */
  options: {
    type: Array,
    default: () => []
  },
  /** Allow clearable */
  clearable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['input', 'update:modelValue', 'update:valueFull'])

const api = useApi()
const loading = ref(false)
const selectOptions = ref([])
const searchQuery = ref('')
const open = ref(false)
const dropdownRef = ref(null)
const dropdownDirection = ref('below')
const overlayPos = ref({ top: 0, left: 0, width: 0, bottom: 0 })

const OPTION_ROW_HEIGHT = 40
const optionsMaxHeight = computed(() => `${OPTION_ROW_HEIGHT * 4}px`)
const hasError = computed(() => props.errorname === 'failed')

const updateOverlayPosition = () => {
  if (!dropdownRef.value) return
  const rect = dropdownRef.value.getBoundingClientRect()
  overlayPos.value = {
    top: rect.bottom + 6,
    left: rect.left,
    width: rect.width,
    bottom: window.innerHeight - rect.top + 6
  }
}

watch(open, (isOpen) => {
  if (isOpen && dropdownRef.value) {
    const rect = dropdownRef.value.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    dropdownDirection.value = spaceBelow < 200 && spaceAbove > spaceBelow ? 'above' : 'below'
    updateOverlayPosition()
    window.addEventListener('scroll', updateOverlayPosition, true)
    window.addEventListener('resize', updateOverlayPosition)
  } else {
    window.removeEventListener('scroll', updateOverlayPosition, true)
    window.removeEventListener('resize', updateOverlayPosition)
  }
})

const currentValue = computed(() => {
  const val = props.modelValue ?? props.value ?? ''
  return String(val)
})

const displayText = computed(() => {
  if (!currentValue.value) return props.placeholder
  const selected = selectOptions.value.find(
    opt => String(opt[props.valueField]) === currentValue.value
  )
  return selected ? selected[props.displayField] : props.placeholder
})

const filteredOptions = computed(() => {
  if (!searchQuery.value) return selectOptions.value
  const q = searchQuery.value.toLowerCase()
  return selectOptions.value.filter(opt =>
    String(opt[props.displayField]).toLowerCase().includes(q)
  )
})

const handleValueChange = (newValue) => {
  const value = newValue ? String(newValue) : ''
  const selectedObject = selectOptions.value.find(
    opt => String(opt[props.valueField]) === value
  )
  emit('input', value)
  emit('update:modelValue', value)
  emit('update:valueFull', selectedObject || null)
  open.value = false
  searchQuery.value = ''
}

const handleClear = (e) => {
  e.stopPropagation()
  emit('input', '')
  emit('update:modelValue', '')
  emit('update:valueFull', null)
  open.value = false
  searchQuery.value = ''
}

const toggleDropdown = () => {
  if (props.disabled || props.readonly || loading.value) return
  if (!open.value) fetchOptions()
  open.value = !open.value
  if (open.value) {
    setTimeout(() => {
      const searchInput = dropdownRef.value?.querySelector('input')
      searchInput?.focus()
    }, 50)
  }
}

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    open.value = false
    searchQuery.value = ''
  }
}

const fetchOptions = async () => {
  if (!props.apiUrl) {
    if (props.options?.length) selectOptions.value = props.options
    return
  }
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (props.apiParams) {
      Object.entries(props.apiParams).forEach(([key, value]) => {
        params.append(key, String(value))
      })
    }
    const sep = props.apiUrl.includes('?') ? '&' : '?'
    const url = `${props.apiUrl}${sep}${params.toString()}`
    const response = await api.get(url)

    if (response?.status === 'success' && Array.isArray(response.data)) {
      selectOptions.value = response.data
    } else if (Array.isArray(response)) {
      selectOptions.value = response
    } else {
      selectOptions.value = []
    }
  } catch (error) {
    console.error('FieldSelect: fetch error', error)
    selectOptions.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.options, (newOptions) => {
  if (newOptions && !props.apiUrl) {
    selectOptions.value = newOptions
  }
}, { deep: true })

onMounted(() => {
  if (props.options?.length) selectOptions.value = props.options
  if (currentValue.value?.trim() && props.apiUrl) fetchOptions()
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', updateOverlayPosition, true)
  window.removeEventListener('resize', updateOverlayPosition)
})

watch(() => currentValue.value, (newVal, oldVal) => {
  if (newVal && newVal.trim() && !oldVal && selectOptions.value.length === 0 && props.apiUrl) {
    fetchOptions()
  }
})

watch(() => props.apiUrl, () => {
  if (open.value) fetchOptions()
}, { deep: true })
</script>

<template>
  <div :class="props.class">
    <Label
      v-if="label"
      :for="id"
      :class="{ required: required }"
      class="mb-2 block"
    >{{ label }}</Label>

    <div ref="dropdownRef" class="relative">
      <div
        :class="[
          'flex items-center w-full h-10 px-3 py-1.5 text-sm rounded-md border bg-background cursor-pointer transition-colors select-none',
          hasError ? 'border-destructive' : 'border-input',
          disabled || readonly ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50',
          open ? 'ring-1 ring-ring border-ring' : ''
        ]"
        @click="toggleDropdown"
      >
        <span
          :class="[
            'flex-1 truncate',
            !currentValue ? 'text-muted-foreground' : 'text-foreground'
          ]"
        >{{ displayText }}</span>
        <div class="flex items-center gap-1 ml-1 shrink-0">
          <Loader2 v-if="loading" class="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          <button
            v-if="clearable && currentValue && !disabled && !readonly"
            type="button"
            class="text-muted-foreground hover:text-foreground"
            @click.stop="handleClear"
          >
            <X class="h-3.5 w-3.5" />
          </button>
          <ChevronDown :class="['h-3.5 w-3.5 text-muted-foreground transition-transform', open ? 'rotate-180' : '']" />
        </div>
      </div>

      <!-- Dropdown overlay -->
      <Teleport to="body">
        <div
          v-if="open"
          :style="{
            position: 'fixed',
            top: dropdownDirection === 'below' ? `${overlayPos.top}px` : 'auto',
            bottom: dropdownDirection === 'above' ? `${overlayPos.bottom}px` : 'auto',
            left: `${overlayPos.left}px`,
            width: `${overlayPos.width}px`,
            zIndex: 9999
          }"
          class="rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          <!-- Search input -->
          <div class="p-1.5 border-b">
            <Input
              v-model="searchQuery"
              type="text"
              placeholder="Cari..."
              class="h-7 text-xs"
              @click.stop
              @keydown.escape="open = false"
            />
          </div>

          <!-- Options list -->
          <div :style="{ maxHeight: optionsMaxHeight, overflowY: 'auto' }" class="p-1 scrollbar-thin" @wheel.stop @click.stop>
            <div
              v-if="filteredOptions.length === 0 && !loading"
              class="px-3 py-4 text-xs text-muted-foreground text-center"
            >
              {{ searchQuery ? 'Tidak ditemukan' : 'Tidak ada data' }}
            </div>
            <div
              v-for="option in filteredOptions"
              :key="String(option[valueField])"
              :class="[
                'flex items-center gap-2 px-3 py-2 text-xs cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground',
                String(option[valueField]) === currentValue ? 'bg-primary text-primary-foreground' : ''
              ]"
              @click.stop="handleValueChange(option[valueField])"
            >
              <Check
                :class="[
                  'h-3.5 w-3.5 shrink-0',
                  String(option[valueField]) === currentValue ? 'opacity-100' : 'opacity-0'
                ]"
              />
              <span class="truncate">{{ option[displayField] }}</span>
            </div>
          </div>
        </div>
      </Teleport>
    </div>

    <p
      v-if="hints"
      :class="hasError ? 'text-destructive' : 'text-muted-foreground'"
      class="text-sm mt-1"
    >{{ hints }}</p>
  </div>
</template>

<style scoped>
.required::after {
  content: " *";
  color: hsl(var(--destructive));
  font-weight: bold;
}
.scrollbar-thin::-webkit-scrollbar { width: 6px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: hsl(var(--muted-foreground) / 0.3); border-radius: 3px; }
.scrollbar-thin { scrollbar-width: thin; scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent; }
</style>
