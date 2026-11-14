import assert from 'node:assert/strict'
import test from 'node:test'
import { hasDefect, percent, topLevel, untested } from '../src/game/risk'
import { en } from '../src/i18n/en'
import { zhTW } from '../src/i18n/zh-TW'
import {
  flyLunar, lunarAcceptance, lunarBestMargin, lunarCorrection, lunarDefectItem, lunarInterface, lunarInterfaceKnown, lunarMargin, lunarMission as mission,
  lunarNextStep, lunarOdds, lunarProposals, lunarRiskIds, lunarRisks, verifyLunar,
  type LunarDefect as Defect, type LunarDesign as Design, type LunarKnowledge, type LunarPlan as Plan, type LunarRisk as Risk,
} from '../src/missions/lunar-mission'

// Route checks for docs/story/lunar-mission.md. The lunar chapter is not wired into src/game/mission.ts yet.
// The risk rules live in src/missions/lunar-mission.ts. This file adds the calendar, budget and partnership rules
// written in that document and replays routes with fixed seeds.

type Partnership = keyof typeof mission.partnerships
type WorkId = keyof typeof mission.costs
type Remedy = keyof typeof mission.remedies

const stepOf = new Map<string, { risk: Risk; level: number }>(
  lunarRiskIds.flatMap(risk => mission.risks[risk].steps.map((work, index) => [work, { risk, level: index + 1 }] as const)))

