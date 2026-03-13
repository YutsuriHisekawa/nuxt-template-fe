/**
 * Pre-generate validation for builder config.
 *
 * Validates cross-references between fields, details, formulas,
 * visibleWhen, dependsOn, and auto-fill targets.
 *
 * Returns { valid: boolean, errors: string[] }
 */
export function validateBuilderConfig({ fields = [], details = [], detailTabs = [] }) {
  const errors = []

  // Build lookup sets
  const fieldNames = new Set()
  const layoutTypes = new Set(['space', 'section', 'fieldgroup', 'fieldgroup_end'])

  fields.forEach(f => {
    if (f.field?.trim() && !layoutTypes.has(f.type)) {
      fieldNames.add(f.field.trim())
    }
  })

  // Also build detail field keys per detail index
  const detailFieldKeys = [] // [ Set, Set, ... ]
  details.forEach((d, i) => {
    const keys = new Set()
    ;(d.detailFields || []).forEach(df => {
      if (df.key?.trim()) keys.add(df.key.trim())
    })
    detailFieldKeys.push(keys)
  })

  // ── 1. dependsOn references ──────────────────────────────────────────
  fields.forEach(f => {
    if (f.dependsOn?.trim() && !fieldNames.has(f.dependsOn.trim())) {
      errors.push(`Field "${f.label || f.field}": dependsOn merujuk ke "${f.dependsOn}" yang tidak ada`)
    }
  })

  // ── 2. Formula references ────────────────────────────────────────────
  fields.forEach(f => {
    const tokens = Array.isArray(f.computedFormula) ? f.computedFormula : []
    tokens.forEach(t => {
      if (t.type === 'field' && !fieldNames.has(t.value)) {
        errors.push(`Field "${f.label || f.field}": formula merujuk ke field "${t.value}" yang tidak ada`)
      }
    })
  })

  // Detail field formulas
  details.forEach((d, di) => {
    const keys = detailFieldKeys[di]
    ;(d.detailFields || []).forEach(df => {
      const tokens = Array.isArray(df.computedFormula) ? df.computedFormula : []
      tokens.forEach(t => {
        if (t.type === 'field' && !keys.has(t.value)) {
          errors.push(`Detail "${d.responseKey || `#${di + 1}`}" field "${df.label || df.key}": formula merujuk ke "${t.value}" yang tidak ada di detail ini`)
        }
      })
    })
  })

  // ── 3. visibleWhen references ────────────────────────────────────────
  fields.forEach(f => {
    if (f.visibleWhen?.field?.trim() && !fieldNames.has(f.visibleWhen.field.trim())) {
      errors.push(`Field "${f.label || f.field}": visibleWhen merujuk ke field "${f.visibleWhen.field}" yang tidak ada`)
    }
  })

  // ── 4. Auto-fill target validation ───────────────────────────────────
  fields.forEach(f => {
    if (f.defaultValueFrom?.field?.trim()) {
      const sourceField = f.defaultValueFrom.field.trim()
      if (!fieldNames.has(sourceField)) {
        errors.push(`Field "${f.label || f.field}": auto-fill source "${sourceField}" tidak ada`)
      }
    }
  })

  // Detail auto-fill from header
  details.forEach((d, di) => {
    ;(d.detailFields || []).forEach(df => {
      if (df.defaultValueFrom?.field?.trim()) {
        const sourceField = df.defaultValueFrom.field.trim()
        if (!fieldNames.has(sourceField)) {
          errors.push(`Detail "${d.responseKey || `#${di + 1}`}" field "${df.label || df.key}": auto-fill source "${sourceField}" tidak ada di header fields`)
        }
      }
    })
  })

  // ── 5. requiredWhenField references ──────────────────────────────────
  fields.forEach(f => {
    if (f.requiredWhenField?.trim() && !fieldNames.has(f.requiredWhenField.trim())) {
      errors.push(`Field "${f.label || f.field}": requiredWhen merujuk ke field "${f.requiredWhenField}" yang tidak ada`)
    }
  })

  // ── 6. detailAggregate references ────────────────────────────────────
  fields.forEach(f => {
    if (f.detailAggregate?.type && f.detailAggregate?.detailField) {
      const di = Number(f.detailAggregate.detailIndex) || 0
      const detailField = f.detailAggregate.detailField
      if (di >= details.length) {
        errors.push(`Field "${f.label || f.field}": aggregate merujuk ke detail index ${di}, tapi hanya ada ${details.length} detail`)
      } else if (detailFieldKeys[di] && !detailFieldKeys[di].has(detailField)) {
        errors.push(`Field "${f.label || f.field}": aggregate merujuk ke detail field "${detailField}" yang tidak ada di detail #${di + 1}`)
      }
    }
  })

  // ── 7. Detail tab references ─────────────────────────────────────────
  if (detailTabs.length) {
    const tabIds = new Set(detailTabs.map(t => t.id))
    details.forEach((d, di) => {
      if (d.tabId && !tabIds.has(d.tabId)) {
        errors.push(`Detail "${d.responseKey || `#${di + 1}`}": tabId "${d.tabId}" tidak ada di detailTabs`)
      }
    })
  }

  // ── 8. Detail responseKey uniqueness ─────────────────────────────────
  const responseKeys = new Set()
  details.forEach((d, di) => {
    const key = d.responseKey?.trim()
    if (key) {
      if (responseKeys.has(key)) {
        errors.push(`Detail #${di + 1}: responseKey "${key}" duplikat`)
      }
      responseKeys.add(key)
    }
  })

  return { valid: errors.length === 0, errors }
}
