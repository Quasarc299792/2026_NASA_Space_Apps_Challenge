import type { CommissionId } from '../missions/cubesat-commission'
import { getMissionRules, missionCatalog } from '../missions/rules'
import { reviewRiskThreshold, untested, verifyDefect, type DefectState } from './risk'
import type { Action, Cost, Design, FlightResult, Game, MissionRules, ReviewDecision, ReviewGate, Stop, TestResult, TimedJob, Work } from './types'

export type * from './types'

export function rulesFor(game: Pick<Game, 'missionId' | 'commission'>): MissionRules {
  return getMissionRules(game)
}

export function passes(evidence: Pick<TestResult, 'checks'>) {
  return evidence.checks.every(Boolean)
}

const stageWork = { feasibility: 'assess', design: 'freeze', build: 'build', integration: 'integrate' } as const
const workOrder: Work[] = Object.values(stageWork)

// The seed used when none is given. Every risk item of the first mission is clean on it, so rule tests that
// are not about risk stay deterministic.
export const defaultSeed = 6

export function newGame(missionId: string = missionCatalog[0].id, records: string[] = [], seed: number = defaultSeed, commission?: CommissionId): Game {
  const mission = getMissionRules({ missionId, commission })
  const game: Game = {
    missionId, ...(commission && { commission }), stage: 'feasibility', week: 0, deadline: mission.deadline, credits: mission.budget, design: mission.initialDesign,
    revision: 0, gate: 'MDR', analysis: null, evidence: null, flight: null, stop: null, returned: false,
    event: null, events: [], records, log: [], seed: seed >>> 0, risks: {}, accepted: [], outcomes: [],
  }
  return triggerEvent(mission.initialize?.(game) ?? game)
}

export function riskState(game: Game, risk: string): DefectState {
  return game.risks[risk] ?? untested
}

// Risks the player signs for by submitting to flight review.
export function riskAcceptance(game: Game) {
  return rulesFor(game).risks?.view(game).filter(item => item.risk > reviewRiskThreshold).map(item => item.id) ?? []
}

// Evidence for the ground pass. Before the pass starts the player only has the test evidence.
export function contactEvidence(game: Game) {
  const evidence = currentEvidence(game)
  return evidence && (game.contact || game.flight) ? rulesFor(game).risks?.inFlight(game, evidence) ?? evidence : evidence
}

// A different design option is a different item, so what was learned about the old one is dropped.
function reconcileRisks(game: Game, design: Design): Game {
  const risks = rulesFor(game).risks
  if (!risks) return { ...game, design }
  const kept = Object.fromEntries(Object.entries(game.risks).filter(([id]) => risks.identity(game.design, id).item === risks.identity(design, id).item))
  return { ...game, design, risks: kept }
}

export function availableWeeks(game: Game) {
  return (rulesFor(game).effectiveDeadline?.(game) ?? game.deadline) - game.week
}

export function affordable(game: Game, cost: Cost) {
  return availableWeeks(game) >= cost.weeks && game.credits >= cost.credits
}

export function optionCost(mission: MissionRules, design: Design) {
  return Object.entries(mission.groups).reduce((total, [key, group]) => total + (group.options[design[key]]?.cost ?? 0), 0)
}

function cheapestFreeze(mission: MissionRules) {
  return Object.values(mission.groups).reduce(
    (total, group) => total + Math.min(...Object.values(group.options).map(option => option.cost ?? 0)), mission.costs.freeze.credits)
}

export function workCost(game: Game, work: Work): Cost {
  const mission = rulesFor(game)
  const cost = mission.costs[work]
  if (work !== 'freeze') return cost
  return { ...cost, credits: cost.credits + optionCost(mission, game.design) }
}

export function repairAndRetestCost(game: Game, remedy: string): Cost {
  const repair = rulesFor(game).costs[remedy]
  const retest = workCost(game, 'integrate')
  return { weeks: repair.weeks + retest.weeks, credits: repair.credits + retest.credits }
}

