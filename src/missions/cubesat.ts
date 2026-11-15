import {
  believedRisk, defectBelief, defectInFlight, detection, missionOdds, testResult, topLevel, untested,
  type DefectState, type Maturity, type Outcome,
} from '../game/risk'
import type { BenchLead, Design, Evidence, Game, MissionRisks, MissionRules, RiskView, TestFocus } from '../game/types'

export const cubeSat = {
  id: 'cubesat',
  title: 'cubesat',
  brief: 'briefStory',
  deadline: 6,
  budget: 110,
  dollarsPerCredit: 10_000,
  playMinutes: '3–5',
  initialDesign: { launch: 'iss', payload: 'basic', supply: 'standard', schedule: 'overlap', radio: 'compliant' },
  // The team review starts after launch is booked on the rideshare, so every proposal fits its mass limit.
  reviewDesign: { launch: 'rideshare', payload: 'advanced', supply: 'standard', schedule: 'overlap', radio: 'compliant' },
  minimumBatches: 2,
  stretchBatches: 4,
  missionOrbits: 1,
  diagnosticBatches: 4,
  busWatts: 2,
  downlinkWatts: 4,
  // Mass of the 3U structure, computer, radio and attitude control. The camera and the power system add to it.
  busKg: 2.4,
  // Launch and orbit come as one booking. Every number here is a game setting, not a launch provider's figure.
  // massLimitKg is the heaviest 3U the deployer accepts. passSlots is how many batches fit in the first ground pass:
  // the higher orbit keeps the satellite above the station's horizon for longer. leadWeeks moves the delivery date earlier.
  launches: {
    iss: { label: 'launchIss', description: 'launchIssDetail', altitudeKm: 420, inclination: 51.6, lifetimeYears: 1, massLimitKg: 4, passSlots: 5, leadWeeks: 0, cost: 10 },
    rideshare: { label: 'launchRideshare', description: 'launchRideshareDetail', altitudeKm: 550, inclination: 97.6, lifetimeYears: 5, massLimitKg: 6, passSlots: 6, leadWeeks: 1, cost: 16 },
  },
  payloads: {
    basic: { label: 'payloadBasic', description: 'payloadBasicDetail', watts: 3, massKg: 0.4, batches: 2, cost: 14, maturity: 'heritage' },
    advanced: { label: 'payloadAdvanced', description: 'payloadAdvancedDetail', watts: 7, massKg: 0.8, batches: 5, cost: 21, maturity: 'new' },
  },
  // watts is the peak the solar panels and battery can deliver together, not the orbit-average power.
  supplies: {
    standard: { label: 'powerStandard', description: 'powerStandardDetail', watts: 10, massKg: 0.5, cost: 12, maturity: 'heritage' },
    reinforced: { label: 'powerReinforced', description: 'powerReinforcedDetail', watts: 14, massKg: 1, cost: 22, maturity: 'new' },
  },
  schedules: {
    overlap: { label: 'scheduleOverlap', description: 'scheduleOverlapDetail', batchLoss: 0, params: { count: 0 } },
    stagger: { label: 'scheduleStagger', description: 'scheduleStaggerDetail', batchLoss: 2, params: { count: 2 } },
  },
  // The first ground pass starts about 20 minutes after separation. A radio that waits longer misses the start of it.
  firstPassMinutes: 20,
  radios: {
    compliant: { label: 'radioCompliant', description: 'radioCompliantDetail', firstTxMinutes: 32, missedSlots: 1, params: { minutes: 32, missed: 1 } },
    early: { label: 'radioEarly', description: 'radioEarlyDetail', firstTxMinutes: 20, missedSlots: 0, params: { minutes: 20, missed: 0 } },
  },
  sources: [
    { source: 'NASA CubeSat 101 §6.9.1 (day-in-the-life test)', url: 'https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=68' },
    { source: 'NASA CubeSat 101 §6.4 (mass properties)', url: 'https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=65' },
    { source: 'NASA, Design and Develop Science Missions', url: 'https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf' },
    { source: 'NASA Systems Engineering Handbook §5.3 Product Verification', url: 'https://www.nasa.gov/reference/5-3-product-verification/' },
    { source: 'NASA Systems Engineering Handbook §6.4 Technical Risk Management', url: 'https://www.nasa.gov/reference/6-4-technical-risk-management/' },
    { source: 'NASA NPR 7123.1D Appendix G (life-cycle reviews)', url: 'https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_7123_001D_&page_name=AppendixG' },
  ],
  ditl: {
    separationMinutes: 0,
    deployMinutes: 15,
    minQuietMinutes: 30,
    source: 'NASA CubeSat 101 §6.9.1',
    url: 'https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=68',
  },
  costs: {
    assess: { weeks: 1, credits: 6, label: 'assess' },
    analyze: { weeks: 1, credits: 5, label: 'analyze' },
    freeze: { weeks: 1, credits: 6, label: 'freeze' },
    build: { weeks: 1, credits: 9, label: 'buildWork' },
    integrate: { weeks: 1, credits: 8, label: 'integrate' },
    wait: { weeks: 1, credits: 0, label: 'wait' },
    stagger: { weeks: 1, credits: 6, label: 'remedyStagger' },
    basic: { weeks: 1, credits: 10, label: 'remedyBasic' },
    reinforced: { weeks: 1, credits: 16, label: 'remedyReinforced' },
    compliant: { weeks: 1, credits: 5, label: 'remedyCompliant' },
    // Risk verification rides along with the week's main work in this tutorial mission, so it costs budget and no weeks.
    imagingAnalysis: { weeks: 0, credits: 4, label: 'riskImagingAnalysis' },
    imagingBench: { weeks: 0, credits: 7, label: 'riskImagingBench' },
    imagingRehearsal: { weeks: 0, credits: 12, label: 'riskImagingRehearsal' },
    powerAnalysis: { weeks: 0, credits: 4, label: 'riskPowerAnalysis' },
    powerLoadTest: { weeks: 0, credits: 7, label: 'riskPowerLoadTest' },
    powerRehearsal: { weeks: 0, credits: 12, label: 'riskPowerRehearsal' },
    fixImaging: { weeks: 1, credits: 5, label: 'riskFixImaging' },
    fixPower: { weeks: 1, credits: 5, label: 'riskFixPower' },
  },
  // Two risk items, both degrading and neither fatal. Each either has a defect or not, drawn from the seed at the
  // start. A defect that reaches orbit costs lostBatches observation batches. steps are the verification works for
  // analysis, unit test and end-to-end test. The optional power and timing analysis also covers the analysis level of both.
  risks: {
    imaging: { label: 'riskImaging', detail: 'riskImagingDetail', failure: 'riskImagingFailure', option: 'payload', steps: ['imagingAnalysis', 'imagingBench', 'imagingRehearsal'], fix: 'fixImaging', lostBatches: 1 },
    power: { label: 'riskPower', detail: 'riskPowerDetail', failure: 'riskPowerFailure', option: 'supply', steps: ['powerAnalysis', 'powerLoadTest', 'powerRehearsal'], fix: 'fixPower', lostBatches: 1 },
  },
} as const

