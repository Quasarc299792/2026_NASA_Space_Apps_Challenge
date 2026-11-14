import { availableWeeks, currentEvidence, optionCost, pendingWorkId, stop } from '../game/mission'
import { defectBelief, topLevel, verifyDefect } from '../game/risk'
import type { Copy, Cost, CostItem, Design, Game, MissionEvent, MissionFile, MissionRules, Review } from '../game/types'
import { completed, evidenceFor, freezeDesign, optionGroup, reviseDesign, riskIssue, verificationCopy } from './chapter'
import {
  lunarAcceptance, lunarDevDeck, lunarFlightRisks, lunarItemId, lunarMass, lunarMaturity,
  lunarMission as mission, lunarRiskIds, lunarSeverity, lunarUntested, type LunarDesign, type LunarRisk, type LunarStates,
} from './lunar-mission'
import { lunarSegments } from './lunar-flight'

type Task = NonNullable<MissionRules['tasks']>[string]
type Partner = 'funding' | 'tech'
type Contract = { kind: Partner; weeks: number; left: number; milestone: number; slots: number; ended: boolean; late: boolean }
type State = {
  contract: Contract | null; slots: number; extraKg: number; delay: number; secondPayload: boolean; interfaceDue: boolean
  governmentCold: boolean; grant: boolean; icd: 'reviewed' | 'open' | null; deckIndex: number
}
const initial: State = {
  contract: null, slots: 0, extraKg: 0, delay: 0, secondPayload: false, interfaceDue: false,
  governmentCold: false, grant: false, icd: null, deckIndex: 0,
}
export const lunarState = (game: Game) => game.missionState as State
export const lunarDesign = (game: Game) => game.design as LunarDesign
export const lunarStates = (game: Game): LunarStates => ({ ...lunarUntested(), ...game.risks })
function lunarRisksReady(game: Game) {
  return lunarRiskIds.every(id => {
    const risk = game.risks[id]
    return risk === undefined || Boolean(risk && Number.isInteger(risk.level) && risk.level >= 0 && risk.level <= topLevel
      && typeof risk.found === 'boolean' && typeof risk.fixed === 'boolean')
  })
}
const set = (game: Game, change: Partial<State>): Game => ({ ...game, missionState: { ...lunarState(game), ...change } })
const active = (game: Game) => Boolean(lunarState(game).contract && !lunarState(game).contract?.ended)
const frozen = (game: Game) => game.stage === 'build' || game.stage === 'integration' || game.stage === 'review'
const massKnown = (game: Game) => completed(game, 'trade') || Boolean(currentEvidence(game))
export const massBudget = (game: Game, measured = massKnown(game)) => lunarMass(lunarDesign(game), lunarState(game).extraKg, measured)

export function missionFile(item: { file: MissionFile['detail']['message']; history: readonly string[] }): MissionFile {
  const sources = mission.sources as Record<string, { source: string; url: string }>
  return { title: { message: 'lunarMissionFile' }, detail: { message: item.file },
    sources: item.history.map(id => sources[id]).filter(Boolean).map(({ source, url }) => ({ title: source, url })) }
}

function configure(game: Game, design: Design) {
  const before = lunarDesign(game)
  const after = design as LunarDesign
  const changed = lunarRiskIds.filter(id => lunarItemId(before, id) !== lunarItemId(after, id))
  const risks = Object.fromEntries(Object.entries(game.risks).filter(([id]) => !changed.includes(id as LunarRisk)))
  return { ...game, design, risks }
}

function redesign(game: Game, design: LunarDesign): Game {
  if (Object.keys(design).every(key => design[key as keyof LunarDesign] === game.design[key])) return game
  const next = configure(game, design)
  return frozen(game) ? reviseDesign(next, design) : { ...next, ...(game.stage === 'design' && { gate: 'PDR', returned: false }) }
}

function sign(game: Game, kind: Partner, late: boolean) {
  const terms = late ? mission.latePartnerships[kind] : mission.partnerships[kind]
  const earlyPayment = kind === 'funding' && !late && game.records.includes('onTime') ? mission.records.onTime.advanceShift : 0
  const extraSlot = kind === 'tech' && !late && game.records.includes('verified') ? mission.records.verified.supportSlots : 0
  return set({ ...game, credits: game.credits + terms.advance + earlyPayment }, {
    contract: { kind, left: terms.weeks, weeks: terms.weeks, milestone: terms.milestone - earlyPayment,
      slots: terms.supportSlots + extraSlot, ended: false, late },
  })
}

