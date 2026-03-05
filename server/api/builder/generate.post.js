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
  return fields.filter(f => !getRegistryEntry(f.type)?.isSpace).map(f => {
    const entry = getRegistryEntry(f.type)
    if (entry?.generateDefault) return entry.generateDefault(f)
    if (entry?.isSwitch) return `  ${f.field}: ${f.defaultValue || 'true'},`
    return `  ${f.field}: "${f.defaultValue || ''}",`
  }).join('\n')
}

function buildErrorsDefaults(fields) {
  return fields.filter(f => {
    const entry = getRegistryEntry(f.type)
    return entry?.hasError !== false && !entry?.isSpace
  }).map(f => `  ${f.field}: "",`).join('\n')
}

function buildValidation(fields) {
  return fields.filter(f => {
    if (!f.required) return false
    const entry = getRegistryEntry(f.type)
    return entry?.isSwitch !== true && !entry?.isSpace
  }).map(f => {
    const msg = f.errorMessage?.trim() || `${f.label} Wajib Di isi`
    return `  if (!values.${f.field}?.toString().trim()) {\n    errors.${f.field} = "${msg}";\n    invalid = true;\n  }`
  }).join('\n')
}

function buildPayload(fields) {
  return fields.filter(f => !getRegistryEntry(f.type)?.isSpace).map(f => {
    const entry = getRegistryEntry(f.type)
    if (entry?.generatePayload) return entry.generatePayload(f)
    if (entry?.isSwitch) return `    ${f.field}: values.${f.field},`
    return `    ${f.field}: values.${f.field}?.toString().trim() || null,`
  }).join('\n')
}

function buildResetValues(fields) {
  return fields.filter(f => !getRegistryEntry(f.type)?.isSpace).map(f => {
    const entry = getRegistryEntry(f.type)
    if (entry?.generateReset) return entry.generateReset(f)
    if (entry?.isSwitch) return `    ${f.field}: ${f.defaultValue || 'true'},`
    return `    ${f.field}: "${f.defaultValue || ''}",`
  }).join('\n')
}

