import { test, expect } from '@playwright/test'

test.describe('Owner facility detail flow', () => {
  test('owner can view facility detail with room context', async ({ page, request }) => {
    await request.post('http://localhost:8787/dev/reset-mock')

    await page.goto('/login/owner')
    await page.getByRole('button', { name: /owner demo/i }).click()
    await expect(page).toHaveURL(/\/owner\/dashboard$/)

    await page.goto('/facilities/mock-bh-1')
    await expect(page.getByRole('heading', { name: 'Mock Boarding House' })).toBeVisible()
    await expect(page.getByText('Phòng 101')).toBeVisible()
    await expect(page.getByText('Phòng 102')).toBeVisible()
  })
})
