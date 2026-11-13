import { cubeSat as mission } from '../missions/cubesat'

export type Design = {
  payload: keyof typeof mission.payloads
  supply: keyof typeof mission.supplies
  schedule: keyof typeof mission.schedules
  radio: keyof typeof mission.radios
}

export const initialDesign: Design = { payload: 'basic', supply: 'standard', schedule: 'overlap', radio: 'compliant' }
export const reviewDesign: Design = { ...initialDesign, payload: 'advanced' }
export const remedies = ['stagger', 'basic', 'reinforced', 'compliant'] as const
export type Remedy = typeof remedies[number]
export const multiplayerRemedies = ['stagger', 'basic', 'reinforced'] as const
export type MultiplayerRemedy = typeof multiplayerRemedies[number]
export type Cost = { weeks: number; credits: number }
export type Stage = 'feasibility' | 'design' | 'build' | 'integration' | 'review' | 'flight' | 'results'
export type Gate = 'MDR' | 'PDR' | 'CDR' | 'FRR'

export function forecast(design: Design) {
  const payload = mission.payloads[design.payload]
  const supply = mission.supplies[design.supply]
  const schedule = mission.schedules[design.schedule]
  const radio = mission.radios[design.radio]
  const combined = mission.busWatts + payload.watts + mission.downlinkWatts
  const separate = mission.busWatts + Math.max(payload.watts, mission.downlinkWatts)
  const peak = design.schedule === 'overlap' ? combined : separate
  const capacity = Math.min(mission.groundCapacity, radio.groundCapacity)
  return {
    payloadWatts: payload.watts, peak, available: supply.watts, deficit: Math.max(0, peak - supply.watts),
    batches: Math.max(0, Math.min(payload.batches - schedule.batchLoss, capacity)),
  }
}

export function testDesign(design: Design) {
  const designForecast = forecast(design)
  const firstTx = mission.radios[design.radio].firstTxMinutes
  const ditl = {
    separation: mission.ditl.separationMinutes,
    deploy: mission.ditl.deployMinutes,
    firstTx,
    elapsed: firstTx - mission.ditl.separationMinutes,
    threshold: mission.ditl.minQuietMinutes,
  }
  return {
    design, ...designForecast, ditl,
    powerPass: designForecast.deficit === 0,
    ditlPass: ditl.elapsed >= ditl.threshold,
    dataPass: designForecast.deficit === 0 && designForecast.batches >= mission.minimumBatches,
  }
}

type Evidence = ReturnType<typeof testDesign> & { week: number; revision: number }
export function passes(evidence: ReturnType<typeof testDesign>) {
  return evidence.powerPass && evidence.ditlPass && evidence.dataPass
}

export function applyRemedy(design: Design, remedy: Remedy): Design {
  switch (remedy) {
    case 'stagger': return { ...design, schedule: 'stagger' }
    case 'basic': return { ...design, payload: 'basic', schedule: 'overlap' }
    case 'reinforced': return { ...design, supply: 'reinforced', schedule: 'overlap' }
    case 'compliant': return { ...design, radio: 'compliant' }
  }
}

export function resolveTeamReview(remedy: MultiplayerRemedy) {
  const correction = mission.costs[remedy]
  const retest = mission.costs.integrate
  return {
    evidence: testDesign(applyRemedy(reviewDesign, remedy)),
    weeks: correction.weeks + retest.weeks,
    credits: correction.credits + retest.credits,
  }
}

const stageWork = { feasibility: 'assess', design: 'freeze', build: 'build', integration: 'integrate' } as const
type Work = keyof typeof mission.costs
type LogId = Work | 'return' | 'approve' | 'operate' | 'analysisClear' | 'analysisConflict'
export type Entry = { id: LogId; week: number; cost: number; design: Design; report?: Evidence }
type Analysis = { design: Design; forecast: ReturnType<typeof forecast> }
export type FlightChoice = 'priority' | 'extra'
export type Flight = { choice: FlightChoice; batches: number; stretch: boolean; firstTx: number }
type Stop = 'deadline' | 'funds' | 'cancelled'

export type Game = {
  missionId: typeof mission.id
  stage: Stage
  week: number
  credits: number
  design: Design
  revision: number
  gate: Gate
  analysis: Analysis | null
  evidence: Evidence | null
  flight: Flight | null
  stop: Stop | null
  returned: boolean
  log: Entry[]
}

export type Action =
  | { type: 'configure'; design: Design }
  | { type: 'work' | 'analyze' | 'review' | 'wait' | 'cancel' }
  | { type: 'repair'; remedy: Remedy }
  | { type: 'fly'; choice: FlightChoice }

export function newGame(): Game {
  return {
    missionId: mission.id, stage: 'feasibility', week: 0, credits: mission.budget, design: initialDesign,
    revision: 0, gate: 'MDR', analysis: null, evidence: null, flight: null, stop: null, returned: false, log: [],
  }
}

export function availableWeeks(game: Game) {
  return mission.deadline - game.week
}

export function affordable(game: Game, cost: Cost) {
  return availableWeeks(game) >= cost.weeks && game.credits >= cost.credits
}

export function workCost(game: Game, work: Work): Cost {
  const cost = mission.costs[work]
  if (work !== 'freeze') return cost
  return {
    ...cost,
    credits: cost.credits + mission.payloads[game.design.payload].cost + mission.supplies[game.design.supply].cost,
  }
}

