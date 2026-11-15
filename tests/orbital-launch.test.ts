import assert from 'node:assert/strict'
import test from 'node:test'
import { hasDefect, percent, topLevel, untested } from '../src/game/risk'
import { en } from '../src/i18n/en'
import { zhTW } from '../src/i18n/zh-TW'
import {
  flyOrbital, orbitalAcceptance, orbitalBestMargin, orbitalCarried, orbitalLaunch as mission, orbitalLinkId, orbitalLinkMaturity, orbitalNextStep,
  orbitalOdds, orbitalProposals, orbitalRiskIds, orbitalRisks, orbitalShortfall, sameOrbitalLink, verifyOrbitalLink,
  type OrbitalDesign as Design, type OrbitalKnowledge, type OrbitalPlan as Plan, type OrbitalRisk as Risk,
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
  | { fix: 'link' }
  | { review: true }
  | { fly: Plan }

const stepOf = new Map<string, { risk: Risk; level: number }>(
  orbitalRiskIds.flatMap(risk => mission.risks[risk].steps.map((work, index) => [work, { risk, level: index + 1 }] as const)))

function start(seed: number, labSlot = false) {
  let design: Design = { ...mission.initialDesign }
  let known: OrbitalKnowledge = { lift: 0, link: untested }
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
  const found: string[] = []
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
    get known() { return known },
    get left() { return budget - spent },
    get week() { return week },
    get over() { return Boolean(outcome) },
    risks: () => orbitalRisks(seed, design, known),
    odds: () => orbitalOdds(seed, design, known),
    bestMargin: () => orbitalBestMargin(seed, design, known),
    acceptance: () => orbitalAcceptance(seed, design, known),
    nextStep: (id: Risk) => orbitalNextStep(seed, design, known, id),
    configure(change: Partial<Design>) {
      assert.equal(frozen, false, 'design choices are free only before CDR')
      const next = { ...design, ...change }
      // A different data chain is a different item: what was learned about the old one does not carry over.
      if (!sameOrbitalLink(design, next)) known = { ...known, link: untested }
      design = next
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
      if (step) {
        assert.equal(step.risk === 'lift' ? known.lift : known.link.level, step.level - 1, `${id} is the next verification level`)
        if (step.risk === 'link') assert.ok(!known.link.found && !known.link.fixed, 'nothing left to learn about a defect that has been found')
      }
      const needs = (mission.requires as Record<string, WorkId>)[id]
      if (needs) assert.ok(done.has(needs), `${id} needs ${needs}`)
      if (id === 'prelim') assert.ok(run.bestMargin() >= 0, 'PDR needs margin at the low end of the known range')
      if (id === 'freeze') cost += mission.stages[design.stage].cost + mission.telemetry[design.telemetry].cost
        + mission.adapters[design.adapter].cost + mission.grounds[design.ground].cost
      if (!spend(id, weeks, cost)) return false
      done.add(id)
      if (step?.risk === 'lift') known = { ...known, lift: step.level }
      if (step?.risk === 'link') {
        known = { ...known, link: verifyOrbitalLink(seed, design, known.link) }
        if (known.link.found) found.push(`link by ${id}`)
      }
      if (id === 'freeze') frozen = true
      if (id === 'integrate' || id === 'retest') integrated = true
      return true
    },
    // Fixing a found defect costs time and money and makes the item clean.
    fix(id: 'link') {
      if (outcome) return false
      assert.ok(known.link.found && !known.link.fixed, 'only a defect that a test found can be fixed')
      const { weeks, credits } = mission.fixes[id]
      if (!spend(`fix ${id}`, weeks, credits)) return false
      known = { ...known, link: { ...known.link, fixed: true } }
      return true
    },
    remedy(id: Remedy) {
      if (outcome) return false
      const { weeks, credits } = mission.remedies[id]
      if (!spend(id, weeks, credits)) return false
      const before = design
      if (id === 'adapter') design = { ...design, adapter: 'lightweight' }
      if (id === 'dropDiagnostics') design = { ...design, telemetry: 'basic' }
      if (id === 'dualStation') design = { ...design, ground: 'dual' }
      if (!sameOrbitalLink(before, design)) known = { ...known, link: untested }
      if (done.has('integrate')) integrated = false
      return true
    },
    // Returns false when the review sends the stack back. Believed risks above the threshold are signed for and recorded.
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
      flight = flyOrbital(seed, design, known, plan)
      outcome = flight.outcome
      stop = flight.stop
    },
    outcomes: () => flight?.outcomes ?? [],
    forecast: () => forecast,
    result() {
      const delivered = outcome === 'extra' || outcome === 'success'
      const result = {
        week, spent, left: budget - spent, outcome, stop, confirmation: flight?.confirmation ?? 0, diagnostics: flight?.diagnostics ?? 0,
        marginProven: flight?.marginProven ?? false, margin: mission.stages[design.stage].capacityKg - orbitalShortfall(seed, design.stage) - orbitalCarried(design),
        flew: flight?.outcomes.map(item => `${item.id} ${percent(item.believed)}% ${item.failed ? 'failed' : 'held'}`) ?? [], found, accepted,
        forecast: { minimum: percent(forecast.minimum), noFatal: percent(forecast.noFatal) },
        onTime: delivered && approvedWeek <= mission.onTimeWeek,
        verified: delivered && known.lift > 0 && known.link.level > 0 && known.lift + known.link.level >= mission.verifiedLevels,
      }
      if (process.env.ORBITAL_ROUTES) console.log(ledger.join('\n'), '\n', result, '\n')
      return result
    },
  }
  return run
}

