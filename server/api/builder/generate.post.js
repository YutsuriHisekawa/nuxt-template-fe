import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs'
import { resolve, dirname } from 'path'
import { FIELD_REGISTRY, getRegistryEntry, wrapVisibleWhen } from '../../utils/builder/fieldRegistry.js'

// ── Helpers ────────────────────────────────────────────────────────────────
function getReadableName(text) {
  const isTransaction = text.startsWith('t_')
  const clean = text.replace(/^[mt]_/, '').split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  return isTransaction ? `Transaksi ${clean}` : `Master ${clean}`
}

function buildValuesDefaults(fields) {
  return fields.filter(f => {
    const entry = getRegistryEntry(f.type)
    return !entry?.isSpace && !entry?.isSection && !entry?.isFieldGroup && !entry?.isFieldGroupEnd
  }).map(f => {
    const entry = getRegistryEntry(f.type)
    if (entry?.generateDefault) return entry.generateDefault(f)
    if (entry?.isSwitch) return `  ${f.field}: ${f.defaultValue || 'true'},`
    return `  ${f.field}: "${f.defaultValue || ''}",`
  }).join('\n')
}

function buildErrorsDefaults(fields) {
  return fields.filter(f => {
    const entry = getRegistryEntry(f.type)
    return entry?.hasError !== false && !entry?.isSpace && !entry?.isSection && !entry?.isFieldGroup && !entry?.isFieldGroupEnd
  }).map(f => `  ${f.field}: "",`).join('\n')
}

function buildValidation(fields) {
  const lines = []
  fields.forEach(f => {
    const entry = getRegistryEntry(f.type)
    if (entry?.isSwitch || entry?.isSpace || entry?.isSection) return

    // Required
    if (f.required) {
      const msg = f.errorMessage?.trim() || `${f.label} Wajib Di isi`
      if (f.requiredWhenField && f.requiredWhenValue !== undefined && f.requiredWhenValue !== '') {
        lines.push(`  if (values.${f.requiredWhenField}?.toString() === '${f.requiredWhenValue}' && !values.${f.field}?.toString().trim()) {\n    errors.${f.field} = "${msg}";\n    invalid = true;\n  }`)
      } else {
        lines.push(`  if (!values.${f.field}?.toString().trim()) {\n    errors.${f.field} = "${msg}";\n    invalid = true;\n  }`)
      }
    }

    // Min length
    if (f.minLength) {
      const n = parseInt(f.minLength)
      if (n > 0) {
        lines.push(`  if (values.${f.field}?.toString().trim() && values.${f.field}.toString().trim().length < ${n}) {\n    errors.${f.field} = "Minimal ${n} karakter";\n    invalid = true;\n  }`)
      }
    }

    // Max length
    if (f.maxLength) {
      const n = parseInt(f.maxLength)
      if (n > 0) {
        lines.push(`  if (values.${f.field}?.toString().trim() && values.${f.field}.toString().trim().length > ${n}) {\n    errors.${f.field} = "Maksimal ${n} karakter";\n    invalid = true;\n  }`)
      }
    }

    // Min value (for numbers)
    if (f.minValue !== undefined && f.minValue !== '') {
      const n = Number(f.minValue)
      if (!isNaN(n)) {
        lines.push(`  if (values.${f.field}?.toString().trim() && Number(values.${f.field}) < ${n}) {\n    errors.${f.field} = "Nilai minimal ${n}";\n    invalid = true;\n  }`)
      }
    }

    // Max value (for numbers)
    if (f.maxValue !== undefined && f.maxValue !== '') {
      const n = Number(f.maxValue)
      if (!isNaN(n)) {
        lines.push(`  if (values.${f.field}?.toString().trim() && Number(values.${f.field}) > ${n}) {\n    errors.${f.field} = "Nilai maksimal ${n}";\n    invalid = true;\n  }`)
      }
    }

    // Regex pattern
    if (f.pattern?.trim()) {
      const msg = f.patternMessage?.trim() || 'Format tidak valid'
      lines.push(`  if (values.${f.field}?.toString().trim() && !/${f.pattern.trim()}/.test(values.${f.field}.toString().trim())) {\n    errors.${f.field} = "${msg}";\n    invalid = true;\n  }`)
    }
  })
  return lines.join('\n')
}

function buildPayload(fields) {
  return fields.filter(f => {
    const entry = getRegistryEntry(f.type)
    return !entry?.isSpace && !entry?.isSection && !entry?.isFieldGroup && !entry?.isFieldGroupEnd
  }).map(f => {
    const entry = getRegistryEntry(f.type)
    if (entry?.generatePayload) return entry.generatePayload(f)
    if (entry?.isSwitch) return `    ${f.field}: values.${f.field},`
    return `    ${f.field}: values.${f.field}?.toString().trim() || null,`
  }).join('\n')
}

function buildResetValues(fields) {
  return fields.filter(f => {
    const entry = getRegistryEntry(f.type)
    return !entry?.isSpace && !entry?.isSection && !entry?.isFieldGroup && !entry?.isFieldGroupEnd
  }).map(f => {
    const entry = getRegistryEntry(f.type)
    if (entry?.generateReset) return entry.generateReset(f)
    if (entry?.isSwitch) return `    ${f.field}: ${f.defaultValue || 'true'},`
    return `    ${f.field}: "${f.defaultValue || ''}",`
  }).join('\n')
}

function buildComputedWatchers(fields) {
  // Support both new array format and legacy string format
  const computedFields = fields.filter(f => {
    if (Array.isArray(f.computedFormula)) return f.computedFormula.length > 0
    return typeof f.computedFormula === 'string' && f.computedFormula.trim()
  })
  if (!computedFields.length) return ''

  const watchers = computedFields.map(f => {
    let refs = []
    let expr = ''

    if (Array.isArray(f.computedFormula)) {
      // New token array format: [{ type: 'field'|'op'|'number'|'paren', value: string }]
      const tokens = f.computedFormula
      refs = [...new Set(tokens.filter(t => t.type === 'field').map(t => t.value))]
      expr = tokens.map(t => {
        if (t.type === 'field') return `(Number(values.${t.value}) || 0)`
        if (t.type === 'op') return ` ${t.value} `
        if (t.type === 'number') return t.value
        if (t.type === 'paren') return t.value
        return ''
      }).join('')
    } else {
      // Legacy string format — backward compat
      const formula = f.computedFormula.trim()
      const cleaned = formula.replace(/"[^"]*"|'[^']*'/g, '').replace(/[+\-*/().,\d\s]/g, ' ')
      refs = [...new Set(cleaned.split(/\s+/).filter(t => t && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t)))]
      const parts = formula.split(/(["'][^"']*["'])/g)
      const isStringConcat = /"[^"]*"|'[^']*'/.test(formula)
      expr = parts.map(part => {
        if (/^["']/.test(part)) return part
        let result = part
        const sortedRefs = [...refs].sort((a, b) => b.length - a.length)
        sortedRefs.forEach(ref => {
          const wrap = isStringConcat ? `(values.${ref} || '')` : `(Number(values.${ref}) || 0)`
          result = result.replace(new RegExp('\\b' + ref + '\\b', 'g'), wrap)
        })
        return result
      }).join('')
    }

    const formulaDisplay = Array.isArray(f.computedFormula)
      ? f.computedFormula.map(t => t.value).join(' ')
      : f.computedFormula.trim()

    const watchSources = refs.map(r => `  () => values.${r}`).join(',\n')
    return `// Auto-compute: ${f.field} = ${formulaDisplay}
watch(
  [
${watchSources}
  ],
  () => {
    if (isReadOnly.value) return;
    values.${f.field} = ${expr};
  },
  { immediate: true }
);`
  })

  return '\n// ── Computed / Auto-Fill Fields ──\n' + watchers.join('\n\n')
}

