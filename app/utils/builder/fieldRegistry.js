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
  },
  required: {
    key: 'required', label: 'Required', type: 'checkbox',
    hideWhen: (f) => f.type === 'switch',
  },
  readonly: {
    key: 'readonly', label: 'Readonly', type: 'checkbox',
    hideWhen: (f) => f.type === 'switch',
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
    hint: 'Endpoint API untuk fetch data options',
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
  fullWidth: {
    key: 'fullWidth', label: 'Full Width (2 kolom)', type: 'checkbox',
  },
}

// ── Common panel sets ──────────────────────────────────────────────────────
const COMMON_PANELS = [PANEL.fieldName, PANEL.label, PANEL.placeholder, PANEL.defaultValue, PANEL.required, PANEL.readonly, PANEL.fullWidth]
const SELECT_PANELS = [...COMMON_PANELS, PANEL.sourceType, PANEL.apiUrl, PANEL.apiParams, PANEL.displayField, PANEL.valueField, PANEL.staticOptions]
const SWITCH_PANELS = [PANEL.fieldName, PANEL.label, PANEL.defaultValue, PANEL.labelTrue, PANEL.labelFalse, PANEL.fullWidth]
const BOX_PANELS = [PANEL.fieldName, PANEL.label, PANEL.defaultValue, PANEL.labelTrue, PANEL.labelFalse, PANEL.fullWidth]