function buildFormFields(fields) {
  return fields.map(f => {
    const entry = getRegistryEntry(f.type)
    let tpl
    if (entry?.generateTemplate) {
      tpl = entry.generateTemplate(f, fields)
    } else {
      // Fallback: plain FieldX
      tpl = `            <FieldX
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
    }
    // Wrap with col-span-2 if fullWidth
    if (f.fullWidth) {
      return `            <div class="md:col-span-2">\n${tpl}\n            </div>`
    }
    return tpl
  }).join('\n\n')
}

function buildColumns(fields) {
  return fields
    .filter(f => {
      const entry = getRegistryEntry(f.type)
      return entry?.isSwitch !== true && !entry?.isSpace
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
    return entry?.isSwitch !== true && !entry?.isSpace
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

// ── Detail tab generation helpers ──────────────────────────────────────────
function hasDetails(details) {
  return Array.isArray(details) && details.length > 0
}

function buildDetailImports(details) {
  if (!hasDetails(details)) return ''
  // Trash2 is always needed for remove button
  // Plus is needed for Add To List mode
  const hasAddToList = details.some(d => d.mode === 'add_to_list')
  const icons = ['Trash2']
  if (hasAddToList) icons.push('Plus')
  return `import { ${icons.join(', ')} } from "lucide-vue-next";`
}

function buildDetailState(details) {
  if (!hasDetails(details)) return ''
  const lines = []
  details.forEach((d, i) => {
    const varName = i === 0 ? 'detailArr' : `detailArr${i + 1}`
    lines.push(`const ${varName} = ref([]);`)
  })
  return '\n// Detail arrays\n' + lines.join('\n')
}

function buildDetailSelectedIds(details) {
  if (!hasDetails(details)) return ''
  const lines = []
  details.forEach((d, i) => {
    // Only ButtonMultiSelect mode needs excludeIds computed
    if (d.mode === 'add_to_list') return
    const varName = i === 0 ? 'detailArr' : `detailArr${i + 1}`
    const compName = i === 0 ? 'selectedDetailIds' : `selectedDetailIds${i + 1}`
    const fk = d.foreignKey || 'id'
    lines.push(`const ${compName} = computed(() => ${varName}.value.map(d => d.${fk}));`)
  })
  if (!lines.length) return ''
  return '\n' + lines.join('\n')
}

function buildDetailMethods(details) {
  if (!hasDetails(details)) return ''
  const blocks = []
  details.forEach((d, i) => {
    const varName = i === 0 ? 'detailArr' : `detailArr${i + 1}`
    const removeName = i === 0 ? 'removeDetail' : `removeDetail${i + 1}`
    const detailFields = d.detailFields || []

    if (d.mode === 'add_to_list') {
      // ── Add To List mode: push empty row ──
      const addName = i === 0 ? 'addDetailRow' : `addDetailRow${i + 1}`
      const fieldDefaults = detailFields.map(df => {
        if (df.type === 'checkbox') return `    ${df.key}: ${df.default !== false},`
        if (['number', 'fieldnumber', 'fieldnumber_decimal'].includes(df.type)) return `    ${df.key}: ${df.default || 0},`
        return `    ${df.key}: "${df.default || ''}",`
      }).join('\n')

      blocks.push(`
const ${addName} = () => {
  ${varName}.value.push({
${fieldDefaults}
  });
};

const ${removeName} = (index) => {
  ${varName}.value.splice(index, 1);
  toast.info("Item dihapus dari daftar");
};`)
    } else {
      // ── ButtonMultiSelect mode: add from selected items ──
      const handlerName = i === 0 ? 'handleDetailAdd' : `handleDetailAdd${i + 1}`
      const fk = d.foreignKey || 'id'
      const fkDisplay = d.foreignDisplay || ''
      const uk = d.uniqueKey || 'id'

      const fieldDefaults = detailFields.map(df => {
        if (df.type === 'checkbox') return `      ${df.key}: ${df.default !== false},`
        if (['number', 'fieldnumber', 'fieldnumber_decimal'].includes(df.type)) return `      ${df.key}: ${df.default || 0},`
        return `      ${df.key}: "${df.default || ''}",`
      }).join('\n')

      blocks.push(`
const ${handlerName} = (selectedItems) => {
  if (!selectedItems || selectedItems.length === 0) return;
  let addedCount = 0;
  let skippedCount = 0;
  selectedItems.forEach((item) => {
    const exists = ${varName}.value.some((d) => d.${fk} === item.${uk});
    if (exists) { skippedCount++; return; }
    ${varName}.value.push({
      ${fk}: item.${uk},${fkDisplay ? `\n      ${fkDisplay}: item,` : ''}
${fieldDefaults}
    });
    addedCount++;
  });
  if (addedCount > 0) toast.success(\`\${addedCount} item ditambahkan\`);
  if (skippedCount > 0) toast.warning(\`\${skippedCount} item sudah ada\`);
};

const ${removeName} = (index) => {
  ${varName}.value.splice(index, 1);
  toast.info("Item dihapus dari daftar");
};`)
    }
  })
  return blocks.join('\n')
}

function buildDetailReset(details) {
  if (!hasDetails(details)) return ''
  const lines = []
  details.forEach((d, i) => {
    const varName = i === 0 ? 'detailArr' : `detailArr${i + 1}`
    lines.push(`  ${varName}.value = [];`)
  })
  return '\n  // Reset detail arrays\n' + lines.join('\n')
}

function buildDetailLoadData(details) {
  if (!hasDetails(details)) return ''
  const blocks = []
  details.forEach((d, i) => {
    const varName = i === 0 ? 'detailArr' : `detailArr${i + 1}`
    const rk = d.responseKey || ''
    const detailFields = d.detailFields || []

    if (d.mode === 'add_to_list') {
      // ── Add To List: load all fields directly ──
      const fieldMappings = detailFields.map(df => {
        if (df.type === 'checkbox') return `        ${df.key}: detail.${df.key} !== undefined ? detail.${df.key} : ${df.default !== false},`
        if (['number', 'fieldnumber', 'fieldnumber_decimal'].includes(df.type)) return `        ${df.key}: detail.${df.key} !== undefined ? detail.${df.key} : ${df.default || 0},`
        return `        ${df.key}: detail.${df.key} || "${df.default || ''}",`
      }).join('\n')

      blocks.push(`
    // Load detail: ${rk}
    if (data.${rk}) {
      ${varName}.value = data.${rk}.map((detail) => ({
${fieldMappings}
      }));
    }`)
    } else {
      // ── ButtonMultiSelect: include FK and display object ──
      const fk = d.foreignKey || 'id'
      const fkDisplay = d.foreignDisplay || ''
      const fieldMappings = detailFields.map(df => {
        if (df.type === 'checkbox') return `        ${df.key}: detail.${df.key} !== undefined ? detail.${df.key} : ${df.default !== false},`
        if (['number', 'fieldnumber', 'fieldnumber_decimal'].includes(df.type)) return `        ${df.key}: detail.${df.key} !== undefined ? detail.${df.key} : ${df.default || 0},`
        return `        ${df.key}: detail.${df.key} || "${df.default || ''}",`
      }).join('\n')

      blocks.push(`
    // Load detail: ${rk}
    if (data.${rk}) {
      ${varName}.value = data.${rk}.map((detail) => ({
        ${fk}: detail.${fk},${fkDisplay ? `\n        ${fkDisplay}: detail.${fkDisplay} || null,` : ''}
${fieldMappings}
      }));
    }`)
    }
  })
  return blocks.join('\n')
}

function buildDetailPayload(details) {
  if (!hasDetails(details)) return ''
  const lines = []
  details.forEach((d, i) => {
    const varName = i === 0 ? 'detailArr' : `detailArr${i + 1}`
    const pk = d.payloadKey || ''
    const detailFields = d.detailFields || []

    if (d.mode === 'add_to_list') {
      // ── Add To List: only detail fields, no FK ──
      const fieldMappings = detailFields.map(df => {
        if (df.type === 'checkbox') return `        ${df.key}: d.${df.key} !== undefined ? d.${df.key} : ${df.default !== false},`
        if (['number', 'fieldnumber', 'fieldnumber_decimal'].includes(df.type)) return `        ${df.key}: d.${df.key} !== undefined ? d.${df.key} : ${df.default || 0},`
        return `        ${df.key}: d.${df.key}?.toString().trim() || null,`
      }).join('\n')

      lines.push(`      ${pk}: ${varName}.value.map((d) => ({
${fieldMappings}
      })),`)
    } else {
      // ── ButtonMultiSelect: FK + detail fields ──
      const fk = d.foreignKey || 'id'
      const fieldMappings = detailFields.map(df => {
        if (df.type === 'checkbox') return `        ${df.key}: d.${df.key} !== undefined ? d.${df.key} : ${df.default !== false},`
        if (['number', 'fieldnumber', 'fieldnumber_decimal'].includes(df.type)) return `        ${df.key}: d.${df.key} !== undefined ? d.${df.key} : ${df.default || 0},`
        return `        ${df.key}: d.${df.key}?.toString().trim() || null,`
      }).join('\n')

      lines.push(`      ${pk}: ${varName}.value.map((d) => ({
        ${fk}: d.${fk},
${fieldMappings}
      })),`)
    }
  })
  return '\n' + lines.join('\n')
}

function buildDetailFieldTd(df) {
  if (df.type === 'checkbox') {
    return `                      <td class="px-2 py-2 text-center">
                        <FieldBox
                          v-if="!isReadOnly"
                          :value="detail.${df.key}"
                          @input="(v) => (detail.${df.key} = v)"
                          labelTrue="${df.labelTrue || 'Ya'}"
                          labelFalse="${df.labelFalse || 'Tidak'}"
                        />
                        <span v-else>{{ detail.${df.key} ? '${df.labelTrue || 'Ya'}' : '${df.labelFalse || 'Tidak'}' }}</span>
                      </td>`
  }
  if (df.type === 'fieldnumber' || df.type === 'fieldnumber_decimal') {
    const fnType = df.type === 'fieldnumber_decimal' ? 'decimal' : 'integer'
    return `                      <td class="px-2 py-2">
                        <FieldNumber
                          v-if="!isReadOnly"
                          :value="detail.${df.key}"
                          @input="(v) => (detail.${df.key} = v)"
                          type="${fnType}"
                          class="w-full"
                        />
                        <span v-else>{{ detail.${df.key} }}</span>
                      </td>`
  }
  if (df.type === 'number') {
    return `                      <td class="px-2 py-2">
                        <FieldX
                          v-if="!isReadOnly"
                          :value="detail.${df.key}"
                          @input="(v) => (detail.${df.key} = v)"
                          type="number"
                          class="w-full"
                        />
                        <span v-else>{{ detail.${df.key} }}</span>
                      </td>`
  }
  if (df.type === 'textarea') {
    return `                      <td class="px-2 py-2">
                        <FieldTextarea
                          v-if="!isReadOnly"
                          :value="detail.${df.key}"
                          @input="(v) => (detail.${df.key} = v)"
                          class="w-full"
                        />
                        <span v-else>{{ detail.${df.key} || '-' }}</span>
                      </td>`
  }
  if (df.type === 'select') {
    return `                      <td class="px-2 py-2">
                        <FieldSelect
                          v-if="!isReadOnly"
                          :value="detail.${df.key}"
                          @input="(v) => (detail.${df.key} = v)"
                          class="w-full"
                        />
                        <span v-else>{{ detail.${df.key} || '-' }}</span>
                      </td>`
  }
  // Default: FieldX text
  return `                      <td class="px-2 py-2">
                        <FieldX
                          v-if="!isReadOnly"
                          :value="detail.${df.key}"
                          @input="(v) => (detail.${df.key} = v)"
                          placeholder="${df.label || df.key}"
                          class="w-full"
                        />
                        <span v-else>{{ detail.${df.key} || '-' }}</span>
                      </td>`
}

function buildDetailTemplate(details) {
  if (!hasDetails(details)) return ''
  const tabTriggers = details.map((d, i) => {
    const val = `detail-${i}`
    return `          <TabsTrigger value="${val}">${d.tabLabel || 'Detail'}</TabsTrigger>`
  }).join('\n')

  const tabContents = details.map((d, i) => {
    const val = `detail-${i}`
    const varName = i === 0 ? 'detailArr' : `detailArr${i + 1}`
    const removeName = i === 0 ? 'removeDetail' : `removeDetail${i + 1}`
    const detailFields = d.detailFields || []

    // Detail field <th>
    const fieldThs = detailFields.map(df =>
      `                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm">${df.label || df.key}</th>`
    ).join('\n')

    // Detail field <td> — using real field components
    const fieldTds = detailFields.map(df => buildDetailFieldTd(df)).join('\n')

    if (d.mode === 'add_to_list') {
      // ── ADD TO LIST MODE ──
      const addName = i === 0 ? 'addDetailRow' : `addDetailRow${i + 1}`
      const totalCols = 1 + detailFields.length + 1

      return `        <TabsContent value="${val}" class="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle>${d.tabLabel || 'Detail'}</CardTitle>
                  <CardDescription>Kelola data detail</CardDescription>
                </div>
                <Button
                  v-if="!isReadOnly"
                  variant="outline"
                  size="sm"
                  class="gap-1.5"
                  @click="${addName}"
                >
                  <Plus class="h-4 w-4" />
                  ${d.buttonLabel || 'Tambah'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div class="border rounded-lg overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-muted">
                    <tr>
                      <th class="px-3 py-2 text-left font-medium text-xs sm:text-sm">No</th>
${fieldThs}
                      <th v-if="!isReadOnly" class="px-2 py-2 text-center font-medium text-xs sm:text-sm">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="${varName}.length === 0">
                      <td colspan="${totalCols}" class="text-center py-8 text-muted-foreground text-xs sm:text-sm">
                        Belum ada item ditambahkan
                      </td>
                    </tr>
                    <tr v-for="(detail, index) in ${varName}" :key="index" class="border-t hover:bg-muted/50">
                      <td class="px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{{ index + 1 }}</td>
${fieldTds}
                      <td v-if="!isReadOnly" class="px-2 py-2 text-center">
                        <Button variant="ghost" size="icon" class="h-7 w-7 sm:h-8 sm:w-8" @click="${removeName}(index)">
                          <Trash2 class="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>`
    } else {
      // ── BUTTON MULTI SELECT MODE ──
      const handlerName = i === 0 ? 'handleDetailAdd' : `handleDetailAdd${i + 1}`
      const compName = i === 0 ? 'selectedDetailIds' : `selectedDetailIds${i + 1}`
      const fkDisplay = d.foreignDisplay || ''
      const uk = d.uniqueKey || 'id'
      const displayCols = d.displayColumns || []
      const columns = d.columns || []

      // Build columns literal
      const colsLiteral = columns.map(c =>
        `\n                    { key: '${c.key}', label: '${c.label}', sortable: true, width: '${c.width || '200px'}' }`
      ).join(',')

      // Display column <th>
      const displayThs = displayCols.map(dc =>
        `                      <th class="px-3 py-2 text-left font-medium text-xs sm:text-sm">${dc.label || dc.key}</th>`
      ).join('\n')

      // Display column <td> — read from nested object
      const displayTds = displayCols.map(dc => {
        const accessor = fkDisplay ? `detail.${fkDisplay}?.${dc.key}` : `detail.${dc.key}`
        return `                      <td class="px-3 py-2 text-xs sm:text-sm">{{ ${accessor} || '-' }}</td>`
      }).join('\n')

      const totalCols = 1 + displayCols.length + detailFields.length + 1

      return `        <TabsContent value="${val}" class="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle>${d.tabLabel || 'Detail'}</CardTitle>
                  <CardDescription>Kelola data detail</CardDescription>
                </div>
                <ButtonMultiSelect
                  v-if="!isReadOnly"
                  title="${d.buttonLabel || 'Pilih Item'}"
                  :api="{ url: '${d.apiUrl || ''}' }"
                  :columns="[${colsLiteral}
                  ]"
                  searchKey="${d.searchKey || 'name'}"
                  displayKey="${d.displayKey || 'name'}"
                  uniqueKey="${uk}"
                  :excludeIds="${compName}"
                  @add="${handlerName}"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div class="border rounded-lg overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-muted">
                    <tr>
                      <th class="px-3 py-2 text-left font-medium text-xs sm:text-sm">No</th>
${displayThs}
${fieldThs}
                      <th v-if="!isReadOnly" class="px-2 py-2 text-center font-medium text-xs sm:text-sm">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="${varName}.length === 0">
                      <td colspan="${totalCols}" class="text-center py-8 text-muted-foreground text-xs sm:text-sm">
                        Belum ada item ditambahkan
                      </td>
                    </tr>
                    <tr v-for="(detail, index) in ${varName}" :key="index" class="border-t hover:bg-muted/50">
                      <td class="px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{{ index + 1 }}</td>
${displayTds}
${fieldTds}
                      <td v-if="!isReadOnly" class="px-2 py-2 text-center">
                        <Button variant="ghost" size="icon" class="h-7 w-7 sm:h-8 sm:w-8" @click="${removeName}(index)">
                          <Trash2 class="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>`
    }
  }).join('\n\n')

  return `
      <!-- DETAIL TABS -->
      <Tabs default-value="detail-0" class="w-full">
        <TabsList class="w-full overflow-x-auto flex justify-start">
${tabTriggers}
        </TabsList>

${tabContents}
      </Tabs>`
}

// ── Handler ────────────────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { modulePath, moduleName, apiEndpoint, routePath, pageTitle, fields, details } = body

  if (!modulePath || !fields?.length) {
    throw createError({ statusCode: 400, statusMessage: 'modulePath and fields are required' })
  }

  const root = process.cwd()

  // ── Token validation ───────────────────────────────────────────────────
  const configPath = resolve(root, '.builder_config.json')
  if (!existsSync(configPath)) {
    throw createError({ statusCode: 403, statusMessage: 'Builder session not found' })
  }
  const savedConfig = JSON.parse(readFileSync(configPath, 'utf-8'))
  if (!body.token || body.token !== savedConfig.token) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid builder token' })
  }
  const readableName = pageTitle || getReadableName(moduleName)

  // ── Read templates ─────────────────────────────────────────────────────
  const formTpl = readFileSync(resolve(root, 'template', 'Form.vue.tpl'), 'utf-8')
  const landingTpl = readFileSync(resolve(root, 'template', 'Landing.vue.tpl'), 'utf-8')

  // ── Build replacements ─────────────────────────────────────────────────
  const hasSwitch = fields.some(f => f.type === 'switch')
  const switchField = fields.find(f => f.type === 'switch')

  const replacements = {
    __READABLE_NAME__: readableName,
    __READABLE_NAME_LOWER__: readableName.toLowerCase(),
    __API_ENDPOINT__: apiEndpoint,
    __API_DETAIL_ENDPOINT__: hasDetails(details)
      ? `const API_SAVE = API_BASE + "/with-details"; // with-details karena ada detail`
      : `const API_SAVE = API_BASE;`,
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
    __DETAIL_IMPORTS__: buildDetailImports(details),
    __DETAIL_STATE__: buildDetailState(details),
    __DETAIL_SELECTED_IDS__: buildDetailSelectedIds(details),
    __DETAIL_METHODS__: buildDetailMethods(details),
    __DETAIL_RESET__: buildDetailReset(details),
    __DETAIL_LOAD_DATA__: buildDetailLoadData(details),
    __DETAIL_PAYLOAD__: buildDetailPayload(details),
    __DETAIL_TEMPLATE__: buildDetailTemplate(details),
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
