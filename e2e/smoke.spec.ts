import { expect, test } from '@playwright/test'

test.describe('New Tab Page', () => {
  test('renders the page shell with Tably brand', async ({ page }) => {
    await page.goto('/newtab.html')

    // Page title
    await expect(page).toHaveTitle('Tably')

    // #app container is populated (layout mounted)
    const app = page.locator('#app')
    await expect(app).not.toBeEmpty()

    // Brand text is visible in header
    await expect(page.locator('header')).toContainText('Tably')

    // Main content area exists
    await expect(page.locator('main')).toBeVisible()
  })

  test('shows error state when chrome.tabs is unavailable', async ({ page }) => {
    await page.goto('/newtab.html')

    // Outside a Chrome extension, the error state should appear
    await expect(page.getByText('Grant tabs permission')).toBeVisible({ timeout: 5_000 })
  })

  test('gear button is rendered', async ({ page }) => {
    await page.goto('/newtab.html')

    const gearButton = page.locator('button[aria-haspopup="dialog"]')
    await expect(gearButton).toBeVisible()
  })
})