function jobId(job: TimedJob) {
  if (job.type === 'work') return job.work
  if (job.type === 'repair') return job.remedy
  if (job.type === 'task') return job.task
  if (job.type === 'verify' || job.type === 'fix') return job.work
  return job.type
}

export function pendingWorkId(game: Game) {
  return game.pendingWork ? jobId(game.pendingWork.job) : null
}

export function currentWork(game: Game) {
  return game.stage in stageWork ? stageWork[game.stage as keyof typeof stageWork] : null
}

export function baselineRemainingCost(game: Game) {
  if (rulesFor(game).tasks) return 0
  const work = currentWork(game)
  if (!work) return 0
  return workOrder.slice(workOrder.indexOf(work)).reduce((total, task) => total + workCost(game, task).credits, 0)
}

export function canConfigure(game: Game) {
  return !game.pendingWork && (game.stage === 'feasibility' || game.stage === 'design')
}

export function sameDesign(a: Design, b: Design) {
  return Object.keys({ ...a, ...b }).every(key => a[key] === b[key])
}

export function currentEvidence(game: Game) {
  return game.evidence?.revision === game.revision && sameDesign(game.evidence.design, game.design) ? game.evidence : null
}

export function repairOptions(game: Game) {
  return rulesFor(game).repairOptions?.(game.design) ?? []
}

export function pendingEvent(game: Game) {
  return game.event ? rulesFor(game).events?.find(event => event.id === game.event) ?? null : null
}

export function eventChoice(game: Game, eventId: string) {
  return game.events.find(entry => entry.startsWith(`${eventId}:`))?.slice(eventId.length + 1) ?? null
}

function record(game: Game, id: string, cost = 0, details: Partial<Pick<Game['log'][number], 'report' | 'label' | 'incomplete' | 'review' | 'detail' | 'event'>> = {}): Game {
  return { ...game, log: [...game.log, { id, week: game.week, cost, design: game.design, ...details }] }
}

export function stop(game: Game, reason: Stop): Game {
  const { pendingWork, ...next } = game
  const stopped: Game = { ...next, stage: 'results', stop: reason, event: null }
  return pendingWork ? record(stopped, jobId(pendingWork.job), pendingWork.cost.credits, { incomplete: true }) : stopped
}

function checkResources(game: Game): Game {
  if (game.stage === 'flight' || game.stage === 'results') return game
  if (game.event || game.pendingWork) return game
  if (availableWeeks(game) < 0) return stop(game, 'deadline')
  const mission = rulesFor(game)
  const reason = mission.stopReason?.(game)
  if (reason) return stop(game, reason)
  if (game.stage === 'review' || mission.tasks) return game
  if (availableWeeks(game) === 0) return stop(game, 'deadline')
  const work = currentWork(game)
  if (work && game.stage !== 'design' && game.credits < workCost(game, work).credits) return stop(game, 'funds')
  if (game.stage === 'design' && game.credits < cheapestFreeze(mission)) return stop(game, 'funds')
  return game
}

function triggerEvent(game: Game): Game {
  if (game.event || game.stage === 'flight' || game.stage === 'results') return game
  const event = rulesFor(game).events?.find(item => eventChoice(game, item.id) === null && item.trigger(game))
  return event ? { ...game, event: event.id } : game
}

function advance(game: Game) {
  return checkResources(triggerEvent(game))
}

export function taskOptions(game: Game) {
  if (game.event || game.pendingWork || game.stage === 'flight' || game.stage === 'results') return []
  return Object.entries(rulesFor(game).tasks ?? {}).flatMap(([id, task]) => {
    const cost = task.plan(game)
    return cost ? [{ id, cost }] : []
  })
}

export function pendingReview(game: Game) {
  const gate: ReviewGate | null = game.stage === 'design' && game.gate === 'PDR' ? 'PDR'
    : game.stage === 'review' ? 'FRR' : null
  const review = gate && rulesFor(game).reviews?.[gate]?.(game, currentEvidence(game))
  return gate && review ? { ...review, gate } : null
}

