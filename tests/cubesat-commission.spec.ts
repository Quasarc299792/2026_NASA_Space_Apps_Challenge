import { expect, test, type Page } from '@playwright/test'

const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' })
const radio = (page: Page, name: RegExp) => page.getByRole('radio', { name })

async function start(page: Page, seed: number, { bay = false, rideshare = false, capability }: {
  bay?: boolean; rideshare?: boolean; capability?: RegExp
} = {}) {
  await page.goto(`/?seed=${seed}`)
  await button(page, 'View mission brief').click()
  if (bay) await radio(page, /Bay discharge survey/).check()
  await button(page, 'Start mission').click()
  if (rideshare) await radio(page, /Rideshare to sun-synchronous orbit/).check()
  if (capability) await radio(page, capability).check()
  await button(page, /^Complete feasibility/).click()
}

async function integrate(page: Page) {
  await button(page, /^Freeze design/).click()
  await button(page, /^Build and test subsystems/).click()
  await button(page, /^Run integration tests/).click()
  await expect(page.getByText(/first transmission T\+32 min.*minimum silence 30 min/)).toBeVisible()
}

async function pass(page: Page) {
  await button(page, 'Submit FRR').click()
  await button(page, 'Run first ground pass').click()
}

test('the bay commission reaches its own acceptance threshold and unlocks the next brief', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await start(page, 1, { bay: true })
  await expect(page.getByText('Thermal imager', { exact: true })).toBeVisible()
  await expect(page.getByText('3 required · 4 nominal downlink slots')).toBeVisible()
  await button(page, '繁中').click()
  await expect(page.getByText('熱像儀', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await button(page, 'EN').click()
  await integrate(page)
  await pass(page)
  await expect(page.getByRole('heading', { name: 'Commission fulfilled', exact: true })).toBeVisible()
  await expect(page.getByText('All 3 usable batches were sent to the client and archived.').first()).toBeVisible()
  await button(page, /Open the .* brief/).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Orbital/)
})

test('early evidence guides a correction and follow-up survives a reload', async ({ page }) => {
  await start(page, 6, { capability: /Add an auxiliary sensor/ })
  await expect(button(page, /Run early interface test.*1 wk.*\$50,000/)).toBeVisible()
  await button(page, /Run early interface test/).click()
  await expect(page.getByRole('status')).toContainText('Engineering found a mismatch')
  await expect(button(page, /^Freeze design/)).toHaveCount(0)
  await button(page, /Correct the interface drawing.*0 wk.*\$60,000/).click()
  await integrate(page)
  await pass(page)
  await expect(page.getByText(/The client has all 2 required batches/)).toBeVisible()
  await page.reload()
  await button(page, 'Continue mission').click()
  await radio(page, /Image the southern bridge/).check()
  await button(page, 'Capture and downlink follow-up').click()
  await expect(page.getByText(/relief crew rerouted heavy trucks/).first()).toBeVisible()
  await expect(page.getByText(/offered lab time/)).toBeVisible()
  await button(page, 'Replay this seed').click()
  await expect(page.getByRole('heading', { name: 'Feasibility' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('space-mission.single.v2')!).seed)).toBe(6)
})

test('late fallback fits exactly when salvaging the sensor cannot', async ({ page }) => {
  await start(page, 6, { rideshare: true, capability: /Add an auxiliary sensor/ })
  await integrate(page)
  await button(page, 'Submit FRR').click()
  await expect(button(page, /Rework the auxiliary interface.*2 wk.*\$170,000/)).toBeDisabled()
  await button(page, /Return to the primary instrument.*1 wk.*\$120,000/).click()
  await expect(button(page, 'Submit FRR')).toHaveCount(0)
  await button(page, /Retest/).click()
  await pass(page)
  await expect(page.getByRole('heading', { name: 'Commission fulfilled', exact: true })).toBeVisible()
  await expect(page.getByText(/returned the spacecraft to the primary instrument configuration/).first()).toBeVisible()
})

test('a fully committed schedule misses launch when integration rejects the interface', async ({ page }) => {
  await start(page, 6, { rideshare: true, capability: /Auxiliary sensor and pointing reserve/ })
  await expect(page.getByText(/leaves 0 wk/)).toBeVisible()
  await expect(button(page, /Run early interface test/)).toHaveCount(0)
  await integrate(page)
  await button(page, 'Submit FRR').click()
  await expect(page.getByText('The launch slot closed before flight approval.')).toBeVisible()
  await expect(page.getByText(/Handover was due in week 6/)).toBeVisible()
  await expect(page.getByText(/pick up from the reason this attempt stopped/)).toBeVisible()
  await expect(page.getByText(/an orbital sponsor has asked/)).toHaveCount(0)
  await expect(button(page, /Open the .* brief/)).toHaveCount(0)
})
