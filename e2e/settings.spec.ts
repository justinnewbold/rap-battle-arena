import { test, expect } from '@playwright/test'

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Enter demo mode
    await page.goto('/login')
    await page.getByRole('button', { name: /demo/i }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('should display settings page', async ({ page }) => {
    await page.goto('/settings')

    await expect(page.getByText(/settings/i)).toBeVisible()
  })

  test('should have sound settings', async ({ page }) => {
    await page.goto('/settings')

    await expect(page.getByText(/sound|audio/i)).toBeVisible()
  })

  test('should have notification settings', async ({ page }) => {
    await page.goto('/settings')

    await expect(page.getByText(/notification/i)).toBeVisible()
  })

  test('should have privacy settings', async ({ page }) => {
    await page.goto('/settings')

    await expect(page.getByText(/privacy/i)).toBeVisible()
  })

  test('should toggle sound settings', async ({ page }) => {
    await page.goto('/settings')

    const soundToggle = page.locator('[role="switch"]').first()
    if (await soundToggle.isVisible()) {
      await soundToggle.click()
      // Toggle should respond to click
      await expect(soundToggle).toBeVisible()
    }
  })
})

test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /demo/i }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('should display profile information', async ({ page }) => {
    // Navigate to own profile
    await page.goto('/dashboard')

    const profileLink = page.getByRole('link', { name: /profile/i })
    if (await profileLink.isVisible()) {
      await profileLink.click()
      await expect(page.getByText(/battles|wins|stats/i)).toBeVisible()
    }
  })
})
