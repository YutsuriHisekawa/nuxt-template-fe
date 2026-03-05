import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

export default defineEventHandler((event) => {
  const configPath = resolve(process.cwd(), '.builder_config.json')

  if (!existsSync(configPath)) {
    throw createError({ statusCode: 404, statusMessage: 'Builder config not found. Run: node add_route.cjs <module_path>' })
  }

  const raw = readFileSync(configPath, 'utf-8')
  const config = JSON.parse(raw)

  // Validate token
  const query = getQuery(event)
  if (!query.token || query.token !== config.token) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid or expired builder token' })
  }

  return config
})