function verify(game: Game, id: LunarRisk) {
  const d = lunarDesign(game)
  const state = lunarStates(game)[id]
  const result = verifyDefect(game.seed, lunarItemId(d, id), lunarMaturity(d, id), state)
  return { ...game, risks: { ...game.risks, [id]: result } }
}

const highestRisk = (game: Game) => {
  const design = lunarDesign(game)
  const states = lunarStates(game)
  return [...lunarFlightRisks].filter(id => !states[id].found && !states[id].fixed && states[id].level < topLevel)
    .sort((a, b) => defectBelief(lunarMaturity(design, b), states[b]) - defectBelief(lunarMaturity(design, a), states[a]))[0]
}

const costs: Record<string, CostItem> = { ...mission.costs, ...mission.remedies }
const tasks: Record<string, Task> = {}
function task(id: string, ready: (game: Game) => boolean, complete: Task['complete'], detail?: Task['detail']) {
  tasks[id] = { plan: game => ready(game) ? costs[id] : null, complete, detail }
}
function support(id: string, label: CostItem['label'], change: (cost: Cost) => Cost, ready = (_game: Game) => true) {
  const key = `support:${id}`
  costs[key] = { ...change(costs[id]), label }
  tasks[key] = {
    plan: game => {
      const cost = tasks[id].plan(game)
      return cost && lunarState(game).slots > 0 && ready(game) ? change(cost) : null
    },
    start: game => set(game, { slots: lunarState(game).slots - 1 }),
    complete: tasks[id].complete, detail: tasks[id].detail,
  }
}

const production = ['buildFlight', 'buildPayload', 'buildGround'] as const
const mainline = ['assess', 'prelim', 'detail', 'freeze', ...production, 'integrate'] as const
export function lunarPlanCost(game: Game, design = game.design) {
  const state = lunarState(game)
  const remaining = mainline.filter(id => !completed(game, id) && pendingWorkId(game)?.split(':').at(-1) !== id)
  const jobs = remaining.reduce((sum, id) => ({
    weeks: sum.weeks + costs[id].weeks + (id === 'buildFlight' ? state.delay : 0),
    credits: sum.credits + costs[id].credits + (id === 'freeze' ? optionCost(lunarRules, design) : 0),
  }), { weeks: Number(state.interfaceDue), credits: 0 })
  const retestDue = Boolean(game.evidence && !currentEvidence(game) && pendingWorkId(game) !== 'retest')
  return { weeks: jobs.weeks + (retestDue ? costs.retest.weeks : 0), credits: jobs.credits + (retestDue ? costs.retest.credits : 0) }
}

task('assess', game => game.stage === 'feasibility', game => ({ ...game, stage: 'design', gate: 'PDR' }), () => ({ message: 'lunarMdrPass' }))
task('trade', game => !frozen(game) && !completed(game, 'trade'), game => game)
task('prelim', game => game.stage === 'design' && !completed(game, 'prelim'), game => game)
task('detail', game => game.stage === 'design' && game.gate === 'CDR' && !completed(game, 'detail'), game => game)
tasks.freeze = {
  plan: game => game.stage === 'design' && game.gate === 'CDR' && completed(game, 'detail')
    ? { weeks: costs.freeze.weeks, credits: costs.freeze.credits + optionCost(lunarRules, game.design) } : null,
  complete: freezeDesign, detail: () => ({ message: 'lunarCdrPass' }),
}

for (const id of production) {
  task(id, game => game.stage === 'build' && !completed(game, id), game =>
    production.every(other => other === id || completed(game, other)) ? { ...game, stage: 'integration' } : game)
}
const flightPlan = tasks.buildFlight.plan
tasks.buildFlight.plan = game => {
  const cost = flightPlan(game)
  return cost && { ...cost, weeks: cost.weeks + lunarState(game).delay }
}

function integrate(game: Game): Game {
  const mass = massBudget(game, true)
  return { ...game, stage: 'review', returned: false, evidence: evidenceFor(game,
    [mass.margin >= 0, mass.margin >= mission.reserveKg], { ...mass, mount: mission.mounts[lunarDesign(game).mount].growthKg }) }
}

