import { availableWeeks, currentEvidence, optionCost } from '../game/mission'
import type { Copy, CostItem, Design, Game, MissionRules } from '../game/types'
import { topLevel, untested } from '../game/risk'
import {
  approvedWeek, completed, evidenceFor, freezeDesign, optionGroup, reviseDesign, riskIssue, verificationCopy,
} from './chapter'
import {
  flyOrbital, orbitalAcceptance, orbitalBestMargin, orbitalCarried, orbitalLaunch as mission, orbitalRiskIds, orbitalRisks,
  orbitalUnknown, sameOrbitalLink, verifyOrbitalLink, type OrbitalDesign, type OrbitalKnowledge, type OrbitalPlan,
} from './orbital-launch'

type State = OrbitalKnowledge & { lab: boolean }
type Task = NonNullable<MissionRules['tasks']>[string]
type Remedy = keyof typeof mission.remedies
export const orbitalState = (game: Game) => game.missionState as State
const designOf = (game: Game) => game.design as OrbitalDesign
const seed = (game: Game) => game.seed ?? 0
const set = (game: Game, change: Partial<State>): Game => ({ ...game, missionState: { ...orbitalState(game), ...change } })
const margin = (game: Game) => orbitalBestMargin(seed(game), designOf(game), orbitalState(game))

const costs: Record<string, CostItem> = { ...mission.costs, ...mission.remedies, fixLink: mission.fixes.link }
const tasks: Record<string, Task> = {}

function task(id: string, ready: (game: Game) => boolean, complete: Task['complete'], detail?: Task['detail']) {
  tasks[id] = { plan: game => ready(game) ? costs[id] : null, complete, detail }
}

function configure(game: Game, design: Design) {
  const before = designOf(game)
  const after = design as OrbitalDesign
  return set({ ...game, design }, {
    ...(before.stage !== after.stage && { lift: 0 }),
    ...(!sameOrbitalLink(before, after) && { link: untested }),
  })
}

const pdr = (game: Game): Copy => margin(game) < 0
  ? { message: 'orbitalPdrReturn', values: { count: -margin(game) } }
  : { message: 'orbitalPdrPass', values: { count: margin(game) } }

task('assess', game => game.stage === 'feasibility', game => ({ ...game, stage: 'design', gate: 'PDR' }), () => ({ message: 'orbitalMdrPass' }))
task('prelim', game => game.stage === 'design' && !completed(game, 'prelim'), game => game)
tasks.freeze = {
  plan: game => game.stage === 'design' && game.gate === 'CDR' ? {
    ...costs.freeze, credits: costs.freeze.credits + optionCost(orbitalRules, game.design),
  } : null,
  complete: freezeDesign, detail: () => ({ message: 'orbitalCdrPass' }),
}

const production = mission.gates.FRR.work.filter(id => id !== 'integrate')
for (const id of production) task(id, game => game.stage === 'build' && !completed(game, id), game =>
  production.every(other => other === id || completed(game, other)) ? { ...game, stage: 'integration' } : game)

function integrate(game: Game): Game {
  const d = designOf(game)
  return { ...game, stage: 'review', returned: false, evidence: evidenceFor(game,
    [margin(game) >= 0, mission.grounds[d.ground].capacity >= mission.confirmationUnits], { carried: orbitalCarried(d) }) }
}

task('integrate', game => game.stage === 'integration' && !game.evidence, integrate)
task('retest', game => game.stage === 'integration' && Boolean(game.evidence), integrate)
task('wait', () => true, game => game)

for (const risk of orbitalRiskIds) {
  mission.risks[risk].steps.forEach((id, index) => {
    const needs = (mission.requires as Partial<Record<string, string>>)[id]
    task(id, game => {
      const known = orbitalState(game)
      return completed(game, 'assess') && (!needs || completed(game, needs)) &&
        (risk === 'lift' ? known.lift === index : known.link.level === index && !known.link.found && !known.link.fixed)
    }, game => risk === 'lift' ? set(game, { lift: index + 1 })
      : set(game, { link: verifyOrbitalLink(seed(game), designOf(game), orbitalState(game).link) }),
    (_, after) => {
      if (risk === 'link') return verificationCopy(orbitalState(after).link)
      const { known } = orbitalRisks(seed(after), designOf(after), orbitalState(after)).lift
      return { message: index + 1 === topLevel ? 'riskRevealed' : 'riskRange', values: { ...known, value: known.min, unit: 'kg' } }
    })
  })
}

task('fixLink', game => orbitalState(game).link.found && !orbitalState(game).link.fixed,
  game => set(game, { link: { ...orbitalState(game).link, fixed: true } }), () => ({ message: 'riskFixed' }))