export const departments = ['science', 'power', 'comms'] as const
export type Department = typeof departments[number]
export const proposals = {
  science: { options: ['stagger', 'basic'], fallback: 'stagger', brief: 'scienceBrief' },
  power: { options: ['stagger', 'reinforced'], fallback: 'reinforced', brief: 'powerBrief' },
  comms: { options: ['stagger', 'reinforced'], fallback: 'stagger', brief: 'commsBrief' },
} as const satisfies Record<Department, { options: readonly string[]; fallback: string; brief: string }>

export type CubeSatDesign = {
  launch: keyof typeof cubeSat.launches
  payload: keyof typeof cubeSat.payloads
  supply: keyof typeof cubeSat.supplies
  schedule: keyof typeof cubeSat.schedules
  radio: keyof typeof cubeSat.radios
}

export const initialDesign: CubeSatDesign = cubeSat.initialDesign
export const reviewDesign: CubeSatDesign = cubeSat.reviewDesign
export const remedies = ['stagger', 'basic', 'reinforced', 'compliant'] as const
export type Remedy = typeof remedies[number]
export const multiplayerRemedies = ['stagger', 'basic', 'reinforced'] as const
export type MultiplayerRemedy = typeof multiplayerRemedies[number]
export const flightChoices = ['priority', 'extra', 'diagnostics'] as const
export type FlightChoice = typeof flightChoices[number]

