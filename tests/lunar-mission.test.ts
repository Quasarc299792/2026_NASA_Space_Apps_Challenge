import assert from 'node:assert/strict'
import test from 'node:test'
import { en } from '../src/i18n/en'
import { zhTW } from '../src/i18n/zh-TW'
import { lunarMission as mission, lunarProposals } from '../src/missions/lunar-mission'

// Route checks for docs/story/lunar-mission.md. The lunar chapter is not wired into src/game/mission.ts yet,
// so this file replays each documented route against the mission data with the rules written in that document.

type Design = {
  payload: keyof typeof mission.payloads
  sensor: keyof typeof mission.sensors
  power: keyof typeof mission.powers
  route: keyof typeof mission.routes
  mount: keyof typeof mission.mounts
}
type Partnership = keyof typeof mission.partnerships
type WorkId = keyof typeof mission.costs
type Remedy = keyof typeof mission.remedies
type Waiver = keyof typeof mission.waivers
type Plan = keyof typeof mission.surfacePlans
type Step =
  | { sign: Partnership }
  | { design: Partial<Design> }
  | { work: WorkId; slot?: boolean; mountSlot?: boolean }
  | { remedy: Remedy }
  | { review: readonly Waiver[] }
  | { fly: Plan }

function mass(design: Design, measured: boolean) {
  const dry = mission.busDryKg + mission.payloads[design.payload].massKg + mission.sensors[design.sensor].massKg
    + mission.powers[design.power].massKg + (measured ? mission.mounts[design.mount].growthKg : 0)
  const loaded = mission.launchAllocationKg - dry
  return { dry, loaded, margin: loaded - mission.routes[design.route].propellantKg }
}

