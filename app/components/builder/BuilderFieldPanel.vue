<script setup>
import { computed, ref, watch } from 'vue'
import { getRegistryEntry, FIELD_REGISTRY } from '~/utils/builder/fieldRegistry'

const props = defineProps({
  field: { type: Object, required: true },
  allFields: { type: Array, default: () => [] },
  allDetails: { type: Array, default: () => [] },
  fieldIndex: { type: Number, default: -1 },
})

const emit = defineEmits(['update:field', 'remove', 'close'])

const entry = computed(() => getRegistryEntry(props.field.type))

// ── Help modal ───────────────────────────────────────────────────────────
const panelHelp = ref('')
const PANEL_HELP = {
  computedFormula: {
    title: 'Formula / Computed Field',
    desc: 'Buat field yang nilainya otomatis dihitung berdasarkan field lain. Cocok untuk subtotal, diskon, PPN, dll.',
    steps: [
      'Pilih template cepat (Kali, Tambah, Diskon%, PPN 11%, dll) lalu assign field A, B, C sesuai kebutuhan',
      'Atau bangun manual: klik Field → Operator (+ − × ÷) → Angka → Kurung',
      'Token formula akan muncul sebagai badge warna-warni di area formula',
      'Klik tombol ✕ pada badge untuk menghapus satu token, atau "Hapus Formula" untuk reset semua',
      'Field yang punya formula otomatis menjadi DISABLED (readonly) — nilainya diisi otomatis saat runtime',
      'Formula bisa berantai: Field A (formula) bisa jadi sumber untuk Field B (formula lain)',
    ],
    example: 'Contoh: qty × harga_satuan = subtotal\nTemplate: Kali → A = qty, B = harga_satuan → Apply\nHasil: subtotal auto-computed setiap qty atau harga berubah',
  },
  defaultValueFrom: {
    title: 'Auto-Fill dari Field Lain',
    desc: 'Otomatis mengisi field ini ketika user memilih nilai dari field Select/Popup tertentu. Berguna untuk mengambil data dari object response API.',
    steps: [
      'Pilih "Field Sumber" — harus bertipe FieldSelect atau FieldPopUp',
      'Isi "Property yang Diambil" — nama property di object API response (contoh: nama_comp, alamat, kode)',
      'Untuk tahu property apa saja yang tersedia, cek struktur API. Biasanya: id, nama_comp, alamat, kode, telp, email, dll',
      'Ketika user memilih item dari Select/Popup sumber, field ini otomatis terisi dari property yang dipilih',
      'Auto-fill juga berlaku untuk Detail Tab — bisa ambil dari header field atau detail field di baris yang sama',
    ],
    example: 'Contoh: Field "Nama Company" auto-fill dari "Unit Bisnis" (select)\n→ Field Sumber: m_unit_bisnis_id (select)\n→ Property: nama_comp\n\nKetika user pilih Unit Bisnis "PT BEST", maka Nama Company otomatis terisi "PT BEST" dari response API',
    tips: [
      'Cek nama property di API response — buka endpoint di browser atau gunakan Auto-Detect di builder',
      'Property yang umum: nama_comp, alamat, kode, telp, email, no_rekening, npwp',
      'Satu field sumber bisa mengisi banyak field target sekaligus',
      'Auto-fill terjadi saat user memilih, bukan saat load halaman',
    ],
  },
}

// ── Computed formula visual builder ──────────────────────────────────────
const formulaFieldSelect = ref('')
const formulaNumberInput = ref('')

// Available fields for formula (exclude current field, non-data fields)
const formulaAvailableFields = computed(() => {
  return props.allFields.filter(f =>
    f.field && f.field !== props.field.field &&
    !['section', 'divider', 'fieldgroup', 'fieldgroup_end'].includes(f.type)
  )
})

function getFormulaTokens() {
  const raw = props.field.computedFormula
  if (Array.isArray(raw)) return raw
  // Backward compat: if string, convert to empty array (old format ignored)
  return []
}

function setFormulaTokens(tokens) {
  updateField('computedFormula', [...tokens])
}

function addFormulaField() {
  if (!formulaFieldSelect.value) return
  const tokens = getFormulaTokens()
  tokens.push({ type: 'field', value: formulaFieldSelect.value })
  setFormulaTokens(tokens)
  formulaFieldSelect.value = ''
}

function addFormulaOp(op) {
  const tokens = getFormulaTokens()
  tokens.push({ type: 'op', value: op })
  setFormulaTokens(tokens)
}

function addFormulaNumber() {
  const num = formulaNumberInput.value?.trim()
  if (!num || isNaN(Number(num))) return
  const tokens = getFormulaTokens()
  tokens.push({ type: 'number', value: num })
  setFormulaTokens(tokens)
  formulaNumberInput.value = ''
}

function addFormulaParen(p) {
  const tokens = getFormulaTokens()
  tokens.push({ type: 'paren', value: p })
  setFormulaTokens(tokens)
}

function removeFormulaToken(index) {
  const tokens = getFormulaTokens()
  tokens.splice(index, 1)
  setFormulaTokens(tokens)
}

function clearFormula() {
  setFormulaTokens([])
}

