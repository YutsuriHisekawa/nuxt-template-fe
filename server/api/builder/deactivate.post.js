import { resolve } from 'path'
import { existsSync, unlinkSync } from 'fs'

/**
 * POST /api/builder/deactivate
 *
 * Removes the .builder_active gate file, locking the dashboard.
 */
export default defineEventHandler(async () => {
  const gatePath = resolve(process.cwd(), '.builder_active')
  try {
    if (existsSync(gatePath)) unlinkSync(gatePath)
  } catch {}
  return { success: true }
})