const remedies: Record<Remedy, (design: OrbitalDesign) => OrbitalDesign | null> = {
  adapter: design => design.adapter === 'standard' ? { ...design, adapter: 'lightweight' } : null,
  dropDiagnostics: design => design.telemetry === 'diagnostics' ? { ...design, telemetry: 'basic' } : null,
  dualStation: design => design.ground === 'single' ? { ...design, ground: 'dual' } : null,
}
for (const [id, remedy] of Object.entries(remedies)) {
  task(id, game => (game.stage === 'build' || game.stage === 'integration' || game.stage === 'review') && remedy(designOf(game)) !== null, game => {
    const design = remedy(designOf(game))!
    return reviseDesign(configure(game, design), design)
  })
}

for (const id of ['integrate', 'rehearse'] as const) {
  const labId = `lab:${id}`
  costs[labId] = { ...costs[id], credits: costs[id].credits - mission.labSlot.uses[id].creditsSaved }
  tasks[labId] = {
    plan: game => orbitalState(game).lab && game.week < mission.labSlot.expiresWeek && tasks[id].plan(game) ? costs[labId] : null,
    start: game => set(game, { lab: false }),
    complete: tasks[id].complete,
    detail: tasks[id].detail,
  }
}

function result(game: Game, choice: OrbitalPlan) {
  return flyOrbital(seed(game), designOf(game), orbitalState(game), choice)
}