function play(steps: readonly Step[]) {
  let design: Design = { ...mission.initialDesign }
  let partnership: Partnership = 'decline'
  let week = 0
  let credits: number = mission.budget
  let spent = 0
  let deadline: number = mission.deadline
  let contractWeeks = 0
  let slots = 0
  let trade = false
  let frozen = false
  let evidence: ReturnType<typeof mass> | undefined
  let rehearsed = false
  let waivers: readonly Waiver[] = []
  let approvedWeek = 0
  let outcome: keyof typeof mission.outcomes | undefined
  let stop = ''
  let delivered = 0
  const done = new Set<WorkId>()
  const ledger: string[] = []
  const due = () => deadline - mission.routes[design.route].leadWeeks

  function spend(label: string, weeks: number, cost: number) {
    if (cost > credits) { outcome = 'stopped'; stop = 'funds'; ledger.push(`${label}: needs ${cost}, has ${credits}`); return false }
    credits -= cost
    spent += cost
    const start = week + 1
    for (let index = 0; index < weeks; index += 1) {
      week += 1
      if (week === mission.events.pullIn.afterWeek) deadline += mission.events.pullIn.deadlineChange
    }
    ledger.push(`W${weeks > 1 ? `${start}–${week}` : weeks ? week : `${week}+`} ${label} −${cost} → ${credits}`)
    return true
  }

  for (const step of steps) {
    if (outcome) break
    if ('sign' in step) {
      partnership = step.sign
      credits += mission.partnerships[partnership].advance
      ledger.push(`sign ${partnership} +${mission.partnerships[partnership].advance} → ${credits}`)
    } else if ('design' in step) {
      assert.equal(frozen, false, 'design choices are free only before CDR')
      design = { ...design, ...step.design }
    } else if ('work' in step) {
      const { weeks, credits: cost } = mission.costs[step.work]
      const support = step.slot && (step.work === 'buildFlight' || step.work === 'integrate') ? mission.supportUses[step.work] : undefined
      if (support) { assert.ok(slots > 0, 'support slot available'); slots -= 1 }
      let hardware = 0
      if (step.work === 'freeze') {
        const mount = mission.mounts[design.mount]
        if (step.mountSlot) { assert.ok(slots >= mount.supportSlots, 'support slot available'); slots -= mount.supportSlots }
        hardware = mission.payloads[design.payload].cost + mission.sensors[design.sensor].cost + mission.powers[design.power].cost
          + mission.routes[design.route].cost + (step.mountSlot ? 0 : mount.cost)
      }
      if (step.work === 'prelim') assert.ok(mass(design, trade).margin >= mission.reserveKg, 'PDR needs estimated margin')
      if (!spend(step.work, weeks - (support?.weeksSaved ?? 0), cost - (support?.creditsSaved ?? 0) + hardware)) break
      done.add(step.work)
      if (step.work === 'contract') {
        contractWeeks += 1
        if (contractWeeks === mission.partnerships[partnership].weeks) {
          credits += mission.partnerships[partnership].milestone
          slots += mission.partnerships[partnership].supportSlots
          ledger.push(`contract delivered +${mission.partnerships[partnership].milestone} → ${credits}, support slots ${slots}`)
        }
      }
      if (step.work === 'trade') trade = true
      if (step.work === 'freeze') frozen = true
      if (step.work === 'integrate' || step.work === 'retest') evidence = mass(design, true)
      if (step.work === 'rehearse') rehearsed = true
    } else if ('remedy' in step) {
      const { weeks, credits: cost } = mission.remedies[step.remedy]
      if (step.remedy === 'partnerMount') { assert.ok(slots > 0, 'support slot available'); slots -= 1 }
      if (!spend(step.remedy, weeks, cost)) break
      if (step.remedy === 'mount' || step.remedy === 'partnerMount') design = { ...design, mount: 'lightweight' }
      if (step.remedy === 'dropKit') design = { ...design, power: 'dayOnly' }
      if (step.remedy === 'reroute') design = { ...design, route: 'lowEnergy' }
      if (step.remedy === 'basicPayload') design = { ...design, payload: 'basic' }
      evidence = undefined
    } else if ('review' in step) {
      if (week > due()) { outcome = 'stopped'; stop = 'deadline'; break }
      assert.ok(mission.gates.FRR.work.every((work) => done.has(work)), 'FRR work complete')
      assert.ok(evidence, 'integration evidence is current')
      assert.equal(contractWeeks, mission.partnerships[partnership].weeks, 'contract delivered')
      assert.ok(evidence.margin >= 0, 'propellant covers the route')
      assert.equal(evidence.margin < mission.reserveKg, step.review.includes('reserve'), 'reserve waiver matches margin')
      assert.equal(!rehearsed, step.review.includes('rehearsal'), 'rehearsal waiver matches evidence')
      waivers = step.review
      approvedWeek = week
    } else {
      assert.ok(approvedWeek, 'FRR approved before flight')
      const margin = mass(design, true).margin
      if (margin < mission.routes[design.route].correctionKg) { outcome = 'lost'; stop = 'transfer'; break }
      if (!rehearsed && !mission.sensors[design.sensor].backup) { outcome = 'lost'; stop = 'landing'; break }
      const plan = mission.surfacePlans[step.fly]
      const payload = mission.payloads[design.payload]
      const windows = (rehearsed ? mission.daylightWindows : mission.degradedWindows) + mission.powers[design.power].nightWindows - plan.reservedWindows
      const batches = Math.max(0, Math.min(payload.maxBatches, Math.floor(windows / (payload.collectWindows + mission.downlinkWindows))))
      delivered = plan.deliverAll ? batches : Math.min(batches, mission.minimumBatches)
      outcome = delivered >= mission.stretchBatches ? 'extra' : delivered >= mission.minimumBatches ? 'success' : 'noData'
    }
  }
  if (process.env.LUNAR_ROUTES) console.log(ledger.join('\n'), '\n', { week, spent, credits, due: due(), outcome, stop, delivered, waivers, ...mass(design, true) }, '\n')
  return { week, spent, credits, due: due(), outcome, stop, delivered, approvedWeek, margin: mass(design, true).margin }
}

