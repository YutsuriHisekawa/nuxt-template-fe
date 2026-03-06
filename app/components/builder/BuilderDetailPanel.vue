<script setup>
import { Trash2, Copy } from 'lucide-vue-next'
import { createBlankColumn, createBlankDisplayColumn, createBlankDetailField, DETAIL_FIELD_TYPES } from '~/utils/builder/fieldRegistry'

const props = defineProps({
  detail: { type: Object, required: true },
  detailIndex: { type: Number, default: 0 },
})

const emit = defineEmits(['update:detail', 'remove', 'close'])

const isMultiSelect = computed(() => props.detail.mode !== 'add_to_list')

function update(key, value) {
  const updated = { ...props.detail, [key]: value }

  // Auto-derive foreignKey & foreignDisplay from apiUrl when user types apiUrl
  if (key === 'apiUrl' && value) {
    const match = value.match(/\/([^/?]+)(?:\?|$)/)
    if (match) {
      const tableName = match[1] // e.g. "m_role"
      if (!props.detail.foreignKey) updated.foreignKey = tableName + '_id'
      if (!props.detail.foreignDisplay) updated.foreignDisplay = tableName
    }
  }

  emit('update:detail', updated)
}

// ── Column helpers ──────────────────────────────────────────────────
function updateColumn(index, prop, val) {
  const arr = [...(props.detail.columns || [])]
  arr[index] = { ...arr[index], [prop]: val }
  update('columns', arr)
}
function removeColumn(index) {
  const arr = [...(props.detail.columns || [])]
  arr.splice(index, 1)
  update('columns', arr)
}
function addColumn() {
  update('columns', [...(props.detail.columns || []), createBlankColumn()])
}

// ── Display column helpers ──────────────────────────────────────────
function updateDisplayCol(index, prop, val) {
  const arr = [...(props.detail.displayColumns || [])]
  arr[index] = { ...arr[index], [prop]: val }
  update('displayColumns', arr)
}
function removeDisplayCol(index) {
  const arr = [...(props.detail.displayColumns || [])]
  arr.splice(index, 1)
  update('displayColumns', arr)
}
function addDisplayCol() {
  update('displayColumns', [...(props.detail.displayColumns || []), createBlankDisplayColumn()])
}

// ── Detail fields helpers ───────────────────────────────────────────
function updateDetailField(index, prop, val) {
  const arr = [...(props.detail.detailFields || [])]
  const updated = { ...arr[index], [prop]: val }
  // When type changes, reset default value to match new type
  if (prop === 'type') {
    if (val === 'checkbox' || val === 'status') {
      updated.default = true
    } else if (['number', 'fieldnumber', 'fieldnumber_decimal', 'currency', 'slider'].includes(val)) {
      updated.default = 0
    } else {
      updated.default = ''
    }
    // Reset sourceType for select
    if (val === 'select') updated.sourceType = updated.sourceType || 'api'
  }
  arr[index] = updated
  update('detailFields', arr)
}
function removeDetailField(index) {
  const arr = [...(props.detail.detailFields || [])]
  arr.splice(index, 1)
  update('detailFields', arr)
}
function addDetailField() {
  update('detailFields', [...(props.detail.detailFields || []), createBlankDetailField()])
}
function duplicateDetailField(index) {
  const arr = [...(props.detail.detailFields || [])]
  const clone = { ...arr[index] }
  arr.splice(index + 1, 0, clone)
  update('detailFields', arr)
}

function getFieldTypeLabel(type) {
  return DETAIL_FIELD_TYPES.find(t => t.value === type)?.label || type
}

