<script setup>
import { Trash2, Copy, GripVertical, ChevronDown, ChevronRight } from 'lucide-vue-next'
import { createBlankColumn, createBlankDisplayColumn, createBlankDetailField, DETAIL_FIELD_TYPES, getDetailFieldDefaultWidth } from '~/utils/builder/fieldRegistry'

const props = defineProps({
  detail: { type: Object, required: true },
  detailIndex: { type: Number, default: 0 },
  allHeaderFields: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:detail', 'remove', 'close'])

// ── Help modal ───────────────────────────────────────────────────────────
const detailHelp = ref('')
const DETAIL_HELP = {
  formula: {
    title: 'Formula Detail (Per-Baris)',
    desc: 'Buat kolom yang nilainya otomatis dihitung per baris berdasarkan kolom lain di baris yang sama. Cocok untuk subtotal, diskon, total per item.',
    steps: [
      'Pilih template cepat (Kali, Tambah, Diskon%, Subtotal, dll) dari daftar template yang tersedia',
      'Assign field A, B, C sesuai kebutuhan — hanya field lain di detail yang sama yang bisa dipilih',
      'Klik "Apply Template" untuk menerapkan token formula',
      'Atau bangun manual: pilih Field → klik Operator (+ − × ÷) → tambah Angka → Kurung',
      'Klik ✕ pada badge token untuk hapus satu-satu, atau "Hapus Formula" untuk reset semua',
      'Kolom yang punya formula otomatis menjadi READONLY — nilainya dihitung otomatis per baris',
      'Formula dijalankan oleh deep watcher di generated code — setiap perubahan data baris langsung recompute',
    ],
    example: 'Contoh: Detail Pembelian\n├─ qty (FieldNumber)\n├─ harga (FieldCurrency)\n└─ subtotal (FieldCurrency) ← Formula: qty × harga\n\nTemplate: Kali → A = qty, B = harga → Apply\nHasil: setiap baris subtotal = qty × harga otomatis',
    tips: [
      'Gunakan template "Qty × Harga − Diskon" untuk transaksi yang ada diskon per baris',
      'Gunakan template "Subtotal Disc %" untuk diskon persen: harga × qty × (1 − disc/100)',
      'Formula bisa berantai: subtotal → ppn → total (masing-masing formula terpisah)',
    ],
  },
  autoFill: {
    title: 'Auto-Fill Detail dari Field Lain',
    desc: 'Otomatis mengisi kolom detail ketika user memilih nilai dari kolom Select/Popup. Bisa dari detail baris yang sama atau dari header field.',
    steps: [
      'Buka panel "Auto-Fill dari Field Lain" pada kolom target (yang ingin diisi otomatis)',
      'Pilih sumber dari dropdown:\n   • "Detail Field (Baris Sama)" — kolom select/popup di baris yang sama\n   • "Header Field" — field select/popup dari header form',
      'Isi "Property yang Diambil" — nama property dari object response API (cek endpoint API)',
      'Setelah generate, ketika user memilih item dari sumber, kolom target terisi otomatis',
    ],
    example: 'Contoh 1 — Detail ke Detail (baris sama):\nKolom "Produk" (select) → Kolom "Nama Produk" auto-fill dari property nama_comp\nUser pilih produk ID=5 → nama_comp otomatis terisi "Mie Goreng"\n\nContoh 2 — Header ke Detail:\nHeader "Supplier" (select) → Detail kolom "Alamat" auto-fill dari property alamat\nUser pilih supplier → semua baris detail kolom alamat terisi alamat supplier',
    tips: [
      'Property umum dari API: nama_comp, alamat, kode, telp, email, no_rekening, npwp',
      'Satu field sumber bisa auto-fill ke banyak field target sekaligus',
      'Header → Detail: ketika header berubah, SEMUA baris detail akan terupdate',
      'Detail → Detail: hanya baris yang bersangkutan yang terupdate',
    ],
  },
}

const isMultiSelect = computed(() => props.detail.mode !== 'add_to_list')

// ── URL ↔ Params sync helpers (like Postman) ────────────────────────
function parseUrlParams(url) {
  const idx = url.indexOf('?')
  if (idx === -1) return []
  const qs = url.slice(idx + 1)
  if (!qs) return []
  return qs.split('&').filter(Boolean).map(pair => {
    const eqIdx = pair.indexOf('=')
    if (eqIdx === -1) return { key: pair, value: '' }
    return { key: pair.slice(0, eqIdx), value: decodeURIComponent(pair.slice(eqIdx + 1)) }
  })
}

function getBaseUrl(url) {
  const idx = url.indexOf('?')
  return idx === -1 ? url : url.slice(0, idx)
}

function buildFullUrl(base, params) {
  const valid = (params || []).filter(p => p.key)
  if (!valid.length) return base
  const qs = valid.map(p => `${p.key}=${encodeURIComponent(p.value || '')}`).join('&')
  return `${base}?${qs}`
}

// Prevent infinite sync loop
let _syncing = false

function update(key, value) {
  const updated = { ...props.detail, [key]: value }

  // Auto-derive foreignKey & foreignDisplay from apiUrl when user types apiUrl
  if (key === 'apiUrl' && value) {
    const base = getBaseUrl(value)
    const match = base.match(/\/([^/?]+)$/)
    if (match) {
      const tableName = match[1] // e.g. "m_role"
      if (!props.detail.foreignKey) updated.foreignKey = tableName + '_id'
      if (!props.detail.foreignDisplay) updated.foreignDisplay = tableName
    }

    // URL → Params sync: extract query params from URL
    if (!_syncing) {
      _syncing = true
      const extracted = parseUrlParams(value)
      updated.apiParams = extracted.length ? extracted : (props.detail.apiParams || [])
      updated.apiUrl = value // keep full URL as-is while user types
      _syncing = false
    }
  }

  // Params → URL sync: rebuild URL query string when params change
  if (key === 'apiParams' && !_syncing) {
    _syncing = true
    const base = getBaseUrl(props.detail.apiUrl || '')
    updated.apiUrl = buildFullUrl(base, value)
    _syncing = false
  }

  emit('update:detail', updated)
}

// ── Computed: display base URL (without query params) for the URL input ──
const displayApiUrl = computed(() => props.detail.apiUrl || '')
const detailSearchKeys = computed(() => {
  const raw = props.detail.searchKey
  if (Array.isArray(raw)) return raw.length ? raw : ['']
  if (typeof raw === 'string' && raw.trim()) {
    const parts = raw.split(',').map(key => key.trim()).filter(Boolean)
    return parts.length ? parts : ['']
  }
  return ['']
})

// ── API Params helpers ────────────────────────────────────────────────
function updateApiParam(index, prop, val) {
  const arr = [...(props.detail.apiParams || [])]
  arr[index] = { ...arr[index], [prop]: val }
  update('apiParams', arr)
}
function removeApiParam(index) {
  const arr = [...(props.detail.apiParams || [])]
  arr.splice(index, 1)
  update('apiParams', arr)
}
function addApiParam() {
  update('apiParams', [...(props.detail.apiParams || []), { key: '', value: '' }])
}

function updateSearchKey(index, value) {
  const arr = [...detailSearchKeys.value]
  arr[index] = value
  update('searchKey', arr)
}

function removeSearchKey(index) {
  const arr = [...detailSearchKeys.value]
  arr.splice(index, 1)
  update('searchKey', arr.length ? arr : [''])
}

function addSearchKey() {
  update('searchKey', [...detailSearchKeys.value, ''])
}

function reloadApiParams() {
  const url = props.detail.apiUrl || ''
  const extracted = parseUrlParams(url)
  _syncing = true
  emit('update:detail', { ...props.detail, apiParams: extracted.length ? extracted : [] })
  _syncing = false
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

// ── Drag-drop reorder ─────────────────────────────────────────────────────
const draggedFieldIndex = ref(null)
function onFieldDragStart(e, i) {
  draggedFieldIndex.value = i
  e.dataTransfer.effectAllowed = 'move'
}
function onFieldDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
}
function onFieldDrop(targetIndex) {
  const from = draggedFieldIndex.value
  if (from === null || from === targetIndex) { draggedFieldIndex.value = null; return }
  const arr = [...(props.detail.detailFields || [])]
  const moved = arr.splice(from, 1)[0]
  arr.splice(targetIndex, 0, moved)
  update('detailFields', arr)
  // reset collapsed index mapping (re-keyed by position)
  collapsedFields.value = {}
  draggedFieldIndex.value = null
}

// ── Collapse/expand per card ───────────────────────────────────────────────
const collapsedFields = ref({})
function toggleFieldCollapse(i) {
  collapsedFields.value = { ...collapsedFields.value, [i]: !collapsedFields.value[i] }
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

// ── Detail field API params helpers (for select/popup) ──────────────
function addDetailApiParam(fieldIndex) {
  const arr = [...(props.detail.detailFields || [])]
  const field = { ...arr[fieldIndex] }
  field.apiParams = [...(field.apiParams || []), { key: '', value: '' }]
  arr[fieldIndex] = field
  update('detailFields', arr)
}
function removeDetailApiParam(fieldIndex, paramIndex) {
  const arr = [...(props.detail.detailFields || [])]
  const field = { ...arr[fieldIndex] }
  const params = [...(field.apiParams || [])]
  params.splice(paramIndex, 1)
  field.apiParams = params
  arr[fieldIndex] = field
  update('detailFields', arr)
}
function updateDetailApiParam(fieldIndex, paramIndex, prop, val) {
  const arr = [...(props.detail.detailFields || [])]
  const field = { ...arr[fieldIndex] }
  const params = [...(field.apiParams || [])]
  params[paramIndex] = { ...params[paramIndex], [prop]: val }
  field.apiParams = params
  arr[fieldIndex] = field
  update('detailFields', arr)
}

// ── Detail field popup columns helpers ──────────────────────────────
function addDetailPopupColumn(fieldIndex) {
  const arr = [...(props.detail.detailFields || [])]
  const field = { ...arr[fieldIndex] }
  field.popupColumns = [...(field.popupColumns || []), { field: '', headerName: '', width: '' }]
  arr[fieldIndex] = field
  update('detailFields', arr)
}
function removeDetailPopupColumn(fieldIndex, colIndex) {
  const arr = [...(props.detail.detailFields || [])]
  const field = { ...arr[fieldIndex] }
  const cols = [...(field.popupColumns || [])]
  cols.splice(colIndex, 1)
  field.popupColumns = cols
  arr[fieldIndex] = field
  update('detailFields', arr)
}
function updateDetailPopupColumn(fieldIndex, colIndex, prop, val) {
  const arr = [...(props.detail.detailFields || [])]
  const field = { ...arr[fieldIndex] }
  const cols = [...(field.popupColumns || [])]
  cols[colIndex] = { ...cols[colIndex], [prop]: val }
  field.popupColumns = cols
  arr[fieldIndex] = field
  update('detailFields', arr)
}

// ── Detail field formula helpers ────────────────────────────────────────
function getDetailFormulaTokens(fieldIndex) {
  const raw = (props.detail.detailFields || [])[fieldIndex]?.computedFormula
  return Array.isArray(raw) ? raw : []
}
function setDetailFormulaTokens(fieldIndex, tokens) {
  updateDetailField(fieldIndex, 'computedFormula', [...tokens])
}
function addDetailFormulaField(fieldIndex, fieldKey) {
  if (!fieldKey) return
  const tokens = getDetailFormulaTokens(fieldIndex)
  tokens.push({ type: 'field', value: fieldKey })
  setDetailFormulaTokens(fieldIndex, tokens)
}
function addDetailFormulaOp(fieldIndex, op) {
  const tokens = getDetailFormulaTokens(fieldIndex)
  tokens.push({ type: 'op', value: op })
  setDetailFormulaTokens(fieldIndex, tokens)
}
function addDetailFormulaNumber(fieldIndex, num) {
  if (!num?.trim() || isNaN(Number(num))) return
  const tokens = getDetailFormulaTokens(fieldIndex)
  tokens.push({ type: 'number', value: num.trim() })
  setDetailFormulaTokens(fieldIndex, tokens)
}
function addDetailFormulaParen(fieldIndex, p) {
  const tokens = getDetailFormulaTokens(fieldIndex)
  tokens.push({ type: 'paren', value: p })
  setDetailFormulaTokens(fieldIndex, tokens)
}
function removeDetailFormulaToken(fieldIndex, tokenIndex) {
  const tokens = getDetailFormulaTokens(fieldIndex)
  tokens.splice(tokenIndex, 1)
  setDetailFormulaTokens(fieldIndex, tokens)
}
function clearDetailFormula(fieldIndex) {
  setDetailFormulaTokens(fieldIndex, [])
}
function detailFormulaPreview(tokens) {
  if (!tokens?.length) return ''
  return tokens.map(t => {
    if (t.type === 'op') return t.value === '*' ? '×' : t.value === '/' ? '÷' : t.value
    return t.value
  }).join(' ')
}

// Available detail fields for formula (exclude current field)
function getFormulaAvailableDetailFields(fieldIndex) {
  const currentKey = (props.detail.detailFields || [])[fieldIndex]?.key
  return (props.detail.detailFields || []).filter((df, i) =>
    df.key && df.key !== currentKey && i !== fieldIndex
  )
}

// ── Detail field formula templates ──────────────────────────────────────
const DETAIL_FORMULA_TEMPLATES = [
  { id: 'kali', label: 'A × B', icon: '✖️', cat: 'Dasar', fields: 2,
    desc: 'A × B', hint: 'Misal: Qty × Harga Satuan',
    build: (a, b) => [
      { type: 'field', value: a }, { type: 'op', value: '*' }, { type: 'field', value: b },
    ],
  },
  { id: 'tambah', label: 'A + B', icon: '➕', cat: 'Dasar', fields: 2,
    desc: 'A + B', hint: 'Penjumlahan dua field',
    build: (a, b) => [
      { type: 'field', value: a }, { type: 'op', value: '+' }, { type: 'field', value: b },
    ],
  },
  { id: 'kurang', label: 'A − B', icon: '➖', cat: 'Dasar', fields: 2,
    desc: 'A - B', hint: 'Pengurangan dua field',
    build: (a, b) => [
      { type: 'field', value: a }, { type: 'op', value: '-' }, { type: 'field', value: b },
    ],
  },
  { id: 'diskon_persen', label: 'Diskon %', icon: '🏷️', cat: 'Persentase', fields: 2,
    desc: 'A - (A × B ÷ 100)', hint: 'Harga setelah diskon persen',
    labelA: 'Harga', labelB: 'Diskon (%)',
    build: (a, b) => [
      { type: 'field', value: a }, { type: 'op', value: '-' }, { type: 'paren', value: '(' },
      { type: 'field', value: a }, { type: 'op', value: '*' }, { type: 'field', value: b },
      { type: 'op', value: '/' }, { type: 'number', value: '100' }, { type: 'paren', value: ')' },
    ],
  },
  { id: 'subtotal', label: 'Qty × Harga − Diskon', icon: '🛒', cat: 'Transaksi', fields: 3,
    desc: 'A × B - C', hint: 'Subtotal = Qty × Harga − Diskon',
    labelA: 'Qty', labelB: 'Harga Satuan', labelC: 'Diskon (Rp)',
    build: (a, b, c) => [
      { type: 'field', value: a }, { type: 'op', value: '*' }, { type: 'field', value: b },
      { type: 'op', value: '-' }, { type: 'field', value: c },
    ],
  },
  { id: 'subtotal_disc_persen', label: 'Qty × Harga × (1 − Disc%)', icon: '🧮', cat: 'Transaksi', fields: 3,
    desc: 'A × B × (1 - C/100)', hint: 'Subtotal setelah diskon persen',
    labelA: 'Qty', labelB: 'Harga Satuan', labelC: 'Diskon (%)',
    build: (a, b, c) => [
      { type: 'field', value: a }, { type: 'op', value: '*' }, { type: 'field', value: b },
      { type: 'op', value: '*' }, { type: 'paren', value: '(' }, { type: 'number', value: '1' },
      { type: 'op', value: '-' }, { type: 'field', value: c },
      { type: 'op', value: '/' }, { type: 'number', value: '100' }, { type: 'paren', value: ')' },
    ],
  },
]

const detailFormulaState = ref({})
function getDetailTplState(fieldIndex) {
  if (!detailFormulaState.value[fieldIndex]) {
    detailFormulaState.value[fieldIndex] = { selectedTemplate: '', tplA: '', tplB: '', tplC: '', numberInput: '', manualField: '' }
  }
  return detailFormulaState.value[fieldIndex]
}
function applyDetailTemplate(fieldIndex) {
  const st = getDetailTplState(fieldIndex)
  const tpl = DETAIL_FORMULA_TEMPLATES.find(t => t.id === st.selectedTemplate)
  if (!tpl) return
  const tokens = tpl.build(st.tplA, st.tplB, st.tplC)
  setDetailFormulaTokens(fieldIndex, tokens)
  st.selectedTemplate = ''
  st.tplA = ''
  st.tplB = ''
  st.tplC = ''
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

    <!-- ════════════════════════════════════════════════════════════════ -->
    <!-- DETAIL OPTIONS (shared between both modes) -->
    <!-- ════════════════════════════════════════════════════════════════ -->
    <div class="space-y-3 border border-border rounded-lg p-3 bg-muted/20">
      <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Opsi Detail</p>

      <!-- Min / Max Rows -->
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block mb-0.5 text-xs text-muted-foreground">Min Baris</label>
          <input type="number" min="0" :value="detail.minRows || 0" placeholder="0 = tidak ada" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary" @input="update('minRows', Number($event.target.value) || 0)" />
          <p class="text-[9px] text-muted-foreground/50 mt-0.5">0 = tidak wajib isi</p>
        </div>
        <div>
          <label class="block mb-0.5 text-xs text-muted-foreground">Max Baris</label>
          <input type="number" min="0" :value="detail.maxRows || 0" placeholder="0 = unlimited" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary" @input="update('maxRows', Number($event.target.value) || 0)" />
          <p class="text-[9px] text-muted-foreground/50 mt-0.5">0 = tak terbatas</p>
        </div>
      </div>

      <!-- Toggle: Duplicate Row -->
      <div class="flex items-center justify-between gap-2">
        <div>
          <p class="text-xs font-medium text-foreground">Duplikat Baris</p>
          <p class="text-[9px] text-muted-foreground/50">Tombol salin baris di tabel detail</p>
        </div>
        <button type="button" class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors" :class="detail.enableDuplicate ? 'bg-primary' : 'bg-muted-foreground/30'" @click="update('enableDuplicate', !detail.enableDuplicate)">
          <span class="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform" :class="detail.enableDuplicate ? 'translate-x-[18px]' : 'translate-x-0.5'" />
        </button>
      </div>

      <!-- Toggle: Reorder Row -->
      <div class="flex items-center justify-between gap-2">
        <div>
          <p class="text-xs font-medium text-foreground">Urut Baris (↑↓)</p>
          <p class="text-[9px] text-muted-foreground/50">Tombol naik/turun untuk urut baris</p>
        </div>
        <button type="button" class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors" :class="detail.enableReorder ? 'bg-primary' : 'bg-muted-foreground/30'" @click="update('enableReorder', !detail.enableReorder)">
          <span class="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform" :class="detail.enableReorder ? 'translate-x-[18px]' : 'translate-x-0.5'" />
        </button>
      </div>

      <!-- Toggle: Import from Clipboard -->
      <div class="flex items-center justify-between gap-2">
        <div>
          <p class="text-xs font-medium text-foreground">Import Clipboard</p>
          <p class="text-[9px] text-muted-foreground/50">Paste dari Excel/spreadsheet (tab-separated)</p>
        </div>
        <button type="button" class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors" :class="detail.enableImport ? 'bg-primary' : 'bg-muted-foreground/30'" @click="update('enableImport', !detail.enableImport)">
          <span class="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform" :class="detail.enableImport ? 'translate-x-[18px]' : 'translate-x-0.5'" />
        </button>
      </div>
    </div>

    <hr class="border-border" />

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
        <div class="flex items-center gap-2 mb-1">
          <label class="font-medium text-muted-foreground">API Endpoint (Multi-Select)</label>
          <button type="button" title="Reload API Params dari URL" class="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors px-1.5 py-0.5 rounded border border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10" @click="reloadApiParams">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Reload Params
          </button>
        </div>
        <input type="text" :value="displayApiUrl" placeholder="/api/dynamic/m_menu?join=true&include=m_item" class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm" @input="update('apiUrl', $event.target.value)" />
        <p class="text-xs text-muted-foreground/70 mt-0.5">URL dan Params otomatis sinkron (seperti Postman)</p>
      </div>

      <!-- API Params -->
      <div>
        <label class="block mb-1 font-medium text-muted-foreground">API Params</label>
        <p class="text-xs text-muted-foreground/70 mb-2">Edit param di sini atau langsung di URL — otomatis sinkron</p>
        <div class="flex flex-col gap-2">
          <div v-for="(p, i) in (detail.apiParams || [])" :key="i" class="flex gap-2 items-center">
            <input type="text" :value="p.key" placeholder="Key (e.g. join)" class="flex-1 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary" @input="updateApiParam(i, 'key', $event.target.value)" />
            <input type="text" :value="p.value" placeholder="Value (e.g. true)" class="flex-1 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary" @input="updateApiParam(i, 'value', $event.target.value)" />
            <button class="text-muted-foreground hover:text-destructive transition-colors p-1" @click="removeApiParam(i)">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
          <button class="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors py-1" @click="addApiParam">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Param
          </button>
        </div>
      </div>

      <!-- Search Key, Display Key, Unique Key -->
      <div class="grid grid-cols-2 gap-2 items-start">
        <div>
          <label class="block mb-1 font-medium text-muted-foreground text-xs">Search Key</label>
          <div class="flex flex-col gap-2">
            <div v-for="(searchKey, i) in detailSearchKeys" :key="`search-key-${i}`" class="flex gap-2 items-center">
              <input type="text" :value="searchKey" placeholder="m_item.nama_item" class="flex-1 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary" @input="updateSearchKey(i, $event.target.value)" />
              <button type="button" class="text-muted-foreground hover:text-destructive transition-colors p-1" :disabled="detailSearchKeys.length === 1" @click="removeSearchKey(i)">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
            <button type="button" class="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors py-1" @click="addSearchKey">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tambah Search Key
            </button>
          </div>
        </div>
        <div>
          <label class="block mb-1 font-medium text-muted-foreground text-xs">Anti Duplikat</label>
          <div class="flex items-center gap-2 mt-1">
            <button type="button" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" :class="detail.antiDuplicate ? 'bg-primary' : 'bg-muted-foreground/30'" @click="update('antiDuplicate', !detail.antiDuplicate)">
              <span class="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform" :class="detail.antiDuplicate ? 'translate-x-6' : 'translate-x-1'" />
            </button>
            <span class="text-sm" :class="detail.antiDuplicate ? 'text-primary font-medium' : 'text-muted-foreground'">{{ detail.antiDuplicate ? 'Aktif' : 'Tidak Aktif' }}</span>
          </div>
          <p class="text-xs text-muted-foreground/70 mt-1">Jika aktif, item yang sudah dipilih tidak bisa dipilih lagi (mencegah item terpilih dobel).</p>
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
        <div
          v-for="(df, i) in (detail.detailFields || [])"
          :key="i"
          class="border border-border rounded-lg bg-muted/30 transition-opacity"
          :class="{ 'opacity-40': draggedFieldIndex === i }"
          draggable="true"
          @dragstart="onFieldDragStart($event, i)"
          @dragover="onFieldDragOver"
          @drop="onFieldDrop(i)"
          @dragend="draggedFieldIndex = null"
        >
          <!-- Card header: drag handle + key/label + collapse/actions -->
          <div class="flex gap-2 items-center px-3 py-2">
            <GripVertical class="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab active:cursor-grabbing" />
            <input type="text" :value="df.key" placeholder="Key (e.g. qty)" class="flex-1 min-w-0 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'key', $event.target.value)" />
            <input type="text" :value="df.label" placeholder="Label" class="flex-1 min-w-0 rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'label', $event.target.value)" />
            <button class="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0" :title="collapsedFields[i] ? 'Expand' : 'Collapse'" @click="toggleFieldCollapse(i)">
              <ChevronRight v-if="collapsedFields[i]" class="w-4 h-4" />
              <ChevronDown v-else class="w-4 h-4" />
            </button>
            <button class="text-muted-foreground hover:text-primary transition-colors p-1 shrink-0" title="Duplikat" @click="duplicateDetailField(i)">
              <Copy class="w-4 h-4" />
            </button>
            <button class="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0" title="Hapus" @click="removeDetailField(i)">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>

          <!-- Collapsible body -->
          <div v-show="!collapsedFields[i]" class="px-3 pb-3 space-y-2">

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
              <!-- API Params -->
              <div>
                <label class="block mb-0.5 text-xs text-muted-foreground">API Params</label>
                <div class="flex flex-col gap-1.5">
                  <div v-for="(param, pi) in (Array.isArray(df.apiParams) ? df.apiParams : [])" :key="pi" class="flex gap-1.5 items-center">
                    <input type="text" :value="param.key" placeholder="Param" class="flex-1 min-w-0 rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailApiParam(i, pi, 'key', $event.target.value)" />
                    <span class="text-muted-foreground text-[10px]">=</span>
                    <input type="text" :value="param.value" placeholder="Value" class="flex-1 min-w-0 rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailApiParam(i, pi, 'value', $event.target.value)" />
                    <button class="text-muted-foreground hover:text-destructive transition-colors p-0.5 shrink-0" @click="removeDetailApiParam(i, pi)">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <button class="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors py-0.5" @click="addDetailApiParam(i)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Tambah Param
                  </button>
                </div>
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

          <!-- PopUp: apiUrl, apiParams, columns, searchFields, dialogTitle, displayField, valueField -->
          <div v-else-if="df.type === 'popup'" class="space-y-2">
            <div>
              <label class="block mb-0.5 text-xs text-muted-foreground">API URL</label>
              <input type="text" :value="df.apiUrl || ''" placeholder="/api/dynamic/m_xxx" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'apiUrl', $event.target.value)" />
            </div>
            <!-- API Params -->
            <div>
              <label class="block mb-0.5 text-xs text-muted-foreground">API Params</label>
              <div class="flex flex-col gap-1.5">
                <div v-for="(param, pi) in (Array.isArray(df.apiParams) ? df.apiParams : [])" :key="pi" class="flex gap-1.5 items-center">
                  <input type="text" :value="param.key" placeholder="Param" class="flex-1 min-w-0 rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailApiParam(i, pi, 'key', $event.target.value)" />
                  <span class="text-muted-foreground text-[10px]">=</span>
                  <input type="text" :value="param.value" placeholder="Value" class="flex-1 min-w-0 rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailApiParam(i, pi, 'value', $event.target.value)" />
                  <button class="text-muted-foreground hover:text-destructive transition-colors p-0.5 shrink-0" @click="removeDetailApiParam(i, pi)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <button class="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors py-0.5" @click="addDetailApiParam(i)">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Tambah Param
                </button>
              </div>
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
            <!-- Popup Columns -->
            <div>
              <label class="block mb-0.5 text-xs text-muted-foreground">Popup Columns</label>
              <p class="text-[10px] text-muted-foreground/60 mb-1">Kolom yang ditampilkan di popup dialog</p>
              <div class="flex flex-col gap-1.5">
                <div v-for="(col, ci) in (Array.isArray(df.popupColumns) ? df.popupColumns : [])" :key="ci" class="flex gap-1.5 items-center">
                  <input type="text" :value="col.field" placeholder="Key" class="flex-1 min-w-0 rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailPopupColumn(i, ci, 'field', $event.target.value)" />
                  <input type="text" :value="col.headerName" placeholder="Label" class="flex-1 min-w-0 rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailPopupColumn(i, ci, 'headerName', $event.target.value)" />
                  <div class="relative w-14 shrink-0">
                    <input type="number" min="1" max="100" :value="col.width ? parseInt(col.width) : null" placeholder="%" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 pr-4 text-xs focus:border-primary focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" @input="updateDetailPopupColumn(i, ci, 'width', $event.target.value ? $event.target.value + '%' : '')" />
                    <span class="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">%</span>
                  </div>
                  <button class="text-muted-foreground hover:text-destructive transition-colors p-0.5 shrink-0" @click="removeDetailPopupColumn(i, ci)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <button class="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors py-0.5" @click="addDetailPopupColumn(i)">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Tambah Kolom
                </button>
              </div>
            </div>
            <!-- Search Fields -->
            <div>
              <label class="block mb-0.5 text-xs text-muted-foreground">Search Fields</label>
              <input type="text" :value="df.searchFields || ''" placeholder="name,kode (comma-separated)" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'searchFields', $event.target.value)" />
            </div>
            <!-- Dialog Title -->
            <div>
              <label class="block mb-0.5 text-xs text-muted-foreground">Dialog Title</label>
              <input type="text" :value="df.dialogTitle || ''" placeholder="Pilih Item" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'dialogTitle', $event.target.value)" />
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

          <!-- Currency: default value, prefix, allowDecimal, decimalPlaces -->
          <div v-else-if="df.type === 'currency'" class="space-y-2">
            <div class="flex gap-2">
              <div class="flex-1">
                <label class="block mb-0.5 text-xs text-muted-foreground">Default Value</label>
                <input type="number" :value="df.default || 0" placeholder="0" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'default', Number($event.target.value))" />
              </div>
              <div class="flex-1">
                <label class="block mb-0.5 text-xs text-muted-foreground">Prefix</label>
                <input type="text" :value="df.currencyPrefix || 'Rp'" placeholder="Rp" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'currencyPrefix', $event.target.value)" />
              </div>
            </div>
            <div class="flex gap-2">
              <div class="flex-1">
                <label class="block mb-0.5 text-xs text-muted-foreground">Allow Decimal</label>
                <div class="flex rounded border border-border overflow-hidden h-[26px]">
                  <button :class="['flex-1 text-[11px] transition-colors', df.allowDecimal !== false ? 'bg-primary text-primary-foreground font-medium' : 'bg-muted text-muted-foreground hover:text-foreground']" @click="updateDetailField(i, 'allowDecimal', true)">Ya</button>
                  <button :class="['flex-1 text-[11px] transition-colors', df.allowDecimal === false ? 'bg-primary text-primary-foreground font-medium' : 'bg-muted text-muted-foreground hover:text-foreground']" @click="updateDetailField(i, 'allowDecimal', false)">Tidak</button>
                </div>
              </div>
              <div v-if="df.allowDecimal !== false" class="flex-1">
                <label class="block mb-0.5 text-xs text-muted-foreground">Digit Desimal</label>
                <input type="number" min="0" max="6" :value="df.decimalPlaces ?? 2" placeholder="2" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'decimalPlaces', Math.min(6, Math.max(0, Number($event.target.value || 0))))" />
              </div>
            </div>
          </div>

          <!-- Text/Number/FieldNumber: default value -->
          <div v-else-if="['text', 'number', 'fieldnumber', 'fieldnumber_decimal', 'textarea'].includes(df.type)" class="flex gap-2">
            <div class="flex-1">
              <label class="block mb-0.5 text-xs text-muted-foreground">Default Value</label>
              <input :type="['number', 'fieldnumber', 'fieldnumber_decimal'].includes(df.type) ? 'number' : 'text'" :value="df.default || ''" :placeholder="['number', 'fieldnumber', 'fieldnumber_decimal'].includes(df.type) ? '0' : ''" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'default', ['number', 'fieldnumber', 'fieldnumber_decimal'].includes(df.type) ? Number($event.target.value) : $event.target.value)" />
            </div>
            <div v-if="df.type === 'fieldnumber_decimal'" class="flex-1">
              <label class="block mb-0.5 text-xs text-muted-foreground">Digit Desimal</label>
              <input type="number" min="0" max="6" :value="df.decimalPlaces ?? 2" placeholder="2" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'decimalPlaces', Math.min(6, Math.max(0, Number($event.target.value || 0))))" />
            </div>
          </div>

          <!-- Slider: default, min, max, step, unit -->
          <div v-else-if="df.type === 'slider'" class="space-y-2">
            <div class="flex gap-2">
              <div class="flex-1">
                <label class="block mb-0.5 text-xs text-muted-foreground">Default</label>
                <input type="number" :value="df.default || 0" placeholder="0" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'default', Number($event.target.value))" />
              </div>
              <div class="flex-1">
                <label class="block mb-0.5 text-xs text-muted-foreground">Unit</label>
                <input type="text" :value="df.sliderUnit || ''" placeholder="%, kg, dll" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'sliderUnit', $event.target.value)" />
              </div>
            </div>
            <div class="flex gap-2">
              <div class="flex-1">
                <label class="block mb-0.5 text-xs text-muted-foreground">Min</label>
                <input type="number" :value="df.sliderMin || 0" placeholder="0" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'sliderMin', Number($event.target.value))" />
              </div>
              <div class="flex-1">
                <label class="block mb-0.5 text-xs text-muted-foreground">Max</label>
                <input type="number" :value="df.sliderMax || 100" placeholder="100" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'sliderMax', Number($event.target.value))" />
              </div>
              <div class="flex-1">
                <label class="block mb-0.5 text-xs text-muted-foreground">Step</label>
                <input type="number" :value="df.sliderStep || 1" placeholder="1" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'sliderStep', Number($event.target.value))" />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 border-t border-border/50 pt-2">
            <div>
              <label class="block mb-0.5 text-xs text-muted-foreground">Required</label>
              <div class="flex rounded border border-border overflow-hidden h-[26px]">
                <button
                  class="flex-1 text-xs transition-colors"
                  :class="df.required ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
                  @click="updateDetailField(i, 'required', true)"
                >Ya</button>
                <button
                  class="flex-1 text-xs transition-colors border-l border-border"
                  :class="!df.required ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
                  @click="updateDetailField(i, 'required', false)"
                >Tidak</button>
              </div>
            </div>
            <div>
              <label class="block mb-0.5 text-xs text-muted-foreground">Readonly</label>
              <div class="flex rounded border border-border overflow-hidden h-[26px]">
                <button
                  class="flex-1 text-xs transition-colors"
                  :class="df.readonly ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
                  @click="updateDetailField(i, 'readonly', true)"
                >Ya</button>
                <button
                  class="flex-1 text-xs transition-colors border-l border-border"
                  :class="!df.readonly ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
                  @click="updateDetailField(i, 'readonly', false)"
                >Tidak</button>
              </div>
              <p class="text-[9px] text-muted-foreground/50 mt-0.5">Formula computed akan tetap readonly otomatis.</p>
            </div>
            <div>
              <label class="block mb-0.5 text-xs text-muted-foreground">Lebar Kolom</label>
              <input
                type="text"
                :value="df.width || ''"
                :placeholder="getDetailFieldDefaultWidth(df.type)"
                class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary"
                @input="updateDetailField(i, 'width', $event.target.value)"
              />
              <p class="text-[9px] text-muted-foreground/50 mt-0.5">Kosong = default {{ getDetailFieldDefaultWidth(df.type) }}</p>
            </div>
          </div>

          <!-- ═══ Upload/Multi-Upload config ═══ -->
          <div v-if="df.type === 'upload' || df.type === 'multi_upload'" class="border-t border-border/50 pt-2 space-y-2">
            <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Pengaturan Upload</p>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block mb-0.5 text-xs text-muted-foreground">Accept (MIME)</label>
                <input type="text" :value="df.uploadAccept || 'image/*'" placeholder="image/*" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'uploadAccept', $event.target.value)" />
              </div>
              <div>
                <label class="block mb-0.5 text-xs text-muted-foreground">Max Size (MB)</label>
                <input type="number" min="1" :value="df.maxSizeMB || 5" placeholder="5" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'maxSizeMB', Number($event.target.value) || 5)" />
              </div>
            </div>
            <div v-if="df.type === 'multi_upload'">
              <label class="block mb-0.5 text-xs text-muted-foreground">Max Gambar</label>
              <input type="number" min="1" :value="df.maxImages || 10" placeholder="10" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary" @input="updateDetailField(i, 'maxImages', Number($event.target.value) || 10)" />
            </div>
          </div>

          <!-- ═══ DependsOn (cascading) ═══ -->
          <div v-if="['select', 'popup'].includes(df.type) && (df.sourceType || 'api') === 'api'" class="border-t border-border/50 pt-2 space-y-1.5">
            <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Cascading (DependsOn)</p>
            <div>
              <label class="block mb-0.5 text-[10px] text-muted-foreground">Field Sumber (baris sama)</label>
              <select
                :value="df.dependsOn || ''"
                class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-[10px]"
                @change="updateDetailField(i, 'dependsOn', $event.target.value)"
              >
                <option value="">-- Tidak ada --</option>
                <option
                  v-for="odf in (detail.detailFields || []).filter(f => f.key && f.key !== df.key && ['select', 'popup', 'text', 'number', 'fieldnumber', 'fieldnumber_decimal'].includes(f.type))"
                  :key="odf.key"
                  :value="odf.key"
                >{{ odf.label || odf.key }}</option>
              </select>
            </div>
            <div v-if="df.dependsOn">
              <label class="block mb-0.5 text-[10px] text-muted-foreground">Nama Param API</label>
              <input type="text" :value="df.dependsOnParam || ''" :placeholder="df.dependsOn + '_id'" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-[10px]" @input="updateDetailField(i, 'dependsOnParam', $event.target.value)" />
              <p class="text-[8px] text-muted-foreground/50 mt-0.5">Param query yang dikirim ke API (misal: m_kategori_id)</p>
            </div>
          </div>

          <!-- ═══ VisibleWhen / ReadonlyWhen (conditional) ═══ -->
          <div class="border-t border-border/50 pt-2 space-y-2">
            <details class="group">
              <summary class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none">
                <span>Visible / Readonly Kondisional</span>
                <span v-if="df.visibleWhen?.field || df.readonlyWhen?.field" class="text-[9px] px-1 py-0.5 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 rounded ml-1">Aktif</span>
              </summary>
              <div class="mt-1.5 space-y-2">
                <!-- visibleWhen -->
                <div class="bg-muted/30 rounded p-2 space-y-1">
                  <p class="text-[9px] text-muted-foreground/60 font-semibold">Tampilkan hanya jika:</p>
                  <div class="grid grid-cols-2 gap-1.5">
                    <select
                      :value="df.visibleWhen?.field || ''"
                      class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-[10px]"
                      @change="updateDetailField(i, 'visibleWhen', { field: $event.target.value, value: df.visibleWhen?.value || '' })"
                    >
                      <option value="">-- Selalu tampil --</option>
                      <option
                        v-for="odf in (detail.detailFields || []).filter(f => f.key && f.key !== df.key)"
                        :key="odf.key"
                        :value="odf.key"
                      >{{ odf.label || odf.key }}</option>
                    </select>
                    <input v-if="df.visibleWhen?.field" type="text" :value="df.visibleWhen?.value || ''" placeholder="= nilai" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-[10px]" @input="updateDetailField(i, 'visibleWhen', { ...df.visibleWhen, value: $event.target.value })" />
                  </div>
                </div>
                <!-- readonlyWhen -->
                <div class="bg-muted/30 rounded p-2 space-y-1">
                  <p class="text-[9px] text-muted-foreground/60 font-semibold">Readonly jika:</p>
                  <div class="grid grid-cols-2 gap-1.5">
                    <select
                      :value="df.readonlyWhen?.field || ''"
                      class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-[10px]"
                      @change="updateDetailField(i, 'readonlyWhen', { field: $event.target.value, value: df.readonlyWhen?.value || '' })"
                    >
                      <option value="">-- Tidak ada --</option>
                      <option
                        v-for="odf in (detail.detailFields || []).filter(f => f.key && f.key !== df.key)"
                        :key="odf.key"
                        :value="odf.key"
                      >{{ odf.label || odf.key }}</option>
                    </select>
                    <input v-if="df.readonlyWhen?.field" type="text" :value="df.readonlyWhen?.value || ''" placeholder="= nilai" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-[10px]" @input="updateDetailField(i, 'readonlyWhen', { ...df.readonlyWhen, value: $event.target.value })" />
                  </div>
                </div>
              </div>
            </details>
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

          <!-- ═══ Per-Row Formula (Computed) ═══ -->
          <div v-if="['number', 'fieldnumber', 'fieldnumber_decimal', 'currency', 'text', 'decimal'].includes(df.type)" class="border-t border-border/50 pt-2 space-y-2">
            <details class="group">
              <summary class="flex items-center gap-1.5 cursor-pointer select-none">
                <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Formula (Computed)</span>
                <button type="button" class="text-muted-foreground/40 hover:text-primary transition-colors" title="Bantuan Formula" @click.stop="detailHelp = 'formula'">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </button>
                <span v-if="getDetailFormulaTokens(i).length" class="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded font-mono">
                  = {{ detailFormulaPreview(getDetailFormulaTokens(i)) }}
                </span>
              </summary>
              <div class="mt-2 space-y-2">
                <!-- Quick Templates -->
                <div class="bg-muted/30 rounded-lg p-2 space-y-1.5 border border-border/50">
                  <p class="text-[9px] text-muted-foreground/50 font-semibold uppercase">Template</p>
                  <div v-for="cat in [...new Set(DETAIL_FORMULA_TEMPLATES.map(t => t.cat))]" :key="cat" class="space-y-0.5">
                    <p class="text-[9px] text-muted-foreground/40">{{ cat }}</p>
                    <div class="flex flex-wrap gap-1">
                      <button
                        v-for="tpl in DETAIL_FORMULA_TEMPLATES.filter(t => t.cat === cat)" :key="tpl.id" type="button"
                        class="px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors inline-flex items-center gap-0.5"
                        :class="getDetailTplState(i).selectedTemplate === tpl.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'"
                        :title="tpl.hint"
                        @click="const s = getDetailTplState(i); s.selectedTemplate = s.selectedTemplate === tpl.id ? '' : tpl.id; s.tplA = ''; s.tplB = ''; s.tplC = ''"
                      ><span>{{ tpl.icon }}</span> {{ tpl.label }}</button>
                    </div>
                  </div>

                  <!-- Template field pickers -->
                  <template v-if="getDetailTplState(i).selectedTemplate">
                    <div class="bg-background/60 rounded p-2 space-y-1.5 border border-border/30">
                      <p class="text-[9px] font-semibold text-foreground/80">{{ DETAIL_FORMULA_TEMPLATES.find(t => t.id === getDetailTplState(i).selectedTemplate)?.icon }} {{ DETAIL_FORMULA_TEMPLATES.find(t => t.id === getDetailTplState(i).selectedTemplate)?.label }}</p>
                      <p class="text-[9px] text-muted-foreground/50 italic">{{ DETAIL_FORMULA_TEMPLATES.find(t => t.id === getDetailTplState(i).selectedTemplate)?.hint }}</p>
                      <div class="space-y-1">
                        <select v-model="getDetailTplState(i).tplA" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs">
                          <option value="" disabled>{{ DETAIL_FORMULA_TEMPLATES.find(t => t.id === getDetailTplState(i).selectedTemplate)?.labelA || 'Field A' }}</option>
                          <option v-for="af in getFormulaAvailableDetailFields(i)" :key="af.key" :value="af.key">{{ af.label || af.key }}</option>
                        </select>
                        <select v-if="(DETAIL_FORMULA_TEMPLATES.find(t => t.id === getDetailTplState(i).selectedTemplate)?.fields || 0) >= 2" v-model="getDetailTplState(i).tplB" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs">
                          <option value="" disabled>{{ DETAIL_FORMULA_TEMPLATES.find(t => t.id === getDetailTplState(i).selectedTemplate)?.labelB || 'Field B' }}</option>
                          <option v-for="af in getFormulaAvailableDetailFields(i)" :key="af.key" :value="af.key">{{ af.label || af.key }}</option>
                        </select>
                        <select v-if="(DETAIL_FORMULA_TEMPLATES.find(t => t.id === getDetailTplState(i).selectedTemplate)?.fields || 0) >= 3" v-model="getDetailTplState(i).tplC" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs">
                          <option value="" disabled>{{ DETAIL_FORMULA_TEMPLATES.find(t => t.id === getDetailTplState(i).selectedTemplate)?.labelC || 'Field C' }}</option>
                          <option v-for="af in getFormulaAvailableDetailFields(i)" :key="af.key" :value="af.key">{{ af.label || af.key }}</option>
                        </select>
                      </div>
                      <button type="button"
                        :disabled="!getDetailTplState(i).tplA || ((DETAIL_FORMULA_TEMPLATES.find(t => t.id === getDetailTplState(i).selectedTemplate)?.fields || 0) >= 2 && !getDetailTplState(i).tplB) || ((DETAIL_FORMULA_TEMPLATES.find(t => t.id === getDetailTplState(i).selectedTemplate)?.fields || 0) >= 3 && !getDetailTplState(i).tplC)"
                        class="px-2.5 py-1 rounded text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                        @click="applyDetailTemplate(i)"
                      >Terapkan</button>
                    </div>
                  </template>
                </div>

                <!-- Token display -->
                <div class="min-h-[32px] rounded bg-muted/60 border border-border p-1.5 flex flex-wrap gap-1 items-center">
                  <template v-if="getDetailFormulaTokens(i).length">
                    <span v-for="(tok, ti) in getDetailFormulaTokens(i)" :key="ti"
                      class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
                      :class="{
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300': tok.type === 'field',
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-bold': tok.type === 'op',
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-mono': tok.type === 'number',
                        'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 font-bold': tok.type === 'paren',
                      }"
                    >
                      {{ tok.type === 'op' && tok.value === '*' ? '×' : tok.type === 'op' && tok.value === '/' ? '÷' : tok.value }}
                      <button type="button" class="ml-0.5 text-current opacity-50 hover:opacity-100 text-[8px] leading-none" @click="removeDetailFormulaToken(i, ti)">✕</button>
                    </span>
                  </template>
                  <span v-else class="text-[10px] text-muted-foreground/50 italic">Belum ada formula</span>
                </div>

                <!-- Manual builder -->
                <details class="group/manual">
                  <summary class="text-[9px] text-muted-foreground/50 cursor-pointer hover:text-muted-foreground select-none">▶ Bangun Manual</summary>
                  <div class="mt-1.5 space-y-1.5 pl-1 border-l-2 border-border/50 ml-0.5">
                    <div class="flex gap-1 items-center">
                      <select v-model="getDetailTplState(i).manualField" class="flex-1 rounded bg-muted border border-border text-foreground px-2 py-1 text-[10px]">
                        <option value="" disabled>+ Field...</option>
                        <option v-for="af in getFormulaAvailableDetailFields(i)" :key="af.key" :value="af.key">{{ af.label || af.key }}</option>
                      </select>
                      <button type="button" :disabled="!getDetailTplState(i).manualField" class="px-1.5 py-1 rounded text-[10px] bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40" @click="addDetailFormulaField(i, getDetailTplState(i).manualField); getDetailTplState(i).manualField = ''">+</button>
                    </div>
                    <div class="flex flex-wrap gap-1 items-center">
                      <button v-for="op in ['+', '-', '*', '/']" :key="op" type="button"
                        class="w-6 h-6 flex items-center justify-center rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-bold text-[10px] hover:bg-amber-200"
                        @click="addDetailFormulaOp(i, op)"
                      >{{ op === '*' ? '×' : op === '/' ? '÷' : op }}</button>
                      <button v-for="p in ['(', ')']" :key="p" type="button"
                        class="w-6 h-6 flex items-center justify-center rounded bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 font-bold text-[10px]"
                        @click="addDetailFormulaParen(i, p)"
                      >{{ p }}</button>
                    </div>
                    <div class="flex gap-1 items-center">
                      <input v-model="getDetailTplState(i).numberInput" type="text" inputmode="decimal" placeholder="Angka..." class="flex-1 rounded bg-muted border border-border text-foreground px-2 py-1 text-[10px] font-mono" @keydown.enter.prevent="addDetailFormulaNumber(i, getDetailTplState(i).numberInput); getDetailTplState(i).numberInput = ''" />
                      <button type="button" :disabled="!getDetailTplState(i).numberInput?.trim() || isNaN(Number(getDetailTplState(i).numberInput))" class="px-1.5 py-1 rounded text-[10px] bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40" @click="addDetailFormulaNumber(i, getDetailTplState(i).numberInput); getDetailTplState(i).numberInput = ''">+</button>
                    </div>
                  </div>
                </details>

                <button v-if="getDetailFormulaTokens(i).length" type="button" class="text-[9px] text-red-500 hover:text-red-400 underline" @click="clearDetailFormula(i)">Hapus Formula</button>
              </div>
            </details>
            <p class="text-[9px] text-muted-foreground/50">Auto-hitung per baris. Field ini otomatis readonly.</p>
          </div>

          <!-- ═══ Default Value From Another Field (Auto-Fill) ═══ -->
          <div class="border-t border-border/50 pt-2 space-y-2">
            <details class="group">
              <summary class="flex items-center gap-1.5 cursor-pointer select-none">
                <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Auto-Fill dari Field Lain</span>
                <button type="button" class="text-muted-foreground/40 hover:text-primary transition-colors" title="Bantuan Auto-Fill" @click.stop="detailHelp = 'autoFill'">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </button>
                <span v-if="df.defaultValueFrom?.field" class="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded font-mono">
                  ← {{ df.defaultValueFrom.field }}.{{ df.defaultValueFrom.property }}
                </span>
              </summary>
              <div class="mt-2 space-y-1.5">
                <div>
                  <label class="block mb-0.5 text-[10px] text-muted-foreground">Field Sumber (Select/Popup)</label>
                  <select
                    :value="df.defaultValueFrom?.field || ''"
                    class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-[10px]"
                    @change="updateDetailField(i, 'defaultValueFrom', { field: $event.target.value, property: '' })"
                  >
                    <option value="">-- Tidak ada --</option>
                    <optgroup v-if="(detail.detailFields || []).some(f => f.key && f.key !== df.key && ['select', 'popup'].includes(f.type))" label="Detail Field (Baris Sama)">
                      <option
                        v-for="odf in (detail.detailFields || []).filter(f => f.key && f.key !== df.key && ['select', 'popup'].includes(f.type))"
                        :key="'d-' + odf.key"
                        :value="odf.key"
                      >{{ odf.label || odf.key }} ({{ odf.type }})</option>
                    </optgroup>
                    <optgroup v-if="isMultiSelect && (detail.displayColumns || []).filter(dc => dc.key).length" label="Kolom Tampilan (Pilih Item)">
                      <option
                        v-for="dc in (detail.displayColumns || []).filter(dc => dc.key)"
                        :key="'ms-' + dc.key"
                        :value="dc.key"
                      >{{ dc.label || dc.key }} (kolom tampilan)</option>
                    </optgroup>
                    <optgroup v-if="allHeaderFields.filter(f => f.field && ['select', 'select_creatable', 'popup'].includes(f.type)).length" label="Header Field">
                      <option
                        v-for="hf in allHeaderFields.filter(f => f.field && ['select', 'select_creatable', 'popup'].includes(f.type))"
                        :key="'h-' + hf.field"
                        :value="hf.field"
                      >{{ hf.label || hf.field }} ({{ hf.type }})</option>
                    </optgroup>
                  </select>
                </div>
                <div v-if="df.defaultValueFrom?.field">
                  <label class="block mb-0.5 text-[10px] text-muted-foreground">Property yang Diambil</label>
                  <input
                    type="text"
                    :value="df.defaultValueFrom?.property || ''"
                    placeholder="nama_comp, alamat, kode"
                    class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-[10px]"
                    @input="updateDetailField(i, 'defaultValueFrom', { ...df.defaultValueFrom, property: $event.target.value })"
                  />
                  <p class="text-[8px] text-muted-foreground/50 mt-0.5">Property dari object response yang dipilih</p>
                </div>
                <div v-if="df.defaultValueFrom?.field && df.defaultValueFrom?.property" class="text-[9px] bg-muted/60 border border-border rounded px-2 py-1 font-mono text-muted-foreground">
                  <span class="text-blue-500">{{ df.defaultValueFrom.field }}</span> dipilih → <span class="text-emerald-500">{{ df.key || '?' }}</span> = data.<span class="text-amber-500">{{ df.defaultValueFrom.property }}</span>
                </div>
                <button v-if="df.defaultValueFrom?.field" type="button" class="text-[9px] text-red-500 hover:text-red-400 underline" @click="updateDetailField(i, 'defaultValueFrom', { field: '', property: '' })">Hapus Auto-Fill</button>
              </div>
            </details>
          </div>
          </div><!-- end collapsible body -->
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

    <!-- Help Modal Overlay -->
    <Teleport to="body">
      <div v-if="detailHelp && DETAIL_HELP[detailHelp]" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="detailHelp = ''">
        <div class="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
          <div class="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-muted/30">
            <div class="flex items-center gap-2.5">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <p class="font-bold text-base">{{ DETAIL_HELP[detailHelp].title }}</p>
            </div>
            <button type="button" class="rounded-full p-1.5 hover:bg-muted transition-colors" @click="detailHelp = ''">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            <p class="text-sm text-muted-foreground leading-relaxed">{{ DETAIL_HELP[detailHelp].desc }}</p>
            <div>
              <p class="text-xs font-bold text-foreground uppercase tracking-wide mb-2">Cara Penggunaan</p>
              <ol class="space-y-1.5">
                <li v-for="(step, si) in DETAIL_HELP[detailHelp].steps" :key="si" class="flex gap-2.5 text-sm">
                  <span class="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-bold mt-0.5">{{ si + 1 }}</span>
                  <span class="text-muted-foreground leading-relaxed whitespace-pre-line">{{ step }}</span>
                </li>
              </ol>
            </div>
            <div v-if="DETAIL_HELP[detailHelp].example">
              <p class="text-xs font-bold text-foreground uppercase tracking-wide mb-2">Contoh</p>
              <pre class="text-xs bg-muted/60 border border-border rounded-lg p-3 font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">{{ DETAIL_HELP[detailHelp].example }}</pre>
            </div>
            <div v-if="DETAIL_HELP[detailHelp].tips?.length">
              <p class="text-xs font-bold text-foreground uppercase tracking-wide mb-2">Tips</p>
              <ul class="space-y-1">
                <li v-for="(tip, ti) in DETAIL_HELP[detailHelp].tips" :key="ti" class="flex gap-2 text-sm text-muted-foreground">
                  <span class="text-amber-500 shrink-0">💡</span>
                  <span class="leading-relaxed">{{ tip }}</span>
                </li>
              </ul>
            </div>
          </div>
          <div class="px-5 py-3 border-t border-border bg-muted/20 flex justify-end">
            <button type="button" class="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors" @click="detailHelp = ''">Mengerti</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
