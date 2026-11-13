import { expect, test, type Page } from '@playwright/test'

async function start(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'View mission brief' }).click()
  await page.getByRole('button', { name: 'Start mission' }).click()
}

async function integrate(page: Page) {
  for (const label of ['Complete feasibility', 'Freeze design', 'Build and test subsystems', 'Run integration tests']) {
    await page.getByRole('button', { name: new RegExp(label) }).click()
  }
}

test('baseline mission launches and delivers the required data', async ({ page }) => {
  await start(page)
  await integrate(page)
  await expect(page.getByText('32 min after separation · pass at ≥ 30 min (game setting)')).toBeVisible()
  await expect(page.getByRole('link', { name: /CubeSat 101/ })).toHaveAttribute('href', /page=68/)
  await page.getByRole('button', { name: 'Submit for flight review' }).click()
  await page.getByRole('button', { name: 'Run first ground pass' }).click()
  await expect(page.getByRole('heading', { name: 'Mission delivered' })).toBeVisible()
  await expect(page.getByText('2 usable batches received').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Design estimate' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Integration evidence' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Actual delivery' })).toBeVisible()
})

test('a returned review can be fixed by the deadline, including language switch and reload', async ({ page }) => {
  await start(page)
  await page.getByRole('radio', { name: /High-resolution imager/ }).check()
  await integrate(page)
  await page.getByRole('button', { name: 'Submit for flight review' }).click()
  await expect(page.getByRole('heading', { name: 'Review returned' })).toBeVisible()
  await expect(page.getByText('3 W power shortfall').first()).toBeVisible()
  await page.getByRole('button', { name: '繁中' }).click()
  await page.reload()
  await page.getByRole('button', { name: '繼續任務' }).click()
  await expect(page.getByRole('heading', { name: '審查退回' })).toBeVisible()
  await expect(page.getByText('第 4／6 週')).toBeVisible()
  await page.locator('.repair-option').filter({ hasText: '錯開操作排程' }).getByRole('button', { name: /執行修正/ }).click()
  await expect(page.getByText('前版測試結果。請重測以驗證目前配置。')).toBeVisible()
  await page.getByRole('button', { name: /重新執行整合測試/ }).click()
  await expect(page.getByText('第 6／6 週')).toBeVisible()
  await page.getByRole('button', { name: '送交飛行審查' }).click()
  await page.getByRole('radio', { name: /傳回全部可用觀測/ }).check()
  await page.getByRole('button', { name: '執行首次通聯' }).click()
  await expect(page.getByRole('heading', { name: '完成基本委託' })).toBeVisible()
  await expect(page.getByText('已收到 3 批可用資料').first()).toBeVisible()
  await expect(page.getByText('飛行審查退回', { exact: true })).toBeVisible()
  await expect(page.getByText('第 5 週 · 支出 6 經費')).toBeVisible()
  await expect(page.getByText('第 6 週 · 支出 8 經費')).toBeVisible()
})

test('the launch window closes when failed evidence is left unresolved', async ({ page }) => {
  await start(page)
  await page.getByRole('radio', { name: /Early radio profile/ }).check()
  await integrate(page)
  await expect(page.getByText('20 min after separation · pass at ≥ 30 min (game setting)')).toBeVisible()
  await page.getByRole('button', { name: 'Submit for flight review' }).click()
  await page.getByRole('button', { name: 'Advance one week' }).click()
  await page.getByRole('button', { name: 'Advance one week' }).click()
  await expect(page.getByRole('heading', { name: 'No launch' })).toBeVisible()
  await expect(page.getByText('The launch slot closed before flight approval.')).toBeVisible()
  await expect(page.getByText('No in-orbit result')).toBeVisible()
})