// ── Detail field option helpers (for static select / radio) ─────────
function addDetailOptionItem(fieldIndex, key) {
  const arr = [...(props.detail.detailFields || [])]
  const field = { ...arr[fieldIndex] }
  field[key] = [...(field[key] || []), { value: '', label: '' }]
  arr[fieldIndex] = field
  update('detailFields', arr)
}
function removeDetailOptionItem(fieldIndex, key, optIndex) {
  const arr = [...(props.detail.detailFields || [])]
  const field = { ...arr[fieldIndex] }
  const opts = [...(field[key] || [])]
  opts.splice(optIndex, 1)
  field[key] = opts
  arr[fieldIndex] = field
  update('detailFields', arr)
}
function updateDetailOptionItem(fieldIndex, key, optIndex, prop, val) {
  const arr = [...(props.detail.detailFields || [])]
  const field = { ...arr[fieldIndex] }
  const opts = [...(field[key] || [])]
  opts[optIndex] = { ...opts[optIndex], [prop]: val }
  field[key] = opts
  arr[fieldIndex] = field
  update('detailFields', arr)
}
</script>

<template>
  <div class="flex flex-col gap-5 text-sm">
    <!-- Header -->
    <div class="flex items-center justify-between mb-1">
      <h3 class="text-base font-semibold">Detail Tab #{{ detailIndex + 1 }}</h3>
      <button class="text-muted-foreground hover:text-foreground text-lg" @click="emit('close')">✕</button>
    </div>

    <!-- Mode Selection -->
    <div>
      <label class="block mb-2 font-medium text-muted-foreground">Mode Detail</label>
      <div class="flex rounded-lg border border-border overflow-hidden">
        <button
          class="flex-1 py-2 px-3 text-xs font-medium transition-colors"
          :class="isMultiSelect ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'"
          @click="update('mode', 'button_multi_select')"
        >
          ButtonMultiSelect
        </button>
        <button
          class="flex-1 py-2 px-3 text-xs font-medium transition-colors border-l border-border"
          :class="!isMultiSelect ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'"
          @click="update('mode', 'add_to_list')"
        >
          Add To List
        </button>
      </div>
      <p class="text-xs text-muted-foreground/70 mt-1">
        {{ isMultiSelect ? 'Pilih item dari popup API (ButtonMultiSelect)' : 'Tambah baris manual tanpa API' }}
      </p>
    </div>

    <!-- Tab Label -->
    <div>
      <label class="block mb-1 font-medium text-muted-foreground">Tab Label</label>
      <input type="text" :value="detail.tabLabel" placeholder="Menu & Permissions" class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm" @input="update('tabLabel', $event.target.value)" />
    </div>

    <!-- Button Label -->
    <div>
      <label class="block mb-1 font-medium text-muted-foreground">Button Label</label>
      <input type="text" :value="detail.buttonLabel" placeholder="Pilih Item" class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm" @input="update('buttonLabel', $event.target.value)" />
      <p class="text-xs text-muted-foreground/70 mt-0.5">Label tombol untuk memilih/menambah item</p>
    </div>

    <!-- Response Key -->
    <div>
      <label class="block mb-1 font-medium text-muted-foreground">Response Key</label>
      <input type="text" :value="detail.responseKey" placeholder="m_role_ds" class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm" @input="update('responseKey', $event.target.value)" />
      <p class="text-xs text-muted-foreground/70 mt-0.5">Key dari response GET API yang menampung detail array</p>
    </div>

    <!-- Payload Key -->
    <div>
      <label class="block mb-1 font-medium text-muted-foreground">Payload Key</label>
      <input type="text" :value="detail.payloadKey" placeholder="m_role_d" class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm" @input="update('payloadKey', $event.target.value)" />
      <p class="text-xs text-muted-foreground/70 mt-0.5">Key yang dikirim dalam payload POST/PUT</p>
    </div>

    <!-- ================================================================ -->
    <!-- BUTTON MULTI SELECT MODE FIELDS -->
    <!-- ================================================================ -->
    <template v-if="isMultiSelect">
      <!-- Foreign Key -->
      <div>
        <label class="block mb-1 font-medium text-muted-foreground">Foreign Key Field</label>
        <input type="text" :value="detail.foreignKey" placeholder="m_menu_id" class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm" @input="update('foreignKey', $event.target.value)" />
        <p class="text-xs text-muted-foreground/70 mt-0.5">Kolom FK yang menyimpan ID item yang dipilih</p>
      </div>

      <!-- Foreign Display -->
      <div>
        <label class="block mb-1 font-medium text-muted-foreground">Foreign Display Key</label>
        <input type="text" :value="detail.foreignDisplay" placeholder="m_menu" class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm" @input="update('foreignDisplay', $event.target.value)" />
        <p class="text-xs text-muted-foreground/70 mt-0.5">Nested object dari API response yang berisi info tampilan</p>
      </div>

      <hr class="border-border" />

      <!-- API URL -->
      <div>
        <label class="block mb-1 font-medium text-muted-foreground">API Endpoint (Multi-Select)</label>
        <input type="text" :value="detail.apiUrl" placeholder="/api/dynamic/m_menu" class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm" @input="update('apiUrl', $event.target.value)" />
      </div>

      <!-- Search Key, Display Key, Unique Key -->
      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="block mb-1 font-medium text-muted-foreground text-xs">Search Key</label>
          <input type="text" :value="detail.searchKey" placeholder="name" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary" @input="update('searchKey', $event.target.value)" />
        </div>
        <div>
          <label class="block mb-1 font-medium text-muted-foreground text-xs">Display Key</label>
          <input type="text" :value="detail.displayKey" placeholder="name" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary" @input="update('displayKey', $event.target.value)" />
        </div>
        <div>
          <label class="block mb-1 font-medium text-muted-foreground text-xs">Unique Key</label>
          <input type="text" :value="detail.uniqueKey" placeholder="id" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary" @input="update('uniqueKey', $event.target.value)" />
        </div>
      </div>

      <hr class="border-border" />

      <!-- Popup Table Columns -->
      <div>
        <label class="block mb-1 font-medium text-muted-foreground">Kolom Popup (ButtonMultiSelect)</label>
        <p class="text-xs text-muted-foreground/70 mb-2">Kolom yang ditampilkan di popup multi-select</p>
        <div class="flex flex-col gap-2">
          <div v-for="(col, i) in (detail.columns || [])" :key="i" class="flex gap-2 items-center">
            <input type="text" :value="col.key" placeholder="Key" class="flex-1 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary" @input="updateColumn(i, 'key', $event.target.value)" />
            <input type="text" :value="col.label" placeholder="Label" class="flex-1 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary" @input="updateColumn(i, 'label', $event.target.value)" />
            <div class="relative w-20">
              <input type="number" min="1" max="100" :value="col.width ? parseInt(col.width) : null" placeholder="%" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1.5 pr-6 text-sm focus:border-primary focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" @input="updateColumn(i, 'width', $event.target.value ? $event.target.value + '%' : '')" />
              <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
            </div>
            <button class="text-muted-foreground hover:text-destructive transition-colors p-1" @click="removeColumn(i)">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
          <button class="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors py-1" @click="addColumn">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Kolom Popup
          </button>
        </div>
      </div>

      <hr class="border-border" />

      <!-- Display Columns (in detail table) -->
      <div>
        <label class="block mb-1 font-medium text-muted-foreground">Kolom Tampilan (Detail Table)</label>
        <p class="text-xs text-muted-foreground/70 mb-2">Kolom read-only dari master data yang ditampilkan di tabel detail</p>
        <div class="flex flex-col gap-2">
          <div v-for="(dc, i) in (detail.displayColumns || [])" :key="i" class="flex gap-2 items-center">
            <input type="text" :value="dc.key" placeholder="Key (e.g. name)" class="flex-1 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDisplayCol(i, 'key', $event.target.value)" />
            <input type="text" :value="dc.label" placeholder="Label" class="flex-1 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDisplayCol(i, 'label', $event.target.value)" />
            <button class="text-muted-foreground hover:text-destructive transition-colors p-1" @click="removeDisplayCol(i)">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
          <button class="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors py-1" @click="addDisplayCol">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Kolom Tampilan
          </button>
        </div>
      </div>
    </template>

    <hr class="border-border" />

    <!-- ================================================================ -->
    <!-- DETAIL FIELDS (shared between both modes) -->
    <!-- ================================================================ -->
    <div>
      <label class="block mb-1 font-medium text-muted-foreground">Field Per Baris Detail</label>
      <p class="text-xs text-muted-foreground/70 mb-3">
        {{ isMultiSelect ? 'Field yang bisa diedit per baris detail (selain kolom tampilan)' : 'Kolom yang ditampilkan di tabel dan bisa diisi per baris' }}
      </p>
      <div class="flex flex-col gap-3">
        <div v-for="(df, i) in (detail.detailFields || [])" :key="i" class="border border-border rounded-lg p-3 bg-muted/30 space-y-2">
          <!-- Row 1: Key + Label -->
          <div class="flex gap-2 items-center">
            <input type="text" :value="df.key" placeholder="Key (e.g. is_read)" class="flex-1 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'key', $event.target.value)" />
            <input type="text" :value="df.label" placeholder="Label" class="flex-1 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'label', $event.target.value)" />
            <button class="text-muted-foreground hover:text-primary transition-colors p-1 shrink-0" title="Duplikat" @click="duplicateDetailField(i)">
              <Copy class="w-4 h-4" />
            </button>
            <button class="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0" title="Hapus" @click="removeDetailField(i)">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>

          <!-- Row 2: Field Type selector (from DETAIL_FIELD_TYPES) -->
          <div>
            <label class="block mb-1 text-xs text-muted-foreground">Komponen</label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="ft in DETAIL_FIELD_TYPES"
                :key="ft.value"
                class="px-2 py-1 text-xs rounded border transition-colors"
                :class="df.type === ft.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:border-primary hover:text-primary'"
                @click="updateDetailField(i, 'type', ft.value)"
              >
                {{ ft.label }}
              </button>
            </div>
          </div>

          <!-- Row 3: Type-specific settings -->
          <!-- Checkbox: labelTrue / labelFalse / default -->
          <div v-if="df.type === 'checkbox'" class="grid grid-cols-3 gap-2">
            <div>
              <label class="block mb-0.5 text-xs text-muted-foreground">Label True</label>
              <input type="text" :value="df.labelTrue || 'Ya'" placeholder="Ya" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'labelTrue', $event.target.value)" />
            </div>
            <div>
              <label class="block mb-0.5 text-xs text-muted-foreground">Label False</label>
              <input type="text" :value="df.labelFalse || 'Tidak'" placeholder="Tidak" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'labelFalse', $event.target.value)" />
            </div>
            <div>
              <label class="block mb-0.5 text-xs text-muted-foreground">Default</label>
              <div class="flex rounded border border-border overflow-hidden h-[26px]">
                <button
                  class="flex-1 text-xs transition-colors"
                  :class="df.default !== false ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
                  @click="updateDetailField(i, 'default', true)"
                >True</button>
                <button
                  class="flex-1 text-xs transition-colors border-l border-border"
                  :class="df.default === false ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
                  @click="updateDetailField(i, 'default', false)"
                >False</button>
              </div>
            </div>
          </div>

          <!-- Status (Switch): labelTrue / labelFalse / default -->
          <div v-else-if="df.type === 'status'" class="grid grid-cols-3 gap-2">
            <div>
              <label class="block mb-0.5 text-xs text-muted-foreground">Label True</label>
              <input type="text" :value="df.labelTrue || 'Aktif'" placeholder="Aktif" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'labelTrue', $event.target.value)" />
            </div>
            <div>
              <label class="block mb-0.5 text-xs text-muted-foreground">Label False</label>
              <input type="text" :value="df.labelFalse || 'Tidak Aktif'" placeholder="Tidak Aktif" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'labelFalse', $event.target.value)" />
            </div>
            <div>
              <label class="block mb-0.5 text-xs text-muted-foreground">Default</label>
              <div class="flex rounded border border-border overflow-hidden h-[26px]">
                <button class="flex-1 text-xs transition-colors" :class="df.default !== false ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'" @click="updateDetailField(i, 'default', true)">True</button>
                <button class="flex-1 text-xs transition-colors border-l border-border" :class="df.default === false ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'" @click="updateDetailField(i, 'default', false)">False</button>
              </div>
            </div>
          </div>

          <!-- Select: sourceType, apiUrl/staticOptions, displayField, valueField -->
          <div v-else-if="df.type === 'select'" class="space-y-2">
            <div>
              <label class="block mb-0.5 text-xs text-muted-foreground">Source Type</label>
              <div class="flex rounded border border-border overflow-hidden h-[26px]">
                <button class="flex-1 text-xs transition-colors" :class="(df.sourceType || 'api') === 'api' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'" @click="updateDetailField(i, 'sourceType', 'api')">API</button>
                <button class="flex-1 text-xs transition-colors border-l border-border" :class="df.sourceType === 'static' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'" @click="updateDetailField(i, 'sourceType', 'static')">Static</button>
              </div>
            </div>
            <template v-if="(df.sourceType || 'api') === 'api'">
              <div>
                <label class="block mb-0.5 text-xs text-muted-foreground">API URL</label>
                <input type="text" :value="df.apiUrl || ''" placeholder="/api/dynamic/m_xxx" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'apiUrl', $event.target.value)" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block mb-0.5 text-xs text-muted-foreground">Display Field</label>
                  <input type="text" :value="df.displayField || 'name'" placeholder="name" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'displayField', $event.target.value)" />
                </div>
                <div>
                  <label class="block mb-0.5 text-xs text-muted-foreground">Value Field</label>
                  <input type="text" :value="df.valueField || 'id'" placeholder="id" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'valueField', $event.target.value)" />
                </div>
              </div>
            </template>
            <template v-else>
              <div>
                <label class="block mb-0.5 text-xs text-muted-foreground">Static Options</label>
                <div class="flex flex-col gap-1.5">
                  <div class="flex gap-1.5 items-center text-[10px] text-muted-foreground px-0.5">
                    <span class="w-4 shrink-0 text-center">Def</span>
                    <span class="flex-1">Value</span>
                    <span class="flex-1">Label</span>
                    <span class="w-5 shrink-0"></span>
                  </div>
                  <div v-for="(opt, oi) in (Array.isArray(df.staticOptions) ? df.staticOptions : [])" :key="oi" class="flex gap-1.5 items-center">
                    <button
                      type="button"
                      class="w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors"
                      :class="df.default === opt.value && opt.value !== '' ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-transparent hover:border-primary/60'"
                      @click="updateDetailField(i, 'default', df.default === opt.value ? '' : opt.value)"
                    >
                      <span v-if="df.default === opt.value && opt.value !== ''" class="w-1.5 h-1.5 rounded-full bg-primary-foreground"></span>
                    </button>
                    <input type="text" :value="opt.value" placeholder="Value" class="flex-1 min-w-0 rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailOptionItem(i, 'staticOptions', oi, 'value', $event.target.value)" />
                    <input type="text" :value="opt.label" placeholder="Label" class="flex-1 min-w-0 rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailOptionItem(i, 'staticOptions', oi, 'label', $event.target.value)" />
                    <button class="text-muted-foreground hover:text-destructive transition-colors p-0.5 shrink-0" @click="removeDetailOptionItem(i, 'staticOptions', oi)">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <button class="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors py-0.5" @click="addDetailOptionItem(i, 'staticOptions')">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Tambah Option
                  </button>
                </div>
              </div>
            </template>
          </div>

          <!-- PopUp: apiUrl, columns, searchKey, displayKey -->
          <div v-else-if="df.type === 'popup'" class="space-y-2">
            <div>
              <label class="block mb-0.5 text-xs text-muted-foreground">API URL</label>
              <input type="text" :value="df.apiUrl || ''" placeholder="/api/dynamic/m_xxx" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'apiUrl', $event.target.value)" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block mb-0.5 text-xs text-muted-foreground">Display Field</label>
                <input type="text" :value="df.displayField || 'name'" placeholder="name" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'displayField', $event.target.value)" />
              </div>
              <div>
                <label class="block mb-0.5 text-xs text-muted-foreground">Value Field</label>
                <input type="text" :value="df.valueField || 'id'" placeholder="id" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'valueField', $event.target.value)" />
              </div>
            </div>
          </div>

          <!-- Radio: options -->
          <div v-else-if="df.type === 'radio'" class="space-y-2">
            <div>
              <label class="block mb-0.5 text-xs text-muted-foreground">Radio Options</label>
              <div class="flex flex-col gap-1.5">
                <div class="flex gap-1.5 items-center text-[10px] text-muted-foreground px-0.5">
                  <span class="w-4 shrink-0 text-center">Def</span>
                  <span class="flex-1">Value</span>
                  <span class="flex-1">Label</span>
                  <span class="w-5 shrink-0"></span>
                </div>
                <div v-for="(opt, oi) in (Array.isArray(df.radioOptions) ? df.radioOptions : [])" :key="oi" class="flex gap-1.5 items-center">
                  <button
                    type="button"
                    class="w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors"
                    :class="df.default === opt.value && opt.value !== '' ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-transparent hover:border-primary/60'"
                    @click="updateDetailField(i, 'default', df.default === opt.value ? '' : opt.value)"
                  >
                    <span v-if="df.default === opt.value && opt.value !== ''" class="w-1.5 h-1.5 rounded-full bg-primary-foreground"></span>
                  </button>
                  <input type="text" :value="opt.value" placeholder="Value" class="flex-1 min-w-0 rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailOptionItem(i, 'radioOptions', oi, 'value', $event.target.value)" />
                  <input type="text" :value="opt.label" placeholder="Label" class="flex-1 min-w-0 rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailOptionItem(i, 'radioOptions', oi, 'label', $event.target.value)" />
                  <button class="text-muted-foreground hover:text-destructive transition-colors p-0.5 shrink-0" @click="removeDetailOptionItem(i, 'radioOptions', oi)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <button class="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors py-0.5" @click="addDetailOptionItem(i, 'radioOptions')">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Tambah Option
                </button>
              </div>
            </div>
          </div>

          <!-- Currency: default value -->
          <div v-else-if="df.type === 'currency'" class="flex gap-2">
            <div class="flex-1">
              <label class="block mb-0.5 text-xs text-muted-foreground">Default Value</label>
              <input type="number" :value="df.default || 0" placeholder="0" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'default', Number($event.target.value))" />
            </div>
          </div>

          <!-- Text/Number/FieldNumber: default value -->
          <div v-else-if="['text', 'number', 'fieldnumber', 'fieldnumber_decimal', 'textarea'].includes(df.type)" class="flex gap-2">
            <div class="flex-1">
              <label class="block mb-0.5 text-xs text-muted-foreground">Default Value</label>
              <input :type="['number', 'fieldnumber', 'fieldnumber_decimal'].includes(df.type) ? 'number' : 'text'" :value="df.default || ''" :placeholder="['number', 'fieldnumber', 'fieldnumber_decimal'].includes(df.type) ? '0' : ''" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'default', ['number', 'fieldnumber', 'fieldnumber_decimal'].includes(df.type) ? Number($event.target.value) : $event.target.value)" />
            </div>
          </div>

          <!-- Type badge + Summary selector -->
          <div class="flex items-center justify-between gap-2">
            <div v-if="['number', 'fieldnumber', 'fieldnumber_decimal', 'currency'].includes(df.type)" class="flex items-center gap-1.5">
              <label class="text-[10px] text-muted-foreground shrink-0">Footer:</label>
              <div class="flex gap-1">
                <button
                  v-for="st in ['', 'SUM', 'AVG', 'COUNT']"
                  :key="st"
                  class="px-1.5 py-0.5 text-[10px] rounded border transition-colors"
                  :class="(df.summaryType || '') === st
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border hover:border-primary hover:text-primary'"
                  @click="updateDetailField(i, 'summaryType', st)"
                >
                  {{ st || 'None' }}
                </button>
              </div>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 font-semibold">
              {{ getFieldTypeLabel(df.type) }}
            </span>
          </div>
        </div>

        <button class="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors py-1" @click="addDetailField">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Tambah Detail Field
        </button>
      </div>
    </div>

    <!-- Remove Button -->
    <button class="mt-4 w-full py-2 rounded bg-destructive/20 text-destructive border border-destructive/40 hover:bg-destructive/30 font-medium text-sm transition-colors flex items-center justify-center gap-2" @click="emit('remove', detailIndex)">
      <Trash2 class="h-4 w-4" />
      Hapus Detail Tab
    </button>
  </div>
</template>