function formulaPreview(tokens) {
  if (!tokens?.length) return ''
  return tokens.map(t => {
    if (t.type === 'field') return t.value
    if (t.type === 'op') return t.value === '*' ? '×' : t.value === '/' ? '÷' : t.value
    return t.value
  }).join(' ')
}

// ── Formula Quick Templates ─────────────────────────────────────────────
const FORMULA_TEMPLATES = [
  // ── Dasar (2 field) ──
  { id: 'tambah', label: 'A + B', icon: '➕', cat: 'Dasar', fields: 2,
    desc: 'A + B', hint: 'Penjumlahan. Misal: Harga + Ongkir',
    build: (a, b) => [
      { type: 'field', value: a }, { type: 'op', value: '+' }, { type: 'field', value: b },
    ],
  },
  { id: 'kurang', label: 'A − B', icon: '➖', cat: 'Dasar', fields: 2,
    desc: 'A - B', hint: 'Pengurangan. Misal: Pemasukan - Pengeluaran',
    build: (a, b) => [
      { type: 'field', value: a }, { type: 'op', value: '-' }, { type: 'field', value: b },
    ],
  },
  { id: 'kali', label: 'A × B', icon: '✖️', cat: 'Dasar', fields: 2,
    desc: 'A × B', hint: 'Perkalian. Misal: Qty × Harga Satuan',
    build: (a, b) => [
      { type: 'field', value: a }, { type: 'op', value: '*' }, { type: 'field', value: b },
    ],
  },
  { id: 'bagi', label: 'A ÷ B', icon: '➗', cat: 'Dasar', fields: 2,
    desc: 'A ÷ B', hint: 'Pembagian. Misal: Total ÷ Qty',
    build: (a, b) => [
      { type: 'field', value: a }, { type: 'op', value: '/' }, { type: 'field', value: b },
    ],
  },
  // ── Persentase (2 field) ──
  { id: 'diskon_persen', label: 'Diskon %', icon: '🏷️', cat: 'Persentase', fields: 2,
    desc: 'A - (A × B ÷ 100)', hint: 'Harga setelah diskon. 100 diskon 50% = 50',
    labelA: 'Harga', labelB: 'Diskon (%)',
    build: (a, b) => [
      { type: 'field', value: a }, { type: 'op', value: '-' }, { type: 'paren', value: '(' },
      { type: 'field', value: a }, { type: 'op', value: '*' }, { type: 'field', value: b },
      { type: 'op', value: '/' }, { type: 'number', value: '100' }, { type: 'paren', value: ')' },
    ],
  },
  { id: 'markup_persen', label: 'Markup %', icon: '📈', cat: 'Persentase', fields: 2,
    desc: 'A + (A × B ÷ 100)', hint: 'Harga setelah markup. 100 markup 20% = 120',
    labelA: 'Harga Asal', labelB: 'Markup (%)',
    build: (a, b) => [
      { type: 'field', value: a }, { type: 'op', value: '+' }, { type: 'paren', value: '(' },
      { type: 'field', value: a }, { type: 'op', value: '*' }, { type: 'field', value: b },
      { type: 'op', value: '/' }, { type: 'number', value: '100' }, { type: 'paren', value: ')' },
    ],
  },
  { id: 'persen_dari', label: 'Persen Dari', icon: '📊', cat: 'Persentase', fields: 2,
    desc: 'A × B ÷ 100', hint: 'Nilai persen dari A. 50% dari 200 = 100',
    labelA: 'Nilai', labelB: 'Persen (%)',
    build: (a, b) => [
      { type: 'field', value: a }, { type: 'op', value: '*' }, { type: 'field', value: b },
      { type: 'op', value: '/' }, { type: 'number', value: '100' },
    ],
  },
  { id: 'ppn', label: 'PPN 11%', icon: '🧾', cat: 'Persentase', fields: 1,
    desc: 'A × 11 ÷ 100', hint: 'Hitung PPN 11% dari nilai A',
    labelA: 'Nilai DPP',
    build: (a) => [
      { type: 'field', value: a }, { type: 'op', value: '*' }, { type: 'number', value: '11' },
      { type: 'op', value: '/' }, { type: 'number', value: '100' },
    ],
  },
  { id: 'include_ppn', label: 'Harga + PPN 11%', icon: '🧾', cat: 'Persentase', fields: 1,
    desc: 'A + (A × 11 ÷ 100)', hint: 'Harga termasuk PPN 11%. 100 → 111',
    labelA: 'Harga DPP',
    build: (a) => [
      { type: 'field', value: a }, { type: 'op', value: '+' }, { type: 'paren', value: '(' },
      { type: 'field', value: a }, { type: 'op', value: '*' }, { type: 'number', value: '11' },
      { type: 'op', value: '/' }, { type: 'number', value: '100' }, { type: 'paren', value: ')' },
    ],
  },
  // ── 3 Field ──
  { id: 'qty_harga_diskon', label: 'Qty × Harga − Diskon', icon: '🛒', cat: '3 Field', fields: 3,
    desc: 'A × B - C', hint: 'Subtotal dikurangi diskon nominal. 5 × 100 - 50 = 450',
    labelA: 'Qty', labelB: 'Harga Satuan', labelC: 'Diskon (Rp)',
    build: (a, b, c) => [
      { type: 'field', value: a }, { type: 'op', value: '*' }, { type: 'field', value: b },
      { type: 'op', value: '-' }, { type: 'field', value: c },
    ],
  },
  { id: 'qty_harga_diskon_persen', label: 'Qty × Harga − Diskon%', icon: '🛒', cat: '3 Field', fields: 3,
    desc: '(A × B) - ((A × B) × C ÷ 100)', hint: 'Subtotal lalu diskon persen. 5 × 100 diskon 10% = 450',
    labelA: 'Qty', labelB: 'Harga Satuan', labelC: 'Diskon (%)',
    build: (a, b, c) => [
      { type: 'paren', value: '(' }, { type: 'field', value: a }, { type: 'op', value: '*' }, { type: 'field', value: b }, { type: 'paren', value: ')' },
      { type: 'op', value: '-' },
      { type: 'paren', value: '(' }, { type: 'paren', value: '(' },
      { type: 'field', value: a }, { type: 'op', value: '*' }, { type: 'field', value: b },
      { type: 'paren', value: ')' }, { type: 'op', value: '*' }, { type: 'field', value: c },
      { type: 'op', value: '/' }, { type: 'number', value: '100' }, { type: 'paren', value: ')' },
    ],
  },
  { id: 'a_plus_b_plus_c', label: 'A + B + C', icon: '📝', cat: '3 Field', fields: 3,
    desc: 'A + B + C', hint: 'Penjumlahan 3 field',
    build: (a, b, c) => [
      { type: 'field', value: a }, { type: 'op', value: '+' }, { type: 'field', value: b },
      { type: 'op', value: '+' }, { type: 'field', value: c },
    ],
  },
]

