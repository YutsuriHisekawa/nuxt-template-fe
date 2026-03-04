import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs'
import { resolve, dirname } from 'path'
import { FIELD_REGISTRY, getRegistryEntry } from '../../utils/builder/fieldRegistry.js'

// ── Helpers ────────────────────────────────────────────────────────────────
function getReadableName(text) {
  const isTransaction = text.startsWith('t_')
  const clean = text.replace(/^[mt]_/, '').split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  return isTransaction ? `Transaksi ${clean}` : `Master ${clean}`
}

function buildValuesDefaults(fields) {
  return fields.map(f => {
    const entry = getRegistryEntry(f.type)
    if (entry?.generateDefault) return entry.generateDefault(f)
    if (entry?.isSwitch) return `  ${f.field}: ${f.defaultValue || 'true'},`
    return `  ${f.field}: "${f.defaultValue || ''}",`
  }).join('\n')
}

function buildErrorsDefaults(fields) {
  return fields.filter(f => {
    const entry = getRegistryEntry(f.type)
    return entry?.hasError !== false
  }).map(f => `  ${f.field}: "",`).join('\n')
}

function buildValidation(fields) {
  return fields.filter(f => {
    if (!f.required) return false
    const entry = getRegistryEntry(f.type)
    return entry?.isSwitch !== true
  }).map(f => {
    return `  if (!values.${f.field}?.toString().trim()) {\n    errors.${f.field} = "${f.label} wajib diisi";\n    invalid = true;\n  }`
  }).join('\n')
}

function buildPayload(fields) {
  return fields.map(f => {
    const entry = getRegistryEntry(f.type)
    if (entry?.generatePayload) return entry.generatePayload(f)
    if (entry?.isSwitch) return `    ${f.field}: values.${f.field},`
    return `    ${f.field}: values.${f.field}?.toString().trim() || null,`
  }).join('\n')
}

function buildResetValues(fields) {
  return fields.map(f => {
    const entry = getRegistryEntry(f.type)
    if (entry?.generateReset) return entry.generateReset(f)
    if (entry?.isSwitch) return `    ${f.field}: ${f.defaultValue || 'true'},`
    return `    ${f.field}: "${f.defaultValue || ''}",`
  }).join('\n')
}

function buildFormFields(fields) {
  return fields.map(f => {
    const entry = getRegistryEntry(f.type)
    if (entry?.generateTemplate) return entry.generateTemplate(f)
    // Fallback: plain FieldX
    return `            <FieldX
              id="${f.field}"
              label="${f.label}"
              :value="values.${f.field}"
              :errorname="errors.${f.field} ? 'failed' : ''"
              @input="(v) => (values.${f.field} = v)"
              :hints="errors.${f.field}"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="${f.placeholder || f.label}"
              class="w-full"
            />`
  }).join('\n\n')
}

function buildColumns(fields) {
  return fields
    .filter(f => {
      const entry = getRegistryEntry(f.type)
      return entry?.isSwitch !== true
    })
    .map(f => `\t\t{ headerName: "${f.label}", field: "${f.field}", minWidth: 140 },`)
    .join('\n')
}

function buildSearchFields(fields) {
  return fields
    .filter(f => {
      const entry = getRegistryEntry(f.type)
      return entry?.searchable === true
    })
    .map(f => `"${f.field}"`)
    .join(', ')
}

function buildMobileCardHeader(fields) {
  const textFields = fields.filter(f => {
    const entry = getRegistryEntry(f.type)
    return entry?.showInMobile === true
  })
  const first = textFields[0]?.field || 'id'
  const second = textFields[1]?.field || null
  let html = `<p class="text-sm font-semibold truncate">{{ row.${first} || '-' }}</p>`
  if (second) {
    html += `\n\t\t\t\t\t\t\t\t<p class="text-xs text-muted-foreground truncate">{{ row.${second} || '-' }}</p>`
  }
  return html
}

function buildMobileInfoRows(fields) {
  const extras = fields.filter(f => {
    const entry = getRegistryEntry(f.type)
    return entry?.isSwitch !== true
  }).slice(2, 5)
  if (extras.length === 0) return ''
  return extras.map(f =>
    `\t\t\t\t\t\t\t<div v-if="row.${f.field}"><span class="text-muted-foreground">${f.label}:</span> <span class="font-medium">{{ row.${f.field} }}</span></div>`
  ).join('\n')
}

