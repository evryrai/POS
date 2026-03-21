import { prisma } from '~/server/lib/prisma'
import { requireOwner } from '~/server/lib/require-auth'

export default defineEventHandler(async (event) => {
  requireOwner(event)

  const query = getQuery(event)
  const dateParam = typeof query.date === 'string' ? query.date : null
  
  // Default to today if no date provided
  const targetDate = dateParam ? new Date(dateParam) : new Date()
  
  // Set to start and end of the target day (UTC)
  const startOfDay = new Date(targetDate)
  startOfDay.setUTCHours(0, 0, 0, 0)
  
  const endOfDay = new Date(targetDate)
  endOfDay.setUTCHours(23, 59, 59, 999)

  const transactions = await prisma.transaction.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    include: {
      items: {
        include: {
          product: { select: { name: true, sku: true } }
        }
      }
    }
  })

  // Calculate aggregates
  let totalRevenue = 0
  let totalDiscount = 0
  let transactionCount = transactions.length
  
  const productSales = new Map<string, { name: string, qty: number, revenue: number }>()

  for (const trx of transactions) {
    totalRevenue += Number(trx.totalAmount)
    totalDiscount += Number(trx.discountAmount)

    for (const item of trx.items) {
      const existing = productSales.get(item.productId) || { name: item.product.name, qty: 0, revenue: 0 }
      existing.qty += item.qty
      existing.revenue += Number(item.lineSubtotal)
      productSales.set(item.productId, existing)
    }
  }

  // Sort top products by quantity sold
  const topProducts = Array.from(productSales.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10) // Top 10

  // Find low stock items
  const lowStockItems = await prisma.product.findMany({
    where: {
      isActive: true,
      stockQty: { lte: prisma.product.fields.minStockQty } // Assuming minStockQty exists or threshold (e.g. <= 5)
    },
    select: { id: true, name: true, sku: true, stockQty: true, minStockQty: true },
    take: 15
  })

  // Format date string for response
  const formattedDate = startOfDay.toISOString().split('T')[0]

  return {
    date: formattedDate,
    summary: {
      revenue: totalRevenue,
      discounts: totalDiscount,
      transactions: transactionCount
    },
    topProducts,
    lowStockItems
  }
})