export function powerTimeline(design: CubeSatDesign) {
  const bus = cubeSat.busWatts
  const imaging = bus + cubeSat.payloads[design.payload].watts
  const downlink = bus + cubeSat.downlinkWatts
  return design.schedule === 'overlap'
    ? [{ id: 'imaging', watts: imaging }, { id: 'overlap', watts: imaging + cubeSat.downlinkWatts }] as const
    : [{ id: 'imaging', watts: imaging }, { id: 'handoff', watts: bus }, { id: 'downlink', watts: downlink }] as const
}

const assemblyOrder = ['science', 'power', 'comms'] as const

export function benchSequence(lead: BenchLead = 'science') {
  return lead === 'power' ? ['power', 'science', 'comms'] as const : assemblyOrder
}

export function scopeSegment(timeline: ReturnType<typeof powerTimeline>, focus: TestFocus = 'downlink') {
  return focus === 'imaging' ? timeline[0] : timeline[timeline.length - 1]
}

// Mass in tenths of a kilogram is summed as integers so 2.4 + 0.8 + 1 is exactly 4.2.
export function spacecraftMass(design: CubeSatDesign) {
  const tenths = [cubeSat.busKg, cubeSat.payloads[design.payload].massKg, cubeSat.supplies[design.supply].massKg]
    .reduce((total, kg) => total + Math.round(kg * 10), 0)
  return tenths / 10
}

export function forecast(design: CubeSatDesign) {
  const launch = cubeSat.launches[design.launch]
  const payload = cubeSat.payloads[design.payload]
  const supply = cubeSat.supplies[design.supply]
  const schedule = cubeSat.schedules[design.schedule]
  const radio = cubeSat.radios[design.radio]
  const peak = Math.max(...powerTimeline(design).map(segment => segment.watts))
  const capacity = Math.max(0, launch.passSlots - radio.missedSlots)
  const collectedBatches = Math.max(0, payload.batches - schedule.batchLoss)
  const mass = spacecraftMass(design)
  return {
    payloadWatts: payload.watts, peak, available: supply.watts, deficit: Math.max(0, peak - supply.watts),
    collectedBatches, contactCapacity: capacity,
    batches: Math.min(collectedBatches, capacity),
    mass, massLimit: launch.massLimitKg, massPass: mass <= launch.massLimitKg,
  }
}

export function testDesign(design: CubeSatDesign) {
  const designForecast = forecast(design)
  const firstTx = cubeSat.radios[design.radio].firstTxMinutes
  const ditl = {
    separation: cubeSat.ditl.separationMinutes,
    deploy: cubeSat.ditl.deployMinutes,
    firstTx,
    elapsed: firstTx - cubeSat.ditl.separationMinutes,
    threshold: cubeSat.ditl.minQuietMinutes,
  }
  const testedBatches = designForecast.deficit ? 0 : designForecast.batches
  const powerPass = designForecast.deficit === 0
  const ditlPass = ditl.elapsed >= ditl.threshold
  const dataPass = testedBatches >= cubeSat.minimumBatches
  const { massPass } = designForecast
  return { design, ...designForecast, ditl, testedBatches, powerPass, ditlPass, dataPass, checks: [powerPass, dataPass, ditlPass, massPass] }
}

export type CubeSatEvidence = ReturnType<typeof testDesign> & { week?: number; revision?: number }

export function applyRemedy(design: CubeSatDesign, remedy: Remedy): CubeSatDesign {
  switch (remedy) {
    case 'stagger': return { ...design, schedule: 'stagger' }
    case 'basic': return { ...design, payload: 'basic', schedule: 'overlap' }
    case 'reinforced': return { ...design, supply: 'reinforced', schedule: 'overlap' }
    case 'compliant': return { ...design, radio: 'compliant' }
  }
}