function buildFieldTemplate(f, fields, fullClass, details) {
  const entry = getRegistryEntry(f.type)
  let tpl
  if (entry?.generateTemplate) {
    tpl = entry.generateTemplate(f, fields)
  } else {
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
  // Post-process: conditional required
  if (f.required && f.requiredWhenField && f.requiredWhenValue !== undefined && f.requiredWhenValue !== '') {
    tpl = tpl.replace(':required="!isReadOnly"', `:required="!isReadOnly && values.${f.requiredWhenField}?.toString() === '${f.requiredWhenValue}'"`)
  }
  // Post-process: computed field — make disabled (value is auto-calculated)
  const hasFormula = Array.isArray(f.computedFormula) ? f.computedFormula.length > 0 : f.computedFormula?.trim()
  if (hasFormula) {
    tpl = tpl.replace(':disabled="loading || isReadOnly"', ':disabled="true"')
  }
  // Post-process: auto-fill via @update:valueFull (header→header + header→detail)
  if (['select', 'select_creatable', 'popup'].includes(f.type)) {
    const headerTargets = fields.filter(af => af.defaultValueFrom?.field === f.field && af.defaultValueFrom?.property)
    const detailTargets = []
    if (Array.isArray(details)) {
      details.forEach((d, di) => {
        const varName = di === 0 ? 'detailArr' : `detailArr${di + 1}`
        ;(d.detailFields || []).forEach(df => {
          if (df.defaultValueFrom?.field === f.field && df.defaultValueFrom?.property) {
            detailTargets.push({ key: df.key, property: df.defaultValueFrom.property, varName })
          }
        })
      })
    }
    if (headerTargets.length || detailTargets.length) {
      const fills = []
      headerTargets.forEach(af => fills.push(`values.${af.field} = obj?.${af.defaultValueFrom.property} || ''`))
      detailTargets.forEach(dt => fills.push(`${dt.varName}.value.forEach(row => { row.${dt.key} = obj?.${dt.property} || '' })`))
      const handler = `@update:valueFull="(obj) => { ${fills.join('; ')} }"`
      if (tpl.includes('@update:valueFull')) {
        tpl = tpl.replace(/@update:valueFull="[^"]*"/, handler)
      } else {
        tpl = tpl.replace(/(@input="[^"]*")/, `$1\n              ${handler}`)
      }
    }
  }
  tpl = wrapVisibleWhen(tpl, f)
  if (entry?.isSection) {
    return fullClass ? `            <div class="${fullClass}">\n${tpl}\n            </div>` : tpl
  }
  if (f.fullWidth && fullClass) {
    return `            <div class="${fullClass}">\n${tpl}\n            </div>`
  }
  return tpl
}

function buildFormFields(fields, columnLayout, details) {
  const colsFull = { 1: '', 2: 'md:col-span-2', 3: 'md:col-span-3' }
  const fullClass = colsFull[columnLayout] || colsFull[2]
  const gridCols = { 1: 'grid grid-cols-1 gap-6', 2: 'grid grid-cols-1 md:grid-cols-2 gap-6', 3: 'grid grid-cols-1 md:grid-cols-3 gap-6' }
  const gridClass = gridCols[columnLayout] || gridCols[2]

  const lines = []
  fields.forEach(f => {
    const entry = getRegistryEntry(f.type)
    // Field Group Start
    if (entry?.isFieldGroup) {
      let groupDiv = `            <div class="${fullClass ? fullClass + ' ' : ''}rounded-lg border border-border bg-card/50 p-5 space-y-1">`
      groupDiv += `\n              <h3 class="text-sm font-semibold text-foreground mb-3">${f.label || 'Group'}</h3>`
      groupDiv += `\n              <div class="${gridClass}">`
      groupDiv = wrapVisibleWhen(groupDiv, f)
      lines.push(groupDiv)
      return
    }
    // Field Group End
    if (entry?.isFieldGroupEnd) {
      lines.push(`              </div>\n            </div>`)
      return
    }
    lines.push(buildFieldTemplate(f, fields, fullClass, details))
  })
  return lines.join('\n\n')
}

function buildFormContent(fields, columnLayout, wizardSteps, details) {
  const gridCols = { 1: 'grid grid-cols-1 gap-6', 2: 'grid grid-cols-1 md:grid-cols-2 gap-6', 3: 'grid grid-cols-1 md:grid-cols-3 gap-6' }
  const gridClass = gridCols[columnLayout] || gridCols[2]

  if (!wizardSteps || !wizardSteps.length) {
    // No wizard — single grid
    const fieldsHtml = buildFormFields(fields, columnLayout, details)
    return `          <div class="${gridClass}">\n${fieldsHtml}\n          </div>`
  }

  // Wizard mode — group fields by step
  const stepGroups = wizardSteps.map(() => [])
  fields.forEach(f => {
    const si = Math.min(f.step || 0, wizardSteps.length - 1)
    stepGroups[si].push(f)
  })

  const tabs = wizardSteps.map((step, i) =>
    `              <button\n                @click="wizardStep = ${i}"\n                class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"\n                :class="wizardStep === ${i} ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:text-foreground'"\n              >\n                <span class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" :class="wizardStep === ${i} ? 'bg-primary-foreground text-primary' : 'bg-muted-foreground/20'">${i + 1}</span>\n                ${step.label}\n              </button>`
  ).join('\n')

  const stepContents = stepGroups.map((sf, i) => {
    const fieldsHtml = buildFormFields(sf, columnLayout, details)
    return `          <div v-show="wizardStep === ${i}" class="${gridClass}">\n${fieldsHtml}\n          </div>`
  }).join('\n\n')

  const lastStep = wizardSteps.length - 1
  const nav = `          <div class="flex justify-between mt-4">\n            <Button variant="outline" v-if="wizardStep > 0" @click="wizardStep--">Sebelumnya</Button>\n            <div v-else />\n            <Button v-if="wizardStep < ${lastStep}" @click="wizardStep++">Selanjutnya</Button>\n          </div>`

  return `          <!-- Wizard Steps -->\n          <div class="flex gap-2 mb-6 flex-wrap">\n${tabs}\n          </div>\n\n${stepContents}\n\n${nav}`
}

function buildColumns(fields, landingConfig) {
  if (Array.isArray(landingConfig) && landingConfig.length) {
    return landingConfig
      .filter(c => c.visible)
      .map(c => {
        const df = (c.displayField || '').trim();
        if (df && df.includes('.')) {
          return `\t\t{ headerName: "${c.label}", valueGetter: (p) => ${df.split('.').reduce((acc, k, i) => i === 0 ? `p.data?.${k}` : `${acc}?.${k}`, '')}, minWidth: ${c.minWidth || 140} },`;
        }
        return `\t\t{ headerName: "${c.label}", field: "${df || c.field}", minWidth: ${c.minWidth || 140} },`;
      })
      .join('\n')
  }
  return fields
    .filter(f => {
      const entry = getRegistryEntry(f.type)
      return entry?.isSwitch !== true && !entry?.isSpace
    })
    .map(f => `\t\t{ headerName: "${f.label}", field: "${f.field}", minWidth: 140 },`)
    .join('\n')
}

function buildSearchFields(fields, landingConfig) {
  if (Array.isArray(landingConfig) && landingConfig.length) {
    return landingConfig
      .filter(c => c.visible)
      .map(c => {
        const df = (c.displayField || '').trim();
        return `"${df || c.field}"`;
      })
      .join(', ')
  }
  return fields
    .filter(f => {
      const entry = getRegistryEntry(f.type)
      return entry?.searchable === true
    })
    .map(f => `"${f.field}"`)
    .join(', ')
}

function buildMobileCardHeader(fields, landingConfig) {
  let mobileFields
  if (Array.isArray(landingConfig) && landingConfig.length) {
    mobileFields = landingConfig.filter(c => c.visible)
  } else {
    mobileFields = fields.filter(f => {
      const entry = getRegistryEntry(f.type)
      return entry?.showInMobile === true
    }).map(f => ({ field: f.field }))
  }
  const getDisplay = (c) => (c?.displayField || '').trim() || c?.field || 'id';
  const first = getDisplay(mobileFields[0]) || 'id'
  const second = mobileFields[1] ? getDisplay(mobileFields[1]) : null
  let html = `<p class="text-sm font-semibold truncate">{{ row.${first} || '-' }}</p>`
  if (second) {
    html += `\n\t\t\t\t\t\t\t\t<p class="text-xs text-muted-foreground truncate">{{ row.${second} || '-' }}</p>`
  }
  return html
}

function buildMobileInfoRows(fields, landingConfig) {
  let infoFields
  if (Array.isArray(landingConfig) && landingConfig.length) {
    infoFields = landingConfig.filter(c => c.visible).slice(2, 5)
  } else {
    infoFields = fields.filter(f => {
      const entry = getRegistryEntry(f.type)
      return entry?.isSwitch !== true && !entry?.isSpace
    }).slice(2, 5).map(f => ({ field: f.field, label: f.label }))
  }
  if (infoFields.length === 0) return ''
  return infoFields.map(c => {
    const df = (c.displayField || '').trim() || c.field;
    return `\t\t\t\t\t\t\t<div v-if="row.${df}"><span class="text-muted-foreground">${c.label}:</span> <span class="font-medium">{{ row.${df} }}</span></div>`
  }).join('\n')
}

function buildDeleteDescription(fields, landingConfig) {
  let firstField
  if (Array.isArray(landingConfig) && landingConfig.length) {
    const mc = landingConfig.find(c => c.visible);
    firstField = (mc?.displayField || '').trim() || mc?.field;
  } else {
    const textFields = fields.filter(f => {
      const entry = getRegistryEntry(f.type)
      return entry?.showInMobile === true
    })
    firstField = textFields[0]?.field
  }
  return `{{ deleteTarget?.${firstField || 'id'} || deleteTarget?.id || '-' }}`
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

function buildDetailComputedWatchers(details) {
  if (!hasDetails(details)) return ''
  const blocks = []
  details.forEach((d, i) => {
    const varName = i === 0 ? 'detailArr' : `detailArr${i + 1}`
    const detailFields = d.detailFields || []
    const formulaFields = detailFields.filter(df => Array.isArray(df.computedFormula) && df.computedFormula.length > 0)
    if (!formulaFields.length) return

    // Build a deep watcher on the detail array that recalculates formula fields
    const computations = formulaFields.map(df => {
      const expr = df.computedFormula.map(t => {
        if (t.type === 'field') return `(Number(row.${t.value}) || 0)`
        if (t.type === 'op') return ` ${t.value} `
        if (t.type === 'number') return t.value
        if (t.type === 'paren') return t.value
        return ''
      }).join('')
      const formulaDisplay = df.computedFormula.map(t => t.value).join(' ')
      return `      // ${df.key} = ${formulaDisplay}\n      row.${df.key} = ${expr};`
    }).join('\n')

    blocks.push(`
// Auto-compute detail formula fields for ${varName}
watch(${varName}, (arr) => {
  if (isReadOnly.value) return;
  arr.forEach((row) => {
${computations}
  });
}, { deep: true, immediate: true });`)
  })
  if (!blocks.length) return ''
  return '\n// ── Detail Computed (Per-Row Formula) ──\n' + blocks.join('\n')
}

function buildDefaultValueFromWatchers(fields) {
  // Header auto-fill is handled via @update:valueFull in genSelect/genPopup
  // This function is kept for potential future use
  return ''
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
        if (df.type === 'checkbox' || df.type === 'status') return `    ${df.key}: ${df.default !== false},`
        if (['number', 'fieldnumber', 'fieldnumber_decimal', 'currency', 'slider'].includes(df.type)) return `    ${df.key}: ${df.default || 0},`
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
      const displayCols = d.displayColumns || []
      const displayColKeys = new Set(displayCols.map(dc => dc.key))

      const fieldDefaults = detailFields.map(df => {
        // If this field auto-fills from a displayColumn, use item property
        if (df.defaultValueFrom?.field && df.defaultValueFrom?.property && displayColKeys.has(df.defaultValueFrom.field)) {
          return `      ${df.key}: item.${df.defaultValueFrom.property} || ${['number', 'fieldnumber', 'fieldnumber_decimal', 'currency', 'slider'].includes(df.type) ? '0' : '""'},`
        }
        if (df.type === 'checkbox' || df.type === 'status') return `      ${df.key}: ${df.default !== false},`
        if (['number', 'fieldnumber', 'fieldnumber_decimal', 'currency', 'slider'].includes(df.type)) return `      ${df.key}: ${df.default || 0},`
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
    const dataExpr = rk ? `data.${rk}` : 'data'
    const detailFields = d.detailFields || []

    if (d.mode === 'add_to_list') {
      // ── Add To List: load all fields directly ──
      const fieldMappings = detailFields.map(df => {
        if (df.type === 'checkbox' || df.type === 'status') return `        ${df.key}: detail.${df.key} !== undefined ? detail.${df.key} : ${df.default !== false},`
        if (['number', 'fieldnumber', 'fieldnumber_decimal', 'currency', 'slider'].includes(df.type)) return `        ${df.key}: detail.${df.key} !== undefined ? detail.${df.key} : ${df.default || 0},`
        return `        ${df.key}: detail.${df.key} || "${df.default || ''}",`
      }).join('\n')

      blocks.push(`
    // Load detail: ${rk || varName}
    if (${dataExpr}) {
      ${varName}.value = ${dataExpr}.map((detail) => ({
${fieldMappings}
      }));
    }`)
    } else {
      // ── ButtonMultiSelect: include FK and display object ──
      const fk = d.foreignKey || 'id'
      const fkDisplay = d.foreignDisplay || ''
      const fieldMappings = detailFields.map(df => {
        if (df.type === 'checkbox' || df.type === 'status') return `        ${df.key}: detail.${df.key} !== undefined ? detail.${df.key} : ${df.default !== false},`
        if (['number', 'fieldnumber', 'fieldnumber_decimal', 'currency', 'slider'].includes(df.type)) return `        ${df.key}: detail.${df.key} !== undefined ? detail.${df.key} : ${df.default || 0},`
        return `        ${df.key}: detail.${df.key} || "${df.default || ''}",`
      }).join('\n')

      blocks.push(`
    // Load detail: ${rk || varName}
    if (${dataExpr}) {
      ${varName}.value = ${dataExpr}.map((detail) => ({
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
    const pk = d.payloadKey || `detail${i > 0 ? i + 1 : ''}`
    const detailFields = d.detailFields || []

    if (d.mode === 'add_to_list') {
      // ── Add To List: only detail fields, no FK ──
      const fieldMappings = detailFields.map(df => {
        if (df.type === 'checkbox' || df.type === 'status') return `        ${df.key}: d.${df.key} !== undefined ? d.${df.key} : ${df.default !== false},`
        if (['number', 'fieldnumber', 'fieldnumber_decimal', 'currency', 'slider'].includes(df.type)) return `        ${df.key}: d.${df.key} !== undefined ? d.${df.key} : ${df.default || 0},`
        return `        ${df.key}: d.${df.key}?.toString().trim() || null,`
      }).join('\n')

      lines.push(`      ${pk}: ${varName}.value.map((d) => ({
${fieldMappings}
      })),`)
    } else {
      // ── ButtonMultiSelect: FK + detail fields ──
      const fk = d.foreignKey || 'id'
      const fieldMappings = detailFields.map(df => {
        if (df.type === 'checkbox' || df.type === 'status') return `        ${df.key}: d.${df.key} !== undefined ? d.${df.key} : ${df.default !== false},`
        if (['number', 'fieldnumber', 'fieldnumber_decimal', 'currency', 'slider'].includes(df.type)) return `        ${df.key}: d.${df.key} !== undefined ? d.${df.key} : ${df.default || 0},`
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

function buildDetailFieldTd(df, allDetailFields) {
  // If field has a formula, render as readonly computed value
  const hasFormula = Array.isArray(df.computedFormula) && df.computedFormula.length > 0
  if (hasFormula) {
    const isCurrency = df.type === 'currency'
    const fmt = isCurrency ? `Number(detail.${df.key} || 0).toLocaleString('id-ID')` : `detail.${df.key}`
    return `                      <td class="px-2 py-2 text-right">
                        <span class="text-xs sm:text-sm font-medium text-foreground/80">{{ ${fmt} }}</span>
                      </td>`
  }

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
    const src = df.sourceType || 'api'
    // Check if any other detail field auto-fills from this field
    const detailAutoFills = (allDetailFields || []).filter(af => af.defaultValueFrom?.field === df.key && af.defaultValueFrom?.property)
    const valueFullAttr = detailAutoFills.length > 0
      ? `\n                          @update:valueFull="(obj) => { ${detailAutoFills.map(af => `detail.${af.key} = obj?.${af.defaultValueFrom.property} || ''`).join('; ')} }"`
      : ''
    if (src === 'api') {
      return `                      <td class="px-2 py-2">
                        <FieldSelect
                          v-if="!isReadOnly"
                          :value="detail.${df.key}"
                          @input="(v) => (detail.${df.key} = v)"${valueFullAttr}
                          apiUrl="${df.apiUrl || ''}"
                          displayField="${df.displayField || 'name'}"
                          valueField="${df.valueField || 'id'}"
                          class="w-full"
                        />
                        <span v-else>{{ detail.${df.key} || '-' }}</span>
                      </td>`
    }
    const opts = (df.staticOptions || []).map(o => `{ value: '${o.value}', label: '${o.label}' }`).join(', ')
    return `                      <td class="px-2 py-2">
                        <FieldSelect
                          v-if="!isReadOnly"
                          :value="detail.${df.key}"
                          @input="(v) => (detail.${df.key} = v)"${valueFullAttr}
                          sourceType="static"
                          :staticOptions="[${opts}]"
                          class="w-full"
                        />
                        <span v-else>{{ detail.${df.key} || '-' }}</span>
                      </td>`
  }
  if (df.type === 'popup') {
    // Check if any other detail field auto-fills from this field
    const detailAutoFills = (allDetailFields || []).filter(af => af.defaultValueFrom?.field === df.key && af.defaultValueFrom?.property)
    const valueFullAttr = detailAutoFills.length > 0
      ? `\n                          @update:valueFull="(obj) => { ${detailAutoFills.map(af => `detail.${af.key} = obj?.${af.defaultValueFrom.property} || ''`).join('; ')} }"`
      : ''
    return `                      <td class="px-2 py-2">
                        <FieldPopUp
                          v-if="!isReadOnly"
                          :value="detail.${df.key}"
                          @input="(v) => (detail.${df.key} = v)"${valueFullAttr}
                          apiUrl="${df.apiUrl || ''}"
                          displayField="${df.displayField || 'name'}"
                          valueField="${df.valueField || 'id'}"
                          class="w-full"
                        />
                        <span v-else>{{ detail.${df.key} || '-' }}</span>
                      </td>`
  }
  if (df.type === 'status') {
    return `                      <td class="px-2 py-2 text-center">
                        <FieldStatus
                          v-if="!isReadOnly"
                          v-model="detail.${df.key}"
                          active-text="${df.labelTrue || 'Aktif'}"
                          inactive-text="${df.labelFalse || 'Tidak Aktif'}"
                        />
                        <span v-else :class="detail.${df.key} ? 'text-green-600 font-semibold' : 'text-red-500'">{{ detail.${df.key} ? '${df.labelTrue || 'Aktif'}' : '${df.labelFalse || 'Tidak Aktif'}' }}</span>
                      </td>`
  }
  if (df.type === 'date') {
    return `                      <td class="px-2 py-2">
                        <FieldDate
                          v-if="!isReadOnly"
                          :value="detail.${df.key}"
                          @input="(v) => (detail.${df.key} = v)"
                          class="w-full"
                        />
                        <span v-else>{{ detail.${df.key} || '-' }}</span>
                      </td>`
  }
  if (df.type === 'datetime') {
    return `                      <td class="px-2 py-2">
                        <FieldDateTime
                          v-if="!isReadOnly"
                          :value="detail.${df.key}"
                          @input="(v) => (detail.${df.key} = v)"
                          class="w-full"
                        />
                        <span v-else>{{ detail.${df.key} || '-' }}</span>
                      </td>`
  }
  if (df.type === 'radio') {
    const opts = (df.radioOptions || []).map(o => `{ value: '${o.value}', label: '${o.label}' }`).join(', ')
    return `                      <td class="px-2 py-2">
                        <FieldRadio
                          v-if="!isReadOnly"
                          :value="detail.${df.key}"
                          @input="(v) => (detail.${df.key} = v)"
                          :options="[${opts}]"
                          class="w-full"
                        />
                        <span v-else>{{ detail.${df.key} || '-' }}</span>
                      </td>`
  }
  if (df.type === 'currency') {
    return `                      <td class="px-2 py-2">
                        <FieldCurrency
                          v-if="!isReadOnly"
                          :value="detail.${df.key}"
                          @input="(v) => (detail.${df.key} = v)"
                          class="w-full"
                        />
                        <span v-else>{{ Number(detail.${df.key} || 0).toLocaleString('id-ID') }}</span>
                      </td>`
  }
  if (df.type === 'slider') {
    return `                      <td class="px-2 py-2">
                        <FieldSlider
                          v-if="!isReadOnly"
                          :value="detail.${df.key}"
                          @input="(v) => (detail.${df.key} = v)"
                          class="w-full"
                        />
                        <span v-else>{{ detail.${df.key} }}</span>
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

function buildDetailFooter(detailFields, varName, prefixCols, suffixCols) {
  const hasSummary = detailFields.some(df => df.summaryType)
  if (!hasSummary) return ''

  const footerTds = detailFields.map(df => {
    if (!df.summaryType) return `                      <td class="px-2 py-2"></td>`
    const fmt = df.type === 'currency' ? `.toLocaleString('id-ID')` : ''
    if (df.summaryType === 'SUM') {
      return `                      <td class="px-2 py-2 text-right font-semibold text-xs sm:text-sm">
                        {{ ${varName}.reduce((s, d) => s + (Number(d.${df.key}) || 0), 0)${fmt} }}
                      </td>`
    }
    if (df.summaryType === 'AVG') {
      return `                      <td class="px-2 py-2 text-right font-semibold text-xs sm:text-sm">
                        {{ ${varName}.length ? (${varName}.reduce((s, d) => s + (Number(d.${df.key}) || 0), 0) / ${varName}.length)${fmt ? `.toLocaleString('id-ID')` : '.toFixed(2)'} : 0 }}
                      </td>`
    }
    if (df.summaryType === 'COUNT') {
      return `                      <td class="px-2 py-2 text-center font-semibold text-xs sm:text-sm">
                        {{ ${varName}.length }}
                      </td>`
    }
    return `                      <td class="px-2 py-2"></td>`
  }).join('\n')

  const prefixEmpty = Array(prefixCols).fill(`                      <td class="px-2 py-2"></td>`).join('\n')
  const suffixEmpty = Array(suffixCols).fill(`                      <td class="px-2 py-2"></td>`).join('\n')

  // Label in first prefix column
  const labelTd = prefixCols > 0
    ? `                      <td class="px-2 py-2 text-right font-bold text-xs sm:text-sm" colspan="${prefixCols}">Total</td>`
    : ''

  return `
                  <tfoot class="bg-muted/70 border-t-2 border-border">
                    <tr>
${labelTd}
${footerTds}
${suffixEmpty}
                    </tr>
                  </tfoot>`
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
    const fieldTds = detailFields.map(df => buildDetailFieldTd(df, detailFields)).join('\n')

    if (d.mode === 'add_to_list') {
      // ── ADD TO LIST MODE ──
      const addName = i === 0 ? 'addDetailRow' : `addDetailRow${i + 1}`
      const totalCols = 1 + detailFields.length + 1
      const footer = buildDetailFooter(detailFields, varName, 1, 1)

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
                  </tbody>${footer}
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
      const footer2 = buildDetailFooter(detailFields, varName, 1 + displayCols.length, 1)

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
                  </tbody>${footer2}
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

// ── Print page generation helpers ──────────────────────────────────────────
function buildPrintFields(fields, printConfig) {
  // If printConfig is provided, use it (visible fields only, in configured order)
  // Otherwise fall back to all fields
  const fieldMap = new Map(fields.map(f => [f.field, f]))
  const printItems = (printConfig && printConfig.length)
    ? printConfig.filter(pc => pc.visible !== false).map(pc => {
        const orig = fieldMap.get(pc.field) || {}
        return { ...orig, field: pc.field, label: pc.label || orig.label || pc.field }
      })
    : fields

  const rows = []
  printItems.forEach(f => {
    const entry = getRegistryEntry(f.type)
    if (entry?.isSpace || entry?.isFieldGroupEnd) return

    if (entry?.isSection) {
      rows.push(`          <tr>\n            <td colspan="2" class="pt-4 pb-1 font-bold text-sm uppercase tracking-wide border-b-2 border-black">${f.label || 'Section'}</td>\n          </tr>`)
      return
    }
    if (entry?.isFieldGroup) {
      rows.push(`          <tr>\n            <td colspan="2" class="pt-3 pb-1 font-semibold text-sm border-b border-gray-400">${f.label || 'Group'}</td>\n          </tr>`)
      return
    }

    let valueExpr = `record.${f.field}`
    if (entry?.isSwitch) {
      valueExpr = `record.${f.field} === true || record.${f.field} === 1 || record.${f.field} === '1' ? '${f.labelTrue || 'Aktif'}' : '${f.labelFalse || 'Tidak Aktif'}'`
    } else if (f.type === 'currency') {
      valueExpr = `Number(record.${f.field} || 0).toLocaleString('id-ID')`
    } else if (f.type === 'date') {
      valueExpr = `record.${f.field} ? new Date(record.${f.field}).toLocaleDateString('id-ID') : '-'`
    } else if (f.type === 'datetime') {
      valueExpr = `record.${f.field} ? new Date(record.${f.field}).toLocaleString('id-ID') : '-'`
    }

    rows.push(`          <tr class="border-b border-gray-200">\n            <td class="py-2 pr-4 font-medium text-gray-600 w-50 align-top">${f.label || f.field}</td>\n            <td class="py-2">{{ ${valueExpr} || '-' }}</td>\n          </tr>`)
  })
  return rows.join('\n')
}

function buildPrintDetailTables(details) {
  if (!hasDetails(details)) return ''
  const sections = details.map((d, i) => {
    const detailFields = d.detailFields || []
    const displayCols = d.displayColumns || []
    const rk = d.responseKey || ''
    const dataPath = rk ? `record.${rk}` : '[]'
    const fkDisplay = d.foreignDisplay || ''

    const ths = []
    ths.push(`              <th class="border border-gray-300 px-2 py-1.5 text-left bg-gray-100 text-xs font-semibold">No</th>`)
    if (d.mode !== 'add_to_list') {
      displayCols.forEach(dc => {
        ths.push(`              <th class="border border-gray-300 px-2 py-1.5 text-left bg-gray-100 text-xs font-semibold">${dc.label || dc.key}</th>`)
      })
    }
    detailFields.forEach(df => {
      ths.push(`              <th class="border border-gray-300 px-2 py-1.5 text-left bg-gray-100 text-xs font-semibold">${df.label || df.key}</th>`)
    })

    const tds = []
    tds.push(`              <td class="border border-gray-300 px-2 py-1.5 text-xs">{{ idx + 1 }}</td>`)
    if (d.mode !== 'add_to_list') {
      displayCols.forEach(dc => {
        const accessor = fkDisplay ? `row.${fkDisplay}?.${dc.key}` : `row.${dc.key}`
        tds.push(`              <td class="border border-gray-300 px-2 py-1.5 text-xs">{{ ${accessor} || '-' }}</td>`)
      })
    }
    detailFields.forEach(df => {
      let valExpr = `row.${df.key}`
      if (df.type === 'checkbox' || df.type === 'status') {
        valExpr = `row.${df.key} ? '${df.labelTrue || 'Ya'}' : '${df.labelFalse || 'Tidak'}'`
      } else if (df.type === 'currency') {
        valExpr = `Number(row.${df.key} || 0).toLocaleString('id-ID')`
      }
      tds.push(`              <td class="border border-gray-300 px-2 py-1.5 text-xs">{{ ${valExpr} || '-' }}</td>`)
    })

    return `
      <!-- Detail: ${d.tabLabel || 'Detail'} -->
      <div class="mt-6">
        <h3 class="text-sm font-bold mb-2 uppercase">${d.tabLabel || 'Detail'}</h3>
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr>
${ths.join('\n')}
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in (${dataPath} || [])" :key="idx">
${tds.join('\n')}
            </tr>
            <tr v-if="!(${dataPath} || []).length">
              <td colspan="${1 + (d.mode !== 'add_to_list' ? displayCols.length : 0) + detailFields.length}" class="border border-gray-300 px-2 py-4 text-center text-gray-400 text-xs">
                Tidak ada data
              </td>
            </tr>
          </tbody>
        </table>
      </div>`
  })
  return sections.join('\n')
}

function isPrintableField(field) {
  const entry = getRegistryEntry(field?.type)
  return !entry?.isSpace && !entry?.isSection && !entry?.isFieldGroup && !entry?.isFieldGroupEnd && !!field?.field?.trim()
}

function buildFieldTableText(items, fields) {
  return (items || [])
    .filter((item) => item?.visible !== false)
    .map((item) => {
      const source = fields.find((field) => field.field === item.field)
      return `${item.field}|${item.label || source?.label || item.field}`
    })
    .join('\n')
}

function createDefaultPrintBlocks(fields, details, title) {
  const printable = fields.filter(isPrintableField)
  const firstDetail = (details || []).find((detail) => detail?.responseKey)
  const blocks = [
    { id: 'heading-default', type: 'heading', text: title || 'Dokumen', level: 1, align: 'center' },
    { id: 'paragraph-default', type: 'paragraph', text: 'Dicetak pada {{current_date}}', align: 'center' },
    {
      id: 'field-table-default',
      type: 'field_table',
      title: '',
      itemsText: buildFieldTableText(printable.slice(0, 10).map((field) => ({ field: field.field, label: field.label || field.field, visible: true })), printable),
      variant: 'plain',
    },
  ]

  if (firstDetail) {
    blocks.push({
      id: 'detail-default',
      type: 'detail_table',
      title: firstDetail.tabLabel || 'Detail',
      responseKey: firstDetail.responseKey,
    })
  }

  blocks.push({
    id: 'signature-default',
    type: 'signature',
    titlesText: 'Dibuat Oleh\nDiperiksa Oleh\nDisetujui Oleh',
    caption: 'Nama / Tanggal',
  })

  return blocks
}

function normalizePrintBlock(block, fields, details, title) {
  const printable = fields.filter(isPrintableField)
  const firstField = printable[0]?.field || ''
  const firstDetail = (details || []).find((detail) => detail?.responseKey)
  const base = {
    id: block?.id || `pb_${Math.random().toString(36).slice(2, 10)}`,
    type: block?.type || 'paragraph',
    marginTop: Number(block?.marginTop || 0),
    marginBottom: Number(block?.marginBottom || 0),
    borderWidth: Number(block?.borderWidth || 0),
    borderColor: block?.borderColor || '#000000',
    backgroundColor: block?.backgroundColor || '',
    blockPadding: Number(block?.blockPadding || 0),
  }

  switch (base.type) {
    case 'company_header':
      return {
        ...base,
        logoUrl: block?.logoUrl || '',
        companyName: block?.companyName || 'Nama Perusahaan',
        companySubtitle: block?.companySubtitle || 'Alamat / Divisi / Cabang',
        address: block?.address || 'Jl. Contoh Alamat No. 123, Kota, Indonesia',
        meta: block?.meta || 'Telp: 021-000000 | Email: info@company.com',
        align: block?.align === 'center' ? 'center' : 'left',
      }
    case 'heading':
      return {
        ...base,
        text: block?.text || title || 'Dokumen',
        level: Number(block?.level || 1),
        align: block?.align || 'center',
        fontSize: Number(block?.fontSize || 0),
        fontFamily: block?.fontFamily || '',
        bold: block?.bold !== false,
        italic: !!block?.italic,
        underline: !!block?.underline,
        color: block?.color || '',
      }
    case 'paragraph':
      return {
        ...base,
        text: block?.text || 'Isi teks di sini. Bisa menggunakan token seperti {{current_date}} atau {{nama_field}}.',
        align: block?.align || 'left',
        fontSize: Number(block?.fontSize || 0),
        fontFamily: block?.fontFamily || '',
        bold: !!block?.bold,
        italic: !!block?.italic,
        underline: !!block?.underline,
        color: block?.color || '',
      }
    case 'field':
      return { ...base, field: block?.field || firstField, label: block?.label || '', layout: block?.layout || 'row' }
    case 'field_table':
      return { ...base, title: block?.title || '', itemsText: block?.itemsText || buildFieldTableText(printable.slice(0, 10).map((field) => ({ field: field.field, label: field.label || field.field, visible: true })), printable), variant: block?.variant || 'plain' }
    case 'detail_table':
      return { ...base, title: block?.title || firstDetail?.tabLabel || 'Detail', responseKey: block?.responseKey || firstDetail?.responseKey || '' }
    case 'image':
      return {
        ...base,
        src: block?.src || '',
        alt: block?.alt || 'image',
        width: Number(block?.width || 120),
        height: Number(block?.height || 120),
        fit: block?.fit || 'contain',
        align: ['left', 'center', 'right'].includes(block?.align) ? block.align : 'left',
      }
    case 'columns':
      return {
        ...base,
        colCount: Number(block?.colCount || 2),
        gap: Number(block?.gap || 16),
        columnsHtml: Array.isArray(block?.columnsHtml)
          ? block.columnsHtml.map(h => h || '')
          : ['<strong>Kolom 1</strong><br>Isi konten kolom kiri', '<strong>Kolom 2</strong><br>Isi konten kolom kanan'],
      }
    case 'list':
      return {
        ...base,
        listType: block?.listType || 'bullet',
        itemsText: block?.itemsText || 'Item 1\nItem 2\nItem 3',
        fontSize: Number(block?.fontSize || 0),
        fontFamily: block?.fontFamily || '',
        color: block?.color || '',
      }
    case 'table':
      return {
        ...base,
        rows: Number(block?.rows || 3),
        cols: Number(block?.cols || 3),
        cellsText: block?.cellsText || 'Kolom 1|Kolom 2|Kolom 3\nData A1|Data A2|Data A3\nData B1|Data B2|Data B3',
        showBorder: block?.showBorder !== false,
        headerRow: block?.headerRow !== false,
      }
    case 'divider':
      return { ...base, thickness: Number(block?.thickness || 1), style: block?.style || 'solid' }
    case 'spacer':
      return { ...base, height: Number(block?.height || 20) }
    case 'page_break':
      return { ...base }
    case 'page_number':
      return {
        ...base,
        format: block?.format || 'Halaman {page}',
        align: block?.align || 'center',
        fontSize: Number(block?.fontSize || 0),
      }
    case 'watermark':
      return {
        ...base,
        text: block?.text || 'DRAFT',
        opacity: Number(block?.opacity || 0.08),
        fontSize: Number(block?.fontSize || 80),
        color: block?.color || '#000000',
        rotate: Number(block?.rotate ?? -35),
      }
    case 'signature':
      return { ...base, titlesText: block?.titlesText || 'Dibuat Oleh\nDiperiksa Oleh\nDisetujui Oleh', caption: block?.caption || 'Nama / Tanggal' }
    case 'html':
      return { ...base, html: block?.html || '<p style="font-size:12px;">Konten HTML custom. Bisa pakai token: <strong>{{page_title}}</strong></p>' }
    case 'header':
      return {
        ...base,
        text: block?.text || '{{page_title}}',
        align: block?.align || 'left',
        fontSize: Number(block?.fontSize || 0),
        fontFamily: block?.fontFamily || '',
        bold: !!block?.bold,
        italic: !!block?.italic,
        underline: !!block?.underline,
        color: block?.color || '',
        showLine: block?.showLine !== false,
        showOnFirstPage: block?.showOnFirstPage !== false,
      }
    case 'footer':
      return {
        ...base,
        text: block?.text || 'Halaman {page}',
        align: block?.align || 'center',
        fontSize: Number(block?.fontSize || 0),
        fontFamily: block?.fontFamily || '',
        bold: !!block?.bold,
        italic: !!block?.italic,
        underline: !!block?.underline,
        color: block?.color || '',
        showLine: block?.showLine !== false,
        showOnFirstPage: block?.showOnFirstPage !== false,
      }
    default:
      return { ...base, type: 'paragraph', text: block?.text || '', align: block?.align || 'left' }
  }
}

function normalizePrintConfigServer(rawConfig, fields, details, title) {
  const fallback = {
    enabled: false,
    paperSize: 'A4',
    orientation: 'portrait',
    marginMm: 15,
    exportPdf: true,
    exportDocx: true,
    headerText: '',
    footerText: '',
    showPageNumber: false,
    pageNumberPosition: 'bottom-center',
    blocks: createDefaultPrintBlocks(fields, details, title),
  }

  if (Array.isArray(rawConfig)) {
    return {
      ...fallback,
      enabled: rawConfig.length > 0,
      blocks: [
        normalizePrintBlock({ type: 'heading', text: title || 'Dokumen', level: 1, align: 'center' }, fields, details, title),
        normalizePrintBlock({ type: 'paragraph', text: 'Dicetak pada {{current_date}}', align: 'center' }, fields, details, title),
        normalizePrintBlock({ type: 'field_table', itemsText: buildFieldTableText(rawConfig, fields) }, fields, details, title),
        normalizePrintBlock({ type: 'signature' }, fields, details, title),
      ],
    }
  }

  if (!rawConfig || typeof rawConfig !== 'object') {
    return fallback
  }

  return {
    ...fallback,
    ...rawConfig,
    enabled: rawConfig.enabled === true,
    paperSize: ['A4', 'A5', 'Letter', 'Legal'].includes(rawConfig.paperSize) ? rawConfig.paperSize : 'A4',
    orientation: rawConfig.orientation === 'landscape' ? 'landscape' : 'portrait',
    marginMm: Number(rawConfig.marginMm || 15),
    exportPdf: rawConfig.exportPdf !== false,
    exportDocx: rawConfig.exportDocx !== false,
    headerText: rawConfig.headerText || '',
    footerText: rawConfig.footerText || '',
    showPageNumber: !!rawConfig.showPageNumber,
    pageNumberPosition: rawConfig.pageNumberPosition || 'bottom-center',
    blocks: Array.isArray(rawConfig.blocks)
      ? rawConfig.blocks.map((block) => normalizePrintBlock(block, fields, details, title))
      : fallback.blocks,
  }
}

function toSafeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

function buildPrintFieldMeta(fields) {
  const result = {}
  fields.forEach((field) => {
    if (!field?.field) return
    result[field.field] = {
      field: field.field,
      label: field.label || field.field,
      type: field.type,
      labelTrue: field.labelTrue || 'Aktif',
      labelFalse: field.labelFalse || 'Tidak Aktif',
      displayField: field.displayField || 'name',
    }
  })
  return result
}

function buildPrintDetailMeta(details) {
  return (details || []).map((detail) => ({
    tabLabel: detail.tabLabel || 'Detail',
    responseKey: detail.responseKey || '',
    mode: detail.mode || 'add_to_list',
    foreignDisplay: detail.foreignDisplay || '',
    displayColumns: detail.displayColumns || [],
    detailFields: detail.detailFields || [],
  }))
}

// ── Handler ────────────────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { modulePath, moduleName, apiEndpoint, routePath, pageTitle, fields, details, landingConfig, printConfig, columnLayout, wizardSteps } = body

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
  const printTplPath = resolve(root, 'template', 'Print.vue.tpl')
  const printTpl = existsSync(printTplPath) ? readFileSync(printTplPath, 'utf-8') : null
  const normalizedPrintConfig = printTpl ? normalizePrintConfigServer(printConfig, fields, details, readableName) : null
  const printEnabled = !!normalizedPrintConfig?.enabled

  // ── Build replacements ─────────────────────────────────────────────────
  const hasSwitch = fields.some(f => f.type === 'switch')
  const switchField = fields.find(f => f.type === 'switch')

  // Detect if module has m_unit_bisnis_id field (for auto unit bisnis filtering)
  const hasUnitBisnis = fields.some(f => f.field === 'm_unit_bisnis_id')

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
    __FORM_CONTENT__: buildFormContent(fields, columnLayout || 2, wizardSteps || [], details),
    __WIZARD_STATE__: (wizardSteps && wizardSteps.length > 0) ? `const wizardStep = ref(0);` : '',
    __COLUMN_LAYOUT__: String(columnLayout || 2),
    __COLUMNS__: buildColumns(fields, landingConfig),
    __SEARCH_FIELDS__: buildSearchFields(fields, landingConfig),
    __MOBILE_CARD_HEADER__: buildMobileCardHeader(fields, landingConfig),
    __MOBILE_INFO_ROWS__: buildMobileInfoRows(fields, landingConfig),
    __DELETE_DESCRIPTION__: buildDeleteDescription(fields, landingConfig),
    __DETAIL_IMPORTS__: buildDetailImports(details),
    __DETAIL_STATE__: buildDetailState(details),
    __DETAIL_SELECTED_IDS__: buildDetailSelectedIds(details),
    __DETAIL_METHODS__: buildDetailMethods(details),
    __COMPUTED_WATCHERS__: buildComputedWatchers(fields),
    __DETAIL_COMPUTED_WATCHERS__: buildDetailComputedWatchers(details),
    __DETAIL_RESET__: buildDetailReset(details),
    __DETAIL_LOAD_DATA__: buildDetailLoadData(details),
    __DETAIL_PAYLOAD__: buildDetailPayload(details),
    __DETAIL_TEMPLATE__: buildDetailTemplate(details),
    __PRINT_BUTTON__: printTpl && printEnabled
      ? `        <Button
          v-if="isViewMode && perms.is_print !== false"
          type="button"
          variant="outline"
          @click="navigateTo('${routePath}/print/' + recordId, { open: { target: '_blank' } })"
          class="gap-2 w-full sm:w-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
          Cetak
        </Button>`
      : '',
    __PRINT_FIELDS__: printTpl ? buildPrintFields(fields, printConfig) : '',
    __PRINT_DETAIL_TABLES__: printTpl ? buildPrintDetailTables(details) : '',
    __PRINT_CONFIG_JSON__: printTpl ? toSafeJson(normalizedPrintConfig) : '{}',
    __PRINT_FIELD_META_JSON__: printTpl ? toSafeJson(buildPrintFieldMeta(fields)) : '{}',
    __PRINT_DETAIL_META_JSON__: printTpl ? toSafeJson(buildPrintDetailMeta(details)) : '[]',
    __HAS_SWITCH_COLUMN__: hasSwitch ? `\n\t\t{\n\t\t\theaderName: "Aktif",\n\t\t\tfield: "${switchField?.field || 'is_active'}",\n\t\t\tminWidth: 110,\n\t\t\tcellRenderer: (params) => {\n\t\t\t\tconst isActive = checkActive(params?.value)\n\t\t\t\tconst label = isActive ? "${switchField?.labelTrue || 'Aktif'}" : "${switchField?.labelFalse || 'Nonaktif'}"\n\t\t\t\tconst cls = isActive ? "font-bold text-green-600" : "font-bold text-red-600"\n\t\t\t\treturn \`<span class="\${cls}">\${label}</span>\`\n\t\t\t},\n\t\t},` : '',

    // ── Unit Bisnis auto-filter & auto-fill ────────────────────────────
    __UNIT_BISNIS_LANDING_SETUP__: hasUnitBisnis
      ? `
// Unit bisnis user login (non-super-admin hanya lihat data unit bisnis sendiri)
const userCompanyId = computed(() => {
\tif (authStore.isSuperAdmin) return null
\tconst ud = authStore.userDefault
\tif (!ud) return null
\treturn ud.karyawan?.m_unit_bisnis_id
\t\t|| ud.user_details?.find(d => d.is_primary && d.is_active)?.m_respo?.m_unit_bisnis_id
\t\t|| ud.user_details?.find(d => d.is_active)?.m_respo?.m_unit_bisnis_id
\t\t|| null
})
`
      : '',
    __UNIT_BISNIS_LANDING_FILTER__: hasUnitBisnis
      ? `\t\t\t\tif (userCompanyId.value) {
\t\t\t\t\tparams.set("filter_column_m_unit_bisnis_id", userCompanyId.value)
\t\t\t\t\tparams.set("filter_operator_m_unit_bisnis_id", "=")
\t\t\t\t}
`
      : '',
    __UNIT_BISNIS_FORM_SETUP__: hasUnitBisnis
      ? `
// ============================================================================
// AUTH — Cek tipe user (Super Admin atau bukan)
// ============================================================================
const isSuperAdmin = computed(() => authStore.isSuperAdmin);

// Nama company untuk display di field readonly (non-super-admin)
const companyNameDisplay = computed(() => {
  const ud = authStore.userDefault;
  if (!ud) return '-';
  if (ud.karyawan?.m_unit_bisni?.nama_comp) return ud.karyawan.m_unit_bisni.nama_comp;
  const primary = ud.user_details?.find((d) => d.is_primary && d.is_active) || ud.user_details?.find((d) => d.is_active);
  return primary?.m_respo?.unit_bisnis?.nama_comp || '-';
});
`
      : '',
    __UNIT_BISNIS_FORM_AUTOFILL__: hasUnitBisnis
      ? `  // Auto-fill unit bisnis untuk non-super-admin
  if (!isSuperAdmin.value) {
    const ud = authStore.userDefault;
    if (ud) {
      const companyId = ud.karyawan?.m_unit_bisnis_id
        || ud.user_details?.find((d) => d.is_primary && d.is_active)?.m_respo?.m_unit_bisnis_id
        || ud.user_details?.find((d) => d.is_active)?.m_respo?.m_unit_bisnis_id;
      if (companyId) values.m_unit_bisnis_id = companyId;
    }
  }

`
      : '',
  }

  // ── Apply replacements ─────────────────────────────────────────────────
  let formContent = formTpl
  let landingContent = landingTpl
  for (const [token, value] of Object.entries(replacements)) {
    formContent = formContent.replaceAll(token, value)
    landingContent = landingContent.replaceAll(token, value)
  }

  // ── Post-process: wrap m_unit_bisnis_id FieldSelect with v-if/v-else ──
  if (hasUnitBisnis) {
    // Find the generated FieldSelect for m_unit_bisnis_id and wrap it
    const ubFieldRegex = /(<(?:FieldSelect|FieldSelectCreatable)\s[^>]*id="m_unit_bisnis_id"[^/]*\/>)/s
    const match = formContent.match(ubFieldRegex)
    if (match) {
      const original = match[1]
      const wrapped = original.replace(
        /(<(?:FieldSelect|FieldSelectCreatable))/,
        '$1\n              v-if="isSuperAdmin"'
      )
      const fieldXFallback = `            <FieldX
              v-else
              id="m_unit_bisnis_id_display"
              label="Unit Bisnis"
              :value="companyNameDisplay"
              :disabled="true"
              :readonly="true"
              hints="Unit bisnis dari akun Anda"
              class="w-full"
            />`
      formContent = formContent.replace(original, wrapped + '\n\n' + fieldXFallback)
    }
  }

  // ── Write files ────────────────────────────────────────────────────────
  const formDir = resolve(root, 'app', 'pages', ...modulePath.split('/'), 'form')
  const landingDir = resolve(root, 'app', 'pages', ...modulePath.split('/'))
  const printDir = resolve(root, 'app', 'pages', ...modulePath.split('/'), 'print')

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

  // ── Print page ───────────────────────────────────────────────────────
  if (printTpl && printEnabled) {
    mkdirSync(printDir, { recursive: true })
    const printFile = resolve(printDir, '[[id]].vue')
    let printContent = printTpl
    for (const [token, value] of Object.entries(replacements)) {
      printContent = printContent.replaceAll(token, value)
    }
    if (existsSync(printFile)) {
      skipped.push(`pages/${modulePath}/print/[[id]].vue (sudah ada)`)
    } else {
      writeFileSync(printFile, printContent)
      created.push(`pages/${modulePath}/print/[[id]].vue`)
    }
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
