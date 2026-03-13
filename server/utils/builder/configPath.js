import { resolve } from 'path'
import { existsSync, readFileSync, unlinkSync } from 'fs'
import { timingSafeEqual } from 'crypto'

/**
 * Verify the builder key from the request matches .builder_active.
 * Reads key from query param or request body.
 * Throws 403 if invalid or missing.
 */
export async function verifyBuilderKey(event) {
  const gatePath = resolve(process.cwd(), '.builder_active')
  if (!existsSync(gatePath)) {
    throw createError({ statusCode: 403, statusMessage: 'Builder tidak aktif. Jalankan: node add_route.cjs' })
  }
  const storedKey = readFileSync(gatePath, 'utf-8').trim()

  // Read key from query or body
  const query = getQuery(event)
  let key = query.key
  if (!key) {
    try {
      const body = await readBody(event)
      key = body?.key
    } catch {}
  }

  if (!key || typeof key !== 'string') {
    throw createError({ statusCode: 403, statusMessage: 'Builder key tidak ditemukan. Jalankan: node add_route.cjs' })
  }

  // Constant-time comparison to prevent timing attacks
  const keyBuf = Buffer.from(key)
  const storedBuf = Buffer.from(storedKey)
  if (keyBuf.length !== storedBuf.length || !timingSafeEqual(keyBuf, storedBuf)) {
    throw createError({ statusCode: 403, statusMessage: 'Builder key tidak valid. Jalankan ulang: node add_route.cjs' })
  }
}

/**
 * Resolve the config file path for a given builder token.
 * Validates UUID format to prevent path traversal.
 */
export function getBuilderConfigPath(token) {
  if (!token || typeof token !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid builder token format' })
  }
  return resolve(process.cwd(), '.builder_configs', `${token}.json`)
}

/**
 * Read and parse the builder config for a given token.
 * Throws 404 if the config file doesn't exist.
 */
export function readBuilderConfig(token) {
  const configPath = getBuilderConfigPath(token)
  if (!existsSync(configPath)) {
    throw createError({ statusCode: 404, statusMessage: 'Builder session not found. Run: node add_route.cjs <module_path>' })
  }
  return JSON.parse(readFileSync(configPath, 'utf-8'))
}

/**
 * Delete the builder config file for a given token. Silently ignores missing files.
 */
export function removeBuilderConfig(token) {
  try {
    const configPath = getBuilderConfigPath(token)
    if (existsSync(configPath)) unlinkSync(configPath)
  } catch {}
}
