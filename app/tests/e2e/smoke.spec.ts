import { test, expect } from '@playwright/test'

test.describe('POS E2E Smoke Test', () => {
  test('should load the cashier workspace', async ({ page }) => {
    // This expects the app to be running on localhost:3000 during test
    await page.goto('http://localhost:3000')
    
    // Check if main heading is present
    const heading = page.locator('h1')
    await expect(heading).toContainText('Cashier Workspace')
    
    // Check if product catalog section exists
    const catalog = page.locator('section', { hasText: 'Product Catalog' })
    await expect(catalog).toBeVisible()
    
    // Check if cart section exists
    const cart = page.locator('aside', { hasText: 'Cart' })
    await expect(cart).toBeVisible()
  })

  test('should show search input', async ({ page }) => {
    await page.goto('http://localhost:3000')
    const searchInput = page.getByPlaceholder('Search (press / to focus)...')
    await expect(searchInput).toBeVisible()
  })
})
