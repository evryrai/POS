import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { requireOwner } from '~/server/lib/require-auth'

export default defineEventHandler(async (event) => {
  requireOwner(event)

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  const file = formData.find(f => f.name === 'database')
  if (!file || !file.data) {
    throw createError({ statusCode: 400, statusMessage: 'Missing database file in payload' })
  }

  // Very basic signature check for SQLite file (starts with "SQLite format 3\0")
  const magicHeader = file.data.subarray(0, 16).toString()
  if (magicHeader !== 'SQLite format 3\0') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid file format. Must be a valid SQLite database backup.' })
  }

  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || 'dev.db'
  const fullPath = resolve(process.cwd(), dbPath)

  try {
    // Note: Overwriting the active SQLite file while the app is running can be risky in heavy concurrent environments,
    // but for a single-terminal local POS, this direct replacement works fine for v1.
    writeFileSync(fullPath, file.data)
    
    // In a real app, we might need to disconnect Prisma clients or restart the server to ensure no corruption.
    // For this local Nuxt setup, Prisma will generally reconnect on the next query.
    return { ok: true, message: 'Database restored successfully' }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to restore backup: ${error.message}`
    })
  }
})
