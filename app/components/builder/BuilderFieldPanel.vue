<script setup>
import { computed } from 'vue'
import { getRegistryEntry, FIELD_REGISTRY } from '~/utils/builder/fieldRegistry'

const props = defineProps({
  field: { type: Object, required: true },
  allFields: { type: Array, default: () => [] },
  fieldIndex: { type: Number, default: -1 },
})

const emit = defineEmits(['update:field', 'remove', 'close'])

const entry = computed(() => getRegistryEntry(props.field.type))

const visiblePanelFields = computed(() => {
  if (!entry.value?.panelFields) return []
  return entry.value.panelFields.filter(pf => {
    if (typeof pf.hideWhen === 'function') return !pf.hideWhen(props.field)
    return true
  })
})

// Category-grouped component options for type selector
const groupedOptions = computed(() => {
  const map = {}
  FIELD_REGISTRY.forEach(r => {
    const cat = r.category || 'other'
    if (!map[cat]) map[cat] = []
    map[cat].push(r)
  })
  return map
})

const categoryLabels = {
  input: 'Input Fields',
  number: 'Number Fields',
  selection: 'Selection',
  toggle: 'Toggle',
}

function updateField(key, value) {
  const updated = { ...props.field, [key]: value }
  // When type changes, merge in defaultMeta from the new type so new fields appear
  if (key === 'type') {
    const newEntry = getRegistryEntry(value)
    if (newEntry?.defaultMeta) {
      Object.entries(newEntry.defaultMeta).forEach(([k, v]) => {
        // Only set if currently empty
        if (!updated[k]) updated[k] = v
      })
    }
  }
  // Normalize staticOptions to array when switching to static source
  if (key === 'sourceType' && value === 'static' && !Array.isArray(updated.staticOptions)) {
    updated.staticOptions = []
  }
  // Normalize apiParams to array when switching to api source
  if (key === 'sourceType' && value === 'api' && !Array.isArray(updated.apiParams)) {
    updated.apiParams = []
  }
  emit('update:field', updated)
}

function getPanelPlaceholder(pf) {
  if (typeof pf.dynamicPlaceholder === 'function') return pf.dynamicPlaceholder(props.field)
  return pf.placeholder || ''
}

// List helpers (for optionsList and paramsList)
function updateListItem(key, index, prop, val) {
  const arr = [...(props.field[key] || [])]
  arr[index] = { ...arr[index], [prop]: val }
  updateField(key, arr)
}
function removeListItem(key, index) {
  const arr = [...(props.field[key] || [])]
  arr.splice(index, 1)
  updateField(key, arr)
}
function addOptionItem(key) {
  const arr = [...(props.field[key] || [])]
  arr.push({ value: '', label: '' })
  updateField(key, arr)
}
function addParamItem(key) {
  const arr = [...(props.field[key] || [])]
  arr.push({ key: '', value: '' })
  updateField(key, arr)
}
</script>

