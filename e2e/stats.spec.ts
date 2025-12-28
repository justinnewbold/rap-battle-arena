import { test, expect } from '@playwright/test'

test.describe('Stats & Analytics', () => {
  test.beforeEach(async ({ page }) => {
    // Enter demo mode
    await page.goto('/login')
    await page.getByRole('button', { name: /demo/i }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('should display stats page with charts', async ({ page }) => {
    await page.goto('/stats')

    // Check main stats are visible
    await expect(page.getByText(/battle stats/i)).toBeVisible()
    await expect(page.getByText(/wins/i)).toBeVisible()
    await expect(page.getByText(/losses/i)).toBeVisible()
    await expect(page.getByText(/win rate/i)).toBeVisible()
  })

  test('should display ELO history chart', async ({ page }) => {
    await page.goto('/stats')

    await expect(page.getByText(/elo.*rating.*history/i)).toBeVisible()
  })

  test('should display skill radar chart', async ({ page }) => {
    await page.goto('/stats')

    await expect(page.getByText(/skill breakdown/i)).toBeVisible()
  })

  test('should have time range filter', async ({ page }) => {
    await page.goto('/stats')

    const weekButton = page.getByRole('button', { name: /week/i })
    const monthButton = page.getByRole('button', { name: /month/i })
    const allButton = page.getByRole('button', { name: /all time/i })

    await expect(weekButton).toBeVisible()
    await expect(monthButton).toBeVisible()
    await expect(allButton).toBeVisible()
  })

  test('should navigate back to dashboard', async ({ page }) => {
    await page.goto('/stats')

    const backButton = page.locator('button').filter({ has: page.locator('svg') }).first()
    await backButton.click()

    await expect(page).toHaveURL(/\/dashboard/)
  })
})

test.describe('Leaderboard', () => {
  test('should display leaderboard page', async ({ page }) => {
    await page.goto('/leaderboard')

    await expect(page.getByText(/leaderboard/i)).toBeVisible()
  })

  test('should show top rappers', async ({ page }) => {
    await page.goto('/leaderboard')

    // Should have ranking indicators
    await expect(page.getByText(/1|#1|top/i)).toBeVisible()
  })
})