const selectedTemplate = ref('')
const tplFieldA = ref('')
const tplFieldB = ref('')
const tplFieldC = ref('')

const activeTemplate = computed(() => FORMULA_TEMPLATES.find(t => t.id === selectedTemplate.value))

const templatePreview = computed(() => {
  const tpl = activeTemplate.value
  if (!tpl) return ''
  const a = tplFieldA.value || 'A'
  const b = tplFieldB.value || 'B'
  const c = tplFieldC.value || 'C'
  return tpl.desc.replace(/\bA\b/g, a).replace(/\bB\b/g, b).replace(/\bC\b/g, c)
})

const templateCategories = computed(() => {
  const cats = []
  const seen = new Set()
  FORMULA_TEMPLATES.forEach(t => {
    if (!seen.has(t.cat)) { seen.add(t.cat); cats.push(t.cat) }
  })
  return cats
})

function applyTemplate() {
  const tpl = activeTemplate.value
  if (!tpl || !tplFieldA.value) return
  if (tpl.fields >= 2 && !tplFieldB.value) return
  if (tpl.fields >= 3 && !tplFieldC.value) return
  const tokens = tpl.build(tplFieldA.value, tplFieldB.value, tplFieldC.value)
  setFormulaTokens(tokens)
  selectedTemplate.value = ''
  tplFieldA.value = ''
  tplFieldB.value = ''
  tplFieldC.value = ''
}

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

// ── RequiredWhen: reuse same option logic ─────────────────────────────
const requiredWhenTarget = computed(() => {
  if (!props.field.requiredWhenField) return null
  return props.allFields.find(f => f.field === props.field.requiredWhenField) || null
})

const requiredWhenTargetType = computed(() => {
  const t = requiredWhenTarget.value
  if (!t) return 'none'
  const e = getRegistryEntry(t.type)
  if (e?.isSwitch || t.type === 'fieldbox') return 'boolean'
  if (['select', 'select_creatable', 'popup'].includes(t.type) && t.sourceType === 'static') return 'static'
  if (['select', 'select_creatable', 'popup'].includes(t.type) && t.sourceType === 'api' && t.apiUrl) return 'api'
  if (t.type === 'radio' && Array.isArray(t.radioOptions) && t.radioOptions.length) return 'radio'
  return 'text'
})

const apiRequiredWhenOpts = ref([])
const loadingRequiredWhenOpts = ref(false)

watch(
  () => [props.field.requiredWhenField, requiredWhenTargetType.value],
  async () => {
    if (requiredWhenTargetType.value !== 'api') {
      apiRequiredWhenOpts.value = []
      return
    }
    const t = requiredWhenTarget.value
    if (!t?.apiUrl) return
    loadingRequiredWhenOpts.value = true
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
      apiRequiredWhenOpts.value = rows.map(r => ({ value: String(r[vf]), label: r[df] || r[vf] }))
    } catch (e) {
      apiRequiredWhenOpts.value = []
    } finally {
      loadingRequiredWhenOpts.value = false
    }
  },
  { immediate: true }
)

const requiredWhenValueOptions = computed(() => {
  const type = requiredWhenTargetType.value
  const t = requiredWhenTarget.value
  if (type === 'boolean') return [{ value: 'true', label: t?.labelTrue || 'Aktif' }, { value: 'false', label: t?.labelFalse || 'Tidak Aktif' }]
  if (type === 'static') return (t?.staticOptions || []).map(o => ({ value: o.value, label: o.label || o.value }))
  if (type === 'radio') return (t?.radioOptions || []).map(o => ({ value: o.value, label: o.label || o.value }))
  if (type === 'api') return apiRequiredWhenOpts.value
  return []
})