type Run = ReturnType<typeof start>

function play(seed: number, steps: readonly Step[], labSlot = false) {
  const run = start(seed, labSlot)
  for (const step of steps) {
    if (run.over) break
    if ('design' in step) run.configure(step.design)
    else if ('work' in step) run.work(step.work, step.lab)
    else if ('remedy' in step) run.remedy(step.remedy)
    else if ('fix' in step) run.fix(step.fix)
    else if ('review' in step) assert.ok(run.review() || run.over, 'FRR approved')
    else run.fly(step.fly)
  }
  return run.result()
}

const work = (...ids: WorkId[]): Step[] => ids.map(id => ({ work: id }))
const seeds = Array.from({ length: 2000 }, (_, index) => index + 1)
const finish = (run: Run, plan: Plan = 'confirmFirst') => { if (run.review()) run.fly(plan); return run }
// Do each work in turn. When a test finds a link defect, fix it if the budget still covers integration afterwards.
const build = (run: Run, ...ids: WorkId[]) => {
  for (const id of ids) {
    if (stepOf.get(id)?.risk === 'link' && (run.known.link.found || run.known.link.fixed)) continue
    run.work(id)
    if (run.known.link.found && !run.known.link.fixed && run.left >= mission.fixes.link.credits + mission.costs.integrate.credits) run.fix('link')
  }
  return run
}

