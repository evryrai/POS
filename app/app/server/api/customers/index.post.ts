import { z } from 'zod'
import { prisma } from '~/server/lib/prisma'
import { requireAuth } from '~/server/lib/require-auth'

const schema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().max(32).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  debtLimit: z.coerce.number().min(0).default(1000000)
})

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }

  try {
    const created = await prisma.customer.create({
      data: parsed.data
    })
    return { ok: true, item: created }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Phone number already registered' })
    }
    throw error
  }
})
