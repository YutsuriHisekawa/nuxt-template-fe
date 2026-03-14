/**
 * Auto-detect fields from API response.
 * Fetches sample data, analyzes patterns across rows, and infers field types
 * with confidence scores.
 */
export default defineEventHandler(async (event) => {
  await verifyBuilderKey(event)
  const body = await readBody(event)
  const { apiEndpoint, token } = body

  if (!apiEndpoint || !token) {
    throw createError({ statusCode: 400, statusMessage: 'apiEndpoint and token are required' })
  }

  // Validate token (reads per-token config file, throws if invalid)
  readBuilderConfig(token)

  // Fetch rows from the dynamic API (server-side call, forward auth)
  const runtimeConfig = useRuntimeConfig()
  const baseUrl = runtimeConfig.public?.baseUrl || process.env.API_BASE_URL || 'http://localhost:9999'
  const url = `${baseUrl}/api/dynamic/${apiEndpoint}?paginate=10&join=true`

  // Forward auth to backend API
  const headers = {}
  const cookie = getHeader(event, 'cookie')
  if (cookie) headers.cookie = cookie
  const authorization = getHeader(event, 'authorization')
  if (authorization) {
    headers.authorization = authorization
  } else {
    const authToken = getCookie(event, 'auth_token')
    if (authToken) headers.authorization = `Bearer ${authToken}`
  }

  let rows = []
  try {
    const res = await $fetch(url, { headers })
    if (res?.data && Array.isArray(res.data)) {
      rows = res.data
    } else if (Array.isArray(res)) {
      rows = res
    }
  } catch (err) {
    throw createError({
      statusCode: 502,
      statusMessage: `Gagal fetch dari API: ${err?.message || 'Unknown error'}`
    })
  }

  if (!rows.length) {
    return { success: true, fields: [], message: 'API mengembalikan data kosong. Tidak ada field yang bisa di-detect.' }
  }

  // Merge all rows to get complete key set
  const merged = {}
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    for (const key of Object.keys(row)) {
      if (merged[key] === undefined || merged[key] === null) {
        merged[key] = row[key]
      }
    }
  }

  // Collect all values per key for pattern analysis
  const allValues = {}
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    for (const key of Object.keys(row)) {
      if (!allValues[key]) allValues[key] = []
      allValues[key].push(row[key])
    }
  }

  // Detect nested objects (relations) for foreign key enrichment
  const nestedObjects = {}
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    for (const [key, value] of Object.entries(row)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        if (!nestedObjects[key]) nestedObjects[key] = value
      }
    }
  }

  const SKIP_FIELDS = new Set([
    'id', 'createdAt', 'updatedAt', 'deletedAt', 'created_at', 'updated_at', 'deleted_at'
  ])

  const fields = []
  for (const [key, value] of Object.entries(merged)) {
    if (SKIP_FIELDS.has(key)) continue
    // Skip nested objects/arrays (these are relations, handled via FK)
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) continue
    if (Array.isArray(value)) continue

    const inferred = inferFieldType(key, value, allValues[key] || [], nestedObjects)
    fields.push(inferred)
  }

  return { success: true, fields }
})

// ── Date/time pattern detection ────────────────────────────────────────────
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/
const DATE_SLASH_RE = /^\d{2}\/\d{2}\/\d{4}/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^(\+?\d{1,4}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}$/

/**
 * Infer field type from key name, sample value, all values (for enum detection),
 * and nested objects (for FK display field detection).
 */
