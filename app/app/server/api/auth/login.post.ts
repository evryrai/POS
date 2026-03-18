import { compare } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '~/server/lib/prisma'
import { setSession } from '~/server/lib/auth'

const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }

  const user = await prisma.user.findUnique({ where: { username: parsed.data.username } })
  if (!user || !user.isActive) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  const valid = await compare(parsed.data.password, user.passwordHash)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  setSession(event, {
    userId: user.id,
    username: user.username,
    role: user.role
  })

  return {
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  }
})
