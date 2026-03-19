import { prisma } from '~/server/lib/prisma'
import { requireOwner } from '~/server/lib/require-auth'

export default defineEventHandler(async (event) => {
  requireOwner(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing product id' })
  }

  try {
    const item = await prisma.product.update({
      where: { id },
      data: { isActive: false }
    })

    return { ok: true, item }
  } catch (error: any) {
    if (error?.code === 'P2025') {
      throw createError({ statusCode: 404, statusMessage: 'Product not found' })
    }
    throw error
  }
})