function start(seed: number) {
  let design: Design = { ...mission.initialDesign }
  let known: LunarKnowledge = { interface: 0, correction: 0, landing: untested, surface: untested }
  let partnership: Partnership = 'decline'
  let week = 0
  let credits: number = mission.budget
  let spent = 0
  let deadline: number = mission.deadline
  let contractWeeks = 0
  let slots = 0
  let frozen = false
  let current = false
  let approvedWeek = 0
  let accepted: readonly Risk[] = []
  let forecast = { minimum: 0, noFatal: 0 }
  let outcome: keyof typeof mission.outcomes | undefined
  let stop = ''
  let flight: ReturnType<typeof flyLunar> | undefined
  const done = new Set<WorkId>()
  const found: string[] = []
  const ledger: string[] = []
  const due = () => deadline - mission.routes[design.route].leadWeeks

  function spend(label: string, weeks: number, cost: number) {
    if (cost > credits) { outcome = 'stopped'; stop = 'funds'; ledger.push(`${label}: needs ${cost}, has ${credits}`); return false }
    credits -= cost
    spent += cost
    const begin = week + 1
    for (let index = 0; index < weeks; index += 1) {
      week += 1
      if (week === mission.events.pullIn.afterWeek) deadline += mission.events.pullIn.deadlineChange
    }
    ledger.push(`W${weeks > 1 ? `${begin}–${week}` : weeks ? week : `${week}+`} ${label} −${cost} → ${credits}`)
    return true
  }

  // A different sensor set or payload is a different item: what was learned about the old one does not carry over.
  function redesign(next: Design) {
    if (next.sensor !== design.sensor) known = { ...known, landing: untested }
    if (next.payload !== design.payload) known = { ...known, surface: untested }
    design = next
  }

  const run = {
    get design() { return design },
    get known() { return known },
    get credits() { return credits },
    get week() { return week },
    get slots() { return slots },
    get due() { return due() },
    get over() { return Boolean(outcome) },
    has: (id: WorkId) => done.has(id),
    risks: () => lunarRisks(seed, design, known),
    odds: () => lunarOdds(seed, design, known),
    bestMargin: () => lunarBestMargin(seed, design, known),
    interfaceKnown: () => lunarInterfaceKnown(seed, design, known),
    acceptance: () => lunarAcceptance(seed, design, known),
    nextStep: (id: Risk) => lunarNextStep(seed, design, known, id),
    sign(choice: Partnership) {
      partnership = choice
      credits += mission.partnerships[choice].advance
    },
    configure(change: Partial<Design>) {
      assert.equal(frozen, false, 'design choices are free only before CDR')
      redesign({ ...design, ...change })
    },
    // slot: spend one support slot on this work. On the freeze it pays for the lightweight mount.
    work(id: WorkId, slot = false) {
      if (outcome) return false
      let { weeks, credits: cost } = mission.costs[id] as { weeks: number; credits: number }
      const step = stepOf.get(id)
      if (step) {
        const state = step.risk === 'correction' ? null : known[step.risk]
        assert.equal(state ? state.level : known.correction, step.level - 1, `${id} is the next verification level`)
        if (state) assert.ok(!state.found && !state.fixed, 'nothing left to learn about a defect that has been found')
      }
      const needs = (mission.requires as Record<string, WorkId>)[id]
      if (needs) assert.ok(done.has(needs), `${id} needs ${needs}`)
      if (id === 'prelim') assert.ok(run.bestMargin() >= 0, 'PDR needs a margin that can still cover the corrections')
      if (id === 'freeze') {
        const mount = mission.mounts[design.mount]
        cost += mission.payloads[design.payload].cost + mission.sensors[design.sensor].cost + mission.powers[design.power].cost
          + mission.routes[design.route].cost + (slot ? 0 : mount.cost)
        if (slot) { assert.ok(mount.supportSlots > 0 && slots >= mount.supportSlots, 'support slot available'); slots -= mount.supportSlots }
      } else if (slot) {
        assert.ok(slots > 0, 'support slot available')
        slots -= 1
        if (id === 'buildFlight' || id === 'integrate') { weeks -= mission.supportUses[id].weeksSaved; cost -= mission.supportUses[id].creditsSaved }
        else { assert.ok(step, 'support slots cover lander work, integration or one verification step'); cost = 0 }
      }
      if (!spend(id, weeks, cost)) return false
      done.add(id)
      if (step?.risk === 'correction') known = { ...known, correction: step.level }
      else if (step) {
        known = { ...known, [step.risk]: verifyLunar(seed, design, step.risk, known[step.risk]) }
        if (known[step.risk].found) found.push(`${step.risk} by ${id}`)
      }
      if (id === 'contract') {
        contractWeeks += 1
        if (contractWeeks === mission.partnerships[partnership].weeks) {
          credits += mission.partnerships[partnership].milestone
          slots += mission.partnerships[partnership].supportSlots
        }
      }
      if (id === 'trade') known = { ...known, interface: Math.max(known.interface, 1) }
      if (id === 'freeze') frozen = true
      if (id === 'integrate' || id === 'retest') { current = true; known = { ...known, interface: topLevel } }
      return true
    },
    // Fixing a found defect costs time and money and makes the item clean.
    fix(id: Defect) {
      if (outcome) return false
      assert.ok(known[id].found && !known[id].fixed, 'only a defect that a test found can be fixed')
      const { weeks, credits: cost } = mission.fixes[id]
      if (!spend(`fix ${id}`, weeks, cost)) return false
      known = { ...known, [id]: { ...known[id], fixed: true } }
      return true
    },
    remedy(id: Remedy) {
      if (outcome) return false
      const { weeks, credits: cost } = mission.remedies[id]
      if (id === 'partnerMount') { assert.ok(slots > 0, 'support slot available'); slots -= 1 }
      if (!spend(id, weeks, cost)) return false
      // A new mount has not been weighed, and a new route has only been analyzed.
      if (id === 'mount' || id === 'partnerMount') { design = { ...design, mount: 'lightweight' }; known = { ...known, interface: Math.min(known.interface, 1) } }
      if (id === 'dropKit') design = { ...design, power: 'dayOnly' }
      if (id === 'reroute') { design = { ...design, route: 'lowEnergy' }; known = { ...known, correction: Math.min(known.correction, 1) } }
      if (id === 'basicPayload') redesign({ ...design, payload: 'basic' })
      current = false
      return true
    },
    // Returns false when the review sends the spacecraft back. Believed risks above the threshold are signed for.
    review() {
      if (outcome) return false
      if (week > due()) { outcome = 'stopped'; stop = 'deadline'; return false }
      assert.ok(mission.gates.FRR.work.every(id => done.has(id)), 'FRR work complete')
      assert.ok(current, 'integration evidence is current')
      assert.equal(contractWeeks, mission.partnerships[partnership].weeks, 'contract delivered')
      if (run.bestMargin() < 0) return false
      accepted = run.acceptance()
      forecast = run.odds()
      approvedWeek = week
      return true
    },
    fly(plan: Plan) {
      if (outcome) return
      assert.ok(approvedWeek, 'FRR approved before flight')
      flight = flyLunar(seed, design, known, plan)
      outcome = flight.outcome
      stop = flight.stop
    },
    stopNow(reason: string) { if (!outcome) { outcome = 'stopped'; stop = reason } },
    outcomes: () => flight?.outcomes ?? [],
    forecast: () => forecast,
    result() {
      const result = {
        week, spent, credits, due: due(), outcome, stop, delivered: flight?.delivered ?? 0, approvedWeek,
        margin: lunarMargin(design, lunarInterface(seed, design.mount)).margin,
        flew: flight?.outcomes.map(item => `${item.id} ${percent(item.believed)}% ${item.failed ? 'failed' : 'held'}`) ?? [], found, accepted,
        forecast: { minimum: percent(forecast.minimum), noFatal: percent(forecast.noFatal) },
      }
      if (process.env.LUNAR_ROUTES) console.log(ledger.join('\n'), '\n', result, '\n')
      return result
    },
  }
  return run
}

