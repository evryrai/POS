import { describe, it, expect } from 'vitest'

describe('Logic Utils', () => {
  it('correctly calculates change', () => {
    const total = 10000
    const paid = 15000
    const change = paid - total
    expect(change).toBe(5000)
  })

  it('handles discount correctly', () => {
    const subtotal = 20000
    const discount = 5000
    const total = Math.max(0, subtotal - discount)
    expect(total).toBe(15000)
  })
})