function inferFieldType(key, sampleValue, allValues, nestedObjects) {
  const lower = key.toLowerCase()

  // Boolean fields → Switch (confidence: high)
  if (typeof sampleValue === 'boolean' || lower.startsWith('is_') || lower.startsWith('has_')) {
    return {
      field: key,
      label: toLabel(key),
      type: 'switch',
      labelTrue: 'Aktif',
      labelFalse: 'Tidak Aktif',
      confidence: 95,
    }
  }

  // Foreign key → FieldPopUp (confidence: high)
  if (lower.endsWith('_id') && lower !== 'id') {
    const relation = key.replace(/_id$/, '')
    const result = {
      field: key,
      label: toLabel(relation),
      type: 'popup',
      apiUrl: `/api/dynamic/${relation}`,
      displayField: 'name',
      valueField: 'id',
      confidence: 90,
    }

    // Detect display field from nested object
    const nested = nestedObjects[relation]
    if (nested && typeof nested === 'object') {
      const displayCandidates = ['nama', 'name', 'kode', 'code', 'label', 'title', 'no', 'nomor']
      const objectKeys = Object.keys(nested)
      const found = displayCandidates.find(c => objectKeys.some(k => k.toLowerCase().includes(c)))
      if (found) {
        result.displayField = objectKeys.find(k => k.toLowerCase().includes(found)) || 'name'
      }
    }

    return result
  }

  // ── Value-based pattern analysis (use all rows) ────────────────────────

  // Get non-null string values for pattern matching
  const stringValues = allValues.filter(v => v != null && v !== '').map(String)

  // Date detection by value pattern (confidence: high)
  if (stringValues.length > 0) {
    const dateMatches = stringValues.filter(v => ISO_DATE_RE.test(v) || DATE_SLASH_RE.test(v))
    if (dateMatches.length >= stringValues.length * 0.7) {
      const hasTime = dateMatches.some(v => /T\d{2}:\d{2}/.test(v))
      return {
        field: key, label: toLabel(key),
        type: hasTime ? 'datetime' : 'date',
        confidence: 90,
      }
    }
  }

  // Date detection by key name
  if (lower.includes('tanggal') || lower.includes('_date') || lower === 'tgl' || lower.endsWith('_tgl')) {
    return { field: key, label: toLabel(key), type: 'date', confidence: 85 }
  }
  if (lower.includes('datetime') || lower.includes('_at') || lower.endsWith('_time')) {
    return { field: key, label: toLabel(key), type: 'datetime', confidence: 85 }
  }

  // Email detection by value pattern
  if (stringValues.length > 0) {
    const emailMatches = stringValues.filter(v => EMAIL_RE.test(v))
    if (emailMatches.length >= stringValues.length * 0.5) {
      return { field: key, label: toLabel(key), type: 'email', confidence: 85 }
    }
  }
  if (lower.includes('email') || lower.includes('e_mail')) {
    return { field: key, label: toLabel(key), type: 'email', confidence: 80 }
  }

  // Phone/telp detection by value pattern
  if (stringValues.length > 0) {
    const phoneMatches = stringValues.filter(v => PHONE_RE.test(v))
    if (phoneMatches.length >= stringValues.length * 0.5) {
      return { field: key, label: toLabel(key), type: 'tel', confidence: 80 }
    }
  }
  if (lower.includes('telp') || lower.includes('phone') || lower.includes('telepon') || lower.includes('hp') || lower.includes('whatsapp') || lower.includes('wa') || lower === 'no_hp' || lower === 'no_telp') {
    return { field: key, label: toLabel(key), type: 'tel', confidence: 75 }
  }

  // Currency / money fields
  if (lower.includes('harga') || lower.includes('price') || lower.includes('total') || lower.includes('biaya') || lower.includes('cost') || lower.includes('amount') || lower.includes('nominal') || lower.includes('tarif') || lower.includes('diskon') || lower.includes('discount')) {
    return { field: key, label: toLabel(key), type: 'currency', confidence: 85 }
  }

  // Numeric fields
  if (typeof sampleValue === 'number') {
    if (Number.isInteger(sampleValue)) {
      if (lower.includes('qty') || lower.includes('jumlah') || lower.includes('stok') || lower.includes('stock') || lower.includes('quantity')) {
        return { field: key, label: toLabel(key), type: 'fieldnumber', confidence: 85 }
      }
      return { field: key, label: toLabel(key), type: 'fieldnumber', confidence: 75 }
    }
    return { field: key, label: toLabel(key), type: 'fieldnumber_decimal', confidence: 80 }
  }

  // Long text / description fields
  if (lower.includes('catatan') || lower.includes('keterangan') || lower.includes('deskripsi') || lower.includes('desc') || lower.includes('alamat') || lower.includes('address') || lower.includes('note') || lower.includes('remark')) {
    return { field: key, label: toLabel(key), type: 'textarea', confidence: 80 }
  }

  // ── Enum detection: few unique values across rows → select ─────────────
  if (stringValues.length >= 3) {
    const unique = [...new Set(stringValues)]
    if (unique.length > 0 && unique.length <= 8 && unique.length < stringValues.length * 0.5) {
      const staticOptions = unique.map(v => ({ label: v, value: v }))
      return {
        field: key, label: toLabel(key),
        type: 'select',
        sourceType: 'static',
        staticOptions,
        confidence: 70,
      }
    }
  }

  // Status / dropdown candidates by key name
  if (lower === 'status' || lower === 'tipe' || lower === 'jenis' || lower === 'kategori' || lower === 'type' || lower === 'category') {
    const unique = [...new Set(stringValues)]
    const staticOptions = unique.length > 0 && unique.length <= 10
      ? unique.map(v => ({ label: v, value: v }))
      : []
    return { field: key, label: toLabel(key), type: 'select', sourceType: 'static', staticOptions, confidence: 75 }
  }

  // Default: text
  return { field: key, label: toLabel(key), type: 'text', confidence: 50 }
}

/**
 * Convert snake_case field name to readable label
 */
function toLabel(key) {
  return key
    .replace(/^[mt]_/, '')       // strip m_ or t_ prefix
    .replace(/_id$/, '')         // strip _id suffix
    .split(/[_-]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}
