/**
 * Field Registry — Single Source of Truth
 *
 * Setiap entry mendefinisikan:
 * - value        : key unik untuk tipe field
 * - label        : label tampilan di builder
 * - component    : nama Vue component yang dipakai
 * - category     : kategori untuk grouping (input, number, selection, toggle)
 * - searchable   : apakah field ini bisa di-search di landing page
 * - showInMobile : apakah field ini tampil di mobile card header / delete description
 * - hasError     : apakah field ini punya error state
 * - defaultMeta  : default value untuk field config saat addField
 * - panelFields  : array config field yang muncul di panel konfigurasi
 * - previewProps : function(fieldConfig) -> object props untuk preview component
 * - generateTemplate : function(fieldConfig) -> string template Vue untuk generate
 * - generateDefault  : function(fieldConfig) -> string untuk values default
 * - generateReset    : function(fieldConfig) -> string untuk reset values
 * - generatePayload  : function(fieldConfig) -> string untuk payload
 */

// ── Panel field types ──────────────────────────────────────────────────────
// Reusable panel field definitions
const PANEL = {
  fieldName: {
    key: 'field', label: 'Field Name (DB column)', type: 'text', placeholder: 'nama_field',
  },
  label: {
    key: 'label', label: 'Label', type: 'text', placeholder: 'Label Tampilan',
  },
  placeholder: {
    key: 'placeholder', label: 'Placeholder', type: 'text', placeholder: 'Placeholder text',
    hideWhen: (f) => f.type === 'switch',
  },
  defaultValue: {
    key: 'defaultValue', label: 'Default Value', type: 'text', placeholder: '',
    dynamicPlaceholder: (f) => f.type === 'switch' ? 'true / false' : '',
    hideWhen: (f) => (f.type === 'select' || f.type === 'select_creatable') && f.sourceType === 'static',
  },
  required: {
    key: 'required', label: 'Required', type: 'checkbox',
    hideWhen: (f) => f.type === 'switch',
  },
  errorMessage: {
    key: 'errorMessage', label: 'Pesan Error', type: 'text',
    placeholder: '',
    dynamicPlaceholder: (f) => `${f.label || 'Field'} Wajib Di isi`,
    hint: 'Kosongkan untuk pakai default: "{Label} Wajib Di isi"',
    hideWhen: (f) => !f.required || f.type === 'switch',
  },
  readonly: {
    key: 'readonly', label: 'Readonly', type: 'checkbox',
    hideWhen: (f) => f.type === 'switch',
  },
  disabled: {
    key: 'readonly', label: 'Disabled', type: 'checkbox',
    hint: 'Field tidak bisa diubah (disabled)',
    hideWhen: (f) => f.type !== 'switch',
  },
  labelTrue: {
    key: 'labelTrue', label: 'Label True', type: 'text', placeholder: 'Aktif',
  },
  labelFalse: {
    key: 'labelFalse', label: 'Label False', type: 'text', placeholder: 'Tidak Aktif',
  },
  sourceType: {
    key: 'sourceType', label: 'Data Source', type: 'buttongroup',
    options: [
      { value: 'api', label: 'API' },
      { value: 'static', label: 'Static / Hardcode' },
    ],
  },
  apiUrl: {
    key: 'apiUrl', label: 'API Endpoint', type: 'text', placeholder: '/api/dynamic/m_supplier',
    hint: 'Relative (/api/dynamic/...) atau full URL (https://...)',
    hideWhen: (f) => f.sourceType === 'static',
  },
  apiParams: {
    key: 'apiParams', label: 'API Params', type: 'paramsList',
    hideWhen: (f) => f.sourceType === 'static',
  },
  displayField: {
    key: 'displayField', label: 'Display Field', type: 'text', placeholder: 'name',
    hint: 'Field dari API yang ditampilkan sebagai label',
    hideWhen: (f) => f.sourceType === 'static',
  },
  valueField: {
    key: 'valueField', label: 'Value Field', type: 'text', placeholder: 'id',
    hint: 'Field dari API yang dipakai sebagai value',
    hideWhen: (f) => f.sourceType === 'static',
  },
  staticOptions: {
    key: 'staticOptions', label: 'Options', type: 'optionsList',
    hideWhen: (f) => f.sourceType !== 'static',
  },
  radioOptions: {
    key: 'staticOptions', label: 'Radio Options', type: 'radioOptionsList',
  },
  fullWidth: {
    key: 'fullWidth', label: 'Full Width (2 kolom)', type: 'checkbox',
  },
  dependsOn: {
    key: 'dependsOn', label: 'Depends On (Parent)', type: 'selectField',
    hint: 'Pilih field lain sebagai parent (field ini disabled sampai parent terisi)',
  },
  dependsOnParam: {
    key: 'dependsOnParam', label: 'Param Name', type: 'text',
    placeholder: 'provinsi',
    hint: 'Nama query param yang dikirim ke API (value parent)',
    hideWhen: (f) => f.sourceType === 'static' || !f.dependsOn,
  },
  dateDefaultValue: {
    key: 'defaultValue', label: 'Default Value', type: 'buttongroup',
    options: [
      { value: '', label: 'Kosong' },
      { value: 'NOW', label: 'Hari Ini' },
    ],
  },
  popupColumns: {
    key: 'popupColumns', label: 'Popup Columns (AG Grid)', type: 'columnsList',
    hint: 'Kolom-kolom yang muncul di tabel popup',
  },
  searchFields: {
    key: 'searchFields', label: 'Search Fields', type: 'text',
    placeholder: 'code,name,value1',
    hint: 'Comma-separated field names untuk search (auto dari columns jika kosong)',
  },
  dialogTitle: {
    key: 'dialogTitle', label: 'Dialog Title', type: 'text',
    placeholder: 'Pilih Data',
    hint: 'Judul popup dialog (default: "Pilih {label}")',
  },
  // ── Currency-specific ──
  currencyPrefix: {
    key: 'currencyPrefix', label: 'Prefix Mata Uang', type: 'text',
    placeholder: 'Rp',
    hint: 'Prefix yang tampil di depan angka (Rp, $, USD, dll)',
  },
  allowDecimal: {
    key: 'allowDecimal', label: 'Boleh Desimal', type: 'checkbox',
  },
  decimalPlaces: {
    key: 'decimalPlaces', label: 'Digit Desimal', type: 'text', placeholder: '2',
    hint: 'Batas maksimum digit di belakang koma (0-6)',
    hideWhen: (f) => !['decimal', 'fieldnumber_decimal', 'currency'].includes(f.type) || (f.type === 'currency' && f.allowDecimal === false),
  },
  // ── Slider-specific ──
  sliderMin: {
    key: 'sliderMin', label: 'Min', type: 'text', placeholder: '0',
  },
  sliderMax: {
    key: 'sliderMax', label: 'Max', type: 'text', placeholder: '100',
  },
  sliderStep: {
    key: 'sliderStep', label: 'Step', type: 'text', placeholder: '1',
  },
  sliderUnit: {
    key: 'sliderUnit', label: 'Unit Suffix', type: 'text',
    placeholder: '%',
    hint: 'Satuan yang ditampilkan (%, pcs, kg, dll)',
  },
  // ── Conditional Required ──
  requiredWhen: {
    key: 'requiredWhenField', label: 'Required When (Kondisional)', type: 'requiredWhenCombo',
    hint: 'Wajib diisi hanya kalau field lain bernilai tertentu. Kosongkan untuk selalu wajib.',
    hideWhen: (f) => !f.required || f.type === 'switch',
  },
  // ── Conditional Readonly ──
  readonlyWhen: {
    key: 'readonlyWhenField', label: 'Readonly When (Kondisional)', type: 'readonlyWhenCombo',
    hint: 'Field menjadi readonly jika field lain bernilai tertentu. Kosongkan jika tidak ada kondisi.',
    hideWhen: (f) => f.readonly || f.type === 'switch',
  },
  // ── Conditional Visibility ──
  visibleWhen: {
    key: 'visibleWhenField', label: 'Visible When (Kondisional)', type: 'visibleWhenCombo',
    hint: 'Tampilkan field ini hanya jika field lain bernilai tertentu. Kosongkan untuk selalu tampil.',
  },
  // ── Section Divider ──
  sectionTitle: {
    key: 'label', label: 'Judul Section', type: 'text', placeholder: 'Data Harga',
  },
  // ── Validation Rules ──
  minLength: {
    key: 'minLength', label: 'Min Length', type: 'text', placeholder: '',
    hint: 'Panjang karakter minimum',
    hideWhen: (f) => ['switch', 'fieldbox', 'date', 'datetime', 'fieldnumber', 'fieldnumber_decimal', 'slider', 'currency', 'radio'].includes(f.type),
  },
  maxLength: {
    key: 'maxLength', label: 'Max Length', type: 'text', placeholder: '',
    hint: 'Panjang karakter maksimum',
    hideWhen: (f) => ['switch', 'fieldbox', 'date', 'datetime', 'fieldnumber', 'fieldnumber_decimal', 'slider', 'currency', 'radio'].includes(f.type),
  },
  minValue: {
    key: 'minValue', label: 'Min Value', type: 'text', placeholder: '',
    hint: 'Nilai minimum (untuk angka)',
    hideWhen: (f) => !['number', 'decimal', 'fieldnumber', 'fieldnumber_decimal', 'currency', 'slider'].includes(f.type),
  },
  maxValue: {
    key: 'maxValue', label: 'Max Value', type: 'text', placeholder: '',
    hint: 'Nilai maksimum (untuk angka)',
    hideWhen: (f) => !['number', 'decimal', 'fieldnumber', 'fieldnumber_decimal', 'currency', 'slider'].includes(f.type),
  },
  pattern: {
    key: 'pattern', label: 'Regex Pattern', type: 'text', placeholder: '^[A-Z]{2,4}$',
    hint: 'Regex pattern untuk validasi (kosongkan jika tidak perlu)',
    hideWhen: (f) => !['text', 'email', 'tel', 'password', 'number', 'decimal'].includes(f.type),
  },
  patternMessage: {
    key: 'patternMessage', label: 'Pesan Regex Error', type: 'text', placeholder: 'Format tidak sesuai',
    hint: 'Pesan error jika regex tidak cocok',
    hideWhen: (f) => !f.pattern,
  },
  // ── Upload-specific ──
  uploadAccept: {
    key: 'uploadAccept', label: 'Tipe File', type: 'checkboxGroup',
    options: [
      { value: '*', label: 'Semua File' },
      { value: 'image/png', label: 'PNG' },
      { value: 'image/jpeg', label: 'JPG / JPEG' },
      { value: 'image/webp', label: 'WebP' },
      { value: 'application/pdf', label: 'PDF' },
      { value: '.xlsx,.xls', label: 'Excel' },
      { value: '.doc,.docx', label: 'Word' },
    ],
    hint: 'Pilih tipe file yang diterima',
  },
  maxSizeMB: {
    key: 'maxSizeMB', label: 'Ukuran Maksimal File', type: 'select',
    options: [
      { value: '1', label: '1 MB' },
      { value: '2', label: '2 MB' },
      { value: '5', label: '5 MB' },
      { value: '10', label: '10 MB' },
      { value: '25', label: '25 MB' },
      { value: '50', label: '50 MB' },
    ],
    hint: 'File yang melebihi ukuran ini akan ditolak',
  },
  maxImages: {
    key: 'maxImages', label: 'Jumlah Maksimal File', type: 'text',
    placeholder: '10',
    hint: 'Jumlah maksimal file yang bisa diupload',
  },
  // ── Computed / Auto-Fill ──
  computedFormula: {
    key: 'computedFormula', label: 'Formula (Computed)', type: 'computedFormula',
    hint: 'Pilih field & operator untuk auto-hitung. Field ini otomatis disabled.',
    hideWhen: (f) => ['switch', 'fieldbox', 'upload', 'multi_upload', 'select', 'select_creatable', 'popup', 'radio', 'date', 'datetime', 'slider'].includes(f.type),
  },
  defaultValueFrom: {
    key: 'defaultValueFrom', label: 'Auto-Fill dari Field Lain', type: 'defaultValueFrom',
    hint: 'Isi otomatis dari data field lain (misal: pilih Supplier → isi Alamat dari supplier.alamat)',
    hideWhen: (f) => ['switch', 'fieldbox', 'upload', 'multi_upload', 'section', 'divider', 'fieldgroup', 'fieldgroup_end'].includes(f.type),
  },
}

