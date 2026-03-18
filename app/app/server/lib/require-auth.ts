import { H3Event, createError } from 'h3'
import { getSession } from './auth'

export function requireAuth(event: H3Event) {
  const session = getSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return session
}

export function requireOwner(event: H3Event) {
  const session = requireAuth(event)
  if (session.role !== 'OWNER') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return session
}
