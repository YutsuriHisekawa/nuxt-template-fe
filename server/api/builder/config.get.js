import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

export default defineEventHandler(() => {
  const configPath = resolve(process.cwd(), '.builder_config.json')

  if (!existsSync(configPath)) {
    throw createError({ statusCode: 404, statusMessage: 'Builder config not found. Run: node add_route.cjs <module_path>' })
  }

  const raw = readFileSync(configPath, 'utf-8')
  return JSON.parse(raw)
})
