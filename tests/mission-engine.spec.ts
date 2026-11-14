import { expect, test, type Page } from '@playwright/test'
import { fixtureMission } from './fixtures/mission-engine'
import type { Game } from '../src/game/types'

const saved = (page: Page): Promise<Game> => page.evaluate(() => JSON.parse(localStorage.getItem('space-mission.single.v2')!))

test('the shared workbench resumes an event and a flight segment from v2', async ({ page }) => {
  await page.route(/\/src\/missions\/(rules|index)\.ts(?:\?|$)/, async route => {
    const response = await route.fetch()
    const rules = new URL(route.request().url()).pathname.endsWith('/rules.ts')
    // Register the fixture on each reload without adding it to the production catalog.
    const register = rules
      ? 'missionRules[fixtureMission.id] = fixtureMission;'
      : 'missions[fixtureMission.id] = { ...fixtureMission, ui: { ...cubeSatMission.ui, Estimate: () => null, Report: () => null, Delivery: () => null, flightSummary: () => "" } };'
    await route.fulfill({
      response,
      body: (await response.text()) + '\nimport { fixtureMission } from "/tests/fixtures/mission-engine.ts";\n' + register,
    })
  })
  await page.addInitScript(id => {
    if (localStorage.getItem('space-mission.single.v2')) return
    localStorage.setItem('space-mission.single.v2', JSON.stringify({
      missionId: id, stage: 'feasibility', week: 0, deadline: 8, credits: 30, design: { route: 'direct' },
      seed: 6, risks: {}, accepted: [], outcomes: [], revision: 0, gate: 'MDR', analysis: null, evidence: null, flight: null, stop: null, returned: false,
      event: null, events: [], records: [], log: [], missionState: { support: 1, signed: false },
    }))
  }, fixtureMission.id)

  await page.goto('/')
  const button = (name: string | RegExp) => page.getByRole('button', { name })
  await button('Continue mission').click()
  await button(/Define the architecture/).click()
  await button(/Complete the preliminary design/).click()
  await button('Submit PDR').click()
  await expect(page.getByRole('heading', { name: 'Review returned' })).toBeVisible()
  await page.getByRole('radio', { name: /Low-energy transfer/ }).check()
  await button('Submit PDR').click()
  await button(/Freeze design/).click()
  await button(/Integrate and test the payload interface/).click()

  await expect(page.getByText(/paused in week 4.*2/)).toBeVisible()
  await expect.poll(async () => (await saved(page)).pendingWork?.remaining).toBe(2)
  await page.reload()
  await button('Continue mission').click()
  await expect(page.getByText(/paused in week 4.*2/)).toBeVisible()
  await page.getByText('Flight review deadline: week 8 → week 7').locator('..').locator('..').getByRole('button').click()
  await expect.poll(async () => (await saved(page)).evidence?.week).toBe(6)
  expect((await saved(page)).credits).toBe(13)
  await button(/Do contract work/).click()
  await page.getByRole('checkbox', { name: /Accept the reduced propellant reserve/ }).check()
  await button('Submit FRR').click()

  await expect(page.getByRole('status')).toHaveText('Flight readiness review approved.')
  await button('Run this segment').click()
  await expect.poll(async () => (await saved(page)).flightProgress?.steps[0]?.id).toBe('launch')
  await page.reload()
  await button('Continue mission').click()
  await expect(page.getByRole('heading', { name: 'Lunar transfer' })).toBeVisible()
  await expect(button('Run this segment')).toBeDisabled()
  await page.getByRole('radio', { name: /Direct transfer/ }).check()
  await button('Run this segment').click()
  await expect(page.getByText('Flight ended during Lunar transfer.')).toBeVisible()
  await page.locator('summary').filter({ hasText: 'Decision log' }).click()
  await page.locator('summary').filter({ hasText: 'FRR approved' }).last().click()
  await expect(page.getByText('Waivers accepted: Accept the reduced propellant reserve')).toBeVisible()
  const game = await saved(page)
  expect(game.flight?.interruptedAt).toBe('transfer')
  expect(game.log.filter(entry => entry.id === 'integrate')).toHaveLength(1)
  expect(game.log.filter(entry => entry.id === 'operate')).toHaveLength(1)
})

test('the orbital and lunar chapters unlock, finish and replay using the production workbench', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('space-mission.progress.v1')) return
    localStorage.setItem('space-mission.progress.v1', JSON.stringify({
      missions: { cubesat: { minimum: true, stretch: false, records: ['cubesat:partnerVerified'] } },
    }))
  })
  await page.goto('/?seed=4')
  const button = (name: string | RegExp) => page.getByRole('button', { name })
  const work = (name: RegExp) => button(name).click()
  const openChapter = async (id: string) => {
    await page.locator('summary').filter({ hasText: 'Other missions' }).click()
    await page.locator(`[data-mission="${id}"]`).getByRole('button').click()
    await button('Start mission').click()
  }
  await openChapter('orbital-launch')
  await button('Choose Borrowed lab session').click()
  await work(/Assign the demonstration requirements|Define the architecture/)
  await work(/Complete the preliminary design/)
  await button('Choose Return to the workbench').click()
  await button('Submit PDR').click()
  await work(/Freeze design/)
  await work(/^Build the upper stage/)
  await work(/^Build avionics/)
  await work(/With partner facilities: Integrate and test the payload interface/)
  await page.getByRole('checkbox').check()
  await button('Submit FRR').click()
  await button('Run this segment').click()
  await page.reload()
  await button('Continue mission').click()
  await page.getByRole('radio', { name: /Send orbit confirmation first/ }).check()
  await button('Run this segment').click()
  await expect(page.getByText('Run seed: 4', { exact: false })).toBeVisible()
  await expect.poll(async () => (await saved(page)).flight?.delivered).toBe(true)

  await button('Return home').click()
  await page.goto('/?seed=1')
  await openChapter('lunar-mission')
  await button('Choose Decline both offers').click()
  await page.getByRole('radio', { name: /Low-energy transfer/ }).check()
  await work(/Define the architecture/)
  await work(/Complete the preliminary design/)
  await button('Submit PDR').click()
  await work(/Complete the detailed design/)
  await work(/Freeze design/)
  await button('Choose Wait for it').click()
  await work(/^Build and test the lander/)
  await button('Choose Carry on alone').click()
  await work(/^Build and test the payload/)
  await button('Choose Accept the earlier date').click()
  await work(/^Set up the ground system/)
  await work(/^Integrate, weigh and test/)
  for (const check of await page.getByRole('checkbox').all()) await check.check()
  await button('Submit FRR').click()
  await page.getByRole('radio', { name: /full check in parking orbit/i }).check()
  await button('Run this segment').click()
  await button('Run this segment').click()
  await button('Run this segment').click()
  await button('Run this segment').click()
  await button('Run this segment').click()
  await page.getByRole('radio', { name: /Keep observing without heat/ }).check()
  await button('Run this segment').click()
  await page.reload()
  await button('Continue mission').click()
  await page.getByRole('radio', { name: /Use every window for science/ }).check()
  await button('Run this segment').click()
  await page.getByRole('radio', { name: /End operations at sunset/ }).check()
  await button('Run this segment').click()
  await expect.poll(async () => (await saved(page)).flight?.batches).toBe(1)
  await expect(page.getByRole('heading', { name: 'Landed · mission delivered' })).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/\{\w+\}/)
  await button('Replay this seed').click()
  await expect.poll(async () => (await saved(page)).seed).toBe(1)
  await expect(button('Choose Decline both offers')).toBeVisible()
})
