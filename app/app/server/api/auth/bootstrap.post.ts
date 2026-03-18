import { hash } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '~/server/lib/prisma'

const schema = z.object({
  ownerUsername: z.string().min(3),
  ownerPassword: z.string().min(6),
  cashierUsername: z.string().min(3).optional(),
  cashierPassword: z.string().min(6).optional()
})

export default defineEventHandler(async (event) => {
  const count = await prisma.user.count()
  if (count > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Users already initialized' })
  }

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }

  const { ownerUsername, ownerPassword, cashierUsername, cashierPassword } = parsed.data

  const owner = await prisma.user.create({
    data: {
      username: ownerUsername,
      passwordHash: await hash(ownerPassword, 10),
      role: 'OWNER'
    }
  })

  let cashier: { id: string; username: string } | null = null
  if (cashierUsername && cashierPassword) {
    const c = await prisma.user.create({
      data: {
        username: cashierUsername,
        passwordHash: await hash(cashierPassword, 10),
        role: 'CASHIER'
      }
    })
    cashier = { id: c.id, username: c.username }
  }

  return {
    ok: true,
    owner: { id: owner.id, username: owner.username },
    cashier
  }
})