// ── Common panel sets ──────────────────────────────────────────────────────
const COMMON_PANELS = [PANEL.fieldName, PANEL.label, PANEL.placeholder, PANEL.defaultValue, PANEL.required, PANEL.errorMessage, PANEL.requiredWhen, PANEL.readonly, PANEL.readonlyWhen, PANEL.fullWidth, PANEL.dependsOn, PANEL.visibleWhen, PANEL.computedFormula, PANEL.defaultValueFrom, PANEL.minLength, PANEL.maxLength, PANEL.minValue, PANEL.maxValue, PANEL.decimalPlaces, PANEL.pattern, PANEL.patternMessage]
const SELECT_PANELS = [...COMMON_PANELS, PANEL.sourceType, PANEL.apiUrl, PANEL.apiParams, PANEL.dependsOnParam, PANEL.displayField, PANEL.valueField, PANEL.staticOptions]
const SWITCH_PANELS = [PANEL.fieldName, PANEL.label, PANEL.defaultValue, PANEL.labelTrue, PANEL.labelFalse, PANEL.disabled, PANEL.fullWidth, PANEL.dependsOn, PANEL.visibleWhen]
const BOX_PANELS = [PANEL.fieldName, PANEL.label, PANEL.defaultValue, PANEL.labelTrue, PANEL.labelFalse, PANEL.fullWidth, PANEL.dependsOn, PANEL.visibleWhen]
const DATE_PANELS = [PANEL.fieldName, PANEL.label, PANEL.placeholder, PANEL.dateDefaultValue, PANEL.required, PANEL.errorMessage, PANEL.requiredWhen, PANEL.readonly, PANEL.readonlyWhen, PANEL.fullWidth, PANEL.dependsOn, PANEL.visibleWhen]
const RADIO_PANELS = [PANEL.fieldName, PANEL.label, PANEL.required, PANEL.errorMessage, PANEL.requiredWhen, PANEL.readonly, PANEL.readonlyWhen, PANEL.fullWidth, PANEL.dependsOn, PANEL.visibleWhen, PANEL.radioOptions]
const POPUP_PANELS = [PANEL.fieldName, PANEL.label, PANEL.placeholder, PANEL.required, PANEL.errorMessage, PANEL.requiredWhen, PANEL.readonly, PANEL.readonlyWhen, PANEL.fullWidth, PANEL.dependsOn, PANEL.visibleWhen, PANEL.defaultValueFrom, PANEL.apiUrl, PANEL.apiParams, PANEL.dependsOnParam, PANEL.displayField, PANEL.valueField, PANEL.popupColumns, PANEL.searchFields, PANEL.dialogTitle]
const CURRENCY_PANELS = [PANEL.fieldName, PANEL.label, PANEL.placeholder, PANEL.defaultValue, PANEL.required, PANEL.errorMessage, PANEL.requiredWhen, PANEL.readonly, PANEL.readonlyWhen, PANEL.fullWidth, PANEL.dependsOn, PANEL.visibleWhen, PANEL.computedFormula, PANEL.defaultValueFrom, PANEL.currencyPrefix, PANEL.allowDecimal, PANEL.decimalPlaces, PANEL.minValue, PANEL.maxValue]
const SLIDER_PANELS = [PANEL.fieldName, PANEL.label, PANEL.defaultValue, PANEL.required, PANEL.fullWidth, PANEL.dependsOn, PANEL.visibleWhen, PANEL.sliderMin, PANEL.sliderMax, PANEL.sliderStep, PANEL.sliderUnit]
const SECTION_PANELS = [PANEL.sectionTitle, PANEL.visibleWhen]
const UPLOAD_PANELS = [PANEL.fieldName, PANEL.label, PANEL.required, PANEL.errorMessage, PANEL.requiredWhen, PANEL.readonly, PANEL.readonlyWhen, PANEL.fullWidth, PANEL.dependsOn, PANEL.visibleWhen, PANEL.uploadAccept, PANEL.maxSizeMB]
const MULTI_UPLOAD_PANELS = [PANEL.fieldName, PANEL.label, PANEL.required, PANEL.errorMessage, PANEL.requiredWhen, PANEL.readonly, PANEL.readonlyWhen, PANEL.fullWidth, PANEL.dependsOn, PANEL.visibleWhen, PANEL.uploadAccept, PANEL.maxSizeMB, PANEL.maxImages]