<template>
  <div class="flex flex-col gap-4 text-sm">
    <!-- Header -->
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-base font-semibold">Edit Field #{{ fieldIndex + 1 }}</h3>
      <button class="text-muted-foreground hover:text-foreground text-lg" @click="emit('close')">✕</button>
    </div>

    <!-- Component Type Selector (grid) -->
    <div>
      <label class="block mb-1 font-medium text-muted-foreground">Component Type</label>
      <div class="flex flex-col gap-3">
        <div v-for="(items, cat) in groupedOptions" :key="cat">
          <div class="text-xs font-semibold text-muted-foreground/70 mb-1 uppercase tracking-wide">
            {{ categoryLabels[cat] || cat }}
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="opt in items"
              :key="opt.value"
              class="px-2.5 py-1 rounded text-xs font-medium border transition-colors"
              :class="field.type === opt.value
                ? 'bg-primary border-primary text-primary-foreground'
                : 'bg-muted border-border text-muted-foreground hover:border-foreground/30'"
              @click="updateField('type', opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Dynamic Panel Fields -->
    <template v-for="pf in visiblePanelFields" :key="pf.key">
      <!-- Checkbox -->
      <div v-if="pf.type === 'checkbox'" class="flex items-center gap-2">
        <input
          :id="'panel-' + pf.key"
          type="checkbox"
          :checked="!!field[pf.key]"
          class="rounded border-border bg-muted text-primary focus:ring-primary"
          @change="updateField(pf.key, $event.target.checked)"
        />
        <label :for="'panel-' + pf.key" class="text-foreground cursor-pointer">
          {{ pf.label }}
        </label>
      </div>

      <!-- Button group (e.g. sourceType: api vs static) -->
      <div v-else-if="pf.type === 'buttongroup'">
        <label class="block mb-1 font-medium text-muted-foreground">{{ pf.label }}</label>
        <div class="flex gap-1.5">
          <button
            v-for="opt in pf.options"
            :key="opt.value"
            class="px-3 py-1.5 rounded text-xs font-medium border transition-colors"
            :class="field[pf.key] === opt.value
              ? 'bg-primary border-primary text-primary-foreground'
              : 'bg-muted border-border text-muted-foreground hover:border-foreground/30'"
            @click="updateField(pf.key, opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- Textarea -->
      <div v-else-if="pf.type === 'textarea'">
        <label :for="'panel-' + pf.key" class="block mb-1 font-medium text-muted-foreground">
          {{ pf.label }}
        </label>
        <textarea
          :id="'panel-' + pf.key"
          :value="field[pf.key] || ''"
          :placeholder="getPanelPlaceholder(pf)"
          rows="5"
          class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm font-mono resize-y"
          @input="updateField(pf.key, $event.target.value)"
        />
        <p v-if="pf.hint" class="text-xs text-muted-foreground/70 mt-0.5">{{ pf.hint }}</p>
      </div>

      <!-- Options List (for static select options) -->
      <div v-else-if="pf.type === 'optionsList'">
        <label class="block mb-1 font-medium text-muted-foreground">{{ pf.label }}</label>
        <div class="flex flex-col gap-2">
          <div v-for="(opt, i) in (Array.isArray(field[pf.key]) ? field[pf.key] : [])" :key="i" class="flex gap-2 items-center">
            <input
              type="text"
              :value="opt.value"
              placeholder="Value"
              class="flex-1 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              @input="updateListItem(pf.key, i, 'value', $event.target.value)"
            />
            <input
              type="text"
              :value="opt.label"
              placeholder="Label"
              class="flex-1 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              @input="updateListItem(pf.key, i, 'label', $event.target.value)"
            />
            <button
              class="text-muted-foreground hover:text-destructive transition-colors p-1"
              @click="removeListItem(pf.key, i)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <button
            class="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors py-1"
            @click="addOptionItem(pf.key)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Option
          </button>
        </div>
      </div>

      <!-- Params List (for API query params) -->
      <div v-else-if="pf.type === 'paramsList'">
        <label class="block mb-1 font-medium text-muted-foreground">{{ pf.label }}</label>
        <div class="flex flex-col gap-2">
          <div v-for="(param, i) in (Array.isArray(field[pf.key]) ? field[pf.key] : [])" :key="i" class="flex gap-2 items-center">
            <input
              type="text"
              :value="param.key"
              placeholder="Param"
              class="flex-1 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              @input="updateListItem(pf.key, i, 'key', $event.target.value)"
            />
            <span class="text-muted-foreground text-xs">=</span>
            <input
              type="text"
              :value="param.value"
              placeholder="Value"
              class="flex-1 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              @input="updateListItem(pf.key, i, 'value', $event.target.value)"
            />
            <button
              class="text-muted-foreground hover:text-destructive transition-colors p-1"
              @click="removeListItem(pf.key, i)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <button
            class="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors py-1"
            @click="addParamItem(pf.key)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Param
          </button>
        </div>
      </div>

      <!-- Text input (default) -->
      <div v-else>
        <label :for="'panel-' + pf.key" class="block mb-1 font-medium text-muted-foreground">
          {{ pf.label }}
        </label>
        <input
          :id="'panel-' + pf.key"
          type="text"
          :value="field[pf.key] || ''"
          :placeholder="getPanelPlaceholder(pf)"
          class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
          @input="updateField(pf.key, $event.target.value)"
        />
        <p v-if="pf.hint" class="text-xs text-muted-foreground/70 mt-0.5">{{ pf.hint }}</p>
      </div>
    </template>

    <!-- Remove Button -->
    <button
      class="mt-4 w-full py-2 rounded bg-destructive/20 text-destructive border border-destructive/40 hover:bg-destructive/30 font-medium text-sm transition-colors"
      @click="emit('remove', fieldIndex)"
    >
      Hapus Field
    </button>
  </div>
</template>
