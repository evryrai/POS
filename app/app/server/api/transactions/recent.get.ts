import { prisma } from '~/server/lib/prisma'
import { requireAuth } from '~/server/lib/require-auth'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const items = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      cashier: { select: { username: true } },
      items: {
        include: { product: { select: { name: true } } }
      }
    }
  })

  return { items }
})