task('integrate', game => game.stage === 'integration' && !game.evidence && !lunarState(game).interfaceDue, integrate)
task('retest', game => game.stage === 'integration' && Boolean(game.evidence) && !lunarState(game).interfaceDue, integrate)
task('secondInterface', game => lunarState(game).interfaceDue, game => set(game, { interfaceDue: false }))
task('wait', () => true, game => game)

task('contract', game => active(game) && Boolean(lunarState(game).contract?.left), game => {
  const state = lunarState(game)
  const contract = { ...state.contract!, left: state.contract!.left - 1 }
  return set({ ...game, credits: game.credits + (contract.left === 0 ? contract.milestone : 0) },
    { contract, slots: state.slots + (contract.left === 0 ? contract.slots : 0) })
})
for (const kind of ['funding', 'tech'] as const) {
  const id = `contract:${kind}`
  costs[id] = { ...mission.partnerships[kind], weeks: 0, credits: 0 }
  task(id, game => game.stage === 'design' && game.gate === 'PDR' && game.events.includes('offers:decline') && !lunarState(game).contract,
    game => sign(game, kind, false))
}

support('buildFlight', mission.supportUses.buildFlight.label, cost => ({ weeks: cost.weeks - 1, credits: cost.credits - 10 }))
support('integrate', mission.supportUses.integrate.label, cost => ({ weeks: cost.weeks - 1, credits: cost.credits - 10 }))
support('freeze', mission.supportUses.mount.label, cost => ({ ...cost, credits: cost.credits - mission.mounts.lightweight.cost }),
  game => lunarDesign(game).mount === 'lightweight')

for (const id of lunarRiskIds) {
  const item = mission.risks[id]
  item.steps.forEach((step, index) => {
    task(step, game => {
      const state = lunarStates(game)[id]
      const needs = ['assess', item.unitNeeds, 'integrate'][index]
      return completed(game, needs) && (index < 2 || Boolean(currentEvidence(game))) && state.level === index && !state.found && !state.fixed
    }, game => verify(game, id), (_, after) => verificationCopy(lunarStates(after)[id], item.found))
    support(step, costs[step].label, cost => ({ ...cost, credits: 0 }))
  })
  const fix = `fix:${id}`
  costs[fix] = mission.fix
  task(fix, game => lunarStates(game)[id].found && !lunarStates(game)[id].fixed,
    game => ({ ...game, risks: { ...game.risks, [id]: { ...lunarStates(game)[id], fixed: true } } }),
    () => ({ message: 'lunarRiskRestored' }))
}

const remedies = {
  mount: (d: LunarDesign) => d.mount === 'standard' ? { ...d, mount: 'lightweight' as const } : null,
  partnerMount: (d: LunarDesign) => d.mount === 'standard' ? { ...d, mount: 'lightweight' as const } : null,
  dropKit: (d: LunarDesign) => d.power === 'extended' ? { ...d, power: 'dayOnly' as const } : null,
  reroute: (d: LunarDesign) => d.route === 'direct' ? { ...d, route: 'lowEnergy' as const } : null,
  basicPayload: (d: LunarDesign) => d.payload === 'advanced' ? { ...d, payload: 'basic' as const } : null,
  addLidar: (d: LunarDesign) => d.sensor === 'single' ? { ...d, sensor: 'redundant' as const } : null,
}
for (const [id, remedy] of Object.entries(remedies)) {
  task(id, game => frozen(game) && Boolean(remedy(lunarDesign(game))) &&
    (id !== 'partnerMount' || lunarState(game).slots > 0) &&
    (id !== 'reroute' || availableWeeks(game) >= costs[id].weeks + mission.routes.lowEnergy.leadWeeks + Number(Boolean(game.evidence))),
  game => redesign(id === 'partnerMount' ? set(game, { slots: lunarState(game).slots - 1 }) : game, remedy(lunarDesign(game))!))
}

type DevCard = typeof mission.devCards[number] | typeof mission.storyEvents[number]
type DevId = DevCard['id']
function cardReady(game: Game, id: DevId) {
  const state = lunarState(game)
  if (id === 'Camera' || id === 'Review') return active(game) && state.contract?.left === 0 &&
    (id === 'Camera' ? state.contract.kind === 'funding' : state.contract.kind === 'tech')
  if (id === 'SecondOffer') return game.week === mission.secondOfferWeek && !active(game)
  const slot = (mission.drawWeeks as readonly number[]).indexOf(game.week)
  if (slot < 0 || game.log.some(entry => entry.week === game.week && mission.devCards.some(card => card.id === entry.event))) return false
  const deck = lunarDevDeck(game.seed)
  if (slot === deck.pullInSlot) return id === 'PullIn'
  return deck.order.slice(state.deckIndex).find(candidate => eligibleCard(game, candidate)) === id
}

