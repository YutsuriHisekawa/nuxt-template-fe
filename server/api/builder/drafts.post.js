import { resolve } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { randomUUID } from 'crypto'

/**
 * POST /api/builder/drafts
 *
 * Creates a new builder draft from the dashboard UI.
 * Body: { modulePath: string, apiEndpoint?: string }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { modulePath } = body

  if (!modulePath || typeof modulePath !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'modulePath wajib diisi' })
  }

  // Sanitize & normalize path
  const cleaned = modulePath.replace(/\\/g, '/').replace(/^\/|\/$/g, '').trim()
  if (!cleaned || /[^a-zA-Z0-9/_-]/.test(cleaned)) {
    throw createError({ statusCode: 400, statusMessage: 'modulePath hanya boleh berisi huruf, angka, underscore, dash, dan slash' })
  }

  const segments = cleaned.split('/')
  const moduleName = segments[segments.length - 1]
  const apiEndpoint = body.apiEndpoint?.trim() || moduleName
  const routePath = '/' + cleaned

  // Readable name
  const isTransaction = moduleName.startsWith('t_')
  const cleanName = moduleName.replace(/^[mt]_/, '').split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  const readableName = isTransaction ? 'Transaksi ' + cleanName : 'Master ' + cleanName

  const token = randomUUID()
  const configDir = resolve(process.cwd(), '.builder_configs')
  if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true })

  const configPath = resolve(configDir, `${token}.json`)
  const config = {
    modulePath: cleaned,
    moduleName,
    apiEndpoint,
    routePath,
    readableName,
    token,
    createdAt: new Date().toISOString(),
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2))

  return {
    success: true,
    token,
    config,
  }
})