export function repairOptions(design: CubeSatDesign) {
  const estimate = testDesign(design)
  return remedies.filter(remedy => {
    if (remedy === 'compliant') return !estimate.ditlPass
    const changed = testDesign(applyRemedy(design, remedy))
    if (!changed.massPass) return false
    return (changed.deficit < estimate.deficit && changed.dataPass)
      || (!estimate.dataPass && changed.dataPass && changed.powerPass)
      || (!estimate.massPass && changed.dataPass && changed.powerPass)
  })
}

export function resolveTeamReview(remedy: MultiplayerRemedy) {
  const correction = cubeSat.costs[remedy]
  const retest = cubeSat.costs.integrate
  return {
    evidence: testDesign(applyRemedy(reviewDesign, remedy)),
    weeks: correction.weeks + retest.weeks,
    credits: correction.credits + retest.credits,
  }
}

export type CubeSatGame = Game & { design: CubeSatDesign }
export type CubeSatRisk = keyof typeof cubeSat.risks
export const cubeSatRiskIds = Object.keys(cubeSat.risks) as CubeSatRisk[]

// The imaging item follows the imager and the power item follows the supply. Each option has its own truth.
export function riskIdentity(design: Design, risk: string): { item: string; maturity: Maturity } {
  const { option } = cubeSat.risks[risk as CubeSatRisk]
  const choice = design[option]
  const maturity = (option === 'payload' ? cubeSat.payloads[choice as CubeSatDesign['payload']] : cubeSat.supplies[choice as CubeSatDesign['supply']]).maturity
  return { item: `cubesat:${risk}:${choice}`, maturity }
}

function riskStates(game: Pick<Game, 'risks'>) {
  return Object.fromEntries(cubeSatRiskIds.map(id => [id, game.risks[id] ?? untested])) as Record<CubeSatRisk, DefectState>
}

export function riskView(game: Pick<Game, 'design' | 'risks'>): RiskView[] {
  const states = riskStates(game)
  return cubeSatRiskIds.map(id => {
    const { label, detail, failure, steps, fix } = cubeSat.risks[id]
    const { maturity } = riskIdentity(game.design, id)
    const state = states[id]
    const work = state.level < topLevel ? steps[state.level] : null
    return {
      id, label, detail, failure, severity: 'degraded', maturity, state, risk: defectBelief(maturity, state),
      next: work && !state.found && !state.fixed
        ? { ...cubeSat.costs[work], work, passRisk: believedRisk(maturity, state.level + 1), missRate: 1 - detection[state.level + 1] } : null,
      fix: { ...cubeSat.costs[fix], work: fix },
    }
  })
}

// Batches that reach the ground when the given risk items turn out defective.
function batchesAfter(design: CubeSatDesign, failed: ReadonlySet<string>) {
  const lost = cubeSatRiskIds.reduce((total, id) => total + (failed.has(id) ? cubeSat.risks[id].lostBatches : 0), 0)
  const estimate = forecast(design)
  const collected = cubeSat.payloads[design.payload].batches - cubeSat.schedules[design.schedule].batchLoss - lost
  return Math.max(0, Math.min(collected, estimate.contactCapacity))
}

export function riskOdds(game: Pick<Game, 'design' | 'risks'>) {
  return missionOdds(riskView(game), failed => batchesAfter(game.design as CubeSatDesign, failed) >= cubeSat.minimumBatches)
}

function defectsInFlight(game: Pick<Game, 'seed' | 'design' | 'risks'>) {
  const states = riskStates(game)
  return new Set<string>(cubeSatRiskIds.filter(id => {
    const { item, maturity } = riskIdentity(game.design, id)
    return defectInFlight(game.seed, item, maturity, states[id])
  }))
}

export function riskOutcomes(game: Pick<Game, 'seed' | 'design' | 'risks'>): Outcome[] {
  const failed = defectsInFlight(game)
  return riskView(game).map(item => ({ id: item.id, believed: item.risk, failed: failed.has(item.id) }))
}

