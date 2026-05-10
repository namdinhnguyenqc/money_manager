import { test, expect } from '@playwright/test'

test.describe('Owner canonical facility flow', () => {
  test('owner can navigate facility tabs without losing context', async ({ page, request }) => {
    await request.post('http://localhost:8787/dev/reset-mock')

    await page.goto('/login/owner')
    await page.getByRole('button', { name: /owner demo/i }).click()
    await expect(page).toHaveURL(/\/owner\/dashboard$/)

    await page.goto('/facilities/mock-bh-1')
    await expect(page.getByRole('heading', { name: 'Mock Boarding House' })).toBeVisible()

    await page.getByRole('button', { name: /Hợp đồng/i }).click()
    await expect(page).toHaveURL(/\/facilities\/mock-bh-1\?tab=contracts/)
    await expect(page.getByText('Nguyễn Văn A')).toBeVisible()

    await page.getByRole('button', { name: /Hóa đơn/i }).click()
    await expect(page).toHaveURL(/\/facilities\/mock-bh-1\?tab=invoices/)
    await expect(page.getByRole('heading', { name: 'Mock Boarding House' })).toBeVisible()

    await page.getByRole('button', { name: /Cài đặt/i }).click()
    await expect(page).toHaveURL(/\/facilities\/mock-bh-1\?tab=settings/)
    await expect(page.getByRole('heading', { name: 'Cài đặt cơ sở' })).toBeVisible()
  })
})
