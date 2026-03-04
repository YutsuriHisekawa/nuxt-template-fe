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
  emit('update:field', updated)
}

function getPanelPlaceholder(pf) {
  if (typeof pf.dynamicPlaceholder === 'function') return pf.dynamicPlaceholder(props.field)
  return pf.placeholder || ''
}
</script>

<template>
  <div class="flex flex-col gap-4 text-sm">
    <!-- Header -->
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-base font-semibold">Edit Field #{{ fieldIndex + 1 }}</h3>
      <button class="text-neutral-400 hover:text-neutral-100 text-lg" @click="emit('close')">✕</button>
    </div>

    <!-- Component Type Selector (grid) -->
    <div>
      <label class="block mb-1 font-medium text-neutral-400">Component Type</label>
      <div class="flex flex-col gap-3">
        <div v-for="(items, cat) in groupedOptions" :key="cat">
          <div class="text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wide">
            {{ categoryLabels[cat] || cat }}
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="opt in items"
              :key="opt.value"
              class="px-2.5 py-1 rounded text-xs font-medium border transition-colors"
              :class="field.type === opt.value
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-500'"
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
          class="rounded border-neutral-600 bg-neutral-800 text-blue-600 focus:ring-blue-500"
          @change="updateField(pf.key, $event.target.checked)"
        />
        <label :for="'panel-' + pf.key" class="text-neutral-300 cursor-pointer">
          {{ pf.label }}
        </label>
      </div>

      <!-- Text input -->
      <div v-else>
        <label :for="'panel-' + pf.key" class="block mb-1 font-medium text-neutral-400">
          {{ pf.label }}
        </label>
        <input
          :id="'panel-' + pf.key"
          type="text"
          :value="field[pf.key] || ''"
          :placeholder="getPanelPlaceholder(pf)"
          class="w-full rounded bg-neutral-800 border border-neutral-700 text-neutral-100 px-3 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
          @input="updateField(pf.key, $event.target.value)"
        />
        <p v-if="pf.hint" class="text-xs text-neutral-500 mt-0.5">{{ pf.hint }}</p>
      </div>
    </template>

    <!-- Remove Button -->
    <button
      class="mt-4 w-full py-2 rounded bg-red-600/20 text-red-400 border border-red-800 hover:bg-red-600/30 font-medium text-sm transition-colors"
      @click="emit('remove', fieldIndex)"
    >
      Hapus Field
    </button>
  </div>
</template>