export function currentWork(game: Game) {
  return game.stage in stageWork ? stageWork[game.stage as keyof typeof stageWork] : null
}

export function canConfigure(game: Game) {
  return game.stage === 'feasibility' || game.stage === 'design'
}

export function sameDesign(a: Design, b: Design) {
  return a.payload === b.payload && a.supply === b.supply && a.schedule === b.schedule && a.radio === b.radio
}

export function currentEvidence(game: Game) {
  return game.evidence?.revision === game.revision ? game.evidence : null
}

export function repairOptions(game: Game) {
  const estimate = testDesign(game.design)
  return remedies.filter(remedy => {
    if (remedy === 'compliant') return !estimate.ditlPass
    const changed = testDesign(applyRemedy(game.design, remedy))
    return (changed.deficit < estimate.deficit && changed.dataPass)
      || (!estimate.dataPass && changed.dataPass && changed.powerPass)
  })
}

function record(game: Game, id: LogId, cost = 0, report?: Evidence): Game {
  return { ...game, log: [...game.log, { id, week: game.week, cost, design: game.design, ...(report ? { report } : {}) }] }
}

function spend(game: Game, work: Work, cost = workCost(game, work)): Game {
  return record({ ...game, week: game.week + cost.weeks, credits: game.credits - cost.credits }, work, cost.credits)
}

function stop(game: Game, reason: Stop): Game {
  return { ...game, stage: 'results', stop: reason }
}

function checkResources(game: Game): Game {
  if (game.stage === 'review' || game.stage === 'flight' || game.stage === 'results') return game
  if (availableWeeks(game) === 0) return stop(game, 'deadline')
  const work = currentWork(game)
  if (work && game.stage !== 'design' && game.credits < workCost(game, work).credits) return stop(game, 'funds')
  if (game.stage === 'design') {
    const cheapest = workCost({ ...game, design: initialDesign }, 'freeze')
    if (game.credits < cheapest.credits) return stop(game, 'funds')
  }
  return game
}

function doWork(game: Game): Game {
  const work = currentWork(game)
  if (!work || !affordable(game, workCost(game, work))) return game
  const next = spend(game, work)
  switch (work) {
    case 'assess': return checkResources({ ...next, stage: 'design', gate: 'PDR' })
    case 'freeze': return checkResources({ ...next, stage: 'build', gate: 'CDR' })
    case 'build': return checkResources({ ...next, stage: 'integration' })
    case 'integrate': {
      const evidence = { ...testDesign(game.design), week: next.week, revision: next.revision }
      return {
        ...next, stage: 'review', evidence, returned: false,
        log: [...next.log.slice(0, -1), { ...next.log[next.log.length - 1], report: evidence }],
      }
    }
  }
}

export function runMission(game: Game, action: Action): Game {
  if (game.stage === 'results') return game
  switch (action.type) {
    case 'configure':
      return canConfigure(game) && !sameDesign(game.design, action.design) ? { ...game, design: action.design } : game
    case 'work':
      return doWork(game)
    case 'analyze': {
      if (!canConfigure(game) || (game.analysis && sameDesign(game.analysis.design, game.design))
        || !affordable(game, mission.costs.analyze)) return game
      const result = forecast(game.design)
      const next = spend(game, 'analyze')
      return checkResources({
        ...next, analysis: { design: game.design, forecast: result },
        log: [...next.log.slice(0, -1), { ...next.log[next.log.length - 1], id: result.deficit ? 'analysisConflict' : 'analysisClear' }],
      })
    }
    case 'review': {
      const evidence = currentEvidence(game)
      if (game.stage !== 'review' || !evidence || game.returned) return game
      if (passes(evidence)) return record({ ...game, stage: 'flight', gate: 'FRR' }, 'approve', 0, evidence)
      const returned = record({ ...game, returned: true }, 'return', 0, evidence)
      if (!availableWeeks(game)) return stop(returned, 'deadline')
      if (game.credits < mission.costs.integrate.credits) return stop(returned, 'funds')
      return returned
    }
    case 'repair': {
      const cost = mission.costs[action.remedy]
      if (game.stage !== 'review' || !game.returned || !repairOptions(game).includes(action.remedy) || !affordable(game, cost)) return game
      const design = applyRemedy(game.design, action.remedy)
      const next = spend({ ...game, design, revision: game.revision + 1 }, action.remedy)
      return checkResources({ ...next, stage: 'integration', returned: false })
    }
    case 'wait':
      if (game.stage === 'flight' || (game.stage === 'review' && !game.returned)
        || !affordable(game, mission.costs.wait)) return game
      return game.stage === 'review' && availableWeeks(game) === 1
        ? stop(spend(game, 'wait'), 'deadline')
        : checkResources(spend(game, 'wait'))
    case 'cancel':
      return game.stage === 'flight' ? game : stop(game, 'cancelled')
    case 'fly': {
      const evidence = currentEvidence(game)
      if (game.stage !== 'flight' || !evidence || !passes(evidence)) return game
      const batches = action.choice === 'priority' ? Math.min(evidence.batches, mission.minimumBatches) : evidence.batches
      const flight = { choice: action.choice, batches, stretch: batches >= mission.stretchBatches, firstTx: evidence.ditl.firstTx }
      return record({ ...game, stage: 'results', flight }, 'operate')
    }
  }
}