function eligibleCard(game: Game, id: DevId) {
  const state = lunarState(game)
  switch (id) {
    case 'PartnerExit': return active(game) && Boolean(state.contract?.left)
    case 'CostReview': return game.credits < lunarPlanCost(game).credits
    case 'SecondPayload': return Boolean(state.contract && !state.contract.ended && !state.governmentCold && !state.secondPayload && !game.evidence && pendingWorkId(game)?.split(':').at(-1) !== 'integrate')
    case 'SupplierDelay': return !completed(game, 'buildFlight')
    case 'IcdMismatch': return !game.evidence
    default: return true
  }
}

function chooseCard(game: Game, id: DevId, choice: string, effect: DevCard['choices'][number]['effect']): Game {
  const state = lunarState(game)
  let next = { ...game, credits: game.credits + (effect.credits ?? 0), deadline: game.deadline + (effect.deadline ?? 0) }
  if (id !== 'PullIn' && id !== 'Camera' && id !== 'Review' && id !== 'SecondOffer') {
    const index = lunarDevDeck(game.seed).order.indexOf(id)
    next = set(next, { deckIndex: index + 1 })
  }
  if (effect.massKg) {
    next = set(next, { extraKg: state.extraKg + effect.massKg })
    if (currentEvidence(game)) next = reviseDesign(next, next.design)
  }
  if (effect.slots) next = set(next, { slots: state.slots + effect.slots })
  if (effect.weeks && id !== 'SupplierDelay') {
    if (next.pendingWork) {
      const work = next.pendingWork
      next = { ...next, pendingWork: { ...work, remaining: work.remaining + effect.weeks, cost: { ...work.cost, weeks: work.cost.weeks + effect.weeks } } }
    } else {
      next = { ...next, week: next.week + effect.weeks }
    }
  }
  if (id === 'PartnerExit') {
    const contract = state.contract!
    next = set(next, { contract: { ...contract, ended: true } })
    if (pendingWorkId(next) === 'contract') {
      const { pendingWork, ...rest } = next
      next = { ...rest, log: [...rest.log, { id: 'contract', week: next.week, cost: 0, design: next.design, incomplete: true }] }
    }
    if (choice === 'Switch') return sign(next, contract.kind === 'funding' ? 'tech' : 'funding', true)
    if (choice === 'Negotiate') return set({ ...next, credits: next.credits + (contract.kind === 'funding' ? 10 : 0) },
      { slots: state.slots + (contract.kind === 'tech' ? 1 : 0) })
  }
  if (id === 'CostReview') {
    if (choice === 'Stop') return stop(next, 'cancelled')
    if (choice === 'Grant') return set(next, { grant: true })
    const d = lunarDesign(game)
    const paid = frozen(game) || pendingWorkId(game)?.split(':').at(-1) === 'freeze'
    const refund = paid ? (mission.payloads[d.payload].cost - mission.payloads.basic.cost + mission.powers[d.power].cost) / 2 : 0
    return redesign({ ...next, credits: next.credits + refund }, { ...d, payload: 'basic', power: 'dayOnly' })
  }
  if (id === 'SecondOffer') {
    if (choice === 'Funding' || choice === 'Tech') return sign(next, choice === 'Funding' ? 'funding' : 'tech', true)
    if (choice === 'Government') return set(next, { secondPayload: true, interfaceDue: true })
  }
  if (id === 'SecondPayload' && choice !== 'Decline') return set(next, { secondPayload: true, interfaceDue: choice === 'Accept' })
  if (id === 'PullIn' && choice === 'Refuse') return set(next, { governmentCold: true })
  if (id === 'SupplierDelay' && choice === 'Wait') {
    const work = next.pendingWork
    return work && pendingWorkId(next)?.split(':').at(-1) === 'buildFlight'
      ? { ...next, pendingWork: { ...work, remaining: work.remaining + 1, cost: { ...work.cost, weeks: work.cost.weeks + 1 } } }
      : set(next, { delay: state.delay + 1 })
  }
  if (id === 'PartsAlert' && choice !== 'Fly') return verify(next, 'thrusters')
  if (id === 'IcdMismatch') return choice === 'Review' ? set(verify(next, 'software'), { icd: 'reviewed' }) : set(next, { icd: 'open' })
  if (id === 'Review' && choice === 'UseSlot') return verify(next, highestRisk(game))
  return next
}

