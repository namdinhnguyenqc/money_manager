import { expect, test } from '@playwright/test'

test('admin audit UI filters logs and opens immutable detail', async ({ page }) => {
  await page.goto('/')

  await page.locator('#keywordInput').fill('owner.active')
  await page.locator('#statusSelect').selectOption('active')
  await page.getByRole('button', { name: 'Lọc' }).click()
  await page.getByRole('button', { name: 'Khóa' }).click()
  await page.locator('#reasonInput').fill('Kiểm thử Audit UI Phase 2')
  await page.getByRole('button', { name: 'Khóa tài khoản' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()

  await page.getByRole('link', { name: 'Nhật ký hoạt động' }).click()
  await expect(page.getByRole('heading', { name: 'Nhật ký hoạt động' })).toBeVisible()
  await expect(page.locator('#auditBody')).toContainText('account.lock')

  await page.locator('#auditActionSelect').selectOption('account.lock')
  await page.locator('#auditRiskSelect').selectOption('high')
  await page.locator('#auditObjectInput').fill('owner_active_001')
  await page.getByRole('button', { name: 'Lọc' }).click()

  await expect(page.locator('#auditBody tr')).toHaveCount(1)
  await expect(page.locator('#auditBody')).toContainText('owner_active_001')
  await expect(page.locator('#auditBody')).toContainText('Kiểm thử Audit UI Phase 2')

  await page.getByRole('button', { name: 'Xem' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('#auditDetailAction')).toHaveText('account.lock')
  await expect(page.locator('#auditBeforeValue')).toContainText('"status": "active"')
  await expect(page.locator('#auditAfterValue')).toContainText('"status": "locked"')
  await expect(page.getByRole('button', { name: 'Đóng' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Sửa|Xóa|Lưu/ })).toHaveCount(0)
})
