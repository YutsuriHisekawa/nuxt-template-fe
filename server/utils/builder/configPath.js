import { resolve } from 'path'
import { existsSync, readFileSync, unlinkSync } from 'fs'

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
