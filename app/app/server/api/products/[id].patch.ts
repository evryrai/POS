import { z } from 'zod'
import { prisma } from '~/server/lib/prisma'
import { requireOwner } from '~/server/lib/require-auth'

const schema = z
  .object({
    sku: z.string().min(1).max(64).optional(),
    barcode: z.string().max(128).optional().nullable(),
    name: z.string().min(1).max(255).optional(),
    category: z.string().max(128).optional().nullable(),
    unit: z.string().min(1).max(32).optional(),
    costPrice: z.coerce.number().min(0).optional(),
    sellPrice: z.coerce.number().min(0).optional(),
    stockQty: z.coerce.number().int().min(0).optional(),
    minStockQty: z.coerce.number().int().min(0).optional(),
    isActive: z.coerce.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'No update fields provided' })

export default defineEventHandler(async (event) => {
  requireOwner(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing product id' })
  }

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }

  try {
    const data = parsed.data
    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(data.sku ? { sku: data.sku.trim() } : {}),
        ...(data.barcode !== undefined ? { barcode: data.barcode || null } : {}),
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.category !== undefined ? { category: data.category || null } : {}),
        ...(data.unit ? { unit: data.unit } : {}),
        ...(data.costPrice !== undefined ? { costPrice: data.costPrice } : {}),
        ...(data.sellPrice !== undefined ? { sellPrice: data.sellPrice } : {}),
        ...(data.stockQty !== undefined ? { stockQty: data.stockQty } : {}),
        ...(data.minStockQty !== undefined ? { minStockQty: data.minStockQty } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {})
      }
    })

    return { ok: true, item: updated }
  } catch (error: any) {
    if (error?.code === 'P2025') {
      throw createError({ statusCode: 404, statusMessage: 'Product not found' })
    }
    if (error?.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'SKU already exists' })
    }
    throw error
  }
})
