import assert from 'node:assert/strict'
import test from 'node:test'
import { percent, riskFloor, topLevel } from '../src/game/risk'
import { en } from '../src/i18n/en'
import { zhTW } from '../src/i18n/zh-TW'
import {
  flyOrbital, orbitalAcceptance, orbitalBestMargin, orbitalCarried, orbitalLaunch as mission, orbitalNextStep, orbitalOdds,
  orbitalProposals, orbitalRiskIds, orbitalRisks, orbitalShortfall,
  type OrbitalDesign as Design, type OrbitalLevels, type OrbitalPlan as Plan, type OrbitalRisk as Risk,
} from '../src/missions/orbital-launch'

// Route checks for docs/story/orbital-launch.md. The orbital chapter is not wired into src/game/mission.ts yet.
// The risk rules live in src/missions/orbital-launch.ts. This file adds the calendar and budget rules written in
// that document and replays each documented route with a fixed seed.

type WorkId = keyof typeof mission.costs
type Remedy = keyof typeof mission.remedies
type Step =
  | { design: Partial<Design> }
  | { work: WorkId; lab?: boolean }
  | { remedy: Remedy }
  | { review: true }
  | { fly: Plan }

const stepOf = new Map<string, { risk: Risk; level: number }>(
  orbitalRiskIds.flatMap(risk => mission.risks[risk].steps.map((work, index) => [work, { risk, level: index + 1 }] as const)))

