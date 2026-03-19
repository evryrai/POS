import { prisma } from '~/server/lib/prisma'
import { requireAuth } from '~/server/lib/require-auth'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing product id' })
  }

  const item = await prisma.product.findUnique({ where: { id } })
  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  }

  return { item }
})
