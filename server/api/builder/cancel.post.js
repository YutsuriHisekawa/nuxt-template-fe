import { existsSync, unlinkSync, readFileSync } from 'fs'
import { resolve } from 'path'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const configPath = resolve(process.cwd(), '.builder_config.json')

  if (!existsSync(configPath)) {
    return { success: true, message: 'Config already removed' }
  }

  // Validate token before allowing cancel
  try {
    const raw = readFileSync(configPath, 'utf-8')
    const config = JSON.parse(raw)
    if (!body.token || body.token !== config.token) {
      throw createError({ statusCode: 403, statusMessage: 'Invalid token' })
    }
  } catch (e) {
    if (e.statusCode === 403) throw e
  }

  try {
    unlinkSync(configPath)
  } catch {}

  return { success: true, message: 'Builder config removed' }
})