export function currentFlightSegment(game: Game) {
  return game.stage === 'flight' ? rulesFor(game).segmentedFlight?.segments[game.flightProgress?.steps.length ?? 0] : undefined
}

export function flightContext(game: Game) {
  return { game, evidence: currentEvidence(game), progress: game.flightProgress ?? { steps: [], state: {} } }
}

function completeWork(game: Game, work: Work, cost: Cost, lab?: Extract<TimedJob, { type: 'work' }>['lab']): Game {
  if (work === 'integrate') {
    const evidence = { ...rulesFor(game).test!(game.design), week: game.week, revision: game.revision }
    return {
      ...record(game, work, cost.credits, { report: evidence }), stage: 'review', evidence, returned: false,
      ...(lab && { testFocus: lab.testFocus, playback: { kind: 'integration', step: 0 } }),
    }
  }
  const next = record(game, work, cost.credits)
  switch (work) {
    case 'assess': return { ...next, stage: 'design', gate: 'PDR' }
    case 'freeze': return { ...next, stage: 'build', gate: 'CDR' }
    case 'build': return {
      ...next, stage: 'integration', ...(lab && { benchLead: lab.benchLead, playback: { kind: 'assembly', step: 0 } }),
    }
  }
}

function completeJob(game: Game, job: TimedJob, cost: Cost): Game {
  const mission = rulesFor(game)
  switch (job.type) {
    case 'work':
      return completeWork(game, job.work, cost, job.lab)
    case 'analyze': {
      const result = mission.forecast!(game.design)
      const id = mission.forecastClear?.(result) ? 'analysisClear' : 'analysisConflict'
      const risks = { ...game.risks }
      for (const id of mission.risks?.analysisCovers ?? []) {
        const state = riskState(game, id)
        const { item, maturity } = mission.risks!.identity(game.design, id)
        if (state.level === 0) risks[id] = verifyDefect(game.seed, item, maturity, state)
      }
      return record({ ...game, risks, analysis: { design: game.design, forecast: result } }, id, cost.credits)
    }
    case 'repair': {
      const design = mission.applyRemedy!(game.design, job.remedy)
      return record({ ...reconcileRisks(game, design), revision: game.revision + 1, stage: 'integration', returned: false }, job.remedy, cost.credits)
    }
    case 'verify':
    case 'fix': {
      const previous = riskState(game, job.risk)
      const { item, maturity } = mission.risks!.identity(game.design, job.risk)
      const state = job.type === 'verify' ? verifyDefect(game.seed, item, maturity, previous) : { ...previous, fixed: true }
      return record({ ...game, risks: { ...game.risks, [job.risk]: state } }, job.work, cost.credits)
    }
    case 'task': {
      const next = mission.tasks![job.task].complete(game)
      const report = next.evidence !== game.evidence ? currentEvidence(next) : null
      const detail = mission.tasks![job.task].detail?.(game, next)
      return record(next, job.task, cost.credits, { ...(report && { report }), ...(detail && { detail }) })
    }
    case 'wait': {
      const next = record(game, 'wait', cost.credits)
      return next.stage === 'review' && availableWeeks(next) === 0 && !mission.reviews?.FRR ? stop(next, 'deadline') : next
    }
  }
}

function resumeWork(game: Game): Game {
  const pending = game.pendingWork!
  if (availableWeeks(game) < pending.remaining) return stop(game, 'deadline')
  let next = game
  for (let remaining = pending.remaining; remaining > 0; remaining -= 1) {
    next = triggerEvent({ ...next, week: next.week + 1, pendingWork: { ...pending, remaining: remaining - 1 } })
    if (next.event) return next
  }
  const { pendingWork: _completed, ...finished } = next
  return advance(completeJob(finished, pending.job, pending.cost))
}

