import { getSession } from '~/server/lib/auth'

export default defineEventHandler(async (event) => {
  const session = getSession(event)
  return {
    authenticated: !!session,
    user: session
      ? { id: session.userId, username: session.username, role: session.role }
      : null
  }
})
