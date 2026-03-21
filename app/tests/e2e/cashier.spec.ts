import { test, expect } from '@playwright/test'

// E2E test for the core cashier flow
test.describe('Cashier Workflow', () => {
  test('should load the workspace and show empty cart', async ({ page }) => {
    await page.goto('/')
    
    // Check header
    await expect(page.locator('h1')).toContainText('Cashier Workspace')
    
    // Check empty state
    await expect(page.locator('aside.rounded-2xl')).toContainText('Cart is empty')
  })

  test('navigation to products management should work', async ({ page }) => {
    await page.goto('/products')
    await expect(page.locator('h1')).toContainText('Product Management')
  })

  test('navigation to reporting should work', async ({ page }) => {
    await page.goto('/reports')
    await expect(page.locator('h1')).toContainText('Daily Report')
  })
})