function start(seed: number, labSlot = false) {
  let design: Design = { ...mission.initialDesign }
  const levels: OrbitalLevels = { lift: 0, link: 0 }
  let week = 0
  let budget: number = mission.budget
  let spent = 0
  let frozen = false
  let integrated = false
  let lab = labSlot
  let approvedWeek = 0
  let accepted: readonly Risk[] = []
  let forecast = { minimum: 0, noFatal: 0 }
  let outcome: keyof typeof mission.outcomes | undefined
  let stop = ''
  let flight: ReturnType<typeof flyOrbital> | undefined
  const done = new Set<WorkId>()
  const ledger: string[] = []

  function spend(label: string, weeks: number, cost: number) {
    if (cost > budget - spent) { outcome = 'stopped'; stop = 'funds'; ledger.push(`${label}: needs ${cost}, has ${budget - spent}`); return false }
    spent += cost
    const begin = week + 1
    for (let index = 0; index < weeks; index += 1) {
      week += 1
      if (week === mission.events.budgetCut.afterWeek) budget += mission.events.budgetCut.budgetChange
    }
    ledger.push(`W${weeks > 1 ? `${begin}–${week}` : week} ${label} −${cost} → ${budget - spent}`)
    return true
  }

  const run = {
    get design() { return design },
    get levels() { return { ...levels } },
    get left() { return budget - spent },
    get week() { return week },
    get over() { return Boolean(outcome) },
    risks: () => orbitalRisks(seed, design, levels),
    odds: () => orbitalOdds(seed, design, levels),
    bestMargin: () => orbitalBestMargin(seed, design, levels),
    acceptance: () => orbitalAcceptance(seed, design, levels),
    configure(change: Partial<Design>) {
      assert.equal(frozen, false, 'design choices are free only before CDR')
      design = { ...design, ...change }
    },
    work(id: WorkId, useLab = false) {
      if (outcome) return false
      const { weeks, credits } = mission.costs[id]
      let cost: number = credits
      if (useLab) {
        assert.ok(lab && week < mission.labSlot.expiresWeek && (id === 'integrate' || id === 'rehearse'), 'lab session available')
        cost -= mission.labSlot.uses[id as 'integrate' | 'rehearse'].creditsSaved
        lab = false
      }
      const step = stepOf.get(id)
      if (step) assert.equal(levels[step.risk], step.level - 1, `${id} is the next verification level`)
      const needs = (mission.requires as Record<string, WorkId>)[id]
      if (needs) assert.ok(done.has(needs), `${id} needs ${needs}`)
      if (id === 'prelim') assert.ok(run.bestMargin() >= 0, 'PDR needs margin at the low end of the known range')
      if (id === 'freeze') cost += mission.stages[design.stage].cost + mission.telemetry[design.telemetry].cost
        + mission.adapters[design.adapter].cost + mission.grounds[design.ground].cost
      if (!spend(id, weeks, cost)) return false
      done.add(id)
      if (step) levels[step.risk] = step.level
      if (id === 'freeze') frozen = true
      if (id === 'integrate' || id === 'retest') integrated = true
      return true
    },
    remedy(id: Remedy) {
      if (outcome) return false
      const { weeks, credits } = mission.remedies[id]
      if (!spend(id, weeks, credits)) return false
      if (id === 'adapter') design = { ...design, adapter: 'lightweight' }
      if (id === 'dropDiagnostics') design = { ...design, telemetry: 'basic' }
      // Tests run on the one-station chain do not cover the handover. The analysis still holds.
      if (id === 'dualStation') { design = { ...design, ground: 'dual' }; levels.link = Math.min(levels.link, 1) }
      if (done.has('integrate')) integrated = false
      return true
    },
    // Returns false when the review sends the stack back. Risks above the review threshold are signed for and recorded.
    review() {
      if (outcome) return false
      if (week > mission.deadline) { outcome = 'stopped'; stop = 'deadline'; return false }
      assert.ok(mission.gates.FRR.work.every(id => done.has(id)), 'FRR work complete')
      assert.ok(integrated, 'integration evidence is current')
      assert.ok(mission.grounds[design.ground].capacity >= mission.confirmationUnits, 'pass carries the confirmation data')
      if (run.bestMargin() < 0) return false
      accepted = run.acceptance()
      forecast = run.odds()
      approvedWeek = week
      return true
    },
    fly(plan: Plan) {
      if (outcome) return
      assert.ok(approvedWeek, 'FRR approved before flight')
      flight = flyOrbital(seed, design, levels, plan)
      outcome = flight.outcome
      stop = flight.stop
    },
    result() {
      const delivered = outcome === 'extra' || outcome === 'success'
      const result = {
        week, spent, left: budget - spent, outcome, stop, confirmation: flight?.confirmation ?? 0, diagnostics: flight?.diagnostics ?? 0,
        marginProven: flight?.marginProven ?? false, margin: mission.stages[design.stage].capacityKg - orbitalShortfall(seed, design.stage) - orbitalCarried(design),
        rolls: flight?.rolls.map(roll => `${roll.id} ${percent(roll.risk)}% ${roll.failed ? 'failed' : 'held'}`) ?? [], accepted,
        forecast: { minimum: percent(forecast.minimum), noFatal: percent(forecast.noFatal) },
        onTime: delivered && approvedWeek <= mission.onTimeWeek,
        verified: delivered && orbitalRiskIds.every(id => levels[id] > 0) && orbitalRiskIds.reduce((total, id) => total + levels[id], 0) >= mission.verifiedLevels,
      }
      if (process.env.ORBITAL_ROUTES) console.log(ledger.join('\n'), '\n', result, flight?.rolls, '\n')
      return result
    },
    rolls: () => flight?.rolls ?? [],
    forecast: () => forecast,
    nextStep: (id: Risk) => orbitalNextStep(seed, design, levels, id),
  }
  return run
}

function play(seed: number, steps: readonly Step[], labSlot = false) {
  const run = start(seed, labSlot)
  for (const step of steps) {
    if (run.over) break
    if ('design' in step) run.configure(step.design)
    else if ('work' in step) run.work(step.work, step.lab)
    else if ('remedy' in step) run.remedy(step.remedy)
    else if ('review' in step) assert.ok(run.review() || run.over, 'FRR approved')
    else run.fly(step.fly)
  }
  return run.result()
}

const work = (...ids: WorkId[]): Step[] => ids.map(id => ({ work: id }))
const seeds = Array.from({ length: 2000 }, (_, index) => index + 1)

// Strategies for the balance table. Each returns the finished run.
type Strategy = (seed: number) => ReturnType<typeof start>
const finish = (run: ReturnType<typeof start>, plan: Plan = 'confirmFirst') => { if (run.review()) run.fly(plan); return run }
const build = (run: ReturnType<typeof start>, ...ids: WorkId[]) => { for (const id of ids) run.work(id); return run }

