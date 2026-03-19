import { z } from 'zod'
import { prisma } from '~/server/lib/prisma'
import { requireAuth } from '~/server/lib/require-auth'

const querySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  includeInactive: z.coerce.boolean().optional().default(false)
})

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid query params' })
  }

  const { q, limit, offset, includeInactive } = parsed.data

  const where = {
    ...(includeInactive ? {} : { isActive: true }),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { sku: { contains: q } },
            { barcode: { contains: q } }
          ]
        }
      : {})
  }

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: offset,
      take: limit
    })
  ])

  return { total, items, limit, offset }
})
