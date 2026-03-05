<script setup>
import { computed, ref, watch } from 'vue'
import { getRegistryEntry, FIELD_REGISTRY } from '~/utils/builder/fieldRegistry'

const props = defineProps({
  field: { type: Object, required: true },
  allFields: { type: Array, default: () => [] },
  fieldIndex: { type: Number, default: -1 },
})

const emit = defineEmits(['update:field', 'remove', 'close'])

const entry = computed(() => getRegistryEntry(props.field.type))

// ── Parent field options (static OR API-based) ─────────────────────────
const apiParentOptions = ref([])
const loadingParentOpts = ref(false)

const parentField = computed(() => {
  if (!props.field.dependsOn) return null
  return props.allFields.find(f => f.field === props.field.dependsOn) || null
})

// Fetch parent's API options when parent is API-based
watch(
  () => [props.field.dependsOn, parentField.value?.sourceType, parentField.value?.apiUrl],
  async () => {
    const pf = parentField.value
    if (!pf || pf.sourceType !== 'api' || !pf.apiUrl) {
      apiParentOptions.value = []
      return
    }
    loadingParentOpts.value = true
    try {
      const { get } = useApi()
      let url = pf.apiUrl
      // Append parent's own apiParams
      const qp = new URLSearchParams()
      if (Array.isArray(pf.apiParams)) {
        pf.apiParams.forEach(p => { if (p.key) qp.set(p.key, p.value || '') })
      }
      qp.set('no_pagination', 'true')
      const qs = qp.toString()
      if (qs) url += (url.includes('?') ? '&' : '?') + qs
      const res = await get(url)
      const rows = Array.isArray(res) ? res : (res?.data || res?.rows || [])
      const vf = pf.valueField || 'id'
      const df = pf.displayField || 'name'
      apiParentOptions.value = rows.map(r => ({ value: r[vf], label: r[df] || r[vf] }))
    } catch (e) {
      console.warn('Failed to fetch parent API options:', e)
      apiParentOptions.value = []
    } finally {
      loadingParentOpts.value = false
    }
  },
  { immediate: true }
)

const parentFieldOptions = computed(() => {
  const pf = parentField.value
  if (!pf) return []
  // API-based parent → use fetched options
  if (pf.sourceType === 'api') return apiParentOptions.value
  // Static parent → use staticOptions
  return pf.staticOptions || []
})

// ── VisibleWhen: target field + smart value options ─────────────────────
const visibleWhenTarget = computed(() => {
  if (!props.field.visibleWhenField) return null
  return props.allFields.find(f => f.field === props.field.visibleWhenField) || null
})

const apiVisibleWhenOpts = ref([])
const loadingVisibleWhenOpts = ref(false)

const visibleWhenTargetType = computed(() => {
  const t = visibleWhenTarget.value
  if (!t) return 'none'
  const e = getRegistryEntry(t.type)
  if (e?.isSwitch || t.type === 'fieldbox') return 'boolean'
  if (['select', 'select_creatable', 'popup'].includes(t.type) && t.sourceType === 'static') return 'static'
  if (['select', 'select_creatable', 'popup'].includes(t.type) && t.sourceType === 'api' && t.apiUrl) return 'api'
  if (t.type === 'radio' && Array.isArray(t.radioOptions) && t.radioOptions.length) return 'radio'
  return 'text'
})

// Fetch API data when visibleWhen target is API-based select
watch(
  () => [props.field.visibleWhenField, visibleWhenTargetType.value],
  async () => {
    if (visibleWhenTargetType.value !== 'api') {
      apiVisibleWhenOpts.value = []
      return
    }
    const t = visibleWhenTarget.value
    if (!t?.apiUrl) return
    loadingVisibleWhenOpts.value = true
    try {
      const { get } = useApi()
      let url = t.apiUrl
      const qp = new URLSearchParams()
      if (Array.isArray(t.apiParams)) {
        t.apiParams.forEach(p => { if (p.key) qp.set(p.key, p.value || '') })
      }
      qp.set('no_pagination', 'true')
      const qs = qp.toString()
      if (qs) url += (url.includes('?') ? '&' : '?') + qs
      const res = await get(url)
      const rows = Array.isArray(res) ? res : (res?.data || res?.rows || [])
      const vf = t.valueField || 'id'
      const df = t.displayField || 'name'
      apiVisibleWhenOpts.value = rows.map(r => ({ value: String(r[vf]), label: r[df] || r[vf] }))
    } catch (e) {
      console.warn('Failed to fetch visibleWhen API options:', e)
      apiVisibleWhenOpts.value = []
    } finally {
      loadingVisibleWhenOpts.value = false
    }
  },
  { immediate: true }
)