function toEvent(card: DevCard): MissionEvent {
  return {
    id: card.id, title: card.title, detail: card.detail, file: missionFile(card), quote: card.quote,
    trigger: game => cardReady(game, card.id),
    values: game => ({ week: game.week }),
    subject: game => card.id === 'Review' ? mission.risks[highestRisk(game) ?? 'software'].label : undefined,
    choices: card.choices.map(({ id, label, detail, result, effect }) => ({
      id, label, detail,
      result: game => ({ message: result, values: { week: game.deadline, kg: effect.massKg ?? 0 } }),
      values: game => ({
        credits: Math.abs(effect.credits ?? (card.id === 'PartnerExit' ? 10 : card.id === 'SecondOffer' ? 30 : 0)),
        kg: effect.massKg ?? 0, weeks: Math.abs(effect.weeks ?? effect.deadline ?? (card.id === 'SecondOffer' ? 2 : 0)),
        count: 1, week: game.deadline + (effect.deadline ?? 0), slots: lunarState(game).slots,
      }),
      available: game => {
        const state = lunarState(game)
        const costCut = card.id === 'CostReview' && id === 'Cut'
        const design = lunarDesign(game)
        return (!costCut || design.payload !== 'basic' || design.power !== 'dayOnly') && game.credits + (effect.credits ?? 0) >= 0 && state.slots + (effect.slots ?? 0) >= 0
          && (card.id !== 'SecondOffer' || id !== 'Government' || (!state.governmentCold && !state.secondPayload && !game.evidence && pendingWorkId(game)?.split(':').at(-1) !== 'integrate'))
          && (card.id !== 'Review' || id !== 'UseSlot' || Boolean(highestRisk(game)))
          && (!effect.weeks || card.id === 'SupplierDelay' || availableWeeks(game) >= effect.weeks + (game.pendingWork?.remaining ?? 0))
      },
      apply: game => chooseCard(game, card.id, id, effect),
    })),
  }
}

function pdr(game: Game): Review | null {
  if (!completed(game, 'prelim')) return null
  const margin = massBudget(game).margin
  const returned: Copy = { message: 'lunarPropellantPdr', values: { margin, threshold: mission.reserveKg } }
  return { issues: margin >= mission.reserveKg ? [] : [{ detail: returned }],
    approve: { message: 'lunarPdrPass', values: { count: margin } }, return: returned }
}

function frr(game: Game): Review {
  const state = lunarState(game)
  const d = lunarDesign(game)
  const risks = lunarStates(game)
  const margin = massBudget(game, true).margin
  const issues: Review['issues'][number][] = []
  if (!currentEvidence(game)) issues.push({ detail: { message: 'lunarFrrReturnEvidence' } })
  if (margin < 0) issues.push({ detail: { message: 'lunarFrrReturnMass', values: { count: -margin } } })
  else if (margin < mission.reserveKg) {
    const waiver = { id: 'reserve', label: mission.waivers.reserve.label,
      detail: { message: mission.waivers.reserve.description, values: { margin, need: mission.reserveKg } } }
    issues.push({ detail: waiver.detail, waiver })
  }
  if (active(game) && state.contract!.left > 0) issues.push({ detail: { message: 'lunarFrrReturnContract', values: { count: state.contract!.left } } })
  if (state.interfaceDue) issues.push({ detail: { message: 'lunarInterfacePending' } })
  if (state.grant && risks.descent.level < mission.checkedLevel) issues.push({ detail: { message: 'lunarGrantCondition' } })
  issues.push(...lunarAcceptance(d, risks).map(id => riskIssue(id, mission.risks[id].label, defectBelief(lunarMaturity(d, id), risks[id]), lunarSeverity(d, id))))
  return { issues, approve: { message: 'chapterFrrApproved' }, return: { message: 'lunarFrrReturn' } }
}

