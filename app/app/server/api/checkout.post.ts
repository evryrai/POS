import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '~/server/lib/prisma'
import { requireAuth } from '~/server/lib/require-auth'

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.coerce.number().int().min(1)
      })
    )
    .min(1),
  paymentMethod: z.enum(['CASH', 'QRIS', 'E_WALLET']).default('CASH'),
  paidAmount: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0).default(0),
  note: z.string().max(300).optional()
})

function invoicePrefix() {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const hh = String(now.getUTCHours()).padStart(2, '0')
  const mm = String(now.getUTCMinutes()).padStart(2, '0')
  return `INV-${y}${m}${d}-${hh}${mm}`
}

async function generateUniqueInvoiceNumber(tx: Prisma.TransactionClient) {
  const prefix = invoicePrefix()

  for (let i = 0; i < 10; i++) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
    const candidate = `${prefix}-${suffix}`
    const exists = await tx.transaction.findUnique({ where: { invoiceNumber: candidate } })
    if (!exists) return candidate
  }

  throw createError({
    statusCode: 500,
    statusMessage: 'Failed to generate unique invoice number. Please retry.'
  })
}

export default defineEventHandler(async (event) => {
  const session = requireAuth(event)

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }

  const payload = parsed.data
  const ids = payload.items.map((x) => x.productId)
  const products = await prisma.product.findMany({ where: { id: { in: ids }, isActive: true } })

  if (products.length !== ids.length) {
    throw createError({ statusCode: 400, statusMessage: 'Some products are missing/inactive' })
  }

  const productMap = new Map(products.map((p) => [p.id, p]))

  let subtotal = 0
  for (const line of payload.items) {
    const product = productMap.get(line.productId)!
    if (product.stockQty < line.qty) {
      throw createError({
        statusCode: 409,
        statusMessage: `Insufficient stock for ${product.name}. Available ${product.stockQty}`
      })
    }
    subtotal += Number(product.sellPrice) * line.qty
  }

  const totalAmount = Math.max(0, subtotal - payload.discountAmount)
  if (payload.paidAmount < totalAmount) {
    throw createError({ statusCode: 400, statusMessage: 'Paid amount is lower than total amount' })
  }

  const result = await prisma.$transaction(async (tx) => {
    const generatedInvoiceNumber = await generateUniqueInvoiceNumber(tx)

    // Find active shift for the cashier
    const activeShift = await tx.cashierShift.findFirst({
      where: { cashierId: session.userId, status: 'OPEN' }
    })

    const created = await tx.transaction.create({
      data: {
        invoiceNumber: generatedInvoiceNumber,
        subtotal,
        discountAmount: payload.discountAmount,
        totalAmount,
        paidAmount: payload.paidAmount,
        changeAmount: payload.paidAmount - totalAmount,
        paymentMethod: payload.paymentMethod,
        note: payload.note,
        cashierId: session.userId,
        shiftId: activeShift?.id || null,
        items: {
          create: payload.items.map((line) => {
            const product = productMap.get(line.productId)!
            return {
              productId: product.id,
              qty: line.qty,
              unitPrice: product.sellPrice,
              lineSubtotal: Number(product.sellPrice) * line.qty
            }
          })
        }
      },
      include: { items: true }
    })

    for (const line of payload.items) {
      const product = productMap.get(line.productId)!
      const qtyBefore = product.stockQty
      const qtyAfter = qtyBefore - line.qty

      await tx.product.update({ where: { id: product.id }, data: { stockQty: qtyAfter } })
      await tx.stockMovement.create({
        data: {
          movementType: 'SALE',
          qtyDelta: -line.qty,
          qtyBefore,
          qtyAfter,
          reason: `Sale ${created.invoiceNumber}`,
          productId: product.id,
          actorUserId: session.userId,
          transactionId: created.id
        }
      })

      productMap.set(product.id, { ...product, stockQty: qtyAfter })
    }

    return created
  })

  return {
    ok: true,
    invoiceNumber: result.invoiceNumber,
    transactionId: result.id,
    totalAmount: Number(result.totalAmount),
    paidAmount: Number(result.paidAmount),
    changeAmount: Number(result.changeAmount)
  }
})
