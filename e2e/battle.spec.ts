import { test, expect } from '@playwright/test'

test.describe('Battle Features', () => {
  test.beforeEach(async ({ page }) => {
    // Enter demo mode
    await page.goto('/login')
    await page.getByRole('button', { name: /demo/i }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('should display matchmaking page', async ({ page }) => {
    await page.goto('/matchmaking')

    await expect(page.getByText(/find.*battle/i)).toBeVisible()
  })

  test('should display practice mode page', async ({ page }) => {
    await page.goto('/practice')

    await expect(page.getByRole('heading', { name: /practice/i })).toBeVisible()
  })

  test('should allow creating private battles', async ({ page }) => {
    await page.goto('/battle/create')

    await expect(page.getByText(/create.*battle/i)).toBeVisible()
  })
})

test.describe('Battle Room', () => {
  test('should handle invalid battle room gracefully', async ({ page }) => {
    await page.goto('/battle/invalid-room-id')

    // Should show error or redirect
    await expect(
      page.getByText(/not found|error|invalid/i)
    ).toBeVisible({ timeout: 5000 }).catch(() => {
      // Or redirect to dashboard
      expect(page.url()).toContain('/dashboard')
    })
  })
})

test.describe('Spectator Mode', () => {
  test('should display spectate page', async ({ page }) => {
    await page.goto('/spectate')

    await expect(page.getByText(/spectate|watch|live/i)).toBeVisible()
  })
})
