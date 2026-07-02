import { expect, test } from '@playwright/test'

test('admin account UI supports filter and lock with required reason', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Quản lý tài khoản' })).toBeVisible()
  await expect(page.locator('#totalCount')).toHaveText('9')
  await expect(page.locator('#activeCount')).toHaveText('5')
  await expect(page.locator('#lockedCount')).toHaveText('2')

  await page.locator('#statusSelect').selectOption('locked')
  await page.getByRole('button', { name: 'Lọc' }).click()
  await expect(page.locator('#accountsBody tr')).toHaveCount(2)
  await expect(page.locator('#accountsBody')).toContainText('owner.locked@trocare.local')

  await page.locator('#statusSelect').selectOption('active')
  await page.locator('#keywordInput').fill('owner.active')
  await page.getByRole('button', { name: 'Lọc' }).click()
  await expect(page.locator('#accountsBody tr')).toHaveCount(1)
  await expect(page.locator('#accountsBody')).toContainText('owner.active@trocare.local')

  await page.getByRole('button', { name: 'Khóa' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Khóa tài khoản' }).click()
  await expect(page.locator('#dialogError')).toHaveText('Bắt buộc nhập lý do.')

  await page.locator('#reasonInput').fill('Kiểm thử UI khóa tài khoản Phase 1')
  await page.getByRole('button', { name: 'Khóa tài khoản' }).click()

  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('#stateMessage')).toContainText('Không có tài khoản phù hợp bộ lọc.')
  await expect(page.locator('#activeCount')).toHaveText('4')
  await expect(page.locator('#lockedCount')).toHaveText('3')
  await expect(page.locator('#auditList')).toContainText('account.lock')

  await page.locator('#statusSelect').selectOption('locked')
  await page.getByRole('button', { name: 'Lọc' }).click()
  await expect(page.locator('#accountsBody')).toContainText('owner.active@trocare.local')
  await expect(page.locator('#accountsBody')).toContainText('Locked')
})