type Run = ReturnType<typeof start>
const seeds = Array.from({ length: 2000 }, (_, index) => index + 1)

// Do each work in turn. When a test finds a defect, fix it if the run can still pay for and finish integration afterwards.
function build(run: Run, ...ids: (WorkId | [WorkId, 'slot'])[]) {
  for (const entry of ids) {
    const [id, slot] = typeof entry === 'string' ? [entry, false] as const : [entry[0], true] as const
    const step = stepOf.get(id)
    const defect = step && step.risk !== 'correction' ? step.risk : null
    if (defect && (run.known[defect].found || run.known[defect].fixed)) continue
    run.work(id, slot)
    if (defect && run.known[defect].found) {
      const integration = run.has('integrate') ? { weeks: 0, credits: 0 } : mission.costs.integrate
      const fix = mission.fixes[defect]
      if (run.credits >= fix.credits + integration.credits && run.week + fix.weeks + integration.weeks <= run.due) run.fix(defect)
    }
  }
  return run
}

// After the weighing, close a known shortfall with the cheapest fix the run can still afford, then review and fly.
function finish(run: Run, plan: Plan = 'extra') {
  while (!run.over && !run.review()) {
    if (run.over) break
    const before = run.week
    if (run.design.mount === 'standard' && run.slots > 0) run.remedy('partnerMount')
    else if (run.design.route === 'direct' && run.week + 2 <= run.due - mission.routes.lowEnergy.leadWeeks && run.credits >= 16) run.remedy('reroute')
    else if (run.design.mount === 'standard' && run.credits >= 26) run.remedy('mount')
    else { run.stopNow('margin'); break }
    if (run.week === before || !run.work('retest')) break
  }
  if (!run.over) run.fly(plan)
  return run
}

