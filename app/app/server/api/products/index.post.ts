import { z } from 'zod'
import { prisma } from '~/server/lib/prisma'
import { requireOwner } from '~/server/lib/require-auth'

const schema = z.object({
  sku: z.string().min(1).max(64),
  barcode: z.string().max(128).optional().nullable(),
  name: z.string().min(1).max(255),
  category: z.string().max(128).optional().nullable(),
  unit: z.string().min(1).max(32).default('pcs'),
  costPrice: z.coerce.number().min(0).default(0),
  sellPrice: z.coerce.number().min(0),
  stockQty: z.coerce.number().int().min(0).default(0),
  minStockQty: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().optional().default(true)
})

export default defineEventHandler(async (event) => {
  requireOwner(event)

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }

  try {
    const data = parsed.data
    const created = await prisma.product.create({
      data: {
        sku: data.sku.trim(),
        barcode: data.barcode || null,
        name: data.name.trim(),
        category: data.category || null,
        unit: data.unit,
        costPrice: data.costPrice,
        sellPrice: data.sellPrice,
        stockQty: data.stockQty,
        minStockQty: data.minStockQty,
        isActive: data.isActive
      }
    })

    return { ok: true, item: created }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'SKU already exists' })
    }
    throw error
  }
})
