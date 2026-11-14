import assert from 'node:assert/strict'
import test from 'node:test'
import { percent, topLevel } from '../src/game/risk'
import { en } from '../src/i18n/en'
import { zhTW } from '../src/i18n/zh-TW'
import {
  flyLunar, lunarAcceptance, lunarBestMargin, lunarInterface, lunarInterfaceKnown, lunarMargin, lunarMission as mission, lunarNextStep, lunarOdds,
  lunarProposals, lunarRiskIds, lunarRisks,
  type LunarDesign as Design, type LunarKnowledge, type LunarPlan as Plan, type LunarRisk as Risk,
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
  const known: LunarKnowledge = { correction: 0, landing: 0, surface: 0, interface: 0 }
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

  const run = {
    get design() { return design },
    get known() { return { ...known } },
    get credits() { return credits },
    get week() { return week },
    get slots() { return slots },
    get due() { return due() },
    get over() { return Boolean(outcome) },
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
      design = { ...design, ...change }
    },
    // slot: spend one support slot on this work. On the freeze it pays for the lightweight mount.
    work(id: WorkId, slot = false) {
      if (outcome) return false
      let { weeks, credits: cost } = mission.costs[id] as { weeks: number; credits: number }
      const step = stepOf.get(id)
      if (step) assert.equal(known[step.risk], step.level - 1, `${id} is the next verification level`)
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
      if (step) known[step.risk] = step.level
      if (id === 'contract') {
        contractWeeks += 1
        if (contractWeeks === mission.partnerships[partnership].weeks) {
          credits += mission.partnerships[partnership].milestone
          slots += mission.partnerships[partnership].supportSlots
        }
      }
      if (id === 'trade') known.interface = Math.max(known.interface, 1)
      if (id === 'freeze') frozen = true
      if (id === 'integrate' || id === 'retest') { current = true; known.interface = topLevel }
      return true
    },
    remedy(id: Remedy) {
      if (outcome) return false
      const { weeks, credits: cost } = mission.remedies[id]
      if (id === 'partnerMount') { assert.ok(slots > 0, 'support slot available'); slots -= 1 }
      if (!spend(id, weeks, cost)) return false
      // A new mount has not been weighed, and a new route has only been analyzed.
      if (id === 'mount' || id === 'partnerMount') { design = { ...design, mount: 'lightweight' }; known.interface = Math.min(known.interface, 1) }
      if (id === 'dropKit') design = { ...design, power: 'dayOnly' }
      if (id === 'reroute') { design = { ...design, route: 'lowEnergy' }; known.correction = Math.min(known.correction, 1) }
      if (id === 'basicPayload') { design = { ...design, payload: 'basic' }; known.surface = Math.min(known.surface, 1) }
      current = false
      return true
    },
    // Returns false when the review sends the spacecraft back. Risks above the review threshold are signed for.
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
    rolls: () => flight?.rolls ?? [],
    forecast: () => forecast,
    result() {
      const result = {
        week, spent, credits, due: due(), outcome, stop, delivered: flight?.delivered ?? 0, approvedWeek,
        margin: lunarMargin(design, lunarInterface(seed, design.mount)).margin,
        rolls: flight?.rolls.map(roll => `${roll.id} ${percent(roll.risk)}% ${roll.failed ? 'failed' : 'held'}`) ?? [], accepted,
        forecast: { minimum: percent(forecast.minimum), noFatal: percent(forecast.noFatal) },
      }
      if (process.env.LUNAR_ROUTES) console.log(ledger.join('\n'), '\n', result, '\n')
      return result
    },
  }
  return run
}

type Run = ReturnType<typeof start>
const build = (run: Run, ...ids: WorkId[]) => { for (const id of ids) run.work(id); return run }
const seeds = Array.from({ length: 2000 }, (_, index) => index + 1)

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
  // Funded partnership: lightweight mount after the trade study, then one step on each flight risk.
  fundingBalanced: seed => {
    const run = start(seed)
    run.sign('funding')
    build(run, 'assess', 'trade')
    run.configure({ mount: 'lightweight' })
    build(run, 'prelim', 'contract', 'contract', 'detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'descentSim', 'sensorTest', 'integrate')
    return finish(run)
  },
  // Technical partnership: slots pay for the mount, a shorter lander build and one test.
  techBalanced: seed => {
    const run = start(seed)
    run.sign('tech')
    build(run, 'assess', 'trade')
    run.configure({ mount: 'lightweight' })
    build(run, 'prelim', 'contract', 'contract', 'contract', 'detail')
    run.work('freeze', true)
    run.work('buildFlight', true)
    build(run, 'buildPayload', 'buildGround', 'descentSim')
    run.work('sensorTest', true)
    build(run, 'integrate')
    return finish(run)
  },
  fundingNoVerification: seed => {
    const run = start(seed)
    run.sign('funding')
    return finish(build(run, 'assess', 'prelim', 'contract', 'contract', 'detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'integrate'))
  },
  techNoVerification: seed => {
    const run = start(seed)
    run.sign('tech')
    build(run, 'assess', 'prelim', 'contract', 'contract', 'contract', 'detail', 'freeze')
    run.work('buildFlight', true)
    build(run, 'buildPayload', 'buildGround')
    run.work('integrate', true)
    return finish(run)
  },
  decline: seed => finish(build(start(seed), 'assess', 'prelim', 'detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'integrate')),
  everythingVerified: seed => {
    const run = start(seed)
    run.sign('funding')
    run.configure({ mount: 'lightweight' })
    build(run, 'assess', 'trade', 'navAnalysis', 'descentSim', 'thermalAnalysis', 'prelim', 'contract', 'contract', 'detail', 'freeze',
      'thrusterTest', 'sensorTest', 'thermalTest', 'buildFlight', 'buildPayload', 'buildGround', 'navRehearsal', 'rehearse', 'dayRehearsal', 'integrate')
    return finish(run)
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

test('the same seed and the same play give the same run', () => {
  for (const strategy of Object.values(strategies)) {
    for (const seed of seeds.slice(0, 60)) {
      const [first, second] = [strategy(seed), strategy(seed)]
      assert.deepEqual(first.result(), second.result())
      assert.deepEqual(first.rolls(), second.rolls())
    }
  }
})

if (process.env.LUNAR_BALANCE) console.table(Object.fromEntries(Object.entries(strategies).map(([name, strategy]) => [name, { ...rate(strategy), week: strategy(1).result().week, spent: strategy(1).result().spent }])))
