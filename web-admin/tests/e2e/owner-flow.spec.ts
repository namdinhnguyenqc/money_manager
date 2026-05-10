import { test, expect } from '@playwright/test'

test.describe('Owner flows', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/owner/boarding-houses')
    await expect(page).toHaveURL(/\/login\/owner$/)
  })

  test.skip('redirects to not-authorized when role not OWNER', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      document.cookie = 'accessToken=tok; path=/; max-age=3600'
      document.cookie = 'userRole=ADMIN; path=/; max-age=3600'
      window.localStorage.setItem('accessToken', 'tok')
      window.localStorage.setItem('userRole', 'ADMIN')
    })
    await page.goto('/owner/boarding-houses')
    await expect(page.getByRole('heading', { name: 'Không đủ quyền truy cập' })).toBeVisible()
  })

  test('OWNER can access facility listing and see data', async ({ page, request }) => {
    await request.post('http://localhost:8787/dev/reset-mock')
    await page.goto('/login/owner')
    await page.getByRole('button', { name: /owner demo/i }).click()
    await expect(page).toHaveURL(/\/owner\/dashboard$/)
    await page.goto('/facilities')
    await expect(page.getByText('Mock Boarding House')).toBeVisible()
  })
})
