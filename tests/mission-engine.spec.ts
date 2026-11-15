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
  await button('Choose Return to the workbench').filter({ hasText: 'Flight review deadline: week 8 → week 7' }).click()
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

test('three chapters carry earned records, resume paid work, and replay the lunar ending', async ({ page }) => {
  test.setTimeout(60_000)
  const button = (name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' })
  const heading = (name: string) => page.getByRole('heading', { name, exact: true })
  const radio = (name: RegExp) => page.getByRole('radio', { name })
  const summary = (name: string) => page.locator('summary').filter({ hasText: name })
  const work = (name: RegExp) => button(name).click()
  const progress = () => page.evaluate(() => JSON.parse(localStorage.getItem('space-mission.progress.v1')!))
  const chapter = (id: string) => page.locator(`[data-mission="${id}"]`)
  const start = async () => {
    await button('Start mission').click()
  }
  const open = async (id: string, seed: number) => {
    await button('Return home').click()
    await page.goto(`/?seed=${seed}`)
    await chapter(id).getByRole('button', { name: 'Open brief' }).click()
    await start()
  }
  const signFrr = async () => {
    for (const waiver of await page.getByRole('checkbox').all()) await waiver.check()
    await button('Submit FRR').click()
    await expect(page.getByText(/^Flight readiness review approved\./).first()).toBeVisible()
  }

  await page.goto('/?seed=6')
  await expect(chapter('orbital-launch').getByRole('button')).toHaveCount(0)
  await expect(chapter('lunar-mission').getByRole('button')).toHaveCount(0)
  await button('View mission brief').click()
  await expect(heading('First Light')).toBeVisible()
  await summary('Prologue · The lost signal').click()
  await expect(page.getByText(/Investigators never established the cause/)).toBeVisible()
  await start()
  await radio(/Add an auxiliary sensor/).check()
  await work(/Complete feasibility/)
  await work(/Run early interface test/)
  await work(/Correct the interface drawing/)
  await work(/Freeze design/)
  await work(/Build and test subsystems/)
  await work(/Run integration tests/)
  await button('Submit FRR').click()
  await button('Run first ground pass').click()
  await radio(/Image the northern access road/).check()
  await button('Capture and downlink follow-up').click()
  await expect(heading('Commission fulfilled with a follow-up')).toBeVisible()
  await expect.poll(() => saved(page)).toMatchObject({
    seed: 6, week: 6, credits: 33, flight: { delivered: true, batches: 3, stretch: true },
  })
  await expect.poll(progress).toMatchObject({ missions: {
    cubesat: { minimum: true, stretch: true, records: ['cubesat:partnerVerified'],
      report: { status: 'extra', weeks: 6, data: 3, commission: 'river' } },
  } })

  await open('orbital-launch', 4)
  await expect(heading('Borrowed lab session')).toBeVisible()
  await button('繁中').click()
  await expect(heading('實驗室借用時段')).toBeVisible()
  await button('EN').click()
  await button('Choose Borrowed lab session').click()
  await work(/Define the architecture/)
  await work(/Complete the preliminary design/)
  for (const waiver of await page.getByRole('checkbox').all()) await waiver.check()
  await button('Submit PDR').click()
  await expect(heading('Second payment reduced')).toBeVisible()
  await button('Choose Return to the workbench').click()
  await work(/^Freeze design/)
  await work(/^Build the upper stage/)
  await work(/^Build avionics/)
  await work(/Use the borrowed lab session for Integrate and test the payload interface/)
  await expect(summary('Integration evidence')).toContainText('2 of 2 checks passed')
  await summary('Extra tests and design changes').click()
  await work(/^Analyze the link budget/)
  await work(/^Test ground station compatibility/)
  await work(/^Analyze stage performance/)
  await signFrr()
  await button('Run this segment').click()
  await button('Run this segment').click()
  await expect(heading('Demonstration delivered')).toBeVisible()
  await expect(summary('Integration evidence')).toContainText('2 of 2 checks passed')
  await expect.poll(() => saved(page)).toMatchObject({
    seed: 4, week: 10, credits: 59, records: ['cubesat:partnerVerified'],
    missionState: { lab: false, lift: 1, link: { level: 2 } },
    flight: { delivered: true, confirmation: 2, diagnostics: 0 },
  })
  expect((await saved(page)).log.filter(entry => entry.id === 'lab:integrate').map(entry => entry.cost)).toEqual([0])
  await expect.poll(async () => (await progress()).missions['orbital-launch']).toMatchObject({
    minimum: true, stretch: false, records: ['orbital:onTime', 'orbital:verified'],
    report: { status: 'fulfilled', weeks: 10, data: 2 },
  })

  await open('lunar-mission', 1)
  const playLunar = async (checkReloads: boolean) => {
    await expect(heading('Partner offers')).toBeVisible()
    await expect(page.getByText(/50 cr on signing · 10 cr on delivery/)).toBeVisible()
    await expect(page.getByText(/support slots on delivery: 4/)).toBeVisible()
    await button('Choose Funded partnership').click()
    await expect.poll(() => saved(page)).toMatchObject({ records: ['cubesat:partnerVerified', 'orbital:onTime', 'orbital:verified'],
      credits: 212, missionState: { contract: { kind: 'funding', milestone: 10 } } })
    await work(/Define the architecture/)
    await work(/Complete the preliminary design/)
    await button('Submit PDR').click()
    await radio(/Lightweight mount/).check()
    await work(/^Do contract work/)
    await work(/^Do contract work/)
    await expect(heading('A supplier is late')).toBeVisible()
    await button('Choose Wait for it').click()
    await expect(heading('The funder wants a camera on the lander')).toBeVisible()
    await button('Choose Broadcast from mission control instead').click()
    await summary('Extra tests and design changes').click()
    await work(/^Simulate the descent trajectory/)
    await work(/^Complete the detailed design/)
    await work(/^Freeze design/)

    const beforeBuild = await saved(page)
    await work(/^Build and test the lander/)
    await expect(heading('The government moves the announcement up')).toBeVisible()
    await expect(page.getByText('Build and test the lander paused in week 10. Weeks remaining: 1.')).toBeVisible()
    const paused = await saved(page)
    expect(paused.credits).toBe(beforeBuild.credits - 30)
    expect(paused.pendingWork).toMatchObject({ job: { task: 'buildFlight' }, remaining: 1, cost: { credits: 30 } })
    if (checkReloads) {
      await button('繁中').click()
      await expect(heading('政府把發表日提前')).toBeVisible()
      await expect(page.getByText(/在第 10 週暫停，尚需 1 週/)).toBeVisible()
      await page.reload()
      await button('繼續任務').click()
      await expect(heading('政府把發表日提前')).toBeVisible()
      expect(await saved(page)).toEqual(paused)
      await button('EN').click()
    }
    await button('Choose Accept the earlier date').click()
    const built = await saved(page)
    expect(built.pendingWork).toBeUndefined()
    expect(built.credits).toBe(paused.credits + 12)
    expect(built.log.filter(entry => entry.id === 'buildFlight').map(entry => entry.cost)).toEqual([30])

    await work(/^Build and test the payload/)
    await work(/^Set up the ground system/)
    await work(/^Integrate, weigh and test/)
    await expect(heading('The interface documents disagree')).toBeVisible()
    await button('Choose Let each team fix its own tables').click()
    await summary('Extra tests and design changes').click()
    for (const task of [
      /^Field-test the landing sensors/, /^Rehearse the descent timeline/,
      /^Analyze the payload data flow/, /^Function-test the payload/, /^Review the fault tree and interface documents/,
      /^Bench-test the flight software/, /^Analyze pressurization leak paths/,
    ]) await work(task)
    if (checkReloads) {
      await button('繁中').click()
      await expect(heading('飛行審查')).toBeVisible()
      await expect(page.getByText('待簽署的風險與豁免')).toBeVisible()
      await expect(summary('整合驗證證據')).toContainText('通過 2／2 項測試')
      await button('EN').click()
    }
    await signFrr()

    await radio(/Run a full check in parking orbit/).check()
    await button('Run this segment').click()
    for (let i = 0; i < 4; i++) await button('Run this segment').click()
    await expect(heading('Surface operations and data return')).toBeVisible()
    await radio(/Keep observing without heat/).check()
    await button('Run this segment').click()
    await expect(radio(/Use every window for science/)).toBeVisible()
    const surface = await saved(page)
    expect(surface.flightProgress?.steps.map(step => step.id)).toEqual(['launch', 'checkout', 'transfer', 'orbit', 'descent'])
    expect(surface.flightProgress?.state.decisions).toEqual(['Check', 'Exposed'])
    if (checkReloads) {
      await page.reload()
      await button('Continue mission').click()
      await expect(heading('Surface operations and data return')).toBeVisible()
      await expect(page.getByText('The payload keeps collecting through the eclipse, colder than it has ever been.')).toBeVisible()
      await expect(button('Run this segment')).toBeDisabled()
      expect(await saved(page)).toEqual(surface)
    }
    await radio(/Use every window for science/).check()
    await button('Run this segment').click()
    await button('Run this segment').click()
    await expect(heading('Landed · mission delivered')).toBeVisible()
    await expect(page.getByText(/The surface science team received the spectra/)).toBeVisible()
    await expect(page.locator('main')).not.toContainText(/\{\w+\}/)
    const finished = await saved(page)
    expect(finished).toMatchObject({ seed: 1, week: 23, credits: 41, flight: { delivered: true, batches: 1, outcome: 'success', spareKg: 4 } })
    return finished
  }

  const first = await playLunar(true)
  await button('繁中').click()
  await expect(heading('登月 · 完成基本委託')).toBeVisible()
  await expect(heading('終章・回到實驗室')).toBeVisible()
  await expect(page.getByText(/剛收到下一份提案/)).toBeVisible()
  await expect(page.getByText(/月面科學組收到光譜/)).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/\{\w+\}/)
  await expect.poll(async () => (await progress()).missions['lunar-mission'].minimum).toBe(true)
  await button('EN').click()
  await button('Replay this seed').click()
  expect(await playLunar(false)).toEqual(first)
  await button('Return home').click()
  await expect(page.getByText('Team reputation · 4')).toBeVisible()
  await page.reload()
  await summary('Mission portfolio').click()
  await page.locator('summary').filter({ hasText: 'Orbital launch' }).click()
  await expect(page.getByText('2 orbit confirmation units')).toBeVisible()
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
    await page.locator(`[data-mission="${id}"]`).getByRole('button').click()
    await button('Start mission').click()
  }
  await openChapter('orbital-launch')
  await button('Choose Borrowed lab session').click()
  await work(/Assign the demonstration requirements|Define the architecture/)
  await work(/Complete the preliminary design/)
  for (const waiver of await page.getByRole('checkbox').all()) await waiver.check()
  await button('Submit PDR').click()
  await button('Choose Return to the workbench').click()
  await work(/Freeze design/)
  await work(/^Build the upper stage/)
  await work(/^Build avionics/)
  await work(/Use the borrowed lab session for Integrate and test the payload interface/)
  await page.getByRole('checkbox').check()
  await button('Submit FRR').click()
  await button('Run this segment').click()
  await page.reload()
  await button('Continue mission').click()
  await button('Run this segment').click()
  await expect(page.getByText('Run seed: 4', { exact: false })).toBeVisible()
  await expect.poll(async () => (await saved(page)).flight?.delivered).toBe(true)

  await button('Return home').click()
  await page.goto('/?seed=1')
  await openChapter('lunar-mission')
  await button('Choose Decline both offers').click()
  await button('Route to the Moon').click()
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
  await button('Run this segment').click()
  await expect.poll(async () => (await saved(page)).flight?.batches).toBe(1)
  await expect(page.getByRole('heading', { name: 'Landed · mission delivered' })).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/\{\w+\}/)
  await button('Replay this seed').click()
  await expect.poll(async () => (await saved(page)).seed).toBe(1)
  await expect(button('Choose Decline both offers')).toBeVisible()
})