// ── Static options helpers ────────────────────────────────────────────────
// Returns a JS array literal string for code generation (from array of {value, label, parentValue?})
function parseStaticOptionsLiteral(items, includeParentValue = false) {
  if (!Array.isArray(items) || !items.length) return '[]'
  return '[' + items.map(it => {
    const v = String(it.value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const l = String(it.label || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    if (includeParentValue && it.parentValue) {
      const pv = String(it.parentValue).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
      return `{ value: '${v}', label: '${l}', parentValue: '${pv}' }`
    }
    return `{ value: '${v}', label: '${l}' }`
  }).join(', ') + ']'
}

export function normalizeDecimalPlaces(value, fallback = 2) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(6, Math.max(0, parsed))
}

function getDecimalPlacesValue(field, fallback = 2) {
  return normalizeDecimalPlaces(field?.decimalPlaces, fallback)
}

function getDecimalPlacesAttr(field) {
  if (field.type === 'decimal' || field.type === 'fieldnumber_decimal') {
    return `\n              :decimalPlaces="${getDecimalPlacesValue(field)}"`
  }
  if (field.type === 'currency' && field.allowDecimal !== false) {
    return `\n              :decimalPlaces="${getDecimalPlacesValue(field)}"`
  }
  return ''
}

// ── Generate helpers ───────────────────────────────────────────────────────
function getDisabledAttr(f) {
  if (f.dependsOn) return `:disabled="!values.${f.dependsOn} || loading || isReadOnly"`
  return ':disabled="loading || isReadOnly"'
}

function getReadonlyAttr(f) {
  if (f.readonly) return ':readonly="true"'
  if (f.readonlyWhenField && f.readonlyWhenValue !== undefined && f.readonlyWhenValue !== '') {
    const val = String(f.readonlyWhenValue).replace(/'/g, "\\'")
    return `:readonly="isReadOnly || String(values.${f.readonlyWhenField}) === '${val}'"`
  }
  return ':readonly="isReadOnly"'
}

function genFieldX(f) {
  const typeAttr = f.type !== 'text' ? `\n              type="${f.type}"` : ''
  const readonlyAttr = getReadonlyAttr(f)
  const decimalPlacesAttr = getDecimalPlacesAttr(f)
  return `            <FieldX
              id="${f.field}"
              label="${f.label}"${typeAttr}
              :value="values.${f.field}"
              :errorname="errors.${f.field} ? 'failed' : ''"
              @input="(v) => (values.${f.field} = v)"
              :hints="errors.${f.field}"
              :required="${f.required ? '!isReadOnly' : 'false'}"
              ${getDisabledAttr(f)}
              ${readonlyAttr}
              ${decimalPlacesAttr}
              placeholder="${f.placeholder || f.label}"
              class="w-full"
            />`
}

function genTextarea(f) {
  const readonlyAttr = getReadonlyAttr(f)
  return `            <FieldTextarea
              id="${f.field}"
              label="${f.label}"
              :value="values.${f.field}"
              :errorname="errors.${f.field} ? 'failed' : ''"
              @input="(v) => (values.${f.field} = v)"
              :hints="errors.${f.field}"
              :required="${f.required ? '!isReadOnly' : 'false'}"
              ${getDisabledAttr(f)}
              ${readonlyAttr}
              placeholder="${f.placeholder || f.label}"
              class="w-full"
            />`
}

function genFieldNumber(f) {
  const fnType = f.type === 'fieldnumber_decimal' ? 'decimal' : 'integer'
  const readonlyAttr = getReadonlyAttr(f)
  const decimalPlacesAttr = getDecimalPlacesAttr(f)
  return `            <FieldNumber
              id="${f.field}"
              label="${f.label}"
              type="${fnType}"
              :value="values.${f.field}"
              :errorname="errors.${f.field} ? 'failed' : ''"
              @input="(v) => (values.${f.field} = v)"
              :hints="errors.${f.field}"
              :required="${f.required ? '!isReadOnly' : 'false'}"
              ${getDisabledAttr(f)}
              ${readonlyAttr}
              ${decimalPlacesAttr}
              class="w-full"
            />`
}

function genSwitch(f) {
  const disabledExpr = f.readonly
    ? ':disabled="true"'
    : getDisabledAttr(f)
  const readonlyAttr = getReadonlyAttr(f)
  return `            <FieldStatus
              v-model="values.${f.field}"
              label="${f.label || ''}"
              ${disabledExpr}
              ${readonlyAttr}
              active-text="${f.labelTrue || 'Aktif'}"
              inactive-text="${f.labelFalse || 'Tidak Aktif'}"
            />`
}

function genFieldBox(f) {
  return `            <FieldBox
              id="${f.field}"
              label="${f.label}"
              :value="values.${f.field}"
              @input="(v) => (values.${f.field} = v)"
              ${getDisabledAttr(f)}
              :readonly="isReadOnly"
              labelTrue="${f.labelTrue || 'Ya'}"
              labelFalse="${f.labelFalse || 'Tidak'}"
              class="w-full"
            />`
}

function genSelect(f, component = 'FieldSelect', allFields = []) {
  const readonlyAttr = getReadonlyAttr(f)
  const isStatic = f.sourceType === 'static'
  const vf = isStatic ? 'value' : (f.valueField || 'id')
  const df = isStatic ? 'label' : (f.displayField || 'name')

  // ── Chain / cascading logic ──
  const hasDependsOn = !isStatic && f.dependsOn && f.dependsOnParam
  const hasStaticDependsOn = isStatic && !!f.dependsOn
  const hasSimpleDependsOn = !!f.dependsOn // dependsOn without param (just disable)

  // ── Source attribute (static options or API) ──
  let sourceAttr
  if (isStatic && hasStaticDependsOn) {
    // Static cascading: filter options by parent value
    const allOpts = parseStaticOptionsLiteral(f.staticOptions || [], true)
    sourceAttr = `:options="${allOpts}.filter(o => !o.parentValue || o.parentValue === values.${f.dependsOn})"`
  } else if (isStatic) {
    sourceAttr = `:options="${parseStaticOptionsLiteral(f.staticOptions || [])}"`
  } else {
    // Filter out params that match dependsOnParam (those are handled by :apiParams binding)
    const paramsArr = Array.isArray(f.apiParams)
      ? f.apiParams.filter(p => p.key && !(hasDependsOn && p.key === f.dependsOnParam))
      : []
    const qs = paramsArr.map(p => `${p.key}=${p.value || ''}`).join('&')
    const params = qs ? `?${qs}` : ''
    sourceAttr = `apiUrl="${f.apiUrl || ''}${params}"`
  }
  // Find all fields that depend on THIS field (children)
  const childFields = allFields.filter(c => c.dependsOn === f.field && c.field)
  // Build recursive list of all descendants (children, grandchildren, etc.)
  function getDescendants(fieldName) {
    const direct = allFields.filter(c => c.dependsOn === fieldName && c.field)
    let result = []
    for (const child of direct) {
      result.push(child.field)
      result = result.concat(getDescendants(child.field))
    }
    return result
  }
  const descendantFields = getDescendants(f.field)

  // ── @input handler ──
  let inputHandler
  if (descendantFields.length > 0) {
    // When this field changes, clear all descendants
    const clears = descendantFields.map(cf => `values.${cf} = ''`).join('; ')
    inputHandler = `@input="(v) => { values.${f.field} = v; ${clears} }"`
  } else {
    inputHandler = `@input="(v) => (values.${f.field} = v)"`
  }

  // ── @update:valueFull handler (for defaultValueFrom auto-fill) ──
  const autoFillTargets = allFields.filter(af => af.defaultValueFrom?.field === f.field && af.defaultValueFrom?.property)
  let valueFullAttr = ''
  if (autoFillTargets.length > 0) {
    const fills = autoFillTargets.map(af => `values.${af.field} = obj?.${af.defaultValueFrom.property} || ''`).join('; ')
    valueFullAttr = `\n              @update:valueFull="(obj) => { ${fills} }"`
  }

  // ── :disabled binding ──
  let disabledAttr
  if (hasDependsOn || hasSimpleDependsOn) {
    disabledAttr = `:disabled="!values.${f.dependsOn} || loading || isReadOnly"`
  } else {
    disabledAttr = ':disabled="loading || isReadOnly"'
  }

  // ── :apiParams binding (for cascading) ──
  let apiParamsAttr = ''
  if (hasDependsOn) {
    apiParamsAttr = `\n              :apiParams="{ '${f.dependsOnParam}': values.${f.dependsOn} }"`
  }

  return `            <${component}
              id="${f.field}"
              label="${f.label}"
              :value="values.${f.field}"
              :errorname="errors.${f.field} ? 'failed' : ''"
              ${inputHandler}${valueFullAttr}
              :hints="errors.${f.field}"
              :required="${f.required ? '!isReadOnly' : 'false'}"
              ${disabledAttr}
              ${readonlyAttr}
              ${sourceAttr}${apiParamsAttr}
              displayField="${df}"
              valueField="${vf}"
              placeholder="${f.placeholder || f.label}"
              :clearable="true"
              class="w-full"
            />`
}

function genFieldDate(f) {
  const readonlyAttr = getReadonlyAttr(f)
  return `            <FieldDate
              id="${f.field}"
              label="${f.label}"
              :value="values.${f.field}"
              :errorname="errors.${f.field} ? 'failed' : ''"
              @input="(v) => (values.${f.field} = v)"
              :hints="errors.${f.field}"
              :required="${f.required ? '!isReadOnly' : 'false'}"
              ${getDisabledAttr(f)}
              ${readonlyAttr}
              placeholder="${f.placeholder || f.label}"
              :clearable="true"
              class="w-full"
            />`
}

function genFieldDateTime(f) {
  const readonlyAttr = getReadonlyAttr(f)
  return `            <FieldDateTime
              id="${f.field}"
              label="${f.label}"
              :value="values.${f.field}"
              :errorname="errors.${f.field} ? 'failed' : ''"
              @input="(v) => (values.${f.field} = v)"
              :hints="errors.${f.field}"
              :required="${f.required ? '!isReadOnly' : 'false'}"
              ${getDisabledAttr(f)}
              ${readonlyAttr}
              placeholder="${f.placeholder || f.label}"
              :clearable="true"
              class="w-full"
            />`
}

function genPopup(f, allFields = []) {
  const readonlyAttr = getReadonlyAttr(f)
  const vf = f.valueField || 'id'
  const df = f.displayField || 'name'

  // ── Chain / cascading logic ──
  const hasDependsOn = f.dependsOn && f.dependsOnParam

  // Build API params
  const paramsArr = Array.isArray(f.apiParams)
    ? f.apiParams.filter(p => p.key && !(hasDependsOn && p.key === f.dependsOnParam))
    : []
  const qs = paramsArr.map(p => `${p.key}=${p.value || ''}`).join('&')
  const params = qs ? `?${qs}` : ''

  // Build columns literal
  const cols = Array.isArray(f.popupColumns) && f.popupColumns.length
    ? f.popupColumns.filter(c => c.field)
    : []
  const colsLiteral = cols.length
    ? '[' + cols.map(c => {
        const parts = [`field: '${c.field}'`]
        if (c.headerName) parts.push(`headerName: '${c.headerName}'`)
        if (c.width) parts.push(`width: '${c.width}'`)
        if (c.flex) parts.push(`flex: ${c.flex}`)
        return `{ ${parts.join(', ')} }`
      }).join(', ') + ']'
    : '[]'

  // Find descendants for cascade clear
  function getDescendants(fieldName) {
    const direct = allFields.filter(c => c.dependsOn === fieldName && c.field)
    let result = []
    for (const child of direct) {
      result.push(child.field)
      result = result.concat(getDescendants(child.field))
    }
    return result
  }
  const descendantFields = getDescendants(f.field)

  let inputHandler
  if (descendantFields.length > 0) {
    const clears = descendantFields.map(cf => `values.${cf} = ''`).join('; ')
    inputHandler = `@input="(v) => { values.${f.field} = v; ${clears} }"`
  } else {
    inputHandler = `@input="(v) => (values.${f.field} = v)"`
  }

  // ── @update:valueFull handler (for defaultValueFrom auto-fill) ──
  const autoFillTargets = allFields.filter(af => af.defaultValueFrom?.field === f.field && af.defaultValueFrom?.property)
  let valueFullAttr = ''
  if (autoFillTargets.length > 0) {
    const fills = autoFillTargets.map(af => `values.${af.field} = obj?.${af.defaultValueFrom.property} || ''`).join('; ')
    valueFullAttr = `\n              @update:valueFull="(obj) => { ${fills} }"`
  }

  let apiParamsAttr = ''
  if (hasDependsOn) {
    apiParamsAttr = `\n              :apiParams="{ ${f.dependsOnParam}: values.${f.dependsOn} }"`
  }

  const searchFieldsAttr = f.searchFields ? `\n              searchFields="${f.searchFields}"` : ''
  const dialogTitleAttr = f.dialogTitle ? `\n              dialogTitle="${f.dialogTitle}"` : ''

  return `            <FieldPopUp
              id="${f.field}"
              label="${f.label}"
              :value="values.${f.field}"
              :errorname="errors.${f.field} ? 'failed' : ''"
              ${inputHandler}${valueFullAttr}
              :hints="errors.${f.field}"
              :required="${f.required ? '!isReadOnly' : 'false'}"
              ${getDisabledAttr(f)}
              ${readonlyAttr}
              apiUrl="${f.apiUrl || ''}${params}"${apiParamsAttr}
              displayField="${df}"
              valueField="${vf}"
              :columns="${colsLiteral}"${searchFieldsAttr}${dialogTitleAttr}
              placeholder="${f.placeholder || f.label}"
              :clearable="true"
              class="w-full"
            />`
}

function genFieldRadio(f) {
  const readonlyAttr = getReadonlyAttr(f)
  const optionsLiteral = parseStaticOptionsLiteral(f.staticOptions || [])
  return `            <FieldRadio
              id="${f.field}"
              label="${f.label}"
              :value="values.${f.field}"
              :errorname="errors.${f.field} ? 'failed' : ''"
              @input="(v) => (values.${f.field} = v)"
              :hints="errors.${f.field}"
              :required="${f.required ? '!isReadOnly' : 'false'}"
              ${getDisabledAttr(f)}
              ${readonlyAttr}
              :options="${optionsLiteral}"
              class="w-full"
            />`
}

function genFieldCurrency(f) {
  const readonlyAttr = getReadonlyAttr(f)
  const prefix = f.currencyPrefix || 'Rp'
  const allowDecimal = f.allowDecimal !== false
  const decimalPlacesAttr = allowDecimal ? getDecimalPlacesAttr(f) : ''
  return `            <FieldCurrency
              id="${f.field}"
              label="${f.label}"
              :value="values.${f.field}"
              :errorname="errors.${f.field} ? 'failed' : ''"
              @input="(v) => (values.${f.field} = v)"
              :hints="errors.${f.field}"
              :required="${f.required ? '!isReadOnly' : 'false'}"
              ${getDisabledAttr(f)}
              ${readonlyAttr}
              prefix="${prefix}"
              :allowDecimal="${allowDecimal}"
              ${decimalPlacesAttr}
              placeholder="${f.placeholder || f.label}"
              class="w-full"
            />`
}

function genFieldSlider(f) {
  const min = f.sliderMin || 0
  const max = f.sliderMax || 100
  const step = f.sliderStep || 1
  const unit = f.sliderUnit || ''
  return `            <FieldSlider
              id="${f.field}"
              label="${f.label}"
              :value="values.${f.field}"
              @input="(v) => (values.${f.field} = v)"
              ${getDisabledAttr(f)}
              :readonly="isReadOnly"
              :min="${min}"
              :max="${max}"
              :step="${step}"
              unit="${unit}"
              class="w-full"
            />`
}

function genSection(f) {
  return `            <div class="col-span-full border-b border-border pb-2 pt-4">
              <h3 class="text-base font-semibold text-foreground">${f.label || 'Section'}</h3>
            </div>`
}

// Convert uploadAccept array (e.g. ['image/png', 'image/jpeg', '.pdf']) to accept string for <input>
function resolveAcceptString(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '*'
  if (arr.includes('*')) return '*'
  return arr.join(',')
}

function genFieldUpload(f) {
  const readonlyAttr = getReadonlyAttr(f)
  const accept = resolveAcceptString(f.uploadAccept)
  const maxSizeMB = Number(f.maxSizeMB) || 5
  return `            <FieldUpload
              id="${f.field}"
              label="${f.label}"
              :value="values.${f.field}"
              @input="(v) => (values.${f.field} = v)"
              :required="${f.required ? '!isReadOnly' : 'false'}"
              ${getDisabledAttr(f)}
              ${readonlyAttr}
              accept="${accept}"
              :maxSizeMB="${maxSizeMB}"
              hints="Upload file (max ${maxSizeMB}MB)"
              class="w-full"
            />`
}

function genFieldMultiUpload(f) {
  const readonlyAttr = getReadonlyAttr(f)
  const accept = resolveAcceptString(f.uploadAccept)
  const maxImages = f.maxImages || 10
  const maxSizeMB = Number(f.maxSizeMB) || 5
  return `            <FieldMultiUpload
              id="${f.field}"
              label="${f.label}"
              :value="values.${f.field}"
              @input="(v) => (values.${f.field} = v)"
              :required="${f.required ? '!isReadOnly' : 'false'}"
              ${getDisabledAttr(f)}
              ${readonlyAttr}
              accept="${accept}"
              :maxSizeMB="${maxSizeMB}"
              :maxImages="${maxImages}"
              hints="Upload file (max ${maxSizeMB}MB per file, maksimal ${maxImages} file)"
              class="w-full"
            />`
}

// ── Conditional visibility wrapper ─────────────────────────────────────────
function wrapVisibleWhen(tpl, f) {
  // New format: separate fields
  if (f.visibleWhenField && f.visibleWhenValue !== undefined && f.visibleWhenValue !== '') {
    return `            <div v-if="values.${f.visibleWhenField} === '${f.visibleWhenValue}'">\n${tpl}\n            </div>`
  }
  // Legacy format: "field=value" string
  if (!f.visibleWhen) return tpl
  const parts = f.visibleWhen.split('=')
  if (parts.length !== 2) return tpl
  const watchField = parts[0].trim()
  const watchValue = parts[1].trim()
  return `            <div v-if="values.${watchField} === '${watchValue}'">\n${tpl}\n            </div>`
}

// ── The Registry ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export const FIELD_REGISTRY = [
  // ── FieldX variants ────────────────────────────────────────
  {
    value: 'text', label: 'FieldX (Text)', component: 'FieldX', category: 'input',
    searchable: true, showInMobile: true, hasError: true,
    defaultMeta: {},
    panelFields: COMMON_PANELS,
    previewProps: (f) => ({ label: f.label || 'Label', type: 'text', value: '', placeholder: f.placeholder || f.label, required: f.required }),
    generateTemplate: genFieldX,
  },
  {
    value: 'number', label: 'FieldX (Number)', component: 'FieldX', category: 'input',
    searchable: true, showInMobile: true, hasError: true,
    defaultMeta: {},
    panelFields: COMMON_PANELS,
    previewProps: (f) => ({ label: f.label || 'Label', type: 'number', value: '', placeholder: f.placeholder || f.label, required: f.required }),
    generateTemplate: genFieldX,
  },
  {
    value: 'decimal', label: 'FieldX (Decimal)', component: 'FieldX', category: 'input',
    searchable: true, showInMobile: true, hasError: true,
    defaultMeta: { decimalPlaces: 2 },
    panelFields: COMMON_PANELS,
    previewProps: (f) => ({ label: f.label || 'Label', type: 'decimal', value: '', placeholder: f.placeholder || f.label, required: f.required, decimalPlaces: getDecimalPlacesValue(f) }),
    generateTemplate: genFieldX,
  },
  {
    value: 'email', label: 'FieldX (Email)', component: 'FieldX', category: 'input',
    searchable: true, showInMobile: true, hasError: true,
    defaultMeta: {},
    panelFields: COMMON_PANELS,
    previewProps: (f) => ({ label: f.label || 'Label', type: 'email', value: '', placeholder: f.placeholder || f.label, required: f.required }),
    generateTemplate: genFieldX,
  },
  {
    value: 'tel', label: 'FieldX (Telephone)', component: 'FieldX', category: 'input',
    searchable: true, showInMobile: true, hasError: true,
    defaultMeta: {},
    panelFields: COMMON_PANELS,
    previewProps: (f) => ({ label: f.label || 'Label', type: 'tel', value: '', placeholder: f.placeholder || f.label, required: f.required }),
    generateTemplate: genFieldX,
  },
  {
    value: 'password', label: 'FieldX (Password)', component: 'FieldX', category: 'input',
    searchable: false, showInMobile: false, hasError: true,
    defaultMeta: {},
    panelFields: COMMON_PANELS,
    previewProps: (f) => ({ label: f.label || 'Label', type: 'password', value: '', placeholder: f.placeholder || f.label, required: f.required }),
    generateTemplate: genFieldX,
  },

  // ── FieldTextarea ──────────────────────────────────────────
  {
    value: 'textarea', label: 'FieldTextarea', component: 'FieldTextarea', category: 'input',
    searchable: true, showInMobile: true, hasError: true,
    defaultMeta: {},
    panelFields: COMMON_PANELS,
    previewProps: (f) => ({ label: f.label || 'Label', value: '', placeholder: f.placeholder || f.label, required: f.required }),
    generateTemplate: genTextarea,
  },

  // ── FieldNumber ────────────────────────────────────────────
  {
    value: 'fieldnumber', label: 'FieldNumber (Integer)', component: 'FieldNumber', category: 'number',
    searchable: false, showInMobile: false, hasError: true,
    defaultMeta: {},
    panelFields: COMMON_PANELS,
    previewProps: (f) => ({ label: f.label || 'Label', value: '', type: 'integer' }),
    generateTemplate: genFieldNumber,
  },
  {
    value: 'fieldnumber_decimal', label: 'FieldNumber (Decimal)', component: 'FieldNumber', category: 'number',
    searchable: false, showInMobile: false, hasError: true,
    defaultMeta: { decimalPlaces: 2 },
    panelFields: COMMON_PANELS,
    previewProps: (f) => ({ label: f.label || 'Label', value: '', type: 'decimal', decimalPlaces: getDecimalPlacesValue(f) }),
    generateTemplate: genFieldNumber,
  },

  // ── Switch ─────────────────────────────────────────────────
  {
    value: 'switch', label: 'Switch', component: 'Switch', category: 'toggle',
    searchable: false, showInMobile: false, hasError: false,
    isSwitch: true,
    defaultMeta: { defaultValue: 'true', labelTrue: 'Aktif', labelFalse: 'Tidak Aktif' },
    panelFields: SWITCH_PANELS,
    previewProps: (f) => ({}), // Switch uses custom template in BuilderFieldPreview
    generateTemplate: genSwitch,
    generateDefault: (f) => `  ${f.field}: ${f.defaultValue || 'true'},`,
    generateReset: (f) => `    ${f.field}: ${f.defaultValue || 'true'},`,
    generatePayload: (f) => `    ${f.field}: values.${f.field},`,
  },

  // ── FieldBox (Checkbox) ────────────────────────────────────
  {
    value: 'fieldbox', label: 'FieldBox (Checkbox)', component: 'FieldBox', category: 'toggle',
    searchable: false, showInMobile: false, hasError: false,
    isFieldBox: true,
    defaultMeta: { defaultValue: 'true', labelTrue: 'Ya', labelFalse: 'Tidak' },
    panelFields: BOX_PANELS,
    previewProps: (f) => ({ label: f.label || 'Label', value: f.defaultValue !== 'false', labelTrue: f.labelTrue || 'Ya', labelFalse: f.labelFalse || 'Tidak' }),
    generateTemplate: genFieldBox,
    generateDefault: (f) => `  ${f.field}: ${f.defaultValue || 'true'},`,
    generateReset: (f) => `    ${f.field}: ${f.defaultValue || 'true'},`,
    generatePayload: (f) => `    ${f.field}: values.${f.field},`,
  },

  // ── FieldDate ──────────────────────────────────────────────
  {
    value: 'date', label: 'FieldDate', component: 'FieldDate', category: 'date',
    searchable: false, showInMobile: true, hasError: true,
    defaultMeta: { defaultValue: '' },
    panelFields: DATE_PANELS,
    previewProps: (f) => ({ label: f.label || 'Label', value: '', placeholder: f.placeholder || f.label, required: f.required, clearable: true }),
    generateTemplate: genFieldDate,
    generateDefault: (f) => {
      if (f.defaultValue === 'NOW') return `  ${f.field}: new Date().toISOString().slice(0, 10),`
      return `  ${f.field}: '',`
    },
    generateReset: (f) => {
      if (f.defaultValue === 'NOW') return `    ${f.field}: new Date().toISOString().slice(0, 10),`
      return `    ${f.field}: '',`
    },
    generatePayload: (f) => `    ${f.field}: values.${f.field},`,
  },

  // ── FieldDateTime ──────────────────────────────────────────
  {
    value: 'datetime', label: 'FieldDateTime', component: 'FieldDateTime', category: 'date',
    searchable: false, showInMobile: true, hasError: true,
    defaultMeta: { defaultValue: '' },
    panelFields: DATE_PANELS,
    previewProps: (f) => ({ label: f.label || 'Label', value: '', placeholder: f.placeholder || f.label, required: f.required, clearable: true }),
    generateTemplate: genFieldDateTime,
    generateDefault: (f) => {
      if (f.defaultValue === 'NOW') return `  ${f.field}: (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + 'T' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') })(),`
      return `  ${f.field}: '',`
    },
    generateReset: (f) => {
      if (f.defaultValue === 'NOW') return `    ${f.field}: (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + 'T' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') })(),`
      return `    ${f.field}: '',`
    },
    generatePayload: (f) => `    ${f.field}: values.${f.field},`,
  },

  // ── FieldRadio ─────────────────────────────────────────────
  {
    value: 'radio', label: 'FieldRadio', component: 'FieldRadio', category: 'selection',
    searchable: false, showInMobile: true, hasError: true,
    defaultMeta: { sourceType: 'static', staticOptions: [{ value: 'yes', label: 'Ya' }, { value: 'no', label: 'Tidak' }] },
    panelFields: RADIO_PANELS,
    previewProps: (f) => {
      const opts = f.staticOptions && f.staticOptions.length ? f.staticOptions : [{ value: 'yes', label: 'Ya' }, { value: 'no', label: 'Tidak' }]
      return { label: f.label || 'Label', value: '', options: opts, required: f.required }
    },
    generateTemplate: genFieldRadio,
    generateDefault: (f) => `  ${f.field}: '${f.defaultValue || ''}',`,
    generateReset: (f) => `    ${f.field}: '${f.defaultValue || ''}',`,
    generatePayload: (f) => `    ${f.field}: values.${f.field},`,
  },

  // ── FieldPopUp ─────────────────────────────────────────────
  {
    value: 'popup', label: 'FieldPopUp', component: 'FieldPopUp', category: 'selection',
    searchable: false, showInMobile: false, hasError: true,
    defaultMeta: { apiUrl: '', apiParams: [], displayField: 'name', valueField: 'id', popupColumns: [], searchFields: '', dialogTitle: '', dependsOn: '', dependsOnParam: '' },
    panelFields: POPUP_PANELS,
    previewProps: (f, previewValues) => {
      // Build apiParams from user-configured params (same pattern as FieldSelect)
      const extraParams = {}
      if (Array.isArray(f.apiParams)) {
        f.apiParams.forEach(p => { if (p.key) extraParams[p.key] = p.value || '' })
      }
      const result = {
        label: f.label || 'Label',
        value: '',
        displayField: f.displayField || 'name',
        valueField: f.valueField || 'id',
        placeholder: f.placeholder || f.label,
        required: f.required,
        clearable: true,
        apiUrl: f.apiUrl || '',
        apiParams: { ...extraParams },
        columns: f.popupColumns || [],
        searchFields: f.searchFields || '',
        dialogTitle: f.dialogTitle || '',
      }
      if (f.dependsOn && f.dependsOnParam && previewValues) {
        const parentVal = previewValues[f.dependsOn] || ''
        result.apiParams[f.dependsOnParam] = parentVal
        if (!parentVal) result.disabled = true
      }
      return result
    },
    generateTemplate: (f, allFields) => genPopup(f, allFields),
    generateDefault: (f) => `  ${f.field}: '',`,
    generateReset: (f) => `    ${f.field}: '',`,
    generatePayload: (f) => `    ${f.field}: values.${f.field} || null,`,
  },
  {
    value: 'space', label: 'Space', component: null, category: 'layout',
    searchable: false, showInMobile: false, hasError: false,
    isSpace: true,
    defaultMeta: {},
    panelFields: [],
    previewProps: () => ({}),
    generateTemplate: () => `            <div></div>`,
    generateDefault: () => null,
    generateReset: () => null,
    generatePayload: () => null,
  },

  // ── Section Divider ────────────────────────────────────────
  {
    value: 'section', label: 'Section Divider', component: null, category: 'layout',
    searchable: false, showInMobile: false, hasError: false,
    isSection: true,
    defaultMeta: { label: 'Section Title' },
    panelFields: SECTION_PANELS,
    previewProps: () => ({}),
    generateTemplate: genSection,
    generateDefault: () => null,
    generateReset: () => null,
    generatePayload: () => null,
  },

  // ── Field Group (Start) ────────────────────────────────────
  {
    value: 'fieldgroup', label: 'Field Group (Start)', component: null, category: 'layout',
    searchable: false, showInMobile: false, hasError: false,
    isFieldGroup: true,
    defaultMeta: { label: 'Group Title' },
    panelFields: [{ key: 'label', label: 'Judul Group', type: 'text', placeholder: 'Informasi Pribadi' }, PANEL.visibleWhen],
    previewProps: () => ({}),
    generateTemplate: () => null,
    generateDefault: () => null,
    generateReset: () => null,
    generatePayload: () => null,
  },

  // ── Field Group (End) ──────────────────────────────────────
  {
    value: 'fieldgroup_end', label: 'Field Group (End)', component: null, category: 'layout',
    searchable: false, showInMobile: false, hasError: false,
    isFieldGroupEnd: true,
    defaultMeta: {},
    panelFields: [],
    previewProps: () => ({}),
    generateTemplate: () => null,
    generateDefault: () => null,
    generateReset: () => null,
    generatePayload: () => null,
  },

  // ── FieldCurrency ──────────────────────────────────────────
  {
    value: 'currency', label: 'FieldCurrency', component: 'FieldCurrency', category: 'number',
    searchable: false, showInMobile: false, hasError: true,
    defaultMeta: { currencyPrefix: 'Rp', allowDecimal: true, decimalPlaces: 2 },
    panelFields: CURRENCY_PANELS,
    previewProps: (f) => ({
      label: f.label || 'Label', value: '', prefix: f.currencyPrefix || 'Rp',
      allowDecimal: f.allowDecimal !== false, decimalPlaces: getDecimalPlacesValue(f), placeholder: f.placeholder || f.label, required: f.required,
    }),
    generateTemplate: genFieldCurrency,
  },

  // ── FieldSlider ────────────────────────────────────────────
  {
    value: 'slider', label: 'FieldSlider', component: 'FieldSlider', category: 'number',
    searchable: false, showInMobile: false, hasError: false,
    defaultMeta: { sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: '' },
    panelFields: SLIDER_PANELS,
    previewProps: (f) => ({
      label: f.label || 'Label', value: f.defaultValue || '0',
      min: Number(f.sliderMin) || 0, max: Number(f.sliderMax) || 100,
      step: Number(f.sliderStep) || 1, unit: f.sliderUnit || '',
    }),
    generateTemplate: genFieldSlider,
  },

  // ── FieldUpload (Single) ────────────────────────────────────
  {
    value: 'upload', label: 'FieldUpload', component: 'FieldUpload', category: 'input',
    searchable: false, showInMobile: false, hasError: true,
    defaultMeta: { uploadAccept: ['*'], maxSizeMB: '5' },
    panelFields: UPLOAD_PANELS,
    previewProps: (f) => ({ label: f.label || 'Upload', value: '', accept: resolveAcceptString(f.uploadAccept), maxSizeMB: Number(f.maxSizeMB) || 5, required: f.required }),
    generateTemplate: genFieldUpload,
    generateDefault: (f) => `  ${f.field}: "",`,
    generateReset: (f) => `    ${f.field}: "",`,
    generatePayload: (f) => `    ${f.field}: values.${f.field} || null,`,
  },

  // ── FieldMultiUpload ────────────────────────────────────────
  {
    value: 'multi_upload', label: 'FieldMultiUpload', component: 'FieldMultiUpload', category: 'input',
    searchable: false, showInMobile: false, hasError: true,
    defaultMeta: { uploadAccept: ['*'], maxSizeMB: '5', maxImages: 10 },
    panelFields: MULTI_UPLOAD_PANELS,
    previewProps: (f) => ({ label: f.label || 'Upload', value: [], accept: resolveAcceptString(f.uploadAccept), maxSizeMB: Number(f.maxSizeMB) || 5, maxImages: Number(f.maxImages) || 10, required: f.required }),
    generateTemplate: genFieldMultiUpload,
    generateDefault: (f) => `  ${f.field}: [],`,
    generateReset: (f) => `    ${f.field}: [],`,
    generatePayload: (f) => `    ${f.field}: values.${f.field} || [],`,
  },

  // ── FieldSelect ────────────────────────────────────────────
  {
    value: 'select', label: 'FieldSelect', component: 'FieldSelect', category: 'selection',
    searchable: false, showInMobile: false, hasError: true,
    defaultMeta: { sourceType: 'api', apiUrl: '', apiParams: [], displayField: 'name', valueField: 'id', staticOptions: [], dependsOn: '', dependsOnParam: '' },
    panelFields: SELECT_PANELS,
    previewProps: (f, previewValues) => {
      const isStatic = f.sourceType === 'static'
      const vf = isStatic ? 'value' : (f.valueField || 'id')
      const df = isStatic ? 'label' : (f.displayField || 'name')
      const base = { label: f.label || 'Label', value: '', displayField: df, valueField: vf, placeholder: f.placeholder || f.label, required: f.required, clearable: true }
      if (isStatic) {
        let opts = f.staticOptions || []
        // Static cascading: filter by parent value
        if (f.dependsOn && previewValues) {
          const parentVal = previewValues[f.dependsOn] || ''
          if (!parentVal) return { ...base, options: [], disabled: true }
          opts = opts.filter(o => !o.parentValue || o.parentValue === parentVal)
        }
        return { ...base, options: opts }
      }
      // Build apiParams from user-configured params
      const extraParams = {}
      if (Array.isArray(f.apiParams)) {
        f.apiParams.forEach(p => { if (p.key) extraParams[p.key] = p.value || '' })
      }
      // Cascading: if dependsOn is set, pass parent value as apiParams and disable if parent empty
      const result = { ...base, apiUrl: f.apiUrl || '', apiParams: { ...extraParams } }
      if (f.dependsOn && f.dependsOnParam && previewValues) {
        const parentVal = previewValues[f.dependsOn] || ''
        result.apiParams[f.dependsOnParam] = parentVal
        if (!parentVal) result.disabled = true
      }
      return result
    },
    generateTemplate: (f, allFields) => genSelect(f, 'FieldSelect', allFields),
  },

  // ── FieldSelectCreatable ───────────────────────────────────
  {
    value: 'select_creatable', label: 'FieldSelect Creatable', component: 'FieldSelectCreatable', category: 'selection',
    searchable: false, showInMobile: false, hasError: true,
    defaultMeta: { sourceType: 'api', apiUrl: '', apiParams: [], displayField: 'name', valueField: 'id', staticOptions: [], dependsOn: '', dependsOnParam: '' },
    panelFields: SELECT_PANELS,
    previewProps: (f, previewValues) => {
      const isStatic = f.sourceType === 'static'
      const vf = isStatic ? 'value' : (f.valueField || 'id')
      const df = isStatic ? 'label' : (f.displayField || 'name')
      const base = { label: f.label || 'Label', value: '', displayField: df, valueField: vf, placeholder: f.placeholder || f.label, required: f.required, clearable: true }
      if (isStatic) {
        let opts = f.staticOptions || []
        if (f.dependsOn && previewValues) {
          const parentVal = previewValues[f.dependsOn] || ''
          if (!parentVal) return { ...base, options: [], disabled: true }
          opts = opts.filter(o => !o.parentValue || o.parentValue === parentVal)
        }
        return { ...base, options: opts }
      }
      const extraParams = {}
      if (Array.isArray(f.apiParams)) {
        f.apiParams.forEach(p => { if (p.key) extraParams[p.key] = p.value || '' })
      }
      const result = { ...base, apiUrl: f.apiUrl || '', apiParams: { ...extraParams } }
      if (f.dependsOn && f.dependsOnParam && previewValues) {
        const parentVal = previewValues[f.dependsOn] || ''
        result.apiParams[f.dependsOnParam] = parentVal
        if (!parentVal) result.disabled = true
      }
      return result
    },
    generateTemplate: (f, allFields) => genSelect(f, 'FieldSelectCreatable', allFields),
  },
]

// ── Lookup helpers ─────────────────────────────────────────────────────────
export function getRegistryEntry(type) {
  return FIELD_REGISTRY.find(r => r.value === type)
}

/** Build a blank field config with all defaultMeta merged in */
export function createBlankField() {
  // Collect all possible defaultMeta keys from all registry entries
  const allMetaKeys = {}
  FIELD_REGISTRY.forEach(r => {
    if (r.defaultMeta) Object.assign(allMetaKeys, r.defaultMeta)
  })
  return {
    field: '',
    label: '',
    type: 'text',
    required: false,
    readonly: false,
    placeholder: '',
    defaultValue: '',
    labelTrue: 'Aktif',
    labelFalse: 'Tidak Aktif',
    sourceType: 'api',
    apiUrl: '',
    apiParams: [],
    displayField: 'name',
    valueField: 'id',
    staticOptions: [],
    fullWidth: false,
    dependsOn: '',
    dependsOnParam: '',
    visibleWhen: '',
    visibleWhenField: '',
    visibleWhenValue: '',
    minLength: '',
    maxLength: '',
    minValue: '',
    maxValue: '',
    pattern: '',
    patternMessage: '',
    decimalPlaces: 2,
    requiredWhenField: '',
    requiredWhenValue: '',
    readonlyWhenField: '',
    readonlyWhenValue: '',
    computedFormula: [],
    defaultValueFrom: { field: '', property: '' },
    // Header ← Detail aggregate formula (e.g. grand_total = SUM of detail subtotal)
    detailAggregate: { type: '', detailIndex: 0, detailField: '' },
    step: 0,
    ...allMetaKeys,
    defaultValue: '', // always blank for new fields; boolean fields get their default when type is selected
  }
}

/** Get component display name from type */
export function getComponentBadge(type) {
  const entry = getRegistryEntry(type)
  if (entry?.isSpace) return 'Space'
  if (entry?.isSection) return 'Section'
  if (entry?.isFieldGroup) return 'Group Start'
  if (entry?.isFieldGroupEnd) return 'Group End'
  return entry?.component || 'FieldX'
}

// ── Detail field types for detail rows ─────────────────────────────────────
// Subset of field types available for detail row fields
export const DETAIL_FIELD_TYPES = [
  { value: 'checkbox', label: 'FieldBox (Checkbox)', component: 'FieldBox', defaultValue: true },
  { value: 'status', label: 'FieldStatus (Switch)', component: 'FieldStatus', defaultValue: true },
  { value: 'text', label: 'FieldX (Text)', component: 'FieldX', defaultValue: '' },
  { value: 'number', label: 'FieldX (Number)', component: 'FieldX', defaultValue: 0 },
  { value: 'fieldnumber', label: 'FieldNumber (Integer)', component: 'FieldNumber', defaultValue: 0 },
  { value: 'fieldnumber_decimal', label: 'FieldNumber (Decimal)', component: 'FieldNumber', defaultValue: 0 },
  { value: 'textarea', label: 'FieldTextarea', component: 'FieldTextarea', defaultValue: '' },
  { value: 'select', label: 'FieldSelect', component: 'FieldSelect', defaultValue: '' },
  { value: 'popup', label: 'FieldPopUp', component: 'FieldPopUp', defaultValue: '' },
  { value: 'date', label: 'FieldDate', component: 'FieldDate', defaultValue: '' },
  { value: 'datetime', label: 'FieldDateTime', component: 'FieldDateTime', defaultValue: '' },
  { value: 'radio', label: 'FieldRadio', component: 'FieldRadio', defaultValue: '' },
  { value: 'currency', label: 'FieldCurrency', component: 'FieldCurrency', defaultValue: 0 },
  { value: 'slider', label: 'FieldSlider', component: 'FieldSlider', defaultValue: 0 },
  { value: 'upload', label: 'FieldUpload (File)', component: 'FieldUpload', defaultValue: '' },
  { value: 'multi_upload', label: 'FieldMultiUpload', component: 'FieldMultiUpload', defaultValue: [] },
]

const DETAIL_FIELD_DEFAULT_WIDTHS = {
  checkbox: '110px',
  status: '120px',
  text: '180px',
  number: '140px',
  fieldnumber: '140px',
  fieldnumber_decimal: '150px',
  textarea: '240px',
  select: '180px',
  popup: '180px',
  date: '170px',
  datetime: '190px',
  radio: '220px',
  currency: '170px',
  slider: '200px',
  upload: '200px',
  multi_upload: '260px',
}

export function getDetailFieldDefaultWidth(type) {
  return DETAIL_FIELD_DEFAULT_WIDTHS[type] || '160px'
}

export function isDetailNumericFieldType(type) {
  return ['number', 'fieldnumber', 'fieldnumber_decimal', 'currency', 'slider'].includes(type)
}

export function getDetailFieldDecimalPlaces(field) {
  if (!field) return 0
  if (field.type === 'fieldnumber_decimal' || field.type === 'currency') {
    return getDecimalPlacesValue(field)
  }
  return 0
}

// ── Detail Tab helpers ─────────────────────────────────────────────────────
/** Create a blank detail tab config */
function createBuilderId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createBlankDetailTab(index = 1) {
  return {
    id: createBuilderId('detail-tab'),
    label: `Tab ${index}`,
    layout: 'vertical', // 'vertical' | 'horizontal'
  }
}

export function createBlankDetail() {
  return {
    tabId: '',
    tabLabel: 'Detail',
    buttonLabel: 'Pilih Item',    // label for the ButtonMultiSelect / Tambah button
    mode: 'button_multi_select',  // 'button_multi_select' | 'add_to_list'
    responseKey: '',       // e.g. m_role_ds (key from GET response)
    payloadKey: '',        // e.g. m_role_d  (key sent in POST/PUT)
    // ── ButtonMultiSelect mode fields ──
    foreignKey: '',        // e.g. m_menu_id
    foreignDisplay: '',    // e.g. m_menu    (nested object key with display info)
    apiUrl: '',            // e.g. /api/dynamic/m_menu
    searchKey: ['name'],
    displayKey: 'name',
    antiDuplicate: false,
    apiParams: [],         // e.g. [{ key: 'join', value: 'true' }]
    columns: [             // columns for ButtonMultiSelect popup table
      { key: '', label: '', width: '' },
    ],
    displayColumns: [      // which fields to show in the detail table from the master record
      { key: 'name', label: 'Nama' },
    ],
    // ── Row constraints ──
    minRows: 0,            // minimum rows required (0 = no minimum)
    maxRows: 0,            // maximum rows allowed (0 = unlimited)
    // ── Row features ──
    enableDuplicate: false, // show duplicate/copy row button
    enableReorder: false,   // show drag-to-reorder handle
    enableImport: false,    // show paste-from-Excel import button
    // ── Shared: detail fields per row ──
    detailFields: [        // editable fields per detail row
      { key: 'is_read', label: 'Read', type: 'checkbox', default: true, labelTrue: 'Ya', labelFalse: 'Tidak' },
    ],
  }
}

/** Create a blank column entry */
export function createBlankColumn() {
  return { key: '', label: '', width: '' }
}

/** Create a blank display column entry */
export function createBlankDisplayColumn() {
  return { key: '', label: '' }
}

/** Create a blank detail field entry */
export function createBlankDetailField() {
  return {
    key: '', label: '', type: 'checkbox', default: true,
    labelTrue: 'Ya', labelFalse: 'Tidak', summaryType: '', readonly: false, width: '', decimalPlaces: 2,
    // Validation
    required: false,
    // Conditional logic
    visibleWhen: { field: '', value: '' },    // show this column only when another detail field has this value
    readonlyWhen: { field: '', value: '' },   // make readonly when condition met
    // Cascading (dependsOn another detail field in same row)
    dependsOn: '',          // key of the parent detail field (same row)
    dependsOnParam: '',     // API param name for cascading filter
    // Select / PopUp / Radio fields
    sourceType: 'api', apiUrl: '', displayField: 'name', valueField: 'id',
    apiParams: [],
    staticOptions: [], radioOptions: [],
    // PopUp specific
    popupColumns: [],
    searchFields: '', dialogTitle: '',
    // Currency specific
    currencyPrefix: 'Rp', allowDecimal: true,
    // Slider specific
    sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: '',
    // Upload specific
    uploadAccept: 'image/*', maxSizeMB: 5, maxImages: 10,
    // Formula per-row (same token format as header: [{type:'field',value:'qty'},{type:'op',value:'*'},{type:'field',value:'price'}])
    computedFormula: [],
    // Default value from header field (auto-fill)
    defaultValueFrom: { field: '', property: '' },
  }
}
