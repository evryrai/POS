import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { requireOwner } from '~/server/lib/require-auth'

export default defineEventHandler(async (event) => {
  requireOwner(event)

  // Because this is a local-first SQLite POS, the db is essentially one file.
  // By default, Nuxt/Prisma uses dev.db in development or a specific path in production.
  // We'll read the active database file and serve it for download.
  
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || 'dev.db'
  const fullPath = resolve(process.cwd(), dbPath)

  try {
    const fileBuffer = readFileSync(fullPath)
    
    // Set headers to trigger a file download in the browser
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="pos-backup-${new Date().toISOString().split('T')[0]}.db"`)
    setResponseHeader(event, 'Content-Type', 'application/x-sqlite3')
    
    return fileBuffer
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to create backup: ${error.message}`
    })
  }
})
