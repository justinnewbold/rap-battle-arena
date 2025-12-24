import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login')

    await expect(page).toHaveTitle(/Rap Battle Arena/)
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })

  test('should have demo mode option', async ({ page }) => {
    await page.goto('/login')

    const demoButton = page.getByRole('button', { name: /demo/i })
    await expect(demoButton).toBeVisible()
  })

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('should enter demo mode when demo button is clicked', async ({ page }) => {
    await page.goto('/login')

    const demoButton = page.getByRole('button', { name: /demo/i })
    await demoButton.click()

    // Should redirect to dashboard in demo mode
    await expect(page).toHaveURL(/\/dashboard/)
  })
})

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Enter demo mode first
    await page.goto('/login')
    await page.getByRole('button', { name: /demo/i }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('should navigate to practice mode', async ({ page }) => {
    await page.getByRole('link', { name: /practice/i }).click()
    await expect(page).toHaveURL(/\/practice/)
  })

  test('should navigate to leaderboard', async ({ page }) => {
    await page.getByRole('link', { name: /leaderboard/i }).click()
    await expect(page).toHaveURL(/\/leaderboard/)
  })

  test('should have working back navigation', async ({ page }) => {
    await page.getByRole('link', { name: /leaderboard/i }).click()
    await expect(page).toHaveURL(/\/leaderboard/)

    await page.goBack()
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
