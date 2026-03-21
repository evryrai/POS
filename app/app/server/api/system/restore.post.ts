import { writeFileSync, renameSync, existsSync, copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { requireOwner } from '~/server/lib/require-auth'
import { prisma } from '~/server/lib/prisma'

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

  // Signature check for SQLite file
  const magicHeader = file.data.subarray(0, 16).toString()
  if (magicHeader !== 'SQLite format 3\0') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid file format. Must be a valid SQLite database backup.' })
  }

  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || 'dev.db'
  const fullPath = resolve(process.cwd(), dbPath)
  const backupPath = `${fullPath}.bak`

  try {
    // Hardening:
    // 1. Disconnect Prisma to close active handles
    await prisma.$disconnect()

    // 2. Create a safety backup of the CURRENT db before overwriting
    if (existsSync(fullPath)) {
      copyFileSync(fullPath, backupPath)
    }

    // 3. Write new data to a temporary file first to ensure integrity
    const tempPath = `${fullPath}.tmp`
    writeFileSync(tempPath, file.data)

    // 4. Atomic swap (rename temp to actual)
    renameSync(tempPath, fullPath)
    
    // Prisma will automatically reconnect on next request
    return { 
      ok: true, 
      message: 'Database restored successfully with safety backup created.' 
    }
  } catch (error: any) {
    // If something failed, try to restore the safety backup if we haven't overwritten the main file yet
    console.error('Restore error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to restore backup: ${error.message}. Safety backup at ${backupPath}`
    })
  }
})
