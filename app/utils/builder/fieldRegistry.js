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
  apiUrl: {
    key: 'apiUrl', label: 'API Endpoint', type: 'text', placeholder: '/api/dynamic/m_supplier',
    hint: 'Endpoint API untuk fetch data options',
  },
  displayField: {
    key: 'displayField', label: 'Display Field', type: 'text', placeholder: 'name',
    hint: 'Field yang ditampilkan di dropdown (misal: name, label)',
  },
  valueField: {
    key: 'valueField', label: 'Value Field', type: 'text', placeholder: 'id',
    hint: 'Field yang disimpan sebagai value (misal: id, code)',
  },
}

// ── Common panel sets ──────────────────────────────────────────────────────
const COMMON_PANELS = [PANEL.fieldName, PANEL.label, PANEL.placeholder, PANEL.defaultValue, PANEL.required, PANEL.readonly]
const SELECT_PANELS = [...COMMON_PANELS, PANEL.apiUrl, PANEL.displayField, PANEL.valueField]
const SWITCH_PANELS = [PANEL.fieldName, PANEL.label, PANEL.defaultValue, PANEL.labelTrue, PANEL.labelFalse]

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

function genSelect(f, component = 'FieldSelect') {
  const readonlyAttr = f.readonly ? ':readonly="true"' : ':readonly="isReadOnly"'
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
              apiUrl="${f.apiUrl || ''}"
              displayField="${f.displayField || 'name'}"
              valueField="${f.valueField || 'id'}"
              placeholder="${f.placeholder || f.label}"
              :clearable="true"
              class="w-full"
            />`
}

// ── The Registry ───────────────────────────────────────────────────────────
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

  // ── FieldSelect ────────────────────────────────────────────
  {
    value: 'select', label: 'FieldSelect', component: 'FieldSelect', category: 'selection',
    searchable: false, showInMobile: false, hasError: true,
    defaultMeta: { apiUrl: '', displayField: 'name', valueField: 'id' },
    panelFields: SELECT_PANELS,
    previewProps: (f) => ({
      label: f.label || 'Label', value: '', apiUrl: f.apiUrl || '',
      displayField: f.displayField || 'name', valueField: f.valueField || 'id',
      placeholder: f.placeholder || f.label, required: f.required,
    }),
    generateTemplate: (f) => genSelect(f, 'FieldSelect'),
  },

  // ── FieldSelectCreatable ───────────────────────────────────
  {
    value: 'select_creatable', label: 'FieldSelect Creatable', component: 'FieldSelectCreatable', category: 'selection',
    searchable: false, showInMobile: false, hasError: true,
    defaultMeta: { apiUrl: '', displayField: 'name', valueField: 'id' },
    panelFields: SELECT_PANELS,
    previewProps: (f) => ({
      label: f.label || 'Label', value: '', apiUrl: f.apiUrl || '',
      displayField: f.displayField || 'name', valueField: f.valueField || 'id',
      placeholder: f.placeholder || f.label, required: f.required,
    }),
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
    apiUrl: '',
    displayField: 'name',
    valueField: 'id',
    ...allMetaKeys,
  }
}

/** Get component display name from type */
export function getComponentBadge(type) {
  return getRegistryEntry(type)?.component || 'FieldX'
}