const strategies = {
  // One upgrade (the lightweight stage, on the lightweight adapter) and two tests on the data link.
  stageWithTwoTests: seed => {
    const run = start(seed)
    run.configure({ stage: 'highMargin', adapter: 'lightweight' })
    return finish(build(run, 'assess', 'linkAnalysis', 'prelim', 'freeze', 'buildStage', 'buildAvionics', 'stationTest', 'integrate'))
  },
  // One upgrade (the diagnostics package, with the adapter and second station it needs) and one test on each item.
  diagnosticsWithTwoTests: seed => {
    const run = start(seed)
    run.configure({ telemetry: 'diagnostics', adapter: 'lightweight', ground: 'dual' })
    return finish(build(run, 'assess', 'trade', 'linkAnalysis', 'prelim', 'freeze', 'buildStage', 'buildAvionics', 'integrate'))
  },
  // Both upgrades and no optional verification. After the cut this leaves no room for the adapter or a second station.
  bothUpgradesNoTests: seed => {
    const run = start(seed)
    run.configure({ stage: 'highMargin', telemetry: 'diagnostics' })
    return finish(build(run, 'assess', 'prelim', 'freeze', 'buildStage', 'buildAvionics', 'integrate'))
  },
  baselineNoTests: seed => finish(build(start(seed), 'assess', 'prelim', 'freeze', 'buildStage', 'buildAvionics', 'integrate')),
  baselineWithTwoTests: seed => finish(build(start(seed), 'assess', 'linkAnalysis', 'prelim', 'freeze', 'buildStage', 'buildAvionics', 'stationTest', 'integrate')),
  // Every item verified to the top level.
  everythingVerified: seed => finish(build(start(seed), 'assess', 'trade', 'linkAnalysis', 'prelim', 'freeze', 'buildStage', 'buildAvionics',
    'engineTest', 'hotfire', 'stationTest', 'rehearse', 'integrate')),
} satisfies Record<string, Strategy>

function rate(strategy: Strategy) {
  const results = seeds.map(seed => strategy(seed).result())
  const share = (match: (result: typeof results[number]) => boolean) => results.filter(match).length / results.length
  return {
    minimum: share(result => result.outcome === 'extra' || result.outcome === 'success'),
    stretch: share(result => result.outcome === 'extra'),
    launched: share(result => result.outcome !== 'stopped'),
    ascent: share(result => result.stop === 'ascent'),
  }
}

test('every orbital text key exists in both dictionaries', () => {
  const keys = new Set<string>()
  const collect = (value: unknown, key = '') => {
    if (typeof value === 'string' && ['title', 'brief', 'label', 'description', 'carried', 'pass', 'requires', 'failure'].includes(key)) keys.add(value)
    else if (value && typeof value === 'object') for (const [name, child] of Object.entries(value)) collect(child, name)
  }
  collect(mission)
  collect(orbitalProposals)
  assert.ok(keys.size > 70)
  for (const key of keys) {
    assert.ok(key in en, `en is missing ${key}`)
    assert.ok(key in zhTW, `zh-TW is missing ${key}`)
  }
  assert.deepEqual(Object.keys(zhTW), Object.keys(en))
  const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
  for (const key of Object.keys(en) as (keyof typeof en)[]) assert.deepEqual(placeholders(zhTW[key]), placeholders(en[key]), key)
})

test('every verification step is a costed work, and each level costs more than the one before', () => {
  for (const id of orbitalRiskIds) {
    const costs = mission.risks[id].steps.map(step => mission.costs[step as WorkId])
    assert.equal(costs.length, topLevel)
    for (let level = 1; level < costs.length; level += 1) assert.ok(costs[level].credits > costs[level - 1].credits)
  }
  assert.equal(Object.values(mission.risks).filter(risk => risk.severity === 'fatal').length, 1)
})


