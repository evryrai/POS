import { createHmac, timingSafeEqual } from 'node:crypto'
import { setCookie, getCookie, deleteCookie, H3Event } from 'h3'

export type SessionPayload = {
  userId: string
  username: string
  role: 'OWNER' | 'CASHIER'
  exp: number
}

const COOKIE_NAME = 'pos_session'

function b64url(input: string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function unb64url(input: string) {
  input = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = input.length % 4
  if (pad) input += '='.repeat(4 - pad)
  return Buffer.from(input, 'base64').toString('utf8')
}

function sign(data: string, secret: string) {
  return createHmac('sha256', secret).update(data).digest('base64url')
}

function getSecret() {
  return process.env.AUTH_SECRET || 'change-me-dev-secret'
}

export function createSessionToken(payload: SessionPayload) {
  const body = b64url(JSON.stringify(payload))
  const sig = sign(body, getSecret())
  return `${body}.${sig}`
}

export function verifySessionToken(token?: string): SessionPayload | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null

  const expected = sign(body, getSecret())
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  const payload = JSON.parse(unb64url(body)) as SessionPayload
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}

export function setSession(event: H3Event, payload: Omit<SessionPayload, 'exp'>) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 12 // 12h
  const token = createSessionToken({ ...payload, exp })

  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12
  })
}

export function clearSession(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export function getSession(event: H3Event): SessionPayload | null {
  const token = getCookie(event, COOKIE_NAME)
  return verifySessionToken(token)
}
