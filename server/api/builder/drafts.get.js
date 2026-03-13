import { resolve } from 'path'
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync } from 'fs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * GET /api/builder/drafts
 *
 * Lists all active builder drafts from .builder_configs/.
 * Requires .builder_active gate file (created by add_route.cjs).
 */
export default defineEventHandler(async () => {
  // Check activation gate
  const gatePath = resolve(process.cwd(), '.builder_active')
  if (!existsSync(gatePath)) {
    throw createError({ statusCode: 403, statusMessage: 'Builder tidak aktif. Jalankan: node add_route.cjs' })
  }

  const configDir = resolve(process.cwd(), '.builder_configs')

  let files = []
  try {
    files = readdirSync(configDir).filter(f => f.endsWith('.json'))
  } catch {
    // Directory doesn't exist yet — no drafts
    return { drafts: [] }
  }

  const now = Date.now()
  const drafts = []
  const expired = []

  for (const file of files) {
    const token = file.replace('.json', '')
    if (!UUID_RE.test(token)) continue

    const filePath = resolve(configDir, file)
    try {
      const content = JSON.parse(readFileSync(filePath, 'utf-8'))
      const stat = statSync(filePath)
      const createdAt = content.createdAt ? new Date(content.createdAt).getTime() : stat.mtimeMs
      const age = now - createdAt

      if (age > DRAFT_TTL_MS) {
        // Expired — clean up
        try { unlinkSync(filePath) } catch {}
        expired.push(token)
        continue
      }

      drafts.push({
        token,
        modulePath: content.modulePath || '',
        moduleName: content.moduleName || '',
        apiEndpoint: content.apiEndpoint || '',
        routePath: content.routePath || '',
        readableName: content.readableName || '',
        createdAt: content.createdAt || new Date(stat.mtimeMs).toISOString(),
        ageMs: age,
      })
    } catch {
      // Invalid JSON or unreadable — skip
    }
  }

  // Sort by most recent first
  drafts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return { drafts, expiredCount: expired.length }
})