const mandatory = work('assess', 'prelim', 'freeze', 'buildStage', 'buildAvionics', 'integrate')
const fly: Step[] = [{ review: true }, { fly: 'confirmFirst' }]
const routes = {
  steady: [...work('assess', 'linkAnalysis', 'prelim', 'freeze', 'buildStage', 'buildAvionics', 'stationTest', 'integrate'), ...fly],
  bothRecords: [...work('assess', 'trade', 'linkAnalysis', 'prelim', 'freeze', 'buildStage', 'buildAvionics', 'stationTest', 'integrate'), ...fly],
  liftMargin: [
    { design: { stage: 'highMargin', adapter: 'lightweight' } },
    ...work('assess', 'trade', 'prelim', 'freeze', 'buildStage', 'engineTest', 'hotfire', 'buildAvionics', 'integrate'), ...fly,
  ],
  diagnostics: [
    { design: { telemetry: 'diagnostics', adapter: 'lightweight', ground: 'dual' } },
    ...work('assess', 'trade', 'linkAnalysis', 'prelim', 'freeze', 'buildStage', 'buildAvionics', 'integrate'), ...fly,
  ],
  bothUpgrades: [{ design: { stage: 'highMargin', telemetry: 'diagnostics' } }, ...mandatory, ...fly],
  noVerification: [...mandatory, ...fly],
} satisfies Record<string, Step[]>

const grounded = { confirmation: 0, diagnostics: 0, marginProven: false, rolls: [], accepted: [], forecast: { minimum: 0, noFatal: 0 }, onTime: false, verified: false }

test('seed 1: baseline options with two link tests deliver the demonstration', () => {
  assert.deepEqual(play(1, routes.steady), {
    week: 9, spent: 124, left: 52, outcome: 'success', stop: '', confirmation: 2, diagnostics: 0, marginProven: false, margin: 8,
    rolls: ['lift 2% held', 'link 5% held'], accepted: [], forecast: { minimum: 93, noFatal: 98 }, onTime: true, verified: false,
  })
  // One more analysis verifies every item and still meets the on-time week, so both track records are earned.
  assert.deepEqual(play(1, routes.bothRecords), {
    week: 10, spent: 129, left: 47, outcome: 'success', stop: '', confirmation: 2, diagnostics: 0, marginProven: false, margin: 8,
    rolls: ['lift 2% held', 'link 5% held'], accepted: [], forecast: { minimum: 93, noFatal: 98 }, onTime: true, verified: true,
  })
})

test('the lightweight stage proves its margin only when the hot-fire shows enough', () => {
  assert.deepEqual(play(1, routes.liftMargin), {
    week: 10, spent: 175, left: 1, outcome: 'extra', stop: '', confirmation: 2, diagnostics: 0, marginProven: true, margin: 32,
    rolls: ['lift 2% held', 'link 20% held'], accepted: ['link'], forecast: { minimum: 78, noFatal: 98 }, onTime: true, verified: false,
  })
  // Same play, different stage: this one falls 40 kg short of its analysis figure.
  assert.deepEqual(play(5, routes.liftMargin), {
    week: 10, spent: 175, left: 1, outcome: 'success', stop: '', confirmation: 2, diagnostics: 0, marginProven: false, margin: 8,
    rolls: ['lift 2% held', 'link 20% held'], accepted: ['link'], forecast: { minimum: 78, noFatal: 98 }, onTime: true, verified: false,
  })
})

test('the diagnostics package returns the extra data, and a second station keeps the minimum when the link fails', () => {
  assert.deepEqual(play(1, routes.diagnostics), {
    week: 9, spent: 171, left: 5, outcome: 'extra', stop: '', confirmation: 2, diagnostics: 3, marginProven: false, margin: 12,
    rolls: ['lift 2% held', 'link 25% held'], accepted: ['link'], forecast: { minimum: 98, noFatal: 98 }, onTime: true, verified: false,
  })
  assert.deepEqual(play(8, routes.diagnostics), {
    week: 9, spent: 171, left: 5, outcome: 'success', stop: '', confirmation: 2, diagnostics: 1, marginProven: false, margin: 8,
    rolls: ['lift 2% held', 'link 25% failed'], accepted: ['link'], forecast: { minimum: 98, noFatal: 98 }, onTime: true, verified: false,
  })
})