const strategies = {
  // Funded partnership: buys the lightweight mount, then spends two verification steps on the landing.
  fundingBalanced: seed => {
    const run = start(seed)
    run.sign('funding')
    run.configure({ mount: 'lightweight' })
    return finish(build(run, 'assess', 'descentSim', 'prelim', 'contract', 'contract', 'detail', 'freeze', 'sensorTest', 'buildFlight', 'buildPayload', 'buildGround', 'integrate'))
  },
  // Technical partnership: slots pay for the mount, a shorter lander build and one test.
  techBalanced: seed => {
    const run = start(seed)
    run.sign('tech')
    run.configure({ mount: 'lightweight' })
    return finish(build(run, 'assess', 'descentSim', 'prelim', 'contract', 'contract', 'contract', 'detail', ['freeze', 'slot'], ['sensorTest', 'slot'],
      ['buildFlight', 'slot'], 'buildPayload', 'buildGround', 'integrate'))
  },
  fundingNoVerification: seed => {
    const run = start(seed)
    run.sign('funding')
    return finish(build(run, 'assess', 'prelim', 'contract', 'contract', 'detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'integrate'))
  },
  techNoVerification: seed => {
    const run = start(seed)
    run.sign('tech')
    return finish(build(run, 'assess', 'prelim', 'contract', 'contract', 'contract', 'detail', 'freeze', ['buildFlight', 'slot'], 'buildPayload', 'buildGround', ['integrate', 'slot']))
  },
  decline: seed => finish(build(start(seed), 'assess', 'prelim', 'detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'integrate')),
  everythingVerified: seed => {
    const run = start(seed)
    run.sign('funding')
    run.configure({ mount: 'lightweight' })
    return finish(build(run, 'assess', 'trade', 'navAnalysis', 'descentSim', 'thermalAnalysis', 'prelim', 'contract', 'contract', 'detail', 'freeze',
      'thrusterTest', 'sensorTest', 'thermalTest', 'buildFlight', 'buildPayload', 'buildGround', 'navRehearsal', 'rehearse', 'dayRehearsal', 'integrate'))
  },
} satisfies Record<string, (seed: number) => Run>

function rate(strategy: (seed: number) => Run) {
  const runs = seeds.map(seed => strategy(seed))
  const results = runs.map(run => run.result())
  const share = (match: (result: typeof results[number]) => boolean) => results.filter(match).length / results.length
  return {
    minimum: share(result => result.outcome === 'extra' || result.outcome === 'success'),
    stretch: share(result => result.outcome === 'extra'),
    launched: share(result => result.outcome !== 'stopped'),
    lost: share(result => result.outcome === 'lost'),
    shown: runs.reduce((total, run) => total + run.forecast().minimum, 0) / runs.length,
  }
}

test('every lunar text key exists in both dictionaries', () => {
  const keys = new Set<string>()
  const collect = (value: unknown, key = '') => {
    if (typeof value === 'string' && ['title', 'brief', 'label', 'description', 'carried', 'pass', 'requires', 'failure'].includes(key)) keys.add(value)
    else if (value && typeof value === 'object') for (const [name, child] of Object.entries(value)) collect(child, name)
  }
  collect(mission)
  collect(lunarProposals)
  assert.ok(keys.size > 90)
  for (const key of keys) {
    assert.ok(key in en, `en is missing ${key}`)
    assert.ok(key in zhTW, `zh-TW is missing ${key}`)
  }
  assert.deepEqual(Object.keys(zhTW), Object.keys(en))
  const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
  for (const key of Object.keys(en) as (keyof typeof en)[]) assert.deepEqual(placeholders(zhTW[key]), placeholders(en[key]), key)
})

test('every verification step is a costed work, each level costs more, and at most two items can end the mission', () => {
  for (const id of lunarRiskIds) {
    const costs = mission.risks[id].steps.map(step => mission.costs[step as WorkId])
    assert.equal(costs.length, topLevel)
    for (let level = 1; level < costs.length; level += 1) assert.ok(costs[level].credits > costs[level - 1].credits)
  }
  assert.ok(Object.values(mission.risks).filter(risk => risk.severity === 'fatal').length <= 2)
  assert.ok(Object.values(mission.risks).some(risk => risk.segment === 'surface' && risk.severity === 'degraded'))
})

const routes = {
  funding: (seed: number) => strategies.fundingBalanced(seed),
  tech: (seed: number) => strategies.techBalanced(seed),
  none: (seed: number) => strategies.fundingNoVerification(seed),
  decline: (seed: number) => strategies.decline(seed),
  // Backup lidar, high-rate payload and the low-energy route leave one spare week before the earlier review date.
  backup: (seed: number, fix = false) => {
    const run = start(seed)
    run.sign('funding')
    run.configure({ payload: 'advanced', sensor: 'redundant', route: 'lowEnergy', mount: 'lightweight' })
    for (const id of ['assess', 'descentSim'] as const) run.work(id)
    if (fix && run.known.landing.found) run.fix('landing')
    for (const id of ['prelim', 'contract', 'contract', 'detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'integrate'] as const) run.work(id)
    return finish(run)
  },
  // Trade study, navigation analysis and two landing tests use every week before the review date, so a late finding leaves no time to fix it.
  late: (seed: number, fix: boolean) => {
    const run = start(seed)
    run.sign('funding')
    for (const id of ['assess', 'trade', 'navAnalysis'] as const) run.work(id)
    run.configure({ mount: 'lightweight' })
    for (const id of ['prelim', 'contract', 'contract', 'detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'integrate', 'descentSim', 'sensorTest'] as const) run.work(id)
    if (fix && run.known.landing.found) run.fix('landing')
    return finish(run)
  },
}

test('seed 4, tests that only confirm: both partnerships deliver the baseline mission', () => {
  assert.deepEqual(routes.funding(4).result(), {
    week: 16, spent: 178, credits: 32, due: 18, outcome: 'success', stop: '', delivered: 1, approvedWeek: 16, margin: 18,
    flew: ['correction 5% held', 'landing 9% held', 'surface 20% held'], found: [], accepted: ['landing', 'surface'], forecast: { minimum: 86, noFatal: 86 },
  })
  assert.deepEqual(routes.tech(4).result(), {
    week: 16, spent: 144, credits: 6, due: 18, outcome: 'success', stop: '', delivered: 1, approvedWeek: 16, margin: 18,
    flew: ['correction 5% held', 'landing 9% held', 'surface 20% held'], found: [], accepted: ['landing', 'surface'], forecast: { minimum: 86, noFatal: 86 },
  })
})

test('seed 3, bad news in time: the descent simulation finds a landing defect and both partnerships can pay for the fix', () => {
  assert.deepEqual(routes.funding(3).result(), {
    week: 16, spent: 176, credits: 34, due: 18, outcome: 'success', stop: '', delivered: 1, approvedWeek: 16, margin: 19,
    flew: ['correction 0% held', 'landing 0% held', 'surface 20% held'], found: ['landing by descentSim'], accepted: ['surface'], forecast: { minimum: 100, noFatal: 100 },
  })
  // The technical partnership ends with nothing left: the fix took its last 6 credits.
  assert.deepEqual(routes.tech(3).result(), {
    week: 16, spent: 150, credits: 0, due: 18, outcome: 'success', stop: '', delivered: 1, approvedWeek: 16, margin: 19,
    flew: ['correction 0% held', 'landing 0% held', 'surface 20% held'], found: ['landing by descentSim'], accepted: ['surface'], forecast: { minimum: 100, noFatal: 100 },
  })
})

test('seeds 16 and 13, tests can miss: the simulation passes a defect that only a deeper test catches', () => {
  // Seed 16: the hardware-in-the-loop test catches what the simulation missed. A surface defect then costs one window, not the batch.
  assert.deepEqual(routes.funding(16).result(), {
    week: 17, spent: 184, credits: 26, due: 18, outcome: 'success', stop: '', delivered: 1, approvedWeek: 17, margin: 17,
    flew: ['correction 10% held', 'landing 0% held', 'surface 20% failed'], found: ['landing by sensorTest'], accepted: ['correction', 'surface'], forecast: { minimum: 90, noFatal: 90 },
  })
  // Seed 13: both tests pass, the player believes 9%, and the single sensor fails on descent.
  assert.deepEqual(routes.funding(13).result(), {
    week: 16, spent: 178, credits: 32, due: 18, outcome: 'lost', stop: 'landing', delivered: 0, approvedWeek: 16, margin: 16,
    flew: ['correction 15% held', 'landing 9% failed'], found: [], accepted: ['correction', 'landing', 'surface'], forecast: { minimum: 77, noFatal: 77 },
  })
})

test('seed 16, bad news too late: a defect found in the last week can be flown knowingly or fixed past the deadline', () => {
  const knowingly = routes.late(16, false).result()
  assert.deepEqual([knowingly.week, knowingly.due, knowingly.outcome, knowingly.stop, knowingly.found], [18, 18, 'lost', 'landing', ['landing by sensorTest']])
  assert.ok(knowingly.flew.includes('landing 100% failed') && knowingly.accepted.includes('landing'))
  assert.equal(knowingly.forecast.minimum, 0)
  const fixed = routes.late(16, true).result()
  assert.deepEqual([fixed.week, fixed.due, fixed.outcome, fixed.stop], [19, 18, 'stopped', 'deadline'])
})

test('a backup sensor turns a known landing defect into a tilted landing, and a fix into a second batch', () => {
  // Seed 2: nothing was found, the backup takes over and the high-rate payload still returns one batch from two windows.
  assert.deepEqual(routes.backup(2).result(), {
    week: 15, spent: 202, credits: 8, due: 16, outcome: 'success', stop: '', delivered: 1, approvedWeek: 15, margin: 18,
    flew: ['correction 27% held', 'landing 25% failed', 'surface 40% held'], found: [], accepted: ['correction', 'landing', 'surface'], forecast: { minimum: 66, noFatal: 73 },
  })
  // Seed 20: the simulation finds the defect. Signing for it keeps the spare week and lands tilted.
  assert.deepEqual(routes.backup(20).result(), {
    week: 15, spent: 202, credits: 8, due: 16, outcome: 'success', stop: '', delivered: 1, approvedWeek: 15, margin: 18,
    flew: ['correction 27% held', 'landing 100% failed', 'surface 40% held'], found: ['landing by descentSim'], accepted: ['correction', 'landing', 'surface'], forecast: { minimum: 44, noFatal: 73 },
  })
  // Fixing it uses the last week and the last credits, and the upright landing reaches the stretch goal.
  assert.deepEqual(routes.backup(20, true).result(), {
    week: 16, spent: 208, credits: 2, due: 16, outcome: 'extra', stop: '', delivered: 2, approvedWeek: 16, margin: 18,
    flew: ['correction 27% held', 'landing 0% held', 'surface 40% held'], found: ['landing by descentSim'], accepted: ['correction', 'surface'], forecast: { minimum: 73, noFatal: 73 },
  })
})

test('the trade study and the weighing narrow the interface mass, and analysis can bring good news about the reserve', () => {
  const run = start(1)
  run.work('assess')
  assert.deepEqual([run.interfaceKnown(), percent(run.risks().correction.risk)], [{ min: 10, max: 20 }, 70])
  run.work('trade')
  // Bad news before the freeze: the standard mount is in the heavy half. Changing mounts is still free.
  assert.deepEqual([run.interfaceKnown(), percent(run.risks().correction.risk)], [{ min: 16, max: 20 }, 85])
  run.configure({ mount: 'lightweight' })
  assert.deepEqual([run.interfaceKnown(), percent(run.risks().correction.risk)], [{ min: 3, max: 4 }, 13])
  // Good news on another run: analysis puts the corrections inside the reserve, so no deeper navigation test is needed.
  const lucky = start(28)
  lucky.configure({ mount: 'lightweight' })
  lucky.work('assess')
  assert.equal(percent(lucky.risks().correction.risk), 8)
  lucky.work('navAnalysis')
  assert.deepEqual([lucky.risks().correction.known, lucky.risks().correction.risk], [{ min: 0, max: 9 }, 0])
})

test('without optional verification the run rests on luck, and the debrief says what each first test would have shown', () => {
  assert.deepEqual(routes.none(5).result(), {
    week: 14, spent: 150, credits: 60, due: 18, outcome: 'success', stop: '', delivered: 1, approvedWeek: 14, margin: 5,
    flew: ['correction 70% held', 'landing 40% held', 'surface 20% held'], found: [], accepted: ['correction', 'landing', 'surface'], forecast: { minimum: 18, noFatal: 18 },
  })
  assert.deepEqual(routes.none(1).result(), {
    week: 14, spent: 150, credits: 60, due: 18, outcome: 'lost', stop: 'transfer', delivered: 0, approvedWeek: 14, margin: 4,
    flew: ['correction 75% failed'], found: [], accepted: ['correction', 'landing', 'surface'], forecast: { minimum: 15, noFatal: 15 },
  })
  const run = start(1)
  run.sign('funding')
  for (const id of ['assess', 'prelim', 'contract', 'contract', 'detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'integrate'] as const) run.work(id)
  assert.deepEqual(run.interfaceKnown(), { min: 16, max: 16 })
  assert.deepEqual(run.nextStep('correction'), { work: 'navAnalysis', weeks: 1, credits: 4, found: true, known: { min: 10, max: 19 } })
  assert.deepEqual(run.nextStep('landing'), { work: 'descentSim', weeks: 1, credits: 4, found: false, known: null })
})

test('declining both offers leaves no budget for verification or fixes', () => {
  assert.deepEqual(routes.decline(8).result(), {
    week: 12, spent: 150, credits: 0, due: 18, outcome: 'lost', stop: 'landing', delivered: 0, approvedWeek: 12, margin: 10,
    flew: ['correction 45% held', 'landing 40% failed'], found: [], accepted: ['correction', 'landing', 'surface'], forecast: { minimum: 33, noFatal: 33 },
  })
  assert.deepEqual(routes.decline(5).result(), {
    week: 12, spent: 150, credits: 0, due: 18, outcome: 'success', stop: '', delivered: 1, approvedWeek: 12, margin: 5,
    flew: ['correction 70% held', 'landing 40% held', 'surface 20% held'], found: [], accepted: ['correction', 'landing', 'surface'], forecast: { minimum: 18, noFatal: 18 },
  })
  // One analysis step would cost 4 credits the run does not have.
  const run = build(start(5), 'assess', 'prelim', 'detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'descentSim', 'integrate')
  assert.deepEqual([run.result().outcome, run.result().stop], ['stopped', 'funds'])
})

test('verifying everything to the top level never reaches flight review', () => {
  for (const seed of seeds.slice(0, 300)) assert.equal(strategies.everythingVerified(seed).result().outcome, 'stopped')
  const result = strategies.everythingVerified(4).result()
  assert.deepEqual([result.week, result.due, result.spent, result.outcome], [21, 18, 206, 'stopped'])
})

test('the same seed and the same play give the same run, and test results agree with the flight', () => {
  for (const strategy of Object.values(strategies)) {
    for (const seed of seeds.slice(0, 60)) {
      const [first, second] = [strategy(seed), strategy(seed)]
      assert.deepEqual(first.result(), second.result())
      assert.deepEqual(first.outcomes(), second.outcomes())
    }
  }
  const design: Design = { ...mission.initialDesign, sensor: 'redundant' }
  for (const seed of seeds.slice(0, 500)) {
    const known: LunarKnowledge = { interface: topLevel, correction: topLevel, landing: untested, surface: untested }
    for (const id of ['landing', 'surface'] as const) for (let level = 0; level < topLevel; level += 1) known[id] = verifyLunar(seed, design, id, known[id])
    const flight = flyLunar(seed, design, known, 'extra')
    // The revealed values are the values flown.
    assert.equal(lunarRisks(seed, design, known).correction.known.min, lunarCorrection(seed, design.route))
    assert.equal(flight.outcomes[0].failed, lunarRisks(seed, design, known).correction.risk === 1)
    assert.equal(flight.margin, lunarMargin(design, lunarInterfaceKnown(seed, design, known).min).margin)
    for (const id of ['landing', 'surface'] as const) {
      const { item, maturity } = lunarDefectItem(design, id)
      const truth = hasDefect(seed, item, maturity)
      // A test never reports a defect that is not there, and whatever the tests said, the flight follows the truth.
      if (known[id].found) assert.equal(truth, true)
      const flown = flight.outcomes.find(entry => entry.id === id)
      if (flown) assert.equal(flown.failed, truth)
    }
    const fixed = flyLunar(seed, design, { ...known, landing: { ...known.landing, fixed: true }, surface: { ...known.surface, fixed: true } }, 'extra')
    assert.ok(fixed.outcomes.slice(1).every(entry => !entry.failed))
  }
})

test('balance: success rates over 2000 seeds stay inside the design targets', () => {
  const measured = Object.fromEntries(Object.entries(strategies).map(([name, strategy]) => [name, rate(strategy)])) as Record<keyof typeof strategies, ReturnType<typeof rate>>
  if (process.env.LUNAR_BALANCE) console.table(measured)
  for (const name of ['fundingBalanced', 'techBalanced'] as const) assert.ok(measured[name].minimum >= 0.8 && measured[name].minimum <= 0.9, name)
  for (const name of ['fundingNoVerification', 'techNoVerification'] as const) assert.ok(measured[name].minimum <= 0.25, name)
  assert.ok(measured.decline.minimum >= 0.05 && measured.decline.minimum <= 0.2)
  assert.equal(measured.everythingVerified.launched, 0)
  // The forecast shown at flight review matches how often each strategy meets the minimum.
  for (const name of ['fundingBalanced', 'techBalanced', 'fundingNoVerification', 'techNoVerification', 'decline'] as const) {
    assert.ok(Math.abs(measured[name].minimum - measured[name].shown) < 0.03, `${name}: shown ${measured[name].shown}, measured ${measured[name].minimum}`)
  }
})
