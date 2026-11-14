import { expect, test, type Page } from '@playwright/test'

async function start(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'View mission brief' }).click()
  await expect(page.getByText('$1,000,000', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Start mission' }).click()
}

async function integrate(page: Page) {
  for (const label of ['Complete feasibility', 'Freeze design', 'Build and test subsystems', 'Run integration tests']) {
    await page.getByRole('button', { name: new RegExp(label) }).click()
  }
}

test('baseline mission keeps evidence collapsed and delivers the required data', async ({ page }) => {
  await start(page)
  const payloadChoice = page.locator('.reported-choice').filter({ hasText: 'First, pick the camera' })
  await expect(payloadChoice.locator('.report-speaker')).toHaveText('Science')
  await expect(payloadChoice.getByRole('radio', { name: /Baseline imager/ })).toBeVisible()
  await expect(page.locator('.reported-choice').filter({ hasText: 'Next, pick a power supply' }).locator('.report-speaker')).toHaveText('Power')
  await expect(page.getByRole('radio', { name: /Early radio profile/ })).toBeHidden()
  await expect(page.getByRole('radio', { name: /Baseline imager.*\$140,000/ })).toBeChecked()
  await integrate(page)
  const rule = page.locator('.report').first().getByText('32 min after separation · pass at ≥ 30 min (game setting)')
  await expect(rule).toBeHidden()
  await page.locator('summary').filter({ hasText: 'Integration evidence' }).click()
  await expect(rule).toBeHidden()
  await page.locator('.report').first().locator('summary').filter({ hasText: 'Day-in-the-life (DITL) test' }).click()
  await expect(rule).toBeVisible()
  await expect(page.getByRole('link', { name: /CubeSat 101/ })).toHaveAttribute('href', /page=68/)
  await page.getByRole('button', { name: 'Submit for flight review' }).click()
  await expect(rule).toBeHidden()
  await expect(page.locator('.report-speaker')).toHaveText('Ground station')
  await expect(page.getByRole('radio', { name: /Send required observations/ })).toBeChecked()
  await page.getByRole('button', { name: 'Run first ground pass' }).click()
  await expect(page.getByRole('heading', { name: 'Mission delivered' })).toBeVisible()
  await expect(page.getByText('2 usable batches received')).toBeVisible()
  for (const label of ['Design estimate', 'Integration evidence', 'Actual delivery']) {
    await expect(page.locator('summary').filter({ hasText: label })).toBeVisible()
  }
})

test('a returned review leads with the conflict and lets the player recover after reload', async ({ page }) => {
  await start(page)
  await page.getByRole('radio', { name: /High-resolution imager/ }).check()
  await integrate(page)
  await page.getByRole('button', { name: 'Submit for flight review' }).click()
  await expect(page.getByRole('heading', { name: 'Review returned' })).toBeVisible()
  await expect(page.getByText('Observation and downlink need 13 W together. The supply can deliver 10 W.')).toBeVisible()
  await expect(page.getByText('Spacecraft bus').first()).toBeHidden()
  await page.locator('summary').filter({ hasText: 'Power breakdown' }).click()
  await expect(page.getByText('Spacecraft bus').first()).toBeVisible()
  await page.getByRole('button', { name: '繁中' }).click()
  await page.reload()
  await page.getByRole('button', { name: '繼續任務' }).click()
  await expect(page.getByRole('heading', { name: '審查退回' })).toBeVisible()
  await expect(page.getByText('$380,000', { exact: true })).toBeVisible()
  await expect(page.getByText('重測另需 1 週和 $80,000。')).toBeVisible()
  await page.getByRole('radio', { name: /錯開操作排程.*\$60,000/ }).check()
  await page.getByRole('button', { name: '執行選取的修正' }).click()
  await expect(page.getByText('修正完成了。我們先用目前的配置重測，再送回飛行審查。')).toBeVisible()
  await page.getByRole('button', { name: /重新執行整合測試/ }).click()
  await expect(page.getByText('0 週', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '送交飛行審查' }).click()
  await page.getByRole('radio', { name: /傳回全部可用觀測/ }).check()
  await page.getByRole('button', { name: '執行首次通聯' }).click()
  await expect(page.getByRole('heading', { name: '完成基本委託' })).toBeVisible()
  await expect(page.getByText('已收到 3 批可用資料')).toBeVisible()
  await page.locator('summary').filter({ hasText: '決策紀錄' }).click()
  await expect(page.getByText('飛行審查退回', { exact: true })).toBeVisible()
  await page.locator('summary').filter({ hasText: '錯開操作排程' }).click()
  await expect(page.locator('.decision-log li').filter({ has: page.locator('summary').filter({ hasText: '錯開操作排程' }) }).getByText('支出 $60,000')).toBeVisible()
})

test('the launch window closes when failed evidence is left unresolved', async ({ page }) => {
  await start(page)
  await page.getByRole('button', { name: /Complete feasibility/ }).click()
  await page.getByRole('radio', { name: /Early radio profile/ }).check()
  for (const label of ['Freeze design', 'Build and test subsystems', 'Run integration tests']) {
    await page.getByRole('button', { name: new RegExp(label) }).click()
  }
  await expect(page.getByText('First transmission was 20 minutes after separation. This ride requires at least 30 minutes.')).toBeVisible()
  await page.getByRole('button', { name: 'Submit for flight review' }).click()
  await page.locator('summary').filter({ hasText: 'Other actions' }).click()
  await page.getByRole('button', { name: 'Advance one week' }).click()
  await page.getByRole('button', { name: 'Advance one week' }).click()
  await expect(page.getByRole('heading', { name: 'No launch' })).toBeVisible()
  await expect(page.getByText('The launch slot closed before flight approval.')).toBeVisible()
  await expect(page.getByText('No in-orbit result')).toBeVisible()
})

test('Traditional Chinese mobile run separates tested data from actual delivery', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: '繁中' }).click()
  for (const label of ['查看任務簡報', '開始任務', '完成可行性評估', '確認設計定版', '製造並驗證子系統', '執行整合測試', '送交飛行審查']) {
    await page.getByRole('button', { name: new RegExp(label) }).click()
  }
  await page.getByRole('radio', { name: /優先下傳飛行診斷/ }).check()
  await page.getByRole('button', { name: '執行首次通聯' }).click()
  await expect(page.getByRole('heading', { name: '已發射・交付未達標' })).toBeVisible()
  await expect(page.getByText('已收到 0 批可用資料')).toBeVisible()
  await expect(page.getByText('已下傳飛行診斷')).toBeHidden()
  await page.locator('summary').filter({ hasText: '整合驗證證據' }).click()
  await expect(page.getByRole('region', { name: '任務結算' }).getByText('可用 2 批／需 2 批')).toBeVisible()
  await page.locator('summary').filter({ hasText: '實際交付成果' }).click()
  await expect(page.getByText('已下傳飛行診斷')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})