const visibleWhenValueOptions = computed(() => {
  const type = visibleWhenTargetType.value
  const t = visibleWhenTarget.value
  if (type === 'boolean') return [{ value: 'true', label: t?.labelTrue || 'Aktif' }, { value: 'false', label: t?.labelFalse || 'Tidak Aktif' }]
  if (type === 'static') return (t?.staticOptions || []).map(o => ({ value: o.value, label: o.label || o.value }))
  if (type === 'radio') return (t?.radioOptions || []).map(o => ({ value: o.value, label: o.label || o.value }))
  if (type === 'api') return apiVisibleWhenOpts.value
  return []
})

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
  date: 'Date / Time',
  selection: 'Selection',
  toggle: 'Toggle',
  layout: 'Layout',
}

function updateField(key, value) {
  const updated = { ...props.field, [key]: value }
  // When type changes, force-apply defaultMeta from the new type
  if (key === 'type') {
    const newEntry = getRegistryEntry(value)
    if (newEntry?.defaultMeta) {
      Object.entries(newEntry.defaultMeta).forEach(([k, v]) => {
        updated[k] = v
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
  // Clear dependsOnParam when dependsOn is cleared
  if (key === 'dependsOn' && !value) {
    updated.dependsOnParam = ''
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
function addColumnItem(key) {
  const arr = [...(props.field[key] || [])]
  arr.push({ field: '', headerName: '', width: '' })
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

      <!-- Options List (for static select options with default value selector) -->
      <div v-else-if="pf.type === 'optionsList'">
        <label class="block mb-1 font-medium text-muted-foreground">{{ pf.label }}</label>
        <div class="flex flex-col gap-2">
          <!-- Header row -->
          <div v-if="field.dependsOn" class="flex gap-1.5 items-center text-xs text-muted-foreground px-1">
            <span class="w-4 shrink-0"></span>
            <span class="w-24 shrink-0">Parent</span>
            <span class="flex-1 min-w-0">Value</span>
            <span class="flex-1 min-w-0">Label</span>
            <span class="w-6 shrink-0"></span>
          </div>
          <div v-else class="flex gap-2 items-center text-xs text-muted-foreground px-1">
            <span class="w-5 text-center shrink-0">Default</span>
            <span class="flex-1">Value</span>
            <span class="flex-1">Label</span>
            <span class="w-6"></span>
          </div>
          <!-- Option rows -->
          <div v-for="(opt, i) in (Array.isArray(field[pf.key]) ? field[pf.key] : [])" :key="i" class="flex gap-1.5 items-center">
            <button
              type="button"
              class="w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors"
              :class="field.defaultValue === opt.value && opt.value !== '' ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-transparent hover:border-primary/60'"
              @click="updateField('defaultValue', field.defaultValue === opt.value ? '' : opt.value)"
            >
              <span v-if="field.defaultValue === opt.value && opt.value !== ''" class="w-1.5 h-1.5 rounded-full bg-primary-foreground"></span>
            </button>
            <select
              v-if="field.dependsOn"
              :value="opt.parentValue || ''"
              class="w-24 shrink-0 rounded bg-muted border border-border text-foreground px-1.5 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              @change="updateListItem(pf.key, i, 'parentValue', $event.target.value)"
            >
              <option value="">--</option>
              <option v-for="po in parentFieldOptions" :key="po.value" :value="po.value">{{ po.label || po.value }}</option>
            </select>
            <input
              type="text"
              :value="opt.value"
              placeholder="Value"
              class="flex-1 min-w-0 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              @input="updateListItem(pf.key, i, 'value', $event.target.value)"
            />
            <input
              type="text"
              :value="opt.label"
              placeholder="Label"
              class="flex-1 min-w-0 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              @input="updateListItem(pf.key, i, 'label', $event.target.value)"
            />
            <button
              class="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
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

      <!-- Radio Options List (with default value radio selector) -->
      <div v-else-if="pf.type === 'radioOptionsList'">
        <label class="block mb-1 font-medium text-muted-foreground">{{ pf.label }}</label>
        <div class="flex flex-col gap-2">
          <div class="flex gap-2 items-center text-xs text-muted-foreground px-1">
            <span class="w-5 text-center shrink-0">Default</span>
            <span class="flex-1">Value</span>
            <span class="flex-1">Label</span>
            <span class="w-6"></span>
          </div>
          <div v-for="(opt, i) in (Array.isArray(field[pf.key]) ? field[pf.key] : [])" :key="i" class="flex gap-2 items-center">
            <button
              type="button"
              class="w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors"
              :class="field.defaultValue === opt.value && opt.value !== '' ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-transparent hover:border-primary/60'"
              @click="updateField('defaultValue', field.defaultValue === opt.value ? '' : opt.value)"
            >
              <span v-if="field.defaultValue === opt.value && opt.value !== ''" class="w-1.5 h-1.5 rounded-full bg-primary-foreground"></span>
            </button>
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

      <!-- Columns List (for popup AG Grid columns) -->
      <div v-else-if="pf.type === 'columnsList'">
        <label class="block mb-1 font-medium text-muted-foreground">{{ pf.label }}</label>
        <p v-if="pf.hint" class="text-xs text-muted-foreground/70 mb-2">{{ pf.hint }}</p>
        <div class="flex flex-col gap-2">
          <div v-for="(col, i) in (Array.isArray(field[pf.key]) ? field[pf.key] : [])" :key="i" class="flex gap-1.5 items-center">
            <input
              type="text"
              :value="col.field"
              placeholder="Key"
              class="min-w-0 flex-1 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              @input="updateListItem(pf.key, i, 'field', $event.target.value)"
            />
            <input
              type="text"
              :value="col.headerName"
              placeholder="Label"
              class="min-w-0 flex-1 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              @input="updateListItem(pf.key, i, 'headerName', $event.target.value)"
            />
            <div class="relative w-16 shrink-0">
              <input
                type="number"
                min="1"
                max="100"
                :value="col.width ? parseInt(col.width) : null"
                placeholder="%"
                class="w-full rounded bg-muted border border-border text-foreground px-2 py-1.5 pr-5 text-sm focus:border-primary focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                @input="updateListItem(pf.key, i, 'width', $event.target.value ? $event.target.value + '%' : '')"
              />
              <span class="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
            </div>
            <button
              class="text-muted-foreground hover:text-destructive transition-colors p-0.5 shrink-0"
              @click="removeListItem(pf.key, i)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <button
            class="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors py-1"
            @click="addColumnItem(pf.key)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Kolom
          </button>
        </div>
      </div>

      <!-- Params List (for API query params) -->
      <div v-else-if="pf.type === 'paramsList'">        <label class="block mb-1 font-medium text-muted-foreground">{{ pf.label }}</label>
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

      <!-- Visible When Combo (select field + smart value) -->
      <div v-else-if="pf.type === 'visibleWhenCombo'">
        <label class="block mb-1 font-medium text-muted-foreground">{{ pf.label }}</label>
        <div class="flex flex-col gap-2">
          <!-- Field selector -->
          <select
            :value="field.visibleWhenField || ''"
            class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
            @change="emit('update:field', { ...field, visibleWhenField: $event.target.value, visibleWhenValue: '' })"
          >
            <option value="">-- Tidak ada (selalu tampil) --</option>
            <option
              v-for="f in allFields.filter(af => af.field && af.field !== field.field)"
              :key="f.field"
              :value="f.field"
            >
              {{ f.label || f.field }} ({{ f.field }})
            </option>
          </select>

          <!-- Value input (shown when field selected) -->
          <template v-if="field.visibleWhenField">
            <label class="block text-xs font-medium text-muted-foreground">Bernilai</label>
            <!-- Loading state for API -->
            <div v-if="loadingVisibleWhenOpts" class="text-xs text-muted-foreground italic py-1">
              Memuat opsi dari API...
            </div>
            <!-- Select dropdown when options available -->
            <select
              v-else-if="visibleWhenValueOptions.length > 0"
              :value="field.visibleWhenValue || ''"
              class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
              @change="updateField('visibleWhenValue', $event.target.value)"
            >
              <option value="">-- Pilih nilai --</option>
              <option v-for="opt in visibleWhenValueOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <!-- Fallback text input -->
            <input
              v-else
              type="text"
              :value="field.visibleWhenValue || ''"
              placeholder="Ketik nilai..."
              class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
              @input="updateField('visibleWhenValue', $event.target.value)"
            />
          </template>
        </div>
        <p v-if="pf.hint" class="text-xs text-muted-foreground/70 mt-1">{{ pf.hint }}</p>
      </div>

      <!-- Select Field (pick another field as parent for cascading) -->
      <div v-else-if="pf.type === 'selectField'">
        <label :for="'panel-' + pf.key" class="block mb-1 font-medium text-muted-foreground">
          {{ pf.label }}
        </label>
        <select
          :id="'panel-' + pf.key"
          :value="field[pf.key] || ''"
          class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
          @change="updateField(pf.key, $event.target.value)"
        >
          <option value="">-- Tidak ada (standalone) --</option>
          <option
            v-for="f in allFields.filter(af => af.field && af.field !== field.field && (!pf.filterTypes || pf.filterTypes.includes(af.type)))"
            :key="f.field"
            :value="f.field"
          >
            {{ f.label || f.field }}
          </option>
        </select>
        <p v-if="pf.hint" class="text-xs text-muted-foreground/70 mt-0.5">{{ pf.hint }}</p>
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
