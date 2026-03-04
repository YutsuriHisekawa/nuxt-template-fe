<script setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import * as LucideIcons from 'lucide-vue-next'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

const props = defineProps({
  label: String,
  modelValue: String,
  placeholder: {
    type: String,
    default: 'Cari icon...'
  },
  hints: String,
  errorname: {
    type: String,
    default: '',
    validator: (val) => ['failed', ''].includes(val)
  },
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  class: String,
  id: String,
  clearable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue'])

const search = ref('')
const containerRef = ref(null)

// Get all lucide icon names (PascalCase keys that are components)
const iconNames = Object.keys(LucideIcons).filter(key => {
  // lucide-vue-next exports components as functions
  return /^[A-Z]/.test(key)
    && typeof LucideIcons[key] === 'function'
    && key !== 'default'
    && key !== 'icons'
    && key !== 'createIcons'
    && key !== 'Icon'
})

const filtered = computed(() => {
  if (!search.value.trim()) return iconNames
  const q = search.value.toLowerCase()
  return iconNames.filter(name => name.toLowerCase().includes(q))
})

const hasError = computed(() => props.errorname === 'failed')

const getIcon = (name) => {
  return LucideIcons[name] || null
}

const selectValue = (val) => {
  if (props.readonly || props.disabled) return
  emit('update:modelValue', val)
}

const clearValue = () => {
  if (props.readonly || props.disabled) return
  emit('update:modelValue', '')
}

const scrollToSelected = async () => {
  await nextTick()
  const c = containerRef.value
  const targetValue = props.modelValue
  if (!c || !targetValue) return
  const nodes = Array.from(c.querySelectorAll('[data-value]'))
  const found = nodes.find(n => n.dataset.value === targetValue)
  if (found) {
    try {
      found.scrollIntoView({ block: 'center', inline: 'center' })
    } catch {}
  }
}

watch(() => props.modelValue, async () => {
  await scrollToSelected()
})

onMounted(() => {
  scrollToSelected()
})
</script>

<template>
  <div :class="props.class">
    <Label v-if="label" :for="id" :class="{ 'required': required }" class="mb-2 block">{{ label }}</Label>
    <div class="space-y-2">
      <!-- Selected preview -->
      <div v-if="modelValue" class="flex items-center gap-2 px-2 py-1.5 rounded border bg-background text-foreground relative">
        <component :is="getIcon(modelValue)" class="h-4 w-4" />
        <span class="text-sm font-medium">{{ modelValue }}</span>
        <button
          v-if="clearable && !disabled && !readonly"
          type="button"
          class="absolute right-1.5 top-1.5 h-6 w-6 inline-flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          @click="clearValue"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
            <path fill-rule="evenodd" d="M6.225 4.811a.75.75 0 011.06 0L12 9.525l4.715-4.714a.75.75 0 111.06 1.06L13.06 10.586l4.715 4.714a.75.75 0 11-1.06 1.06L12 11.646l-4.715 4.714a.75.75 0 11-1.06-1.06l4.714-4.715-4.714-4.714a.75.75 0 010-1.06z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
      <Input
        v-model="search"
        :placeholder="placeholder"
        :disabled="disabled || readonly"
        class="h-9"
        :class="{ 'border-destructive': hasError }"
      />
      <div ref="containerRef" class="h-56 w-full rounded border bg-muted/40 p-2 overflow-auto">
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          <button
            v-for="name in filtered"
            :key="name"
            type="button"
            @click="selectValue(name)"
            :title="name"
            :data-value="name"
            :class="[
              'flex flex-col items-center gap-1 p-2 rounded border text-xs transition-colors group select-none',
              (modelValue === name)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-muted hover:bg-accent hover:text-accent-foreground'
            ]"
            :aria-selected="modelValue === name"
          >
            <component :is="getIcon(name)" class="h-5 w-5" />
            <span class="truncate w-full text-center" :class="(modelValue === name) ? 'font-semibold' : ''">{{ name }}</span>
          </button>
        </div>
      </div>
      <p v-if="hints" :class="hasError ? 'text-destructive' : 'text-muted-foreground'" class="text-xs mt-1">{{ hints }}</p>
    </div>
  </div>
</template>

<style scoped>
.required::after { content: ' *'; color: hsl(var(--destructive)); }
</style>
