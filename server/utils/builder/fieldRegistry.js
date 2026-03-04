/**
 * Field Registry — Server-side copy for code generation
 * Mirror of app/utils/builder/fieldRegistry.js (generate-related parts only)
 *
 * Jika menambah component baru, update JUGA file:
 *   app/utils/builder/fieldRegistry.js  (client-side: preview, panel, etc.)
 */

// ── Static options helpers ────────────────────────────────────────────────
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

// ── The Registry ───────────────────────────────────────────────────────────
export const FIELD_REGISTRY = [
  { value: 'text',               searchable: true,  showInMobile: true,  hasError: true,  isSwitch: false, generateTemplate: genFieldX },
  { value: 'number',             searchable: true,  showInMobile: true,  hasError: true,  isSwitch: false, generateTemplate: genFieldX },
  { value: 'decimal',            searchable: true,  showInMobile: true,  hasError: true,  isSwitch: false, generateTemplate: genFieldX },
  { value: 'email',              searchable: true,  showInMobile: true,  hasError: true,  isSwitch: false, generateTemplate: genFieldX },
  { value: 'tel',                searchable: true,  showInMobile: true,  hasError: true,  isSwitch: false, generateTemplate: genFieldX },
  { value: 'password',           searchable: false, showInMobile: false, hasError: true,  isSwitch: false, generateTemplate: genFieldX },
  { value: 'textarea',           searchable: true,  showInMobile: true,  hasError: true,  isSwitch: false, generateTemplate: genTextarea },
  { value: 'fieldnumber',        searchable: false, showInMobile: false, hasError: false, isSwitch: false, generateTemplate: genFieldNumber },
  { value: 'fieldnumber_decimal',searchable: false, showInMobile: false, hasError: false, isSwitch: false, generateTemplate: genFieldNumber },
  {
    value: 'switch', searchable: false, showInMobile: false, hasError: false, isSwitch: true,
    generateTemplate: genSwitch,
    generateDefault: (f) => `  ${f.field}: ${f.defaultValue || 'true'},`,
    generateReset:   (f) => `    ${f.field}: ${f.defaultValue || 'true'},`,
    generatePayload: (f) => `    ${f.field}: values.${f.field},`,
  },
  { value: 'select',             searchable: false, showInMobile: false, hasError: true,  isSwitch: false, generateTemplate: (f) => genSelect(f, 'FieldSelect') },
  { value: 'select_creatable',   searchable: false, showInMobile: false, hasError: true,  isSwitch: false, generateTemplate: (f) => genSelect(f, 'FieldSelectCreatable') },
]

// ── Lookup helper ──────────────────────────────────────────────────────────
export function getRegistryEntry(type) {
  return FIELD_REGISTRY.find(r => r.value === type)
}
