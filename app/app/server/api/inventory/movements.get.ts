import { prisma } from '~/server/lib/prisma'
import { requireOwner } from '~/server/lib/require-auth'
import { z } from 'zod'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  productId: z.string().optional()
})

export default defineEventHandler(async (event) => {
  requireOwner(event)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid query params' })
  }

  const { limit, offset, productId } = parsed.data

  const where = productId ? { productId } : {}

  const [total, items] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        product: { select: { name: true, sku: true } },
        actorUser: { select: { username: true } },
        transaction: { select: { invoiceNumber: true } }
      }
    })
  ])

  return { total, items, limit, offset }
})