// ── Static options helpers ────────────────────────────────────────────────
// Returns a JS array literal string for code generation (from array of {value, label})
function parseStaticOptionsLiteral(items) {
  if (!Array.isArray(items) || !items.length) return '[]'
  return '[' + items.map(it => {
    const v = String(it.value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const l = String(it.label || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    return `{ value: '${v}', label: '${l}' }`
  }).join(', ') + ']'
}

// ── Generate helpers ───────────────────────────────────────────────────────
function genFieldX(f) {
  const typeAttr = f.type !== 'text' ? `\n              type="${f.type}"` : ''
  const readonlyAttr = f.readonly ? ':readonly="true"' : ':readonly="isReadOnly"'
  return `            <FieldX
              id="${f.field}"
              label="${f.label}"${typeAttr}
              :value="values.${f.field}"
              :errorname="errors.${f.field} ? 'failed' : ''"
              @input="(v) => (values.${f.field} = v)"
              :hints="errors.${f.field}"
              :required="${f.required ? '!isReadOnly' : 'false'}"
              :disabled="loading || isReadOnly"
              ${readonlyAttr}
              placeholder="${f.placeholder || f.label}"
              class="w-full"
            />`
}

function genTextarea(f) {
  const readonlyAttr = f.readonly ? ':readonly="true"' : ':readonly="isReadOnly"'
  return `            <FieldTextarea
              id="${f.field}"
              label="${f.label}"
              :value="values.${f.field}"
              :errorname="errors.${f.field} ? 'failed' : ''"
              @input="(v) => (values.${f.field} = v)"
              :hints="errors.${f.field}"
              :required="${f.required ? '!isReadOnly' : 'false'}"
              :disabled="loading || isReadOnly"
              ${readonlyAttr}
              placeholder="${f.placeholder || f.label}"
              class="w-full"
            />`
}

function genFieldNumber(f) {
  const fnType = f.type === 'fieldnumber_decimal' ? 'decimal' : 'integer'
  const readonlyAttr = f.readonly ? ':readonly="true"' : ':readonly="isReadOnly"'
  return `            <FieldNumber
              id="${f.field}"
              label="${f.label}"
              type="${fnType}"
              :value="values.${f.field}"
              @input="(v) => (values.${f.field} = v)"
              :disabled="loading || isReadOnly"
              ${readonlyAttr}
              class="w-full"
            />`
}

function genSwitch(f) {
  return `            <div class="flex items-center gap-3">
              <Switch
                id="${f.field}"
                v-model="values.${f.field}"
                :disabled="loading || isReadOnly"
              />
              <Label for="${f.field}" class="cursor-pointer">
                {{ values.${f.field} ? "${f.labelTrue || 'Aktif'}" : "${f.labelFalse || 'Tidak Aktif'}" }}
              </Label>
            </div>`
}

function genFieldBox(f) {
  return `            <FieldBox
              id="${f.field}"
              label="${f.label}"
              :value="values.${f.field}"
              @input="(v) => (values.${f.field} = v)"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              labelTrue="${f.labelTrue || 'Ya'}"
              labelFalse="${f.labelFalse || 'Tidak'}"
              class="w-full"
            />`
}

function genSelect(f, component = 'FieldSelect') {
  const readonlyAttr = f.readonly ? ':readonly="true"' : ':readonly="isReadOnly"'
  const isStatic = f.sourceType === 'static'
  const vf = isStatic ? 'value' : (f.valueField || 'id')
  const df = isStatic ? 'label' : (f.displayField || 'name')
  let sourceAttr
  if (isStatic) {
    sourceAttr = `:options="${parseStaticOptionsLiteral(f.staticOptions || [])}"`
  } else {
    const paramsArr = Array.isArray(f.apiParams) ? f.apiParams.filter(p => p.key) : []
    const qs = paramsArr.map(p => `${p.key}=${p.value || ''}`).join('&')
    const params = qs ? `?${qs}` : ''
    sourceAttr = `apiUrl="${f.apiUrl || ''}${params}"`
  }
  return `            <${component}
              id="${f.field}"
              label="${f.label}"
              :value="values.${f.field}"
              :errorname="errors.${f.field} ? 'failed' : ''"
              @input="(v) => (values.${f.field} = v)"
              :hints="errors.${f.field}"
              :required="${f.required ? '!isReadOnly' : 'false'}"
              :disabled="loading || isReadOnly"
              ${readonlyAttr}
              ${sourceAttr}
              displayField="${df}"
              valueField="${vf}"
              placeholder="${f.placeholder || f.label}"
              :clearable="true"
              class="w-full"
            />`
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
    defaultMeta: {},
    panelFields: COMMON_PANELS,
    previewProps: (f) => ({ label: f.label || 'Label', type: 'decimal', value: '', placeholder: f.placeholder || f.label, required: f.required }),
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
    searchable: false, showInMobile: false, hasError: false,
    defaultMeta: {},
    panelFields: COMMON_PANELS,
    previewProps: (f) => ({ label: f.label || 'Label', value: '', type: 'integer' }),
    generateTemplate: genFieldNumber,
  },
  {
    value: 'fieldnumber_decimal', label: 'FieldNumber (Decimal)', component: 'FieldNumber', category: 'number',
    searchable: false, showInMobile: false, hasError: false,
    defaultMeta: {},
    panelFields: COMMON_PANELS,
    previewProps: (f) => ({ label: f.label || 'Label', value: '', type: 'decimal' }),
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

  // ── Space (layout spacer) ─────────────────────────────────
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

  // ── FieldSelect ────────────────────────────────────────────
  {
    value: 'select', label: 'FieldSelect', component: 'FieldSelect', category: 'selection',
    searchable: false, showInMobile: false, hasError: true,
    defaultMeta: { sourceType: 'api', apiUrl: '', apiParams: [], displayField: 'name', valueField: 'id', staticOptions: [] },
    panelFields: SELECT_PANELS,
    previewProps: (f) => {
      const isStatic = f.sourceType === 'static'
      const vf = isStatic ? 'value' : (f.valueField || 'id')
      const df = isStatic ? 'label' : (f.displayField || 'name')
      const base = { label: f.label || 'Label', value: '', displayField: df, valueField: vf, placeholder: f.placeholder || f.label, required: f.required }
      if (isStatic) return { ...base, options: f.staticOptions || [] }
      return { ...base, apiUrl: f.apiUrl || '' }
    },
    generateTemplate: (f) => genSelect(f, 'FieldSelect'),
  },

  // ── FieldSelectCreatable ───────────────────────────────────
  {
    value: 'select_creatable', label: 'FieldSelect Creatable', component: 'FieldSelectCreatable', category: 'selection',
    searchable: false, showInMobile: false, hasError: true,
    defaultMeta: { sourceType: 'api', apiUrl: '', apiParams: [], displayField: 'name', valueField: 'id', staticOptions: [] },
    panelFields: SELECT_PANELS,
    previewProps: (f) => {
      const isStatic = f.sourceType === 'static'
      const vf = isStatic ? 'value' : (f.valueField || 'id')
      const df = isStatic ? 'label' : (f.displayField || 'name')
      const base = { label: f.label || 'Label', value: '', displayField: df, valueField: vf, placeholder: f.placeholder || f.label, required: f.required }
      if (isStatic) return { ...base, options: f.staticOptions || [] }
      return { ...base, apiUrl: f.apiUrl || '' }
    },
    generateTemplate: (f) => genSelect(f, 'FieldSelectCreatable'),
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
    ...allMetaKeys,
    defaultValue: '', // always blank for new fields; boolean fields get their default when type is selected
  }
}

/** Get component display name from type */
export function getComponentBadge(type) {
  const entry = getRegistryEntry(type)
  if (entry?.isSpace) return 'Space'
  return entry?.component || 'FieldX'
}

// ── Detail field types for detail rows ─────────────────────────────────────
// Subset of field types available for detail row fields
export const DETAIL_FIELD_TYPES = [
  { value: 'checkbox', label: 'FieldBox (Checkbox)', component: 'FieldBox', defaultValue: true },
  { value: 'text', label: 'FieldX (Text)', component: 'FieldX', defaultValue: '' },
  { value: 'number', label: 'FieldX (Number)', component: 'FieldX', defaultValue: 0 },
  { value: 'fieldnumber', label: 'FieldNumber (Integer)', component: 'FieldNumber', defaultValue: 0 },
  { value: 'fieldnumber_decimal', label: 'FieldNumber (Decimal)', component: 'FieldNumber', defaultValue: 0 },
  { value: 'textarea', label: 'FieldTextarea', component: 'FieldTextarea', defaultValue: '' },
  { value: 'select', label: 'FieldSelect', component: 'FieldSelect', defaultValue: '' },
]

// ── Detail Tab helpers ─────────────────────────────────────────────────────
/** Create a blank detail tab config */
export function createBlankDetail() {
  return {
    tabLabel: 'Detail',
    buttonLabel: 'Pilih Item',    // label for the ButtonMultiSelect / Tambah button
    mode: 'button_multi_select',  // 'button_multi_select' | 'add_to_list'
    responseKey: '',       // e.g. m_role_ds (key from GET response)
    payloadKey: '',        // e.g. m_role_d  (key sent in POST/PUT)
    // ── ButtonMultiSelect mode fields ──
    foreignKey: '',        // e.g. m_menu_id
    foreignDisplay: '',    // e.g. m_menu    (nested object key with display info)
    apiUrl: '',            // e.g. /api/dynamic/m_menu
    searchKey: 'name',
    displayKey: 'name',
    uniqueKey: 'id',
    columns: [             // columns for ButtonMultiSelect popup table
      { key: '', label: '', width: '' },
    ],
    displayColumns: [      // which fields to show in the detail table from the master record
      { key: 'name', label: 'Nama' },
    ],
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
  return { key: '', label: '', type: 'checkbox', default: true, labelTrue: 'Ya', labelFalse: 'Tidak' }
}