const strategies = {
  // One upgrade (the lightweight stage, on the lightweight adapter) and two tests on the data link.
  stageWithTwoTests: seed => {
    const run = start(seed)
    run.configure({ stage: 'highMargin', adapter: 'lightweight' })
    return finish(build(run, 'assess', 'linkAnalysis', 'prelim', 'freeze', 'buildStage', 'buildAvionics', 'stationTest', 'integrate'))
  },
  // One upgrade (the diagnostics package, with the adapter and second station it needs) and one analysis on each item.
  diagnosticsWithTwoTests: seed => {
    const run = start(seed)
    run.configure({ telemetry: 'diagnostics', adapter: 'lightweight', ground: 'dual' })
    // This budget cannot pay for a fix, so a found defect is flown knowingly. The second station covers the minimum.
    for (const id of ['assess', 'trade', 'linkAnalysis', 'prelim', 'freeze', 'buildStage', 'buildAvionics', 'integrate'] as const) run.work(id)
    return finish(run)
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
} satisfies Record<string, (seed: number) => Run>

function rate(strategy: (seed: number) => Run) {
  const runs = seeds.map(seed => strategy(seed))
  const results = runs.map(run => run.result())
  const share = (match: (result: typeof results[number]) => boolean) => results.filter(match).length / results.length
  return {
    minimum: share(result => result.outcome === 'extra' || result.outcome === 'success'),
    stretch: share(result => result.outcome === 'extra'),
    launched: share(result => result.outcome !== 'stopped'),
    ascent: share(result => result.stop === 'ascent'),
    shown: runs.reduce((total, run) => total + run.forecast().minimum, 0) / runs.length,
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
const grounded = { confirmation: 0, diagnostics: 0, marginProven: false, flew: [], accepted: [], forecast: { minimum: 0, noFatal: 0 }, onTime: false, verified: false }

test('seed 4, tests that only confirm: a clean link passes both tests and the demonstration is delivered', () => {
  assert.deepEqual(play(4, routes.steady), {
    week: 9, spent: 124, left: 52, outcome: 'success', stop: '', confirmation: 2, diagnostics: 0, marginProven: false, margin: 3,
    flew: ['lift 0% held', 'link 4% held'], found: [], accepted: [], forecast: { minimum: 96, noFatal: 100 }, onTime: true, verified: false,
  })
  // The untested run on the same seed flies just as well. The tests bought confidence, not a different rocket.
  assert.deepEqual(play(4, routes.noVerification).flew, ['lift 0% held', 'link 20% held'])
  // One more analysis verifies every item and still meets the on-time week, so both track records are earned.
  assert.deepEqual(play(4, routes.bothRecords), {
    week: 10, spent: 129, left: 47, outcome: 'success', stop: '', confirmation: 2, diagnostics: 0, marginProven: false, margin: 3,
    flew: ['lift 0% held', 'link 4% held'], found: [], accepted: [], forecast: { minimum: 96, noFatal: 100 }, onTime: true, verified: true,
  })
})

test('seed 3, bad news: analysis finds a link defect, and the player fixes it or flies with it knowingly', () => {
  const run = start(3)
  run.work('assess')
  assert.equal(percent(run.risks().link.risk), 20)
  run.work('linkAnalysis')
  assert.deepEqual([run.known.link, percent(run.risks().link.risk)], [{ level: 1, found: true, fixed: false }, 100])
  run.fix('link')
  assert.deepEqual([run.known.link, percent(run.risks().link.risk)], [{ level: 1, found: true, fixed: true }, 0])
  for (const id of ['prelim', 'freeze', 'buildStage', 'buildAvionics', 'integrate'] as const) run.work(id)
  assert.deepEqual(finish(run).result(), {
    week: 9, spent: 124, left: 52, outcome: 'success', stop: '', confirmation: 2, diagnostics: 0, marginProven: false, margin: 6,
    flew: ['lift 0% held', 'link 0% held'], found: ['link by linkAnalysis'], accepted: [], forecast: { minimum: 100, noFatal: 100 }, onTime: true, verified: false,
  })
  // Leaving it unfixed is the real accept-risk decision: the review asks for a signature on a known problem.
  assert.deepEqual(play(3, [...work('assess', 'linkAnalysis', 'prelim', 'freeze', 'buildStage', 'buildAvionics', 'integrate'), ...fly]), {
    week: 8, spent: 118, left: 58, outcome: 'incomplete', stop: 'pass', confirmation: 1, diagnostics: 0, marginProven: false, margin: 6,
    flew: ['lift 0% held', 'link 100% failed'], found: ['link by linkAnalysis'], accepted: ['link'], forecast: { minimum: 0, noFatal: 100 }, onTime: false, verified: false,
  })
})

test('seeds 1, 43 and 74, tests can miss: a pass lowers the believed risk and leaves the defect where it was', () => {
  // Seed 1: both tests pass, the player believes 4%, and the defect shows up in flight.
  assert.deepEqual(play(1, routes.steady), {
    week: 9, spent: 124, left: 52, outcome: 'incomplete', stop: 'pass', confirmation: 1, diagnostics: 0, marginProven: false, margin: 8,
    flew: ['lift 0% held', 'link 4% failed'], found: [], accepted: [], forecast: { minimum: 96, noFatal: 100 }, onTime: false, verified: false,
  })
  // Only the end-to-end rehearsal catches it. Fixing it then costs another week.
  assert.deepEqual(play(1, [...work('assess', 'linkAnalysis', 'prelim', 'freeze', 'buildStage', 'buildAvionics', 'stationTest', 'rehearse'), { fix: 'link' }, ...work('integrate'), ...fly]), {
    week: 11, spent: 138, left: 38, outcome: 'success', stop: '', confirmation: 2, diagnostics: 0, marginProven: false, margin: 8,
    flew: ['lift 0% held', 'link 0% held'], found: ['link by rehearse'], accepted: [], forecast: { minimum: 100, noFatal: 100 }, onTime: false, verified: false,
  })
  // Seed 43: analysis misses, the station test catches.
  const run = start(43)
  run.work('assess'); run.work('linkAnalysis')
  assert.deepEqual([run.known.link.found, percent(run.risks().link.risk)], [false, 11])
  for (const id of ['prelim', 'freeze', 'buildStage', 'buildAvionics', 'stationTest'] as const) run.work(id)
  assert.deepEqual([run.known.link.found, percent(run.risks().link.risk)], [true, 100])
  // Seed 74: even three passed tests leave 1%, and this is that run.
  const missed = play(74, [...work('assess', 'linkAnalysis', 'prelim', 'freeze', 'buildStage', 'buildAvionics', 'stationTest', 'rehearse', 'integrate'), ...fly])
  assert.deepEqual([missed.outcome, missed.stop, missed.flew, missed.found], ['incomplete', 'pass', ['lift 0% held', 'link 1% failed'], []])
})

test('the lightweight stage proves its margin only when the hot-fire shows enough', () => {
  assert.deepEqual(play(4, routes.liftMargin), {
    week: 10, spent: 175, left: 1, outcome: 'extra', stop: '', confirmation: 2, diagnostics: 0, marginProven: true, margin: 33,
    flew: ['lift 0% held', 'link 20% held'], found: [], accepted: ['link'], forecast: { minimum: 80, noFatal: 100 }, onTime: true, verified: false,
  })
  // Same play, different stage: this one falls 40 kg short of its analysis figure.
  assert.deepEqual(play(5, routes.liftMargin), {
    week: 10, spent: 175, left: 1, outcome: 'success', stop: '', confirmation: 2, diagnostics: 0, marginProven: false, margin: 8,
    flew: ['lift 0% held', 'link 20% held'], found: [], accepted: ['link'], forecast: { minimum: 80, noFatal: 100 }, onTime: true, verified: false,
  })
})

test('seed 7, good news: the analysis shows the stage is strong enough to skip the lightweight adapter', () => {
  const run = start(7)
  run.configure({ stage: 'highMargin' })
  run.work('assess')
  assert.equal(percent(run.risks().lift.risk), 28)
  run.work('trade')
  assert.deepEqual([run.risks().lift.known, run.risks().lift.limit, run.risks().lift.risk], [{ min: 0, max: 22 }, 32, 0])
  for (const id of ['prelim', 'freeze', 'buildStage', 'engineTest', 'hotfire', 'buildAvionics', 'integrate'] as const) run.work(id)
  const result = finish(run).result()
  // 8 credits saved against the route that bought the adapter up front, and the margin is still proven.
  assert.deepEqual([result.week, result.spent, result.left, result.outcome, result.marginProven, result.margin], [10, 167, 9, 'extra', true, 26])
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
    flew: ['lift 0% held', 'link 20% held'], found: [], accepted: ['link'], forecast: { minimum: 80, noFatal: 100 }, onTime: false, verified: false,
  })
})

test('flight review sends back a stack that is known to be too heavy', () => {
  const run = start(5)
  run.configure({ stage: 'highMargin' })
  build(run, 'assess', 'trade', 'prelim', 'freeze', 'buildStage', 'engineTest', 'buildAvionics', 'integrate')
  assert.equal(run.review(), false)
  assert.equal(run.over, false)
})

test('seed 12: an untested second station cannot cover a known link fault', () => {
  assert.deepEqual(play(4, routes.diagnostics), {
    week: 9, spent: 171, left: 5, outcome: 'extra', stop: '', confirmation: 2, diagnostics: 3, marginProven: false, margin: 7,
    flew: ['lift 0% held', 'link 25% held'], found: [], accepted: ['link'], forecast: { minimum: 75, noFatal: 100 }, onTime: true, verified: false,
  })
  // The analysis finds the defect. The link cannot carry the whole confirmation without proven handover.
  assert.deepEqual(play(12, routes.diagnostics), {
    week: 9, spent: 171, left: 5, outcome: 'incomplete', stop: 'pass', confirmation: 1, diagnostics: 0, marginProven: false, margin: 10,
    flew: ['lift 0% held', 'link 100% failed'], found: ['link by linkAnalysis'], accepted: ['link'], forecast: { minimum: 0, noFatal: 100 }, onTime: false, verified: false,
  })
  // Paying for the fix leaves too little for the integration test: no launch.
  assert.deepEqual(play(12, [
    { design: { telemetry: 'diagnostics', adapter: 'lightweight', ground: 'dual' } }, ...work('assess', 'trade', 'linkAnalysis'), { fix: 'link' },
    ...work('prelim', 'freeze', 'buildStage', 'buildAvionics', 'integrate'), ...fly,
  ]), { week: 9, spent: 165, left: 11, outcome: 'stopped', stop: 'funds', margin: 10, found: ['link by linkAnalysis'], ...grounded })
})

test('keeping both upgrades and cutting verification is a gamble the debrief can explain', () => {
  assert.deepEqual(play(4, routes.bothUpgrades), {
    week: 7, spent: 170, left: 6, outcome: 'success', stop: '', confirmation: 2, diagnostics: 1, marginProven: false, margin: 5,
    flew: ['lift 54% held', 'link 40% held'], found: [], accepted: ['lift', 'link'], forecast: { minimum: 27, noFatal: 46 }, onTime: true, verified: false,
  })
  assert.deepEqual(play(5, routes.bothUpgrades), {
    week: 7, spent: 170, left: 6, outcome: 'incomplete', stop: 'ascent', confirmation: 0, diagnostics: 0, marginProven: false, margin: -20,
    flew: ['lift 54% failed'], found: [], accepted: ['lift', 'link'], forecast: { minimum: 27, noFatal: 46 }, onTime: false, verified: false,
  })
  // The debrief names the next step for each item, its cost and what it would have told the player.
  const run = start(5)
  run.configure({ stage: 'highMargin', telemetry: 'diagnostics' })
  for (const id of ['assess', 'prelim', 'freeze', 'buildStage', 'buildAvionics', 'integrate'] as const) run.work(id)
  assert.deepEqual(run.nextStep('lift'), { work: 'trade', weeks: 1, credits: 5, found: true, known: { min: 23, max: 45 } })
  assert.deepEqual(run.nextStep('link'), { work: 'linkAnalysis', weeks: 1, credits: 4, found: false, known: null })
})

test('seed 1: an unverified link defect costs the confirmation data, and the debrief says the first test would have missed it', () => {
  const run = start(1)
  for (const id of ['assess', 'prelim', 'freeze', 'buildStage', 'buildAvionics', 'integrate'] as const) run.work(id)
  assert.deepEqual(run.nextStep('link'), { work: 'linkAnalysis', weeks: 1, credits: 4, found: false, known: null })
  assert.deepEqual(finish(run).result(), {
    week: 7, spent: 114, left: 62, outcome: 'incomplete', stop: 'pass', confirmation: 1, diagnostics: 0, marginProven: false, margin: 8,
    flew: ['lift 0% held', 'link 20% failed'], found: [], accepted: ['link'], forecast: { minimum: 80, noFatal: 100 }, onTime: false, verified: false,
  })
})

test('verifying everything to the top level misses the launch slot unless a test finds a problem first', () => {
  for (const seed of seeds.slice(0, 300)) {
    const run = strategies.everythingVerified(seed)
    const result = run.result()
    if (run.known.lift === topLevel && run.known.link.level === topLevel) assert.deepEqual([result.outcome, result.stop], ['stopped', 'deadline'])
    if (result.outcome !== 'stopped') assert.ok(result.found.length > 0 && run.known.link.level < topLevel)
  }
  assert.deepEqual(strategies.everythingVerified(4).result(), { week: 13, spent: 159, left: 17, outcome: 'stopped', stop: 'deadline', margin: 3, found: [], ...grounded })
})

test('keeping every upgrade runs out of budget before integration', () => {
  const result = play(1, [{ design: { stage: 'highMargin', telemetry: 'diagnostics', adapter: 'lightweight', ground: 'dual' } }, ...mandatory])
  assert.deepEqual(result, { week: 6, spent: 176, left: 0, outcome: 'stopped', stop: 'funds', margin: 20, found: [], ...grounded })
})

test('the borrowed lab session pays for one integration test', () => {
  const result = play(4, [...work('assess', 'prelim', 'freeze', 'buildStage', 'buildAvionics'), { work: 'integrate', lab: true }, ...fly], true)
  assert.deepEqual([result.week, result.spent, result.outcome], [7, 102, 'success'])
})

test('a different data chain is a different item: what was learned about the old one does not carry over', () => {
  const run = start(4)
  for (const id of ['assess', 'linkAnalysis', 'prelim', 'freeze', 'stationTest'] as const) run.work(id)
  assert.deepEqual([run.known.link.level, percent(run.risks().link.risk)], [2, 4])
  run.remedy('dualStation')
  assert.deepEqual([run.known.link, run.risks().link.maturity, percent(run.risks().link.risk)], [untested, 'new', 40])
})

test('the same seed and the same play give the same run, and test results agree with the flight', () => {
  for (const strategy of Object.values(strategies)) {
    for (const seed of seeds.slice(0, 100)) {
      const [first, second] = [strategy(seed), strategy(seed)]
      assert.deepEqual(first.result(), second.result())
      assert.deepEqual(first.outcomes(), second.outcomes())
    }
  }
  for (const seed of seeds.slice(0, 500)) {
    const design: Design = { ...mission.initialDesign }
    const truth = hasDefect(seed, orbitalLinkId(design), orbitalLinkMaturity(design))
    let link = untested
    for (let level = 0; level < topLevel; level += 1) link = verifyOrbitalLink(seed, design, link)
    // A test never reports a defect that is not there, and whatever the tests said, the flight follows the truth.
    if (link.found) assert.equal(truth, true)
    const flown = flyOrbital(seed, design, { lift: 0, link }, 'confirmFirst').outcomes.find(item => item.id === 'link')
    if (flown) assert.equal(flown.failed, truth)
    const fixed = flyOrbital(seed, design, { lift: 0, link: { ...link, fixed: true } }, 'confirmFirst').outcomes.find(item => item.id === 'link')
    if (fixed) assert.equal(fixed.failed, false)
    // The hot-fire figure is the figure the stage flies with.
    for (const stage of ['standard', 'highMargin'] as const) {
      const tested = orbitalRisks(seed, { ...design, stage }, { lift: topLevel, link: untested }).lift
      const flight = flyOrbital(seed, { ...design, stage }, { lift: topLevel, link: untested }, 'confirmFirst')
      assert.equal(tested.known.min, orbitalShortfall(seed, stage))
      assert.equal(flight.marginKg, tested.limit - tested.known.min)
      assert.equal(flight.outcomes[0].failed, tested.risk === 1)
    }
  }
})

test('work done on one item never changes the truth of another', () => {
  for (const seed of seeds.slice(0, 300)) {
    const plain = strategies.baselineNoTests(seed).outcomes()
    const tested = strategies.everythingVerified(seed)
    assert.equal(orbitalShortfall(seed, 'standard'), plain[0].value)
    assert.equal(tested.risks().lift.known.min, plain[0].value)
    // The untested run and the fully tested run agree on whether the link is defective.
    if (plain[1]?.failed === false) assert.equal(tested.known.link.found, false)
  }
})

test('balance: success rates over 2000 seeds stay inside the design targets', () => {
  const measured = Object.fromEntries(Object.entries(strategies).map(([name, strategy]) => [name, rate(strategy)])) as Record<keyof typeof strategies, ReturnType<typeof rate>>
  if (process.env.ORBITAL_BALANCE) console.table(measured)
  assert.ok(measured.stageWithTwoTests.minimum >= 0.85)
  assert.ok(measured.diagnosticsWithTwoTests.minimum >= 0.58)
  assert.ok(measured.bothUpgradesNoTests.minimum <= 0.3)
  assert.ok(measured.everythingVerified.launched < 0.15)
  assert.ok(measured.baselineWithTwoTests.minimum > measured.baselineNoTests.minimum + 0.1)
  // The forecast shown at flight review matches how often each strategy meets the minimum.
  for (const name of ['stageWithTwoTests', 'diagnosticsWithTwoTests', 'bothUpgradesNoTests', 'baselineNoTests', 'baselineWithTwoTests'] as const) {
    assert.ok(Math.abs(measured[name].minimum - measured[name].shown) < 0.03, `${name}: shown ${measured[name].shown}, measured ${measured[name].minimum}`)
  }
})