function buildDeleteDescription(fields) {
  const textFields = fields.filter(f => {
    const entry = getRegistryEntry(f.type)
    return entry?.showInMobile === true
  })
  const first = textFields[0]?.field || 'id'
  return `{{ deleteTarget?.${first} || deleteTarget?.id || '-' }}`
}

// ── Handler ────────────────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { modulePath, moduleName, apiEndpoint, routePath, pageTitle, fields } = body

  if (!modulePath || !fields?.length) {
    throw createError({ statusCode: 400, statusMessage: 'modulePath and fields are required' })
  }

  const root = process.cwd()
  const readableName = pageTitle || getReadableName(moduleName)

  // ── Read templates ─────────────────────────────────────────────────────
  const formTpl = readFileSync(resolve(root, 'template', 'Form.vue'), 'utf-8')
  const landingTpl = readFileSync(resolve(root, 'template', 'Landing.vue'), 'utf-8')

  // ── Build replacements ─────────────────────────────────────────────────
  const hasSwitch = fields.some(f => f.type === 'switch')
  const switchField = fields.find(f => f.type === 'switch')

  const replacements = {
    __READABLE_NAME__: readableName,
    __READABLE_NAME_LOWER__: readableName.toLowerCase(),
    __API_ENDPOINT__: apiEndpoint,
    __ROUTE_PATH__: routePath,
    __VALUES_DEFAULTS__: buildValuesDefaults(fields),
    __ERRORS_DEFAULTS__: buildErrorsDefaults(fields),
    __VALIDATION__: buildValidation(fields),
    __PAYLOAD__: buildPayload(fields),
    __RESET_VALUES__: buildResetValues(fields),
    __FORM_FIELDS__: buildFormFields(fields),
    __COLUMNS__: buildColumns(fields),
    __SEARCH_FIELDS__: buildSearchFields(fields),
    __MOBILE_CARD_HEADER__: buildMobileCardHeader(fields),
    __MOBILE_INFO_ROWS__: buildMobileInfoRows(fields),
    __DELETE_DESCRIPTION__: buildDeleteDescription(fields),
    __HAS_SWITCH_COLUMN__: hasSwitch ? `\n\t\t{\n\t\t\theaderName: "Aktif",\n\t\t\tfield: "${switchField?.field || 'is_active'}",\n\t\t\tminWidth: 110,\n\t\t\tcellRenderer: (params) => {\n\t\t\t\tconst isActive = checkActive(params?.value)\n\t\t\t\tconst label = isActive ? "${switchField?.labelTrue || 'Aktif'}" : "${switchField?.labelFalse || 'Nonaktif'}"\n\t\t\t\tconst cls = isActive ? "font-bold text-green-600" : "font-bold text-red-600"\n\t\t\t\treturn \`<span class="\${cls}">\${label}</span>\`\n\t\t\t},\n\t\t},` : '',
  }

  // ── Apply replacements ─────────────────────────────────────────────────
  let formContent = formTpl
  let landingContent = landingTpl
  for (const [token, value] of Object.entries(replacements)) {
    formContent = formContent.replaceAll(token, value)
    landingContent = landingContent.replaceAll(token, value)
  }

  // ── Write files ────────────────────────────────────────────────────────
  const formDir = resolve(root, 'app', 'pages', ...modulePath.split('/'), 'form')
  const landingDir = resolve(root, 'app', 'pages', ...modulePath.split('/'))

  mkdirSync(formDir, { recursive: true })

  const formFile = resolve(formDir, '[[id]].vue')
  const landingFile = resolve(landingDir, 'index.vue')

  const created = []
  const skipped = []

  if (existsSync(landingFile)) {
    skipped.push(`pages/${modulePath}/index.vue (sudah ada)`)
  } else {
    writeFileSync(landingFile, landingContent)
    created.push(`pages/${modulePath}/index.vue`)
  }

  if (existsSync(formFile)) {
    skipped.push(`pages/${modulePath}/form/[[id]].vue (sudah ada)`)
  } else {
    writeFileSync(formFile, formContent)
    created.push(`pages/${modulePath}/form/[[id]].vue`)
  }

  // Clean up config
  const configPath = resolve(root, '.builder_config.json')
  if (existsSync(configPath)) {
    try { unlinkSync(configPath) } catch {}
  }

  return {
    success: true,
    message: [
      ...created.map(f => `✓ Created: ${f}`),
      ...skipped.map(f => `⚠ Skipped: ${f}`),
    ].join('<br/>'),
    created,
    skipped,
  }
})
