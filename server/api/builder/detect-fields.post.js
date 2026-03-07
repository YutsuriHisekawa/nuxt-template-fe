/**
 * Auto-detect fields from API response.
 * Hit the dynamic API with paginate=1, read 1 row, infer field types.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { apiEndpoint, token } = body

  if (!apiEndpoint || !token) {
    throw createError({ statusCode: 400, statusMessage: 'apiEndpoint and token are required' })
  }

  // Validate token
  const { readFileSync, existsSync } = await import('fs')
  const { resolve } = await import('path')
  const configPath = resolve(process.cwd(), '.builder_config.json')
  if (!existsSync(configPath)) {
    throw createError({ statusCode: 403, statusMessage: 'Builder session not found' })
  }
  const savedConfig = JSON.parse(readFileSync(configPath, 'utf-8'))
  if (token !== savedConfig.token) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid builder token' })
  }

  // Fetch rows from the dynamic API (server-side call, forward auth)
  const runtimeConfig = useRuntimeConfig()
  const baseUrl = runtimeConfig.public?.baseUrl || process.env.API_BASE_URL || 'http://localhost:9999'
  const url = `${baseUrl}/api/dynamic/${apiEndpoint}?paginate=5&join=true`

  // Forward auth to backend API
  const headers = {}
  // 1. Forward cookie header (for httpOnly cookie auth)
  const cookie = getHeader(event, 'cookie')
  if (cookie) headers.cookie = cookie
  // 2. Check Authorization header from client
  const authorization = getHeader(event, 'authorization')
  if (authorization) {
    headers.authorization = authorization
  } else {
    // 3. Fallback: read auth_token from cookie and use as Bearer token
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

  // Merge all rows to get complete key set (some rows may have null for certain fields)
  const merged = {}
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    for (const key of Object.keys(row)) {
      if (merged[key] === undefined || merged[key] === null) {
        merged[key] = row[key]
      }
    }
  }

  // Skip system/internal fields
  const SKIP_FIELDS = new Set([
    'id', 'createdAt', 'updatedAt', 'deletedAt', 'created_at', 'updated_at', 'deleted_at'
  ])

  const fields = []
  for (const [key, value] of Object.entries(merged)) {
    if (SKIP_FIELDS.has(key)) continue

    // Skip nested objects/arrays (these are relations)
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) continue
    if (Array.isArray(value)) continue

    const inferred = inferFieldType(key, value)
    fields.push(inferred)
  }

  return { success: true, fields }
})

/**
 * Infer field type from key name and sample value
 */
function inferFieldType(key, sampleValue) {
  const lower = key.toLowerCase()

  // Boolean fields → Switch
  if (typeof sampleValue === 'boolean' || lower.startsWith('is_') || lower.startsWith('has_')) {
    return {
      field: key,
      label: toLabel(key),
      type: 'switch',
      labelTrue: 'Aktif',
      labelFalse: 'Tidak Aktif',
    }
  }

  // Foreign key → FieldPopUp
  if (lower.endsWith('_id') && lower !== 'id') {
    // Derive API endpoint from FK (m_supplier_id → m_supplier)
    const relation = key.replace(/_id$/, '')
    return {
      field: key,
      label: toLabel(relation),
      type: 'popup',
      apiUrl: `/api/dynamic/${relation}`,
      displayField: 'name',
      valueField: 'id',
    }
  }

  // Date fields
  if (lower.includes('tanggal') || lower.includes('_date') || lower === 'tgl' || lower.endsWith('_tgl')) {
    return { field: key, label: toLabel(key), type: 'date' }
  }
  if (lower.includes('datetime') || lower.includes('_at') || lower.endsWith('_time')) {
    return { field: key, label: toLabel(key), type: 'datetime' }
  }

  // Currency / money fields
  if (lower.includes('harga') || lower.includes('price') || lower.includes('total') || lower.includes('biaya') || lower.includes('cost') || lower.includes('amount') || lower.includes('nominal') || lower.includes('tarif') || lower.includes('diskon') || lower.includes('discount')) {
    return { field: key, label: toLabel(key), type: 'currency' }
  }

  // Numeric fields
  if (typeof sampleValue === 'number') {
    if (Number.isInteger(sampleValue) && !lower.includes('.')) {
      // Check if it could be qty/jumlah
      if (lower.includes('qty') || lower.includes('jumlah') || lower.includes('stok') || lower.includes('stock') || lower.includes('quantity')) {
        return { field: key, label: toLabel(key), type: 'fieldnumber' }
      }
      return { field: key, label: toLabel(key), type: 'fieldnumber' }
    }
    return { field: key, label: toLabel(key), type: 'fieldnumber_decimal' }
  }

  // Long text / description fields
  if (lower.includes('catatan') || lower.includes('keterangan') || lower.includes('deskripsi') || lower.includes('desc') || lower.includes('alamat') || lower.includes('address') || lower.includes('note') || lower.includes('remark')) {
    return { field: key, label: toLabel(key), type: 'textarea' }
  }

  // Status / dropdown candidates
  if (lower === 'status' || lower === 'tipe' || lower === 'jenis' || lower === 'kategori' || lower === 'type' || lower === 'category') {
    return { field: key, label: toLabel(key), type: 'select', sourceType: 'static', staticOptions: [] }
  }

  // Default: text
  return { field: key, label: toLabel(key), type: 'text' }
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
