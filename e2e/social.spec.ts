import { test, expect } from '@playwright/test'

test.describe('Social Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /demo/i }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('should display friends page', async ({ page }) => {
    await page.goto('/friends')

    await expect(page.getByText(/friends/i)).toBeVisible()
  })

  test('should display search page', async ({ page }) => {
    await page.goto('/search')

    await expect(page.getByPlaceholder(/search/i)).toBeVisible()
  })

  test('should allow searching for users', async ({ page }) => {
    await page.goto('/search')

    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('test')

    // Should show search results or no results message
    await page.waitForTimeout(500)
  })

  test('should display notifications page', async ({ page }) => {
    await page.goto('/notifications')

    await expect(page.getByText(/notification/i)).toBeVisible()
  })
})

test.describe('Crews', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /demo/i }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('should display crews page', async ({ page }) => {
    await page.goto('/crews')

    await expect(page.getByText(/crew/i)).toBeVisible()
  })

  test('should have create crew option', async ({ page }) => {
    await page.goto('/crews')

    const createButton = page.getByRole('button', { name: /create/i })
    await expect(createButton).toBeVisible()
  })
})

test.describe('Tournaments', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /demo/i }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('should display tournaments page', async ({ page }) => {
    await page.goto('/tournaments')

    await expect(page.getByText(/tournament/i)).toBeVisible()
  })

  test('should show tournament categories', async ({ page }) => {
    await page.goto('/tournaments')

    // Should have tabs or filters for tournament types
    await expect(page.getByText(/upcoming|active|past/i)).toBeVisible()
  })
})