// For the debrief only, because it reads the truth: whether the next verification level would have found the defect.
export function riskDebrief(game: Pick<Game, 'seed' | 'design' | 'risks'>, risk: string) {
  const item = riskView(game).find(entry => entry.id === risk)
  if (!item?.next) return null
  const { item: id, maturity } = riskIdentity(game.design, risk)
  return { ...item.next, found: testResult(game.seed, id, maturity, item.state.level + 1) === 'found' }
}

const cubeSatRisks: MissionRisks = {
  identity: riskIdentity,
  analysisCovers: cubeSatRiskIds,
  view: riskView,
  odds: riskOdds,
  inFlight: (game, evidence) => ({ ...evidence, batches: Math.min(evidence.batches, batchesAfter(evidence.design as CubeSatDesign, defectsInFlight(game))) }) as Evidence,
  outcomes: riskOutcomes,
}

export function planContact(evidence: Pick<CubeSatEvidence, 'design' | 'contactCapacity' | 'batches'>, choice: string) {
  const capacity = evidence.contactCapacity ?? forecast(evidence.design).contactCapacity
  const diagnostics = choice === 'diagnostics' ? Math.min(capacity, cubeSat.diagnosticBatches) : 0
  const requested = choice === 'priority' ? cubeSat.minimumBatches : evidence.batches
  return { batches: Math.min(requested, evidence.batches, capacity - diagnostics), diagnostics }
}

function finishContact(evidence: CubeSatEvidence, choice: string, accepted?: number) {
  const { batches: received, diagnostics } = planContact(evidence, choice)
  const batches = accepted ?? received
  return {
    choice, batches, diagnostics, archived: received - batches, firstTx: evidence.ditl.firstTx,
    delivered: batches >= cubeSat.minimumBatches, stretch: batches >= cubeSat.stretchBatches,
  }
}

export const cubeSatRules: MissionRules = {
  id: cubeSat.id,
  title: cubeSat.title,
  brief: cubeSat.brief,
  dialogue: 'briefDialogue',
  deadline: cubeSat.deadline,
  budget: cubeSat.budget,
  playMinutes: cubeSat.playMinutes,
  effectiveDeadline: game => game.deadline - cubeSat.launches[(game.design as CubeSatDesign).launch].leadWeeks,
  groups: {
    launch: { legend: 'launch', options: cubeSat.launches },
    payload: { legend: 'payload', options: cubeSat.payloads },
    supply: { legend: 'supply', options: cubeSat.supplies },
    schedule: { legend: 'schedule', options: cubeSat.schedules },
    radio: { legend: 'radio', options: cubeSat.radios },
  },
  initialDesign: cubeSat.initialDesign,
  costs: cubeSat.costs,
  remedies,
  stageDetails: {
    feasibility: 'feasibilityDetail', design: 'designDetail', build: 'buildDetail',
    integration: 'integrationDetail', review: 'reviewDetail', flight: 'flightDetail',
  },
  outcomes: { stopped: 'outcomeStopped', extra: 'outcomeExtra', success: 'outcomeSuccess', partial: 'outcomePartial' },
  reputation: { minimum: 1, stretch: 1 },
  records: game => game.flight?.delivered && game.evidence?.checks.every(Boolean) ? ['cubesat:partnerVerified'] : [],
  flightChoices,
  risks: cubeSatRisks,
  configurationSteps: { feasibility: ['launch', 'payload', 'supply'], design: ['schedule', 'radio'] },
  labSteps: (game, kind) => kind === 'assembly' ? benchSequence(game.benchLead).length : powerTimeline(game.design as CubeSatDesign).length,
  contact: {
    plan: (evidence, choice) => planContact(evidence as CubeSatEvidence, choice),
    finish: (evidence, choice, accepted) => finishContact(evidence as CubeSatEvidence, choice, accepted),
  },
  forecast: design => forecast(design as CubeSatDesign),
  forecastClear: result => !result.deficit,
  test: design => testDesign(design as CubeSatDesign),
  applyRemedy: (design, remedy) => applyRemedy(design as CubeSatDesign, remedy as Remedy),
  repairOptions: (design: Design) => repairOptions(design as CubeSatDesign),
  fly: (evidence, choice) => finishContact(evidence as CubeSatEvidence, choice),
}
