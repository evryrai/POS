import { z } from 'zod'
import { prisma } from '~/server/lib/prisma'
import { requireAuth } from '~/server/lib/require-auth'

const closeShiftSchema = z.object({
  actualCash: z.coerce.number().min(0),
  note: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const session = requireAuth(event)

  if (event.method === 'GET') {
    const activeShift = await prisma.cashierShift.findFirst({
      where: { cashierId: session.userId, status: 'OPEN' }
    })
    return { ok: true, activeShift }
  }

  if (event.method === 'POST') {
    const activeShift = await prisma.cashierShift.findFirst({
      where: { cashierId: session.userId, status: 'OPEN' }
    })

    if (!activeShift) {
      throw createError({ statusCode: 400, statusMessage: 'No active shift found.' })
    }

    const body = await readBody(event)
    const parsed = closeShiftSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid input' })
    }

    // Calculate total cash transactions during this shift
    const cashTransactions = await prisma.transaction.aggregate({
      _sum: { totalAmount: true },
      where: {
        shiftId: activeShift.id,
        paymentMethod: 'CASH'
      }
    })

    const totalCashSales = cashTransactions._sum.totalAmount ? Number(cashTransactions._sum.totalAmount) : 0
    const expectedEndingCash = Number(activeShift.startingCash) + totalCashSales
    const actualCash = parsed.data.actualCash
    const difference = actualCash - expectedEndingCash

    const closedShift = await prisma.cashierShift.update({
      where: { id: activeShift.id },
      data: {
        status: 'CLOSED',
        endTime: new Date(),
        endingCash: expectedEndingCash,
        actualCash: actualCash,
        difference: difference,
        note: parsed.data.note
      }
    })

    return { ok: true, closedShift }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