const work = (...ids: WorkId[]): Step[] => ids.map((id) => ({ work: id }))

test('every lunar text key exists in both dictionaries', () => {
  const keys = new Set<string>()
  const collect = (value: unknown, key = '') => {
    if (typeof value === 'string' && ['title', 'brief', 'label', 'description', 'carried', 'pass', 'requires'].includes(key)) keys.add(value)
    else if (value && typeof value === 'object') for (const [name, child] of Object.entries(value)) collect(child, name)
  }
  collect(mission)
  collect(lunarProposals)
  assert.ok(keys.size > 80)
  for (const key of keys) {
    assert.ok(key in en, `en is missing ${key}`)
    assert.ok(key in zhTW, `zh-TW is missing ${key}`)
  }
  assert.deepEqual(Object.keys(zhTW), Object.keys(en))
  const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
  for (const key of Object.keys(en) as (keyof typeof en)[]) assert.deepEqual(placeholders(zhTW[key]), placeholders(en[key]), key)
})

test('funded partnership delivers the baseline mission without a track record', () => {
  const result = play([
    { sign: 'funding' }, ...work('assess', 'trade'), { design: { mount: 'lightweight' } }, ...work('prelim', 'contract', 'contract', 'detail', 'freeze',
      'buildFlight', 'buildPayload', 'buildGround', 'integrate', 'rehearse'), { review: [] }, { fly: 'extra' },
  ])
  assert.deepEqual(result, { week: 16, spent: 172, credits: 38, due: 18, outcome: 'success', stop: '', delivered: 1, approvedWeek: 16, margin: 12 })
})

test('technical partnership delivers the baseline mission without a track record', () => {
  const result = play([
    { sign: 'tech' }, ...work('assess', 'trade'), { design: { mount: 'lightweight' } }, ...work('prelim', 'contract', 'contract', 'contract', 'detail'),
    { work: 'freeze', mountSlot: true }, { work: 'buildFlight', slot: true }, ...work('buildPayload', 'buildGround', 'integrate', 'rehearse'),
    { review: [] }, { fly: 'extra' },
  ])
  assert.deepEqual(result, { week: 16, spent: 146, credits: 4, due: 18, outcome: 'success', stop: '', delivered: 1, approvedWeek: 16, margin: 12 })
})

