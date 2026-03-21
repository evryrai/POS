import { z } from 'zod'
import { prisma } from '~/server/lib/prisma'
import { requireAuth } from '~/server/lib/require-auth'

const openShiftSchema = z.object({
  startingCash: z.coerce.number().min(0).default(0)
})

export default defineEventHandler(async (event) => {
  const session = requireAuth(event)

  // Check if cashier already has an OPEN shift
  const existingShift = await prisma.cashierShift.findFirst({
    where: {
      cashierId: session.userId,
      status: 'OPEN'
    }
  })

  if (existingShift) {
    throw createError({ statusCode: 400, statusMessage: 'You already have an active open shift.' })
  }

  if (event.method === 'GET') {
    return { ok: true, activeShift: null }
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    const parsed = openShiftSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid starting cash' })
    }

    const newShift = await prisma.cashierShift.create({
      data: {
        cashierId: session.userId,
        status: 'OPEN',
        startingCash: parsed.data.startingCash
      }
    })

    return { ok: true, activeShift: newShift }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
