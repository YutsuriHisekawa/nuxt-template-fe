/**
 * Field Registry — Server-side copy for code generation
 * Mirror of app/utils/builder/fieldRegistry.js (generate-related parts only)
 *
 * Jika menambah component baru, update JUGA file:
 *   app/utils/builder/fieldRegistry.js  (client-side: preview, panel, etc.)
 */

// ── Static options helpers ────────────────────────────────────────────────
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

// ── Generate helpers ───────────────────────────────────────────────────────
function getDisabledAttr(f) {
  if (f.dependsOn) return `:disabled="!values.${f.dependsOn} || loading || isReadOnly"`
  return ':disabled="loading || isReadOnly"'
}

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
              ${getDisabledAttr(f)}
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
              ${getDisabledAttr(f)}
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
              ${getDisabledAttr(f)}
              ${readonlyAttr}
              class="w-full"
            />`
}

function genSwitch(f) {
  return `            <div class="flex items-center gap-3">
              <Switch
                id="${f.field}"
                v-model="values.${f.field}"
                ${getDisabledAttr(f)}
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
              ${getDisabledAttr(f)}
              :readonly="isReadOnly"
              labelTrue="${f.labelTrue || 'Ya'}"
              labelFalse="${f.labelFalse || 'Tidak'}"
              class="w-full"
            />`
}

function genSelect(f, component = 'FieldSelect', allFields = []) {
  const readonlyAttr = f.readonly ? ':readonly="true"' : ':readonly="isReadOnly"'
  const isStatic = f.sourceType === 'static'
  const vf = isStatic ? 'value' : (f.valueField || 'id')
  const df = isStatic ? 'label' : (f.displayField || 'name')

  // ── Chain / cascading logic ──
  const hasDependsOn = !isStatic && f.dependsOn && f.dependsOnParam
  const hasStaticDependsOn = isStatic && !!f.dependsOn
  const hasSimpleDependsOn = !!f.dependsOn

  // ── Source attribute (static options or API) ──
  let sourceAttr
  if (isStatic && hasStaticDependsOn) {
    const allOpts = parseStaticOptionsLiteral(f.staticOptions || [], true)
    sourceAttr = `:options="${allOpts}.filter(o => !o.parentValue || o.parentValue === values.${f.dependsOn})"`
  } else if (isStatic) {
    sourceAttr = `:options="${parseStaticOptionsLiteral(f.staticOptions || [])}"`
  } else {
    const paramsArr = Array.isArray(f.apiParams)
      ? f.apiParams.filter(p => p.key && !(hasDependsOn && p.key === f.dependsOnParam))
      : []
    const qs = paramsArr.map(p => `${p.key}=${p.value || ''}`).join('&')
    const params = qs ? `?${qs}` : ''
    sourceAttr = `apiUrl="${f.apiUrl || ''}${params}"`
  }

  // Find all descendants (children, grandchildren, etc.)
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
    const clears = descendantFields.map(cf => `values.${cf} = ''`).join('; ')
    inputHandler = `@input="(v) => { values.${f.field} = v; ${clears} }"`
  } else {
    inputHandler = `@input="(v) => (values.${f.field} = v)"`
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
              ${inputHandler}
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

function genFieldCurrency(f) {
  const readonlyAttr = f.readonly ? ':readonly="true"' : ':readonly="isReadOnly"'
  const prefix = f.currencyPrefix || 'Rp'
  const allowDecimal = f.allowDecimal !== false
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

// Convert uploadAccept array to accept string
function resolveAcceptString(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '*'
  if (arr.includes('*')) return '*'
  return arr.join(',')
}

function genFieldUpload(f) {
  const readonlyAttr = f.readonly ? ':readonly="true"' : ':readonly="isReadOnly"'
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
  const readonlyAttr = f.readonly ? ':readonly="true"' : ':readonly="isReadOnly"'
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
  {
    value: 'fieldbox', searchable: false, showInMobile: false, hasError: false, isFieldBox: true,
    generateTemplate: genFieldBox,
    generateDefault: (f) => `  ${f.field}: ${f.defaultValue || 'true'},`,
    generateReset:   (f) => `    ${f.field}: ${f.defaultValue || 'true'},`,
    generatePayload: (f) => `    ${f.field}: values.${f.field},`,
  },
  { value: 'select',             searchable: false, showInMobile: false, hasError: true,  isSwitch: false, generateTemplate: (f, allFields) => genSelect(f, 'FieldSelect', allFields) },
  { value: 'select_creatable',   searchable: false, showInMobile: false, hasError: true,  isSwitch: false, generateTemplate: (f, allFields) => genSelect(f, 'FieldSelectCreatable', allFields) },
  {
    value: 'space', searchable: false, showInMobile: false, hasError: false, isSpace: true,
    generateTemplate: () => `            <div></div>`,
    generateDefault: () => null,
    generateReset: () => null,
    generatePayload: () => null,
  },
  {
    value: 'section', searchable: false, showInMobile: false, hasError: false, isSection: true,
    generateTemplate: genSection,
    generateDefault: () => null,
    generateReset: () => null,
    generatePayload: () => null,
  },
  {
    value: 'fieldgroup', searchable: false, showInMobile: false, hasError: false, isFieldGroup: true,
    generateTemplate: () => null,
    generateDefault: () => null,
    generateReset: () => null,
    generatePayload: () => null,
  },
  {
    value: 'fieldgroup_end', searchable: false, showInMobile: false, hasError: false, isFieldGroupEnd: true,
    generateTemplate: () => null,
    generateDefault: () => null,
    generateReset: () => null,
    generatePayload: () => null,
  },
  { value: 'currency',           searchable: false, showInMobile: false, hasError: true,  isSwitch: false, generateTemplate: genFieldCurrency },
  { value: 'slider',             searchable: false, showInMobile: false, hasError: false, isSwitch: false, generateTemplate: genFieldSlider },
  {
    value: 'upload', searchable: false, showInMobile: false, hasError: true, isSwitch: false,
    generateTemplate: genFieldUpload,
    generateDefault: (f) => `  ${f.field}: "",`,
    generateReset: (f) => `    ${f.field}: "",`,
    generatePayload: (f) => `    ${f.field}: values.${f.field} || null,`,
  },
  {
    value: 'multi_upload', searchable: false, showInMobile: false, hasError: true, isSwitch: false,
    generateTemplate: genFieldMultiUpload,
    generateDefault: (f) => `  ${f.field}: [],`,
    generateReset: (f) => `    ${f.field}: [],`,
    generatePayload: (f) => `    ${f.field}: values.${f.field} || [],`,
  },
]

// ── Lookup helper ──────────────────────────────────────────────────────────
export function getRegistryEntry(type) {
  return FIELD_REGISTRY.find(r => r.value === type)
}

export { wrapVisibleWhen }