// ── ReadonlyWhen: reuse same option logic ─────────────────────────────
const readonlyWhenTarget = computed(() => {
  if (!props.field.readonlyWhenField) return null
  return props.allFields.find(f => f.field === props.field.readonlyWhenField) || null
})

const readonlyWhenTargetType = computed(() => {
  const t = readonlyWhenTarget.value
  if (!t) return 'none'
  const e = getRegistryEntry(t.type)
  if (e?.isSwitch || t.type === 'fieldbox') return 'boolean'
  if (['select', 'select_creatable', 'popup'].includes(t.type) && t.sourceType === 'static') return 'static'
  if (['select', 'select_creatable', 'popup'].includes(t.type) && t.sourceType === 'api' && t.apiUrl) return 'api'
  if (t.type === 'radio' && Array.isArray(t.radioOptions) && t.radioOptions.length) return 'radio'
  return 'text'
})

const apiReadonlyWhenOpts = ref([])
const loadingReadonlyWhenOpts = ref(false)

watch(
  () => [props.field.readonlyWhenField, readonlyWhenTargetType.value],
  async () => {
    if (readonlyWhenTargetType.value !== 'api') {
      apiReadonlyWhenOpts.value = []
      return
    }
    const t = readonlyWhenTarget.value
    if (!t?.apiUrl) return
    loadingReadonlyWhenOpts.value = true
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
      apiReadonlyWhenOpts.value = rows.map(r => ({ value: String(r[vf]), label: r[df] || r[vf] }))
    } catch (e) {
      apiReadonlyWhenOpts.value = []
    } finally {
      loadingReadonlyWhenOpts.value = false
    }
  },
  { immediate: true }
)