test('high-rate payload on the low-energy route reaches the stretch goal on either partnership', () => {
  const funded = play([
    { sign: 'funding' }, ...work('assess', 'trade'), { design: { payload: 'advanced', route: 'lowEnergy', mount: 'lightweight' } },
    ...work('prelim', 'contract', 'contract', 'detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'integrate', 'rehearse'),
    { review: [] }, { fly: 'extra' },
  ])
  assert.deepEqual(funded, { week: 16, spent: 192, credits: 18, due: 16, outcome: 'extra', stop: '', delivered: 2, approvedWeek: 16, margin: 20 })
  const tech = play([
    { sign: 'tech' }, { design: { payload: 'advanced', route: 'lowEnergy' } }, ...work('assess', 'prelim', 'contract', 'contract', 'contract', 'detail', 'freeze'),
    { work: 'buildFlight', slot: true }, ...work('buildPayload', 'buildGround'), { work: 'integrate', slot: true }, ...work('rehearse'),
    { review: [] }, { fly: 'extra' },
  ])
  assert.deepEqual(tech, { week: 14, spent: 150, credits: 0, due: 16, outcome: 'extra', stop: '', delivered: 2, approvedWeek: 14, margin: 12 })
})

test('an untested interface can still be recovered on both partnerships', () => {
  const funded = play([
    { sign: 'funding' }, ...work('assess', 'prelim', 'contract', 'contract', 'detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'integrate'),
    { remedy: 'mount' }, ...work('retest', 'rehearse'), { review: [] }, { fly: 'extra' },
  ])
  assert.deepEqual(funded, { week: 17, spent: 176, credits: 34, due: 18, outcome: 'success', stop: '', delivered: 1, approvedWeek: 17, margin: 12 })
  const tech = play([
    { sign: 'tech' }, ...work('assess', 'prelim', 'contract', 'contract', 'contract', 'detail', 'freeze'), { work: 'buildFlight', slot: true },
    ...work('buildPayload', 'buildGround', 'integrate'), { remedy: 'partnerMount' }, ...work('retest', 'rehearse'), { review: [] }, { fly: 'extra' },
  ])
  assert.deepEqual(tech, { week: 17, spent: 150, credits: 0, due: 18, outcome: 'success', stop: '', delivered: 1, approvedWeek: 17, margin: 12 })
})

test('dropping the kit and waiving the rehearsal lands on the backup sensor without enough power for data', () => {
  const result = play([
    { sign: 'funding' }, { design: { sensor: 'redundant', power: 'extended', route: 'lowEnergy' } },
    ...work('assess', 'prelim', 'contract', 'contract', 'detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'integrate'),
    { remedy: 'dropKit' }, ...work('retest'), { review: ['rehearsal'] }, { fly: 'extra' },
  ])
  assert.deepEqual(result, { week: 16, spent: 184, credits: 26, due: 16, outcome: 'noData', stop: '', delivered: 0, approvedWeek: 16, margin: 16 })
})

test('reserving surface windows for diagnostics leaves the baseline payload short', () => {
  const result = play([
    { sign: 'funding' }, ...work('assess', 'trade'), { design: { mount: 'lightweight' } }, ...work('prelim', 'contract', 'contract', 'detail', 'freeze',
      'buildFlight', 'buildPayload', 'buildGround', 'integrate', 'rehearse'), { review: [] }, { fly: 'diagnostics' },
  ])
  assert.equal(result.outcome, 'noData')
})

test('declining both offers leaves too little budget to close the propellant reserve', () => {
  const steps: Step[] = work('assess', 'prelim', 'detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'integrate', 'rehearse')
  const transfer = play([...steps, { review: ['reserve'] }, { fly: 'priority' }])
  assert.deepEqual(transfer, { week: 13, spent: 150, credits: 0, due: 18, outcome: 'lost', stop: 'transfer', delivered: 0, approvedWeek: 13, margin: 4 })
  const landing = play([{ design: { route: 'lowEnergy' } }, ...steps.slice(0, -1), { review: ['rehearsal'] }, { fly: 'priority' }])
  assert.deepEqual(landing, { week: 12, spent: 146, credits: 4, due: 16, outcome: 'lost', stop: 'landing', delivered: 0, approvedWeek: 12, margin: 22 })
  const complete = play([{ design: { route: 'lowEnergy' } }, ...steps])
  assert.equal(complete.stop, 'funds')
})

test('overspending on hardware or running past the deadline ends without a launch', () => {
  const funds = play([
    { sign: 'tech' }, { design: { payload: 'advanced', sensor: 'redundant', route: 'lowEnergy' } },
    ...work('assess', 'prelim', 'contract', 'contract', 'contract', 'detail', 'freeze'), { work: 'buildFlight', slot: true },
    ...work('buildPayload', 'buildGround'), { work: 'integrate', slot: true },
  ])
  assert.deepEqual(funds, { week: 12, spent: 142, credits: 8, due: 16, outcome: 'stopped', stop: 'funds', delivered: 0, approvedWeek: 0, margin: 6 })
  const deadline = play([
    { sign: 'funding' }, { design: { payload: 'advanced', power: 'extended', route: 'lowEnergy' } },
    ...work('assess', 'prelim', 'contract', 'contract', 'detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'integrate'),
    { remedy: 'dropKit' }, ...work('retest', 'rehearse'), { review: [] },
  ])
  assert.deepEqual(deadline, { week: 17, spent: 196, credits: 14, due: 16, outcome: 'stopped', stop: 'deadline', delivered: 0, approvedWeek: 0, margin: 12 })
})
