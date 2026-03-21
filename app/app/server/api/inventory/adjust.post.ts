import { z } from 'zod'
import { prisma } from '~/server/lib/prisma'
import { requireOwner } from '~/server/lib/require-auth'

const schema = z.object({
  productId: z.string().min(1),
  adjustmentType: z.enum(['ADD', 'SUBTRACT', 'SET']),
  value: z.coerce.number().int().min(0),
  reason: z.string().min(3).max(255)
})

export default defineEventHandler(async (event) => {
  const session = requireOwner(event)

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload or missing reason' })
  }

  const { productId, adjustmentType, value, reason } = parsed.data

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } })
    if (!product) {
      throw createError({ statusCode: 404, statusMessage: 'Product not found' })
    }

    const qtyBefore = product.stockQty
    let qtyAfter = qtyBefore
    let qtyDelta = 0

    if (adjustmentType === 'ADD') {
      qtyAfter = qtyBefore + value
      qtyDelta = value
    } else if (adjustmentType === 'SUBTRACT') {
      qtyAfter = Math.max(0, qtyBefore - value)
      qtyDelta = qtyAfter - qtyBefore
    } else if (adjustmentType === 'SET') {
      qtyAfter = value
      qtyDelta = value - qtyBefore
    }

    if (qtyDelta === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Adjustment results in no change' })
    }

    await tx.product.update({
      where: { id: productId },
      data: { stockQty: qtyAfter }
    })

    const movement = await tx.stockMovement.create({
      data: {
        movementType: 'ADJUSTMENT',
        qtyDelta,
        qtyBefore,
        qtyAfter,
        reason,
        productId,
        actorUserId: session.userId
      }
    })

    return { product: { ...product, stockQty: qtyAfter }, movement }
  })

  return { ok: true, ...result }
})