function startWork(game: Game, job: TimedJob, cost: Cost): Game {
  if (!cost || !Number.isInteger(cost.weeks) || cost.weeks < 0 || !Number.isInteger(cost.credits) || cost.credits < 0
    || !affordable(game, cost)) return game
  const charged = { ...game, credits: game.credits - cost.credits }
  const started = job.type === 'task' ? rulesFor(game).tasks![job.task].start?.(charged) ?? charged : charged
  return resumeWork({ ...started, pendingWork: { job, cost, remaining: cost.weeks } })
}

function doWork(game: Game, lab?: Extract<TimedJob, { type: 'work' }>['lab']): Game {
  const work = currentWork(game)
  const mission = rulesFor(game)
  if (!work || mission.tasks || (work === 'integrate' && !mission.test) || (work === 'freeze' && game.gate === 'PDR' && mission.reviews?.PDR)) return game
  return startWork(game, { type: 'work', work, ...(lab && { lab }) }, workCost(game, work))
}

function submitReview(game: Game, waiverIds: readonly string[]) {
  const mission = rulesFor(game)
  const evidence = currentEvidence(game)
  const review = pendingReview(game)
  if (!review) {
    if (mission.reviews?.FRR || game.stage !== 'review' || !evidence || game.returned || waiverIds.length) return game
    if (availableWeeks(game) < 0) return stop(game, 'deadline')
    if (passes(evidence)) return record({ ...game, stage: 'flight', gate: 'FRR', accepted: riskAcceptance(game) }, 'approve', 0, { report: evidence })
    const returned = record({ ...game, returned: true }, 'return', 0, { report: evidence })
    if (availableWeeks(game) === 0) return stop(returned, 'deadline')
    if (game.credits < (mission.costs.integrate?.credits ?? 0)) return stop(returned, 'funds')
    return returned
  }
  if (availableWeeks(game) < 0) return stop(game, 'deadline')
  const offered = review.issues.flatMap(issue => issue.waiver ? [issue.waiver] : [])
  if (new Set(waiverIds).size !== waiverIds.length || waiverIds.some(id => !offered.some(waiver => waiver.id === id))) return game
  const passed = review.issues.every(issue => issue.waiver && waiverIds.includes(issue.waiver.id))
  // When only signatures are missing, say so instead of the chapter's general return note.
  const unsigned = review.issues.filter(issue => issue.waiver && !waiverIds.includes(issue.waiver.id))
  const onlyUnsigned = !passed && unsigned.length > 0 && review.issues.every(issue => issue.waiver)
  const detail = passed ? review.approve : onlyUnsigned ? { message: 'reviewUnsigned' as const, values: { count: unsigned.length } } : review.return
  const waivers = passed ? offered.filter(waiver => waiverIds.includes(waiver.id)).map(({ id, label }) => ({ id, label })) : []
  const decision: ReviewDecision = { gate: review.gate, passed, waivers, ...(detail && { detail }) }
  const next: Game = !passed ? { ...game, returned: !onlyUnsigned }
    : review.gate === 'PDR' ? { ...game, gate: 'CDR', returned: false }
    : { ...game, stage: 'flight', gate: 'FRR', returned: false }
  const approved = passed ? mission.onReviewApproved?.(next, decision) ?? next : next
  return advance(record(approved, passed ? 'approve' : 'return', 0, { review: decision, ...(evidence && { report: evidence }) }))
}

