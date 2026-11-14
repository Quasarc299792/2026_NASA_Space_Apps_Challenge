import { cubeSat as mission } from '../missions/cubesat'

export type Design = {
  payload: keyof typeof mission.payloads
  supply: keyof typeof mission.supplies
  schedule: keyof typeof mission.schedules
  radio: keyof typeof mission.radios
}

export const initialDesign: Design = mission.initialDesign
export const reviewDesign: Design = mission.reviewDesign
export const remedies = ['stagger', 'basic', 'reinforced', 'compliant'] as const
export type Remedy = typeof remedies[number]
export const multiplayerRemedies = ['stagger', 'basic', 'reinforced'] as const
export type MultiplayerRemedy = typeof multiplayerRemedies[number]
export type Cost = { weeks: number; credits: number }
export type Stage = 'feasibility' | 'design' | 'build' | 'integration' | 'review' | 'flight' | 'results'
export type Gate = 'MDR' | 'PDR' | 'CDR' | 'FRR'

export function powerTimeline(design: Design) {
  const bus = mission.busWatts
  const imaging = bus + mission.payloads[design.payload].watts
  const downlink = bus + mission.downlinkWatts
  return design.schedule === 'overlap'
    ? [{ id: 'imaging', watts: imaging }, { id: 'overlap', watts: imaging + mission.downlinkWatts }] as const
    : [{ id: 'imaging', watts: imaging }, { id: 'handoff', watts: bus }, { id: 'downlink', watts: downlink }] as const
}