test('keeping both upgrades and cutting verification is a gamble the debrief can explain', () => {
  assert.deepEqual(play(1, routes.bothUpgrades), {
    week: 7, spent: 170, left: 6, outcome: 'success', stop: '', confirmation: 2, diagnostics: 1, marginProven: false, margin: 4,
    rolls: ['lift 55% held', 'link 40% held'], accepted: ['lift', 'link'], forecast: { minimum: 27, noFatal: 45 }, onTime: true, verified: false,
  })
  assert.deepEqual(play(5, routes.bothUpgrades), {
    week: 7, spent: 170, left: 6, outcome: 'incomplete', stop: 'ascent', confirmation: 0, diagnostics: 0, marginProven: false, margin: -20,
    rolls: ['lift 55% failed'], accepted: ['lift', 'link'], forecast: { minimum: 27, noFatal: 45 }, onTime: false, verified: false,
  })
  // The debrief names the next step for each item, its cost and what it would have shown.
  const run = start(5)
  run.configure({ stage: 'highMargin', telemetry: 'diagnostics' })
  build(run, 'assess', 'prelim', 'freeze', 'buildStage', 'buildAvionics', 'integrate')
  assert.deepEqual(run.nextStep('lift'), { work: 'trade', weeks: 1, credits: 5, risk: 1, known: { min: 23, max: 45 } })
  assert.deepEqual(run.nextStep('link'), { work: 'linkAnalysis', weeks: 1, credits: 4, risk: 0.25, known: null })
})

test('each lift test narrows the range until the hot-fire sends the stack back for a lighter adapter', () => {
  const run = start(5)
  run.configure({ stage: 'highMargin' })
  assert.deepEqual(run.risks().lift.known, { min: 0, max: 45 })
  build(run, 'assess', 'trade')
  assert.deepEqual([run.risks().lift.known, run.bestMargin(), percent(run.risks().lift.risk)], [{ min: 23, max: 45 }, 9, 57])
  build(run, 'prelim', 'freeze', 'buildStage', 'engineTest')
  assert.deepEqual([run.risks().lift.known, run.bestMargin(), percent(run.risks().lift.risk)], [{ min: 35, max: 45 }, -3, 100])
  build(run, 'hotfire')
  assert.deepEqual([run.risks().lift.known, run.bestMargin()], [{ min: 40, max: 40 }, -8])
  assert.equal(run.nextStep('lift'), null)
  run.remedy('adapter')
  build(run, 'buildAvionics', 'integrate')
  assert.equal(run.bestMargin(), 8)
  assert.deepEqual(finish(run).result(), {
    week: 11, spent: 175, left: 1, outcome: 'success', stop: '', confirmation: 2, diagnostics: 0, marginProven: false, margin: 8,
    rolls: ['lift 2% held', 'link 20% held'], accepted: ['link'], forecast: { minimum: 78, noFatal: 98 }, onTime: false, verified: false,
  })
})

test('flight review sends back a stack that is known to be too heavy', () => {
  const run = start(5)
  run.configure({ stage: 'highMargin' })
  build(run, 'assess', 'trade', 'prelim', 'freeze', 'buildStage', 'engineTest', 'buildAvionics', 'integrate')
  assert.equal(run.review(), false)
  assert.equal(run.over, false)
})

test('seed 8: the same link roll fails an unverified pass and holds after two tests', () => {
  assert.deepEqual(play(8, routes.noVerification), {
    week: 7, spent: 114, left: 62, outcome: 'incomplete', stop: 'pass', confirmation: 1, diagnostics: 0, marginProven: false, margin: 4,
    rolls: ['lift 2% held', 'link 20% failed'], accepted: ['link'], forecast: { minimum: 78, noFatal: 98 }, onTime: false, verified: false,
  })
  const tested = play(8, routes.steady)
  assert.deepEqual([tested.outcome, tested.rolls], ['success', ['lift 2% held', 'link 5% held']])
})

test('seed 23: the floor still fails a fully tested stage', () => {
  const result = play(23, routes.liftMargin)
  assert.deepEqual([result.outcome, result.stop, result.margin, result.rolls], ['incomplete', 'ascent', 19, ['lift 2% failed']])
  assert.equal(riskFloor, 0.02)
})