function resolveSegment(game: Game, segmentId: string, choice: string | null, turn?: number): Game {
  const flight = rulesFor(game).segmentedFlight
  const segment = currentFlightSegment(game)
  if (!flight || !segment || segmentId !== segment.id || (turn !== undefined && turn !== (game.flightProgress?.turn ?? 0))) return game
  const context = flightContext(game)
  const choices = segment.choices?.(context) ?? []
  if (choices.length ? !choices.some(option => option.id === choice) : choice !== null) return game
  const { failed, end, continued, state, report } = segment.resolve(context, choice)
  const nextState = state ?? context.progress.state
  const turnCount = (context.progress.turn ?? 0) + 1
  const updates = context.progress.updates ?? []
  if (continued) {
    return { ...game, flightProgress: { ...context.progress, state: nextState, turn: turnCount, updates: report ? [...updates, report] : updates } }
  }
  const progress = {
    steps: [...context.progress.steps, { id: segment.id, choice, ...(report && { report }), ...(updates.length > 0 && { updates }) }],
    state: nextState,
    turn: turnCount,
  }
  if (!failed && !end && progress.steps.length < flight.segments.length) return { ...game, flightProgress: progress }
  const interruptedAt = failed ? segment.id : null
  const result = flight.finish({ ...context, progress }, interruptedAt)
  const { flightProgress: _completed, ...next } = game
  return record({ ...next, stage: 'results', flight: {
    ...result, segments: progress.steps,
    ...(interruptedAt && { interruptedAt, delivered: false, stretch: false }),
  } }, 'operate')
}

function finishContact(game: Game, flight: FlightResult): Game {
  const { contact: _finished, ...next } = game
  return record({ ...next, stage: 'results', flight }, 'operate')
}