export function forecast(design: Design) {
  const payload = mission.payloads[design.payload]
  const supply = mission.supplies[design.supply]
  const schedule = mission.schedules[design.schedule]
  const radio = mission.radios[design.radio]
  const peak = Math.max(...powerTimeline(design).map(segment => segment.watts))
  const capacity = Math.min(mission.groundCapacity, radio.groundCapacity)
  return {
    payloadWatts: payload.watts, peak, available: supply.watts, deficit: Math.max(0, peak - supply.watts),
    contactCapacity: capacity,
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
  const testedBatches = designForecast.deficit ? 0 : designForecast.batches
  return {
    design, ...designForecast, ditl, testedBatches,
    powerPass: designForecast.deficit === 0,
    ditlPass: ditl.elapsed >= ditl.threshold,
    dataPass: testedBatches >= mission.minimumBatches,
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
const workOrder = Object.values(stageWork)
type Work = keyof typeof mission.costs
type LogId = Work | 'return' | 'approve' | 'operate' | 'analysisClear' | 'analysisConflict'
export type Entry = { id: LogId; week: number; cost: number; design: Design; report?: Evidence }
type Analysis = { design: Design; forecast: ReturnType<typeof forecast> }
export type FlightChoice = 'priority' | 'extra' | 'diagnostics'
type Flight = { choice: FlightChoice; batches: number; diagnostics?: number; archived?: number; stretch: boolean; firstTx: number }
type Contact = { choice: FlightChoice; next: number; accepted: number; diagnosticsPending: boolean }
type Stop = 'deadline' | 'funds' | 'cancelled'
export type LabPlayback = { kind: 'assembly' | 'integration'; step: number }
const assemblyOrder = ['science', 'power', 'comms'] as const
export type BenchLead = 'science' | 'power'
export type TestFocus = 'imaging' | 'downlink'
export type ConfigStep = 'payload' | 'supply' | 'schedule' | 'radio'

export function benchSequence(lead: BenchLead = 'science') {
  return lead === 'power' ? ['power', 'science', 'comms'] as const : assemblyOrder
}

export function scopeSegment(timeline: ReturnType<typeof powerTimeline>, focus: TestFocus = 'downlink') {
  return focus === 'imaging' ? timeline[0] : timeline[timeline.length - 1]
}

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
  playback?: LabPlayback
  benchLead?: BenchLead
  testFocus?: TestFocus
  contact?: Contact
  configStep?: ConfigStep
}

export type Action =
  | { type: 'configure'; design: Design }
  | { type: 'configStep'; step: ConfigStep }
  | { type: 'work' | 'analyze' | 'review' | 'wait' | 'cancel' }
  | { type: 'repair'; remedy: Remedy }
  | { type: 'fly'; choice: FlightChoice }
  | { type: 'runLab'; benchLead?: BenchLead; testFocus?: TestFocus }
  | { type: 'advanceLab'; playback: LabPlayback; skip?: boolean }
  | { type: 'startContact'; choice: FlightChoice }
  | { type: 'checkDiagnostics' }
  | { type: 'checkBatch'; batch: number; deliver: boolean }

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

export function baselineRemainingCost(game: Game) {
  const work = currentWork(game)
  if (!work) return 0
  return workOrder.slice(workOrder.indexOf(work)).reduce((total, task) => total + workCost(game, task).credits, 0)
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
    const cheapest = mission.costs.freeze.credits
      + Math.min(...Object.values(mission.payloads).map(option => option.cost))
      + Math.min(...Object.values(mission.supplies).map(option => option.cost))
    if (game.credits < cheapest) return stop(game, 'funds')
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

export function planContact(evidence: ReturnType<typeof testDesign>, choice: FlightChoice) {
  const capacity = evidence.contactCapacity ?? forecast(evidence.design).contactCapacity
  const diagnostics = choice === 'diagnostics' ? Math.min(capacity, mission.diagnosticBatches) : 0
  const requested = choice === 'priority' ? mission.minimumBatches : evidence.batches
  return { batches: Math.min(requested, evidence.batches, capacity - diagnostics), diagnostics }
}

function finishContact(game: Game, evidence: Evidence, choice: FlightChoice, batches: number): Game {
  const { batches: received, diagnostics } = planContact(evidence, choice)
  const flight = { choice, batches, diagnostics, archived: received - batches, stretch: batches >= mission.stretchBatches, firstTx: evidence.ditl.firstTx }
  const { contact: _finished, ...next } = game
  return record({ ...next, stage: 'results', flight }, 'operate')
}

export function runMission(game: Game, action: Action): Game {
  if (game.playback) {
    if (action.type !== 'advanceLab' || action.playback !== game.playback) return game
    const { kind, step } = game.playback
    const length = kind === 'assembly' ? benchSequence(game.benchLead).length : powerTimeline(game.design).length
    if (!action.skip && step + 1 < length) return { ...game, playback: { kind, step: step + 1 } }
    const { playback: _completed, ...next } = game
    const evidence = currentEvidence(next)
    return kind === 'integration' && evidence && !passes(evidence) ? runMission(next, { type: 'review' }) : next
  }
  if (game.stage === 'results') return game
  switch (action.type) {
    case 'configure':
      return canConfigure(game) && !sameDesign(game.design, action.design) ? { ...game, design: action.design } : game
    case 'configStep': {
      const valid = game.stage === 'feasibility' ? action.step === 'payload' || action.step === 'supply'
        : game.stage === 'design' && (action.step === 'schedule' || action.step === 'radio')
      return valid ? { ...game, configStep: action.step } : game
    }
    case 'work':
      return doWork(game)
    case 'runLab': {
      if (game.stage !== 'build' && game.stage !== 'integration') return game
      const next = doWork(game)
      if (next === game) return game
      return game.stage === 'build'
        ? { ...next, benchLead: action.benchLead, playback: { kind: 'assembly', step: 0 } }
        : { ...next, testFocus: action.testFocus, playback: { kind: 'integration', step: 0 } }
    }
    case 'advanceLab':
      return game
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
    case 'fly':
    case 'startContact': {
      const evidence = currentEvidence(game)
      if (game.stage !== 'flight' || game.contact || !evidence || !passes(evidence)) return game
      const { batches, diagnostics } = planContact(evidence, action.choice)
      if (action.type === 'fly' || (!batches && !diagnostics)) return finishContact(game, evidence, action.choice, batches)
      return { ...game, contact: { choice: action.choice, next: 0, accepted: 0, diagnosticsPending: diagnostics > 0 } }
    }
    case 'checkDiagnostics': {
      const { contact } = game
      const evidence = currentEvidence(game)
      if (game.stage !== 'flight' || !evidence || !contact?.diagnosticsPending) return game
      return planContact(evidence, contact.choice).batches
        ? { ...game, contact: { ...contact, diagnosticsPending: false } }
        : finishContact(game, evidence, contact.choice, 0)
    }
    case 'checkBatch': {
      const { contact } = game
      const evidence = currentEvidence(game)
      if (game.stage !== 'flight' || !evidence || !contact || contact.diagnosticsPending || action.batch !== contact.next) return game
      const { batches } = planContact(evidence, contact.choice)
      const accepted = contact.accepted + Number(action.deliver)
      const next = contact.next + 1
      return next === batches ? finishContact(game, evidence, contact.choice, accepted) : { ...game, contact: { ...contact, next, accepted } }
    }
  }
}