export const lunarRules: MissionRules = {
  id: mission.id, title: mission.title, brief: mission.brief, dialogue: 'lunarBriefDialogue',
  deadline: mission.deadline, budget: mission.budget, playMinutes: mission.playMinutes, initialDesign: mission.initialDesign,
  groups: {
    payload: optionGroup('lunarPayload', mission.payloads, option => ({ mass: option.massKg, windows: option.collectWindows, batches: option.maxBatches })),
    sensor: optionGroup('lunarSensor', mission.sensors, option => ({ mass: option.massKg })),
    power: optionGroup('lunarPower', mission.powers, option => ({ mass: option.massKg, windows: option.nightWindows || mission.daylightWindows })),
    route: optionGroup('lunarRoute', mission.routes, option => ({ propellant: option.propellantKg, min: option.correctionKg, max: option.correctionKg, weeks: option.leadWeeks })),
    mount: optionGroup('lunarMount', mission.mounts, option => ({ min: option.growthKg, max: option.growthKg, slots: option.supportSlots })),
  },
  costs, tasks, configure, initialize: game => ({ ...game, missionState: initial }),
  validSave: game => {
    const state = lunarState(game)
    const decisions = game.flightProgress?.state.decisions
    return Boolean(state && Number.isInteger(state.deckIndex) && typeof state.slots === 'number' && typeof state.extraKg === 'number'
      && (decisions === undefined || (Array.isArray(decisions) && decisions.every(item => typeof item === 'string'))) && lunarRisksReady(game))
  },
  effectiveDeadline: game => game.deadline - mission.routes[lunarDesign(game).route].leadWeeks,
  stageDetails: { feasibility: 'lunarFeasibilityDetail', design: 'lunarDesignDetail', build: 'lunarBuildDetail',
    integration: 'lunarIntegrationDetail', review: 'lunarReviewDetail', flight: 'lunarFlightDetail' },
  outcomes: { stopped: mission.outcomes.stopped.label, extra: mission.outcomes.extra.label, success: mission.outcomes.success.label, partial: mission.outcomes.noData.label },
  reputation: { minimum: 1, stretch: 1 },
  events: [
    { id: 'offers', title: 'lunarOfferTitle', detail: 'lunarOfferIntro', trigger: game => game.week === 0,
      choices: (['funding', 'tech', 'decline'] as const).map(id => ({
        id, label: mission.partnerships[id].label, detail: mission.partnerships[id].description,
        values: game => ({
          weeks: mission.partnerships[id].weeks, budget: mission.budget,
          advance: mission.partnerships[id].advance + (id === 'funding' && game.records.includes('onTime') ? 10 : 0),
          milestone: mission.partnerships[id].milestone - (id === 'funding' && game.records.includes('onTime') ? 10 : 0),
          slots: mission.partnerships[id].supportSlots + (id === 'tech' && game.records.includes('verified') ? 1 : 0),
        }),
        apply: game => id === 'decline' ? game : sign(game, id, false),
      })) },
    ...mission.devCards.map(toEvent), ...mission.storyEvents.map(toEvent),
    ...lunarRiskIds.map((id): MissionEvent => ({
      id: `found:${id}`, title: mission.risks[id].label, detail: mission.risks[id].found, file: missionFile(mission.risks[id]),
      trigger: (game: Game) => lunarStates(game)[id].found && !lunarStates(game)[id].fixed,
      choices: [{ id: 'continue', label: 'lunarEventAcknowledge', detail: 'lunarFoundOptions', apply: (game: Game) => game }],
    })),
  ],
  reviews: { PDR: pdr, FRR: frr },
  stopReason: game => {
    if (game.stage === 'review' && !game.returned && currentEvidence(game)) return null
    if (availableWeeks(game) === 0 && !(game.stage === 'design' && game.gate === 'PDR' && !game.returned && completed(game, 'prelim'))) return 'deadline'
    if (!frozen(game) || game.stage === 'review') return null
    if (game.week < mission.secondOfferWeek && !active(game)) return null
    if (game.week < mission.drawWeeks[mission.drawWeeks.length - 1] && !game.evidence) return null
    const required = Object.entries(tasks).filter(([id]) => mainline.some(work => id === work || id === `support:${work}`) || id === 'secondInterface' || id === 'retest')
      .map(([, task]) => task.plan(game)).filter((cost): cost is Cost => cost !== null)
    if (required.length && required.every(cost => cost.credits > game.credits)) return 'funds'
    return null
  },
  segmentedFlight: lunarSegments,
}