export const orbitalRules: MissionRules = {
  id: mission.id, title: mission.title, brief: mission.brief, deadline: mission.deadline, budget: mission.budget,
  playMinutes: mission.playMinutes, initialDesign: mission.initialDesign,
  dialogue: 'orbitalBriefDialogue',
  groups: {
    stage: optionGroup('orbitalStage', mission.stages, option => ({ capacity: option.capacityKg, ...option.shortfallKg })),
    telemetry: optionGroup('orbitalTelemetry', mission.telemetry, option => ({ mass: option.massKg, units: option.diagnosticUnits })),
    adapter: optionGroup('orbitalAdapter', mission.adapters, option => ({ mass: option.massKg })),
    ground: optionGroup('orbitalGroundPlan', mission.grounds, option => ({ capacity: option.capacity, degraded: option.degradedCapacity })),
  },
  costs, tasks, configure,
  initialize: game => ({ ...game, missionState: { ...orbitalUnknown, lab: false } }),
  validSave: game => {
    const state = orbitalState(game)
    return Boolean(state && Number.isInteger(state.lift) && state.lift >= 0 && state.lift <= topLevel && state.link &&
      Number.isInteger(state.link.level) && state.link.level >= 0 && state.link.level <= topLevel && typeof state.lab === 'boolean')
  },
  stageDetails: {
    feasibility: 'orbitalFeasibilityDetail', design: 'orbitalDesignDetail', build: 'orbitalBuildDetail',
    integration: 'orbitalIntegrationDetail', review: 'orbitalReviewDetail', flight: 'orbitalFlightDetail',
  },
  outcomes: { stopped: mission.outcomes.stopped.label, extra: mission.outcomes.extra.label, success: mission.outcomes.success.label, partial: mission.outcomes.incomplete.label },
  reputation: { minimum: 1, stretch: 1 },
  events: [
    { id: 'foundLink', title: 'orbitalRiskLink', detail: 'riskTestFound',
      trigger: game => orbitalState(game).link.found && !orbitalState(game).link.fixed,
      choices: [{ id: 'continue', label: 'orbitalEventAcknowledge', detail: 'lunarFoundOptions', apply: game => game }] },
    { id: 'lab', title: 'orbitalLabSlot', detail: 'orbitalLabSlotDetail', values: () => ({ week: mission.labSlot.expiresWeek }),
      trigger: game => game.week === 0 && game.records.includes('cubesat:partnerVerified'),
      choices: [
        { id: 'accept', label: 'orbitalLabSlot', detail: 'orbitalLabSlotDialogue', apply: game => set(game, { lab: true }) },
        { id: 'decline', label: 'orbitalLabSlotDecline', detail: 'orbitalEventAcknowledge', apply: game => game },
      ] },
    { id: 'budgetCut', title: 'orbitalEventCutTitle', detail: 'orbitalBudgetUpdate',
      values: game => ({ before: game.credits, after: Math.max(0, game.credits + mission.events.budgetCut.budgetChange) }),
      trigger: game => game.week >= mission.events.budgetCut.afterWeek,
      choices: [{ id: 'acknowledge', label: 'orbitalEventAcknowledge', detail: 'orbitalEventCutOptions',
        apply: game => ({ ...game, credits: game.credits + mission.events.budgetCut.budgetChange }) }] },
  ],
  reviews: {
    PDR: game => !completed(game, 'prelim') ? null : {
      issues: margin(game) < 0 ? [{ detail: pdr(game) }] : [], approve: pdr(game), return: pdr(game),
    },
    FRR: (game, evidence) => {
      const d = designOf(game)
      const risks = orbitalRisks(seed(game), d, orbitalState(game))
      const capacity = mission.grounds[d.ground].capacity
      const issues = orbitalAcceptance(seed(game), d, orbitalState(game)).filter(id => id !== 'lift' || margin(game) >= 0)
        .map(id => riskIssue(id, mission.risks[id].label, risks[id].risk, risks[id].severity))
      if (!evidence) issues.unshift({ detail: { message: 'orbitalFrrReturnEvidence' } })
      if (margin(game) < 0) issues.unshift({ detail: { message: 'orbitalFrrReturnMargin', values: { count: -margin(game) } } })
      if (capacity < mission.confirmationUnits) issues.unshift({ detail: { message: 'orbitalFrrReturnData', values: { capacity, required: mission.confirmationUnits } } })
      return { issues, approve: { message: 'chapterFrrApproved' }, return: { message: 'orbitalFrrReturn' } }
    },
  },
  stopReason: game => {
    if (game.stage === 'review' && !game.returned && currentEvidence(game)) return null
    if (availableWeeks(game) === 0 && (game.stage !== 'design' || game.gate !== 'PDR' || game.returned || !completed(game, 'prelim'))) return 'deadline'
    if (game.stage === 'feasibility' && game.credits < costs.assess.credits) return 'funds'
    if (game.stage === 'design' && game.credits < (completed(game, 'prelim') ? costs.freeze.credits + optionCost(orbitalRules, mission.initialDesign) : costs.prelim.credits)) return 'funds'
    if (game.stage === 'build' && game.credits < production.filter(id => !completed(game, id)).reduce((total, id) => total + costs[id].credits, 0)) return 'funds'
    if (game.stage === 'integration' && game.credits < (game.evidence ? costs.retest.credits : orbitalState(game).lab && game.week < mission.labSlot.expiresWeek ? costs['lab:integrate'].credits : costs.integrate.credits)) return 'funds'
    return null
  },
  segmentedFlight: {
    segments: [
      {
        id: 'ascent', title: 'orbitalAscentTitle', brief: () => ({ message: 'orbitalAscentCarried' }),
        resolve: ({ game }) => {
          const flight = result(game, 'confirmFirst')
          const report: Copy = flight.stop === 'ascent'
            ? { message: 'orbitalAscentFail', values: { shortfall: flight.outcomes[0].value!, margin: flight.outcomes[0].limit! } }
            : { message: flight.marginProven ? 'orbitalAscentProven' : 'orbitalAscentPass',
              values: { margin: flight.marginKg, threshold: mission.marginStretchKg } }
          return { failed: flight.stop === 'ascent', report }
        },
      },
      {
        id: 'pass', title: 'orbitalPassTitle', brief: ({ game }) => ({ message: 'orbitalPassDetail', values: { count: result(game, 'confirmFirst').capacity } }),
        choices: ({ game }) => (Object.keys(mission.passPlans) as OrbitalPlan[])
          .filter(id => id === 'confirmFirst' || mission.telemetry[designOf(game).telemetry].diagnosticUnits > 0)
          .map(id => ({ id, label: mission.passPlans[id].label, detail: { message: mission.passPlans[id].description,
            values: { confirmation: mission.confirmationUnits, diagnostics: mission.telemetry[designOf(game).telemetry].diagnosticUnits } } })),
        resolve: ({ game }, choice) => {
          const { confirmation, diagnostics } = result(game, choice as OrbitalPlan)
          return { report: { message: 'orbitalPassReceipt', values: { confirmation, diagnostics } } }
        },
      },
    ],
    finish: ({ game, progress }) => {
      const choice = (progress.steps.at(-1)?.choice ?? 'confirmFirst') as OrbitalPlan
      const flight = result(game, choice)
      return { ...flight, choice, delivered: flight.outcome !== 'incomplete', stretch: flight.outcome === 'extra' }
    },
  },
  records: game => {
    if (!game.flight?.delivered) return []
    const knowledge = orbitalState(game)
    return [
      ...((approvedWeek(game) ?? Infinity) <= mission.onTimeWeek ? ['onTime'] : []),
      ...(knowledge.lift > 0 && knowledge.link.level > 0 && knowledge.lift + knowledge.link.level >= mission.verifiedLevels ? ['verified'] : []),
    ]
  },
}