test('verifying everything to the top level misses the launch slot', () => {
  for (const seed of seeds.slice(0, 200)) {
    const result = strategies.everythingVerified(seed).result()
    assert.deepEqual([result.week, result.outcome, result.stop], [13, 'stopped', 'deadline'])
  }
  assert.deepEqual(strategies.everythingVerified(1).result(), { week: 13, spent: 159, left: 17, outcome: 'stopped', stop: 'deadline', margin: 8, ...grounded })
})

test('keeping every upgrade runs out of budget before integration', () => {
  const result = play(1, [{ design: { stage: 'highMargin', telemetry: 'diagnostics', adapter: 'lightweight', ground: 'dual' } }, ...mandatory])
  assert.deepEqual(result, { week: 6, spent: 176, left: 0, outcome: 'stopped', stop: 'funds', margin: 20, ...grounded })
})

test('the borrowed lab session pays for one integration test', () => {
  const result = play(1, [...work('assess', 'prelim', 'freeze', 'buildStage', 'buildAvionics'), { work: 'integrate', lab: true }, ...fly], true)
  assert.deepEqual([result.week, result.spent, result.outcome], [7, 102, 'success'])
})

test('adding a second station after the design freeze keeps the analysis and asks for the tests again', () => {
  const run = build(start(1), 'assess', 'linkAnalysis', 'prelim', 'freeze', 'stationTest')
  assert.deepEqual([run.levels.link, percent(run.risks().link.risk)], [2, 5])
  run.remedy('dualStation')
  assert.deepEqual([run.levels.link, run.risks().link.maturity, percent(run.risks().link.risk)], [1, 'new', 25])
})

test('the same seed and the same play give the same run', () => {
  for (const strategy of Object.values(strategies)) {
    for (const seed of seeds.slice(0, 100)) {
      const [first, second] = [strategy(seed), strategy(seed)]
      assert.deepEqual(first.result(), second.result())
      assert.deepEqual(first.rolls(), second.rolls())
    }
  }
  assert.notDeepEqual(seeds.slice(0, 20).map(seed => orbitalShortfall(seed, 'highMargin')), seeds.slice(20, 40).map(seed => orbitalShortfall(seed, 'highMargin')))
})

test('work done on one item never changes the draw of another', () => {
  for (const seed of seeds.slice(0, 300)) {
    const plain = strategies.baselineNoTests(seed).rolls()
    const tested = strategies.baselineWithTwoTests(seed).rolls()
    const upgraded = strategies.diagnosticsWithTwoTests(seed).rolls()
    for (const rolls of [tested, upgraded]) {
      assert.deepEqual(rolls.map(roll => [roll.id, roll.value]), plain.slice(0, rolls.length).map(roll => [roll.id, roll.value]))
      assert.equal(rolls[0].hidden, plain[0].hidden)
    }
  }
})

test('balance: success rates over 2000 seeds stay inside the design targets', () => {
  const measured = Object.fromEntries(Object.entries(strategies).map(([name, strategy]) => {
    const runs = seeds.map(seed => strategy(seed))
    return [name, { ...rate(strategy), shown: runs.reduce((total, run) => total + run.forecast().minimum, 0) / runs.length }]
  })) as Record<keyof typeof strategies, ReturnType<typeof rate> & { shown: number }>
  if (process.env.ORBITAL_BALANCE) console.table(measured)
  assert.ok(measured.stageWithTwoTests.minimum >= 0.85)
  assert.ok(measured.diagnosticsWithTwoTests.minimum >= 0.85)
  assert.ok(measured.bothUpgradesNoTests.minimum <= 0.3)
  assert.equal(measured.everythingVerified.launched, 0)
  assert.ok(measured.baselineWithTwoTests.minimum > measured.baselineNoTests.minimum + 0.1)
  // The forecast shown at flight review matches how often each strategy meets the minimum.
  for (const [name, { minimum, shown, launched }] of Object.entries(measured)) {
    if (launched) assert.ok(Math.abs(minimum - shown) < 0.03, `${name}: shown ${shown}, measured ${minimum}`)
  }
})