const readonlyWhenValueOptions = computed(() => {
  const type = readonlyWhenTargetType.value
  const t = readonlyWhenTarget.value
  if (type === 'boolean') return [{ value: 'true', label: t?.labelTrue || 'Aktif' }, { value: 'false', label: t?.labelFalse || 'Tidak Aktif' }]
  if (type === 'static') return (t?.staticOptions || []).map(o => ({ value: o.value, label: o.label || o.value }))
  if (type === 'radio') return (t?.radioOptions || []).map(o => ({ value: o.value, label: o.label || o.value }))
  if (type === 'api') return apiReadonlyWhenOpts.value
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
  // Auto-fill map column names when prefix changes
  if (key === 'field' && updated.type === 'map' && value) {
    if (!updated.mapLatField) updated.mapLatField = ''
    if (!updated.mapLngField) updated.mapLngField = ''
    if (!updated.mapAddressField) updated.mapAddressField = ''
  }
  // Auto-derive internal field ID from mapLatField for map type
  if (updated.type === 'map' && (key === 'mapLatField' || key === 'mapLngField' || key === 'mapAddressField')) {
    updated.field = updated.mapLatField || 'map_field'
  }
  emit('update:field', updated)
}

function handleCheckboxGroupChange(key, value, checked, options) {
  const current = Array.isArray(props.field[key]) ? [...props.field[key]] : []
  if (value === '*') {
    // "Semua" toggles: if checked, set to ['*']; if unchecked, clear
    updateField(key, checked ? ['*'] : [])
    return
  }
  // Remove '*' when specific option is toggled
  let next = current.filter(v => v !== '*')
  if (checked) { next.push(value) } else { next = next.filter(v => v !== value) }
  // If all specific options are selected, switch to ['*']
  const specificOptions = options.filter(o => o.value !== '*')
  if (next.length === specificOptions.length) next = ['*']
  updateField(key, next)
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

      <!-- Checkbox Group (e.g. file type selection) -->
      <div v-else-if="pf.type === 'checkboxGroup'">
        <label class="block mb-1 font-medium text-muted-foreground">{{ pf.label }}</label>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="opt in pf.options"
            :key="opt.value"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs cursor-pointer transition-colors select-none"
            :class="(Array.isArray(field[pf.key]) ? field[pf.key] : []).includes(opt.value) ? 'bg-primary/10 border-primary text-primary font-medium' : 'bg-muted border-border text-muted-foreground hover:border-foreground/30'"
          >
            <input
              type="checkbox"
              class="rounded border-border text-primary focus:ring-primary h-3 w-3"
              :checked="(Array.isArray(field[pf.key]) ? field[pf.key] : []).includes(opt.value)"
              @change="handleCheckboxGroupChange(pf.key, opt.value, $event.target.checked, pf.options)"
            />
            {{ opt.label }}
          </label>
        </div>
        <p v-if="pf.hint" class="text-xs text-muted-foreground/70 mt-1">{{ pf.hint }}</p>
      </div>

      <!-- Select with predefined options -->
      <div v-else-if="pf.type === 'select'">
        <label :for="'panel-' + pf.key" class="block mb-1 font-medium text-muted-foreground">{{ pf.label }}</label>
        <select
          :id="'panel-' + pf.key"
          :value="field[pf.key] || ''"
          class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
          @change="updateField(pf.key, $event.target.value)"
        >
          <option v-for="opt in pf.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <p v-if="pf.hint" class="text-xs text-muted-foreground/70 mt-0.5">{{ pf.hint }}</p>
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

      <!-- Required When Combo (conditional required) -->
      <div v-else-if="pf.type === 'requiredWhenCombo'">
        <label class="block mb-1 font-medium text-muted-foreground">{{ pf.label }}</label>
        <div class="flex flex-col gap-2">
          <select
            :value="field.requiredWhenField || ''"
            class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
            @change="emit('update:field', { ...field, requiredWhenField: $event.target.value, requiredWhenValue: '' })"
          >
            <option value="">-- Selalu required --</option>
            <option
              v-for="f in allFields.filter(af => af.field && af.field !== field.field)"
              :key="f.field"
              :value="f.field"
            >
              {{ f.label || f.field }} ({{ f.field }})
            </option>
          </select>
          <template v-if="field.requiredWhenField">
            <label class="block text-xs font-medium text-muted-foreground">Bernilai</label>
            <div v-if="loadingRequiredWhenOpts" class="text-xs text-muted-foreground italic py-1">
              Memuat opsi dari API...
            </div>
            <select
              v-else-if="requiredWhenValueOptions.length > 0"
              :value="field.requiredWhenValue || ''"
              class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
              @change="updateField('requiredWhenValue', $event.target.value)"
            >
              <option value="">-- Pilih nilai --</option>
              <option v-for="opt in requiredWhenValueOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <input
              v-else
              type="text"
              :value="field.requiredWhenValue || ''"
              placeholder="Ketik nilai..."
              class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
              @input="updateField('requiredWhenValue', $event.target.value)"
            />
          </template>
        </div>
        <p v-if="pf.hint" class="text-xs text-muted-foreground/70 mt-1">{{ pf.hint }}</p>
      </div>

      <!-- Readonly When Combo (conditional readonly) -->
      <div v-else-if="pf.type === 'readonlyWhenCombo'">
        <label class="block mb-1 font-medium text-muted-foreground">{{ pf.label }}</label>
        <div class="flex flex-col gap-2">
          <select
            :value="field.readonlyWhenField || ''"
            class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
            @change="emit('update:field', { ...field, readonlyWhenField: $event.target.value, readonlyWhenValue: '' })"
          >
            <option value="">-- Tidak ada (selalu editable) --</option>
            <option
              v-for="f in allFields.filter(af => af.field && af.field !== field.field)"
              :key="f.field"
              :value="f.field"
            >
              {{ f.label || f.field }} ({{ f.field }})
            </option>
          </select>
          <template v-if="field.readonlyWhenField">
            <label class="block text-xs font-medium text-muted-foreground">Menjadi readonly jika bernilai</label>
            <div v-if="loadingReadonlyWhenOpts" class="text-xs text-muted-foreground italic py-1">
              Memuat opsi dari API...
            </div>
            <select
              v-else-if="readonlyWhenValueOptions.length > 0"
              :value="field.readonlyWhenValue || ''"
              class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
              @change="updateField('readonlyWhenValue', $event.target.value)"
            >
              <option value="">-- Pilih nilai --</option>
              <option v-for="opt in readonlyWhenValueOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <input
              v-else
              type="text"
              :value="field.readonlyWhenValue || ''"
              placeholder="Ketik nilai..."
              class="w-full rounded bg-muted border border-border text-foreground px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
              @input="updateField('readonlyWhenValue', $event.target.value)"
            />
          </template>
        </div>
        <p v-if="pf.hint" class="text-xs text-muted-foreground/70 mt-1">{{ pf.hint }}</p>
      </div>

      <!-- Computed Formula — Visual Token Builder -->
      <div v-else-if="pf.type === 'computedFormula'">
        <div class="flex items-center gap-1.5 mb-1">
          <label class="font-medium text-muted-foreground">{{ pf.label }}</label>
          <button type="button" class="text-muted-foreground/50 hover:text-primary transition-colors" title="Bantuan Formula" @click="panelHelp = 'computedFormula'">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </button>
        </div>
        <div class="space-y-2">

          <!-- ═══ Quick Formula Templates ═══ -->
          <div class="bg-muted/30 rounded-lg p-2.5 space-y-2 border border-border/50">
            <p class="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wide">Pilih Template Perhitungan</p>

            <!-- Grouped by category -->
            <div v-for="cat in templateCategories" :key="cat" class="space-y-1">
              <p class="text-[10px] text-muted-foreground/40 font-medium">{{ cat }}</p>
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="tpl in FORMULA_TEMPLATES.filter(t => t.cat === cat)" :key="tpl.id" type="button"
                  class="px-2 py-1 rounded text-[10px] font-medium border transition-colors inline-flex items-center gap-1"
                  :class="selectedTemplate === tpl.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'"
                  :title="tpl.hint"
                  @click="selectedTemplate = selectedTemplate === tpl.id ? '' : tpl.id; tplFieldA = ''; tplFieldB = ''; tplFieldC = ''"
                ><span>{{ tpl.icon }}</span> {{ tpl.label }}</button>
              </div>
            </div>

            <!-- Selected template config -->
            <template v-if="activeTemplate">
              <div class="bg-background/60 rounded p-2 space-y-2 border border-border/30">
                <p class="text-[10px] font-semibold text-foreground/80">{{ activeTemplate.icon }} {{ activeTemplate.label }}</p>
                <p class="text-[10px] text-muted-foreground/50 italic">{{ activeTemplate.hint }}</p>
                <p class="text-[10px] text-amber-600 dark:text-amber-400 font-mono">{{ activeTemplate.desc }}</p>

                <!-- Field selects based on template.fields count -->
                <div class="space-y-1.5">
                  <select v-model="tplFieldA" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary">
                    <option value="" disabled>{{ activeTemplate.labelA || 'Field A' }} — pilih field...</option>
                    <option v-for="af in formulaAvailableFields" :key="af.field" :value="af.field">{{ af.label || af.field }}</option>
                  </select>
                  <select v-if="activeTemplate.fields >= 2" v-model="tplFieldB" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary">
                    <option value="" disabled>{{ activeTemplate.labelB || 'Field B' }} — pilih field...</option>
                    <option v-for="af in formulaAvailableFields" :key="af.field" :value="af.field">{{ af.label || af.field }}</option>
                  </select>
                  <select v-if="activeTemplate.fields >= 3" v-model="tplFieldC" class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary">
                    <option value="" disabled>{{ activeTemplate.labelC || 'Field C' }} — pilih field...</option>
                    <option v-for="af in formulaAvailableFields" :key="af.field" :value="af.field">{{ af.label || af.field }}</option>
                  </select>
                </div>

                <div class="flex items-center justify-between gap-2">
                  <span class="text-[10px] text-muted-foreground/50 font-mono flex-1 truncate">= {{ templatePreview }}</span>
                  <button
                    type="button"
                    :disabled="!tplFieldA || (activeTemplate.fields >= 2 && !tplFieldB) || (activeTemplate.fields >= 3 && !tplFieldC)"
                    class="px-3 py-1 rounded text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    @click="applyTemplate"
                  >Terapkan</button>
                </div>
              </div>
            </template>
          </div>

          <!-- ═══ Token display area ═══ -->
          <div class="min-h-[40px] rounded bg-muted/60 border border-border p-2 flex flex-wrap gap-1.5 items-center">
            <template v-if="getFormulaTokens().length">
              <span
                v-for="(tok, ti) in getFormulaTokens()"
                :key="ti"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium cursor-default"
                :class="{
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300': tok.type === 'field',
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-bold': tok.type === 'op',
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-mono': tok.type === 'number',
                  'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 font-bold': tok.type === 'paren',
                }"
              >
                {{ tok.type === 'op' && tok.value === '*' ? '×' : tok.type === 'op' && tok.value === '/' ? '÷' : tok.type === 'field' ? allFields.find(f => f.field === tok.value)?.label || tok.value : tok.value }}
                <button
                  type="button"
                  class="ml-0.5 text-current opacity-50 hover:opacity-100 text-[10px] leading-none"
                  @click="removeFormulaToken(ti)"
                >✕</button>
              </span>
            </template>
            <span v-else class="text-xs text-muted-foreground/50 italic">Belum ada formula — pakai template atau bangun manual di bawah</span>
          </div>

          <!-- ═══ Manual Builder ═══ -->
          <details class="group">
            <summary class="text-[10px] text-muted-foreground/60 cursor-pointer hover:text-muted-foreground select-none">
              ▶ Bangun Manual (field, operator, angka)
            </summary>
            <div class="mt-2 space-y-2 pl-1 border-l-2 border-border/50 ml-1">
              <!-- Add Field select -->
              <div class="flex gap-1.5 items-center">
                <select
                  v-model="formulaFieldSelect"
                  class="flex-1 rounded bg-muted border border-border text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="" disabled>+ Pilih Field...</option>
                  <option
                    v-for="af in formulaAvailableFields"
                    :key="af.field"
                    :value="af.field"
                  >{{ af.label || af.field }} ({{ af.field }})</option>
                </select>
                <button
                  type="button"
                  :disabled="!formulaFieldSelect"
                  class="px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  @click="addFormulaField"
                >+ Field</button>
              </div>

              <!-- Operator buttons -->
              <div class="flex flex-wrap gap-1.5 items-center">
                <span class="text-[10px] text-muted-foreground/60 mr-1">Operator:</span>
                <button v-for="op in ['+', '-', '*', '/']" :key="op" type="button"
                  class="w-7 h-7 flex items-center justify-center rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-bold text-sm hover:bg-amber-200 dark:hover:bg-amber-800/50"
                  @click="addFormulaOp(op)"
                >{{ op === '*' ? '×' : op === '/' ? '÷' : op }}</button>
                <span class="text-[10px] text-muted-foreground/60 mx-1">Kurung:</span>
                <button v-for="p in ['(', ')']" :key="p" type="button"
                  class="w-7 h-7 flex items-center justify-center rounded bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                  @click="addFormulaParen(p)"
                >{{ p }}</button>
              </div>

              <!-- Number input -->
              <div class="flex gap-1.5 items-center">
                <input
                  v-model="formulaNumberInput"
                  type="text"
                  inputmode="decimal"
                  placeholder="Angka konstan..."
                  class="flex-1 rounded bg-muted border border-border text-foreground px-2 py-1 text-xs font-mono focus:border-primary focus:ring-1 focus:ring-primary"
                  @keydown.enter.prevent="addFormulaNumber"
                />
                <button
                  type="button"
                  :disabled="!formulaNumberInput?.trim() || isNaN(Number(formulaNumberInput))"
                  class="px-2 py-1 rounded text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  @click="addFormulaNumber"
                >+ Angka</button>
              </div>
            </div>
          </details>

          <!-- Clear + Preview -->
          <div class="flex items-center justify-between">
            <button
              v-if="getFormulaTokens().length"
              type="button"
              class="text-[10px] text-red-500 hover:text-red-400 underline"
              @click="clearFormula"
            >Hapus Semua</button>
            <span v-if="getFormulaTokens().length" class="text-[10px] text-muted-foreground/50 font-mono">
              = {{ formulaPreview(getFormulaTokens()) }}
            </span>
          </div>
        </div>
        <p v-if="pf.hint" class="text-xs text-muted-foreground/70 mt-1">{{ pf.hint }}</p>
      </div>

      <!-- Detail Aggregate — Header field = SUM/AVG/COUNT of detail column -->
      <div v-if="pf.type === 'computedFormula' && ['number', 'fieldnumber', 'fieldnumber_decimal', 'currency'].includes(field.type) && allDetails.length" class="mt-3 border-t border-border/50 pt-3 space-y-2">
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Aggregate Detail → Header</span>
          <span v-if="field.detailAggregate?.type" class="text-[9px] px-1.5 py-0.5 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 rounded font-mono">
            {{ field.detailAggregate.type }}(detail[{{ field.detailAggregate.detailIndex }}].{{ field.detailAggregate.detailField }})
          </span>
        </div>
        <p class="text-[9px] text-muted-foreground/50">Hitung otomatis dari kolom detail (misal: grand_total = SUM subtotal)</p>
        <div class="grid grid-cols-3 gap-1.5">
          <div>
            <label class="block mb-0.5 text-[10px] text-muted-foreground">Operasi</label>
            <select
              :value="field.detailAggregate?.type || ''"
              class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-[10px]"
              @change="updateField('detailAggregate', { ...field.detailAggregate, type: $event.target.value })"
            >
              <option value="">-- Tidak aktif --</option>
              <option value="SUM">SUM</option>
              <option value="AVG">AVG</option>
              <option value="COUNT">COUNT</option>
            </select>
          </div>
          <div>
            <label class="block mb-0.5 text-[10px] text-muted-foreground">Detail Tab</label>
            <select
              :value="field.detailAggregate?.detailIndex ?? 0"
              class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-[10px]"
              @change="updateField('detailAggregate', { ...field.detailAggregate, detailIndex: Number($event.target.value), detailField: '' })"
            >
              <option v-for="(d, di) in allDetails" :key="di" :value="di">{{ d.tabLabel || `Detail ${di + 1}` }}</option>
            </select>
          </div>
          <div>
            <label class="block mb-0.5 text-[10px] text-muted-foreground">Kolom Detail</label>
            <select
              :value="field.detailAggregate?.detailField || ''"
              class="w-full rounded bg-muted border border-border text-foreground px-2 py-1 text-[10px]"
              @change="updateField('detailAggregate', { ...field.detailAggregate, detailField: $event.target.value })"
            >
              <option value="">-- Pilih --</option>
              <option
                v-for="df in (allDetails[field.detailAggregate?.detailIndex ?? 0]?.detailFields || []).filter(f => f.key && ['number', 'fieldnumber', 'fieldnumber_decimal', 'currency'].includes(f.type))"
                :key="df.key"
                :value="df.key"
              >{{ df.label || df.key }}</option>
            </select>
          </div>
        </div>
        <button
          v-if="field.detailAggregate?.type"
          type="button"
          class="text-[9px] text-red-500 hover:text-red-400 underline"
          @click="updateField('detailAggregate', { type: '', detailIndex: 0, detailField: '' })"
        >Hapus Aggregate</button>
      </div>

      <!-- Auto-Fill Default Value from Another Field -->
      <div v-else-if="pf.type === 'defaultValueFrom'">
        <div class="flex items-center gap-1.5 mb-1">
          <label class="font-medium text-muted-foreground">{{ pf.label }}</label>
          <button type="button" class="text-muted-foreground/50 hover:text-primary transition-colors" title="Bantuan Auto-Fill" @click="panelHelp = 'defaultValueFrom'">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </button>
        </div>
        <div class="space-y-2">
          <!-- Source field picker -->
          <div>
            <label class="block mb-0.5 text-xs text-muted-foreground">Field Sumber</label>
            <select
              :value="field.defaultValueFrom?.field || ''"
              class="w-full rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              @change="updateField('defaultValueFrom', { ...field.defaultValueFrom, field: $event.target.value, property: '' })"
            >
              <option value="">-- Tidak ada --</option>
              <option
                v-for="f in allFields.filter(af => af.field && af.field !== field.field && ['select', 'select_creatable', 'popup'].includes(af.type))"
                :key="f.field"
                :value="f.field"
              >{{ f.label || f.field }} ({{ f.type }})</option>
            </select>
            <p class="text-[10px] text-muted-foreground/60 mt-0.5">Pilih field bertipe Select/Popup yang datanya mau diambil</p>
          </div>
          <!-- Property picker (free text, with hint) -->
          <div v-if="field.defaultValueFrom?.field">
            <label class="block mb-0.5 text-xs text-muted-foreground">Property yang Diambil</label>
            <input
              type="text"
              :value="field.defaultValueFrom?.property || ''"
              placeholder="nama_comp, alamat, kode, id, dll"
              class="w-full rounded bg-muted border border-border text-foreground px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              @input="updateField('defaultValueFrom', { ...field.defaultValueFrom, property: $event.target.value })"
            />
            <p class="text-[10px] text-muted-foreground/60 mt-0.5">Property dari response object (cek struktur API). Misal: <span class="font-mono">nama_comp</span>, <span class="font-mono">alamat</span></p>
          </div>
          <!-- Preview -->
          <div v-if="field.defaultValueFrom?.field && field.defaultValueFrom?.property" class="text-[10px] bg-muted/60 border border-border rounded px-2 py-1.5 font-mono text-muted-foreground">
            Ketika <span class="text-blue-500">{{ field.defaultValueFrom.field }}</span> dipilih → <span class="text-emerald-500">{{ field.field || '?' }}</span> = data.<span class="text-amber-500">{{ field.defaultValueFrom.property }}</span>
          </div>
          <!-- Clear button -->
          <button
            v-if="field.defaultValueFrom?.field"
            type="button"
            class="text-[10px] text-red-500 hover:text-red-400 underline"
            @click="updateField('defaultValueFrom', { field: '', property: '' })"
          >Hapus Auto-Fill</button>
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

    <!-- Map: Preview derived DB columns -->
    <div v-if="field.type === 'map' && (field.mapLatField || field.mapLngField || field.mapAddressField)" class="p-3 rounded-md bg-primary/5 border border-primary/20 space-y-1">
      <p class="text-xs font-semibold text-primary">Kolom DB yang akan dibuat:</p>
      <div class="flex flex-col gap-0.5 text-xs text-muted-foreground font-mono">
        <span>📍 {{ field.mapLatField || 'lokasi_lat' }} <span class="text-muted-foreground/50">(latitude)</span></span>
        <span>📍 {{ field.mapLngField || 'lokasi_lng' }} <span class="text-muted-foreground/50">(longitude)</span></span>
        <span>📍 {{ field.mapAddressField || 'lokasi_alamat' }} <span class="text-muted-foreground/50">(alamat)</span></span>
      </div>
    </div>

    <!-- Remove Button -->
    <button
      class="mt-4 w-full py-2 rounded bg-destructive/20 text-destructive border border-destructive/40 hover:bg-destructive/30 font-medium text-sm transition-colors"
      @click="emit('remove', fieldIndex)"
    >
      Hapus Field
    </button>

    <!-- Help Modal Overlay -->
    <Teleport to="body">
      <div v-if="panelHelp && PANEL_HELP[panelHelp]" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="panelHelp = ''">
        <div class="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
          <!-- Header -->
          <div class="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-muted/30">
            <div class="flex items-center gap-2.5">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <p class="font-bold text-base">{{ PANEL_HELP[panelHelp].title }}</p>
            </div>
            <button type="button" class="rounded-full p-1.5 hover:bg-muted transition-colors" @click="panelHelp = ''">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <!-- Body -->
          <div class="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            <p class="text-sm text-muted-foreground leading-relaxed">{{ PANEL_HELP[panelHelp].desc }}</p>
            <!-- Steps -->
            <div>
              <p class="text-xs font-bold text-foreground uppercase tracking-wide mb-2">Cara Penggunaan</p>
              <ol class="space-y-1.5">
                <li v-for="(step, si) in PANEL_HELP[panelHelp].steps" :key="si" class="flex gap-2.5 text-sm">
                  <span class="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-bold mt-0.5">{{ si + 1 }}</span>
                  <span class="text-muted-foreground leading-relaxed">{{ step }}</span>
                </li>
              </ol>
            </div>
            <!-- Example -->
            <div v-if="PANEL_HELP[panelHelp].example">
              <p class="text-xs font-bold text-foreground uppercase tracking-wide mb-2">Contoh</p>
              <pre class="text-xs bg-muted/60 border border-border rounded-lg p-3 font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">{{ PANEL_HELP[panelHelp].example }}</pre>
            </div>
            <!-- Tips -->
            <div v-if="PANEL_HELP[panelHelp].tips?.length">
              <p class="text-xs font-bold text-foreground uppercase tracking-wide mb-2">Tips</p>
              <ul class="space-y-1">
                <li v-for="(tip, ti) in PANEL_HELP[panelHelp].tips" :key="ti" class="flex gap-2 text-sm text-muted-foreground">
                  <span class="text-amber-500 shrink-0">💡</span>
                  <span class="leading-relaxed">{{ tip }}</span>
                </li>
              </ul>
            </div>
          </div>
          <!-- Footer -->
          <div class="px-5 py-3 border-t border-border bg-muted/20 flex justify-end">
            <button type="button" class="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors" @click="panelHelp = ''">Mengerti</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