export function runMission(game: Game, action: Action): Game {
  const mission = rulesFor(game)
  if (game.playback) {
    if (action.type !== 'advanceLab' || action.playback !== game.playback) return game
    const { kind, step } = game.playback
    const length = mission.labSteps?.(game, kind) ?? 0
    if (!action.skip && step + 1 < length) return { ...game, playback: { kind, step: step + 1 } }
    const { playback: _completed, ...next } = game
    const evidence = currentEvidence(next)
    return kind === 'integration' && evidence && !passes(evidence) ? runMission(next, { type: 'review' }) : next
  }
  if (game.stage === 'results') return game
  if ((game.event || game.pendingWork) && action.type !== 'choose') return game
  switch (action.type) {
    case 'choose': {
      const event = pendingEvent(game)
      const choice = event?.choices.find(item => item.id === action.choice)
      if (!event || (action.event !== undefined && action.event !== event.id) || !choice || choice.available?.(game) === false) return game
      const applied = choice.apply(game)
      const resolved = { ...applied, credits: Math.max(0, applied.credits), event: null, events: [...game.events, `${event.id}:${choice.id}`] }
      const detail = choice.result?.(resolved, game)
      const next = record(resolved, 'event', Math.max(0, game.credits - resolved.credits),
        { label: choice.label, event: event.id, ...(detail && { detail }) })
      if (applied.credits < 0) return stop(next, 'funds')
      if (next.stage === 'results') return next
      const triggered = triggerEvent(next)
      return triggered.event ? triggered : triggered.pendingWork ? resumeWork(triggered) : checkResources(triggered)
    }
    case 'configure':
      if (!canConfigure(game) || sameDesign(game.design, action.design)
        || !Object.entries(mission.groups).every(([key, group]) => Object.hasOwn(group.options, action.design[key])
          && (game.design[key] === action.design[key] || mission.configurable?.(game, key) !== false))) return game
      const configured = mission.configure?.(game, action.design) ?? reconcileRisks(game, action.design)
      return game.stage === 'design' && mission.reviews?.PDR && mission.reopenPdr?.(game, action.design) !== false ? { ...configured, gate: 'PDR', returned: false } : configured
    case 'configStep':
      return mission.configurationSteps?.[game.stage]?.includes(action.step) ? { ...game, configStep: action.step } : game
    case 'work':
      return doWork(game)
    case 'task': {
      if (game.stage === 'flight' || action.turn !== game.log.length
        || !Object.hasOwn(mission.tasks ?? {}, action.task) || !Object.hasOwn(mission.costs, action.task)) return game
      const cost = mission.tasks![action.task].plan(game)
      return cost ? startWork(game, { type: 'task', task: action.task }, cost) : game
    }
    case 'runLab':
      if (!mission.labSteps || (game.stage !== 'build' && game.stage !== 'integration')) return game
      return doWork(game, { benchLead: action.benchLead, testFocus: action.testFocus })
    case 'advanceLab':
      return game
    case 'analyze':
      if (mission.tasks || !mission.forecast || !mission.costs.analyze || !canConfigure(game) || (game.analysis && sameDesign(game.analysis.design, game.design))) return game
      return startWork(game, { type: 'analyze' }, mission.costs.analyze)
    case 'review':
      return action.turn === undefined || action.turn === game.log.length ? submitReview(game, action.waivers ?? []) : game
    case 'repair': {
      if (mission.tasks || !mission.applyRemedy || game.stage !== 'review' || !game.returned || !repairOptions(game).includes(action.remedy)) return game
      if (!affordable(game, repairAndRetestCost(game, action.remedy))) return game
      return startWork(game, action, mission.costs[action.remedy])
    }
    case 'verify':
    case 'fix': {
      // Verification changes what the player knows. Only a fix changes the item itself.
      const item = mission.risks?.view(game).find(entry => entry.id === action.risk)
      if (!item || game.stage === 'flight') return game
      if (action.type === 'verify') {
        if (!item.next || item.state.found || item.state.fixed || !affordable(game, item.next)) return game
        return startWork(game, { ...action, work: item.next.work }, item.next)
      }
      if (!item.state.found || item.state.fixed || !affordable(game, item.fix)) return game
      return startWork(game, { ...action, work: item.fix.work }, item.fix)
    }
    case 'wait':
      if (mission.tasks || game.stage === 'flight' || (game.stage === 'review' && !game.returned)) return game
      return startWork(game, { type: 'wait' }, mission.costs.wait)
    case 'segment':
      return resolveSegment(game, action.segment, action.choice, action.turn)
    case 'cancel':
      return game.stage === 'flight' ? game : stop(game, 'cancelled')
    case 'fly':
    case 'startContact': {
      const evidence = currentEvidence(game)
      if (game.stage !== 'flight' || mission.segmentedFlight || game.contact || !evidence
        || (!mission.reviews?.FRR && !passes(evidence)) || !mission.flightChoices?.includes(action.choice)) return game
      const flown = { ...game, outcomes: mission.risks?.outcomes(game) ?? [] }
      const actual = mission.risks?.inFlight(game, evidence) ?? evidence
      if (action.type === 'fly') return mission.fly
        ? record({ ...flown, stage: 'results', flight: mission.fly(actual, action.choice) }, 'operate') : game
      if (!mission.contact) return game
      const { batches, diagnostics } = mission.contact.plan(actual, action.choice)
      if (!batches && !diagnostics) return finishContact(flown, mission.contact.finish(actual, action.choice, 0))
      return { ...flown, contact: { choice: action.choice, next: 0, accepted: 0, diagnosticsPending: diagnostics > 0 } }
    }
    case 'checkDiagnostics': {
      const { contact } = game
      const evidence = contactEvidence(game)
      if (game.stage !== 'flight' || !evidence || !contact?.diagnosticsPending || !mission.contact) return game
      return mission.contact.plan(evidence, contact.choice).batches
        ? { ...game, contact: { ...contact, diagnosticsPending: false } }
        : finishContact(game, mission.contact.finish(evidence, contact.choice, 0))
    }
    case 'checkBatch': {
      const { contact } = game
      const evidence = contactEvidence(game)
      if (game.stage !== 'flight' || !evidence || !contact || contact.diagnosticsPending
        || action.batch !== contact.next || !mission.contact) return game
      const { batches } = mission.contact.plan(evidence, contact.choice)
      const accepted = contact.accepted + Number(action.deliver)
      const next = contact.next + 1
      return next === batches
        ? finishContact(game, mission.contact.finish(evidence, contact.choice, accepted))
        : { ...game, contact: { ...contact, next, accepted } }
    }
  }
}
