import type { Message } from '../i18n/en'
import {
  defectBelief, defectInFlight, exceedChance, hiddenValue, knownRange, missionOdds, reviewRiskThreshold, testResult, topLevel, untested, verifyDefect,
  type DefectState, type Maturity, type Outcome, type Range, type Severity,
} from '../game/risk'

type Text = { label: Message; description: Message }
type Work = { weeks: number; credits: number; label: Message }
type Source = { source: string; url: string }

type OrbitalShape = {
  title: Message
  brief: Message
  orbits: Record<string, Text & { altitudeKm: number; inclination: number; capacityLossKg: number; bonus: number; cost: number }>
  stages: Record<string, Text & { capacityKg: number; shortfallKg: Range; maturity: Maturity; cost: number }>
  telemetry: Record<string, Text & { massKg: number; diagnosticUnits: number; cost: number }>
  adapters: Record<string, Text & { massKg: number; cost: number }>
  grounds: Record<string, Text & { capacity: number; degradedCapacity: number; cost: number }>
  risks: Record<string, Text & { failure: Message; kind: 'value' | 'defect'; severity: Severity; segment: string; steps: readonly [string, string, string] }>
  fixes: Record<string, Work & { description: Message }>
  requires: Record<string, string>
  labSlot: { label: Message; description: Message; from: string; expiresWeek: number; uses: Record<string, { label: Message; creditsSaved: number }> }
  records: Record<string, { label: Message; description: Message }>
  events: Record<string, { label: Message; description: Message; afterWeek: number; budgetChange: number }>
  costs: Record<string, Work>
  remedies: Record<string, Work & { description: Message; requires: Message }>
  gates: Record<string, { work: readonly string[]; pass: Message }>
  segments: readonly { id: string; label: Message; carried: Message }[]
  passPlans: Record<string, Text & { diagnosticsFirst: boolean }>
  outcomes: Record<string, Text>
  sources: Record<string, Source>
}

export const orbitalLaunch = {
  id: 'orbital-launch',
  title: 'orbital',
  brief: 'orbitalBriefStory',
  deadline: 12,
  budget: 196,
  playMinutes: '8–12',
  initialDesign: { orbit: 'low', stage: 'standard', telemetry: 'basic', adapter: 'standard', ground: 'single' },

  // Performance. Margin = stage capacity to the target orbit − carried mass.
  // The stage delivers capacityKg minus a hidden shortfall drawn from shortfallKg at the start of the run.
  // Each lift verification step halves the range the player sees. The hot-fire test reveals the value.
  testPayloadKg: 70,
  marginStretchKg: 25,

  // Data, counted in units that fit in the first ground pass.
  confirmationUnits: 2,

  // The sponsor accepts either orbit. A higher, near-polar orbit costs the stage lift capacity: it climbs higher and
  // gets less help from Earth's rotation. capacityLossKg comes off every stage's capacity. bonus is what the sponsor
  // pays on delivery for the orbit its customer wants. Game settings, not a launch provider's figures.
  orbits: {
    low: { label: 'orbitalOrbitLow', description: 'orbitalOrbitLowDetail', altitudeKm: 400, inclination: 51.6, capacityLossKg: 0, bonus: 0, cost: 0 },
    sso: { label: 'orbitalOrbitSso', description: 'orbitalOrbitSsoDetail', altitudeKm: 550, inclination: 97.6, capacityLossKg: 20, bonus: 16, cost: 0 },
  },
  stages: {
    standard: { label: 'orbitalStageStandard', description: 'orbitalStageStandardDetail', capacityKg: 106, shortfallKg: { min: 0, max: 7 }, maturity: 'heritage', cost: 30 },
    highMargin: { label: 'orbitalStageHighMargin', description: 'orbitalStageHighMarginDetail', capacityKg: 130, shortfallKg: { min: 0, max: 45 }, maturity: 'new', cost: 56 },
  },
  telemetry: {
    basic: { label: 'orbitalTelemetryBasic', description: 'orbitalTelemetryBasicDetail', massKg: 8, diagnosticUnits: 0, cost: 10 },
    diagnostics: { label: 'orbitalTelemetryDiagnostics', description: 'orbitalTelemetryDiagnosticsDetail', massKg: 20, diagnosticUnits: 3, cost: 40 },
  },
  adapters: {
    standard: { label: 'orbitalAdapterStandard', description: 'orbitalAdapterStandardDetail', massKg: 20, cost: 0 },
    lightweight: { label: 'orbitalAdapterLightweight', description: 'orbitalAdapterLightweightDetail', massKg: 4, cost: 8 },
  },
  // capacity is the first pass when the data link works. degradedCapacity is what is left when the link risk fails.
  grounds: {
    single: { label: 'orbitalGroundSingle', description: 'orbitalGroundSingleDetail', capacity: 3, degradedCapacity: 1, cost: 6 },
    dual: { label: 'orbitalGroundDual', description: 'orbitalGroundDualDetail', capacity: 6, degradedCapacity: 3, cost: 16 },
  },

  // Risk items. Each truth is drawn from the seed at the start. steps are the works that verify the item by analysis,
  // unit test and end-to-end test, in that order. Verification never changes the truth, only what the player knows.
  // lift is a hidden value and the chapter's only fatal item. link either has a defect or not, and a defect only
  // degrades the pass. The link counts as a new design when the diagnostics package or a second station is in the chain.
  risks: {
    lift: { label: 'orbitalRiskLift', description: 'orbitalRiskLiftDetail', failure: 'orbitalRiskLiftFailure', kind: 'value', severity: 'fatal', segment: 'ascent', steps: ['trade', 'engineTest', 'hotfire'] },
    link: { label: 'orbitalRiskLink', description: 'orbitalRiskLinkDetail', failure: 'orbitalRiskLinkFailure', kind: 'defect', severity: 'degraded', segment: 'pass', steps: ['linkAnalysis', 'stationTest', 'rehearse'] },
  },
  // What a found defect costs to fix. A fix changes the truth: the item is then clean.
  // A lift shortfall is answered with the remedies below or by changing the design before the freeze.
  fixes: {
    link: { weeks: 1, credits: 6, label: 'orbitalFixLink', description: 'orbitalFixLinkDetail' },
  },
  // Unit tests need the frozen design. The hot-fire needs the built stage and the rehearsal the built avionics.
  requires: { engineTest: 'freeze', stationTest: 'freeze', hotfire: 'buildStage', rehearse: 'buildAvionics' },

  // Offered at the start when the CubeSat chapter ended with a partner-verified end-to-end record.
  labSlot: {
    label: 'orbitalLabSlot',
    description: 'orbitalLabSlotDetail',
    from: 'cubesat',
    expiresWeek: 10,
    uses: {
      integrate: { label: 'orbitalLabSlotIntegrate', creditsSaved: 12 },
      rehearse: { label: 'orbitalLabSlotRehearse', creditsSaved: 8 },
    },
  },
  // Track records this chapter can pass on. The lunar chapter reads them as `onTime` and `verified`.
  // onTime: minimum met and FRR approved by onTimeWeek. verified: minimum met with every risk item verified at FRR
  // and at least verifiedLevels verification steps done in total.
  onTimeWeek: 10,
  lateDeliveryFee: 10,
  lunarMarginKg: 10,
  verifiedLevels: 3,
  records: {
    onTime: { label: 'orbitalRecordOnTime', description: 'orbitalRecordOnTimeDetail' },
    verified: { label: 'orbitalRecordVerified', description: 'orbitalRecordVerifiedDetail' },
  },

  events: {
    budgetCut: { label: 'orbitalEventCutTitle', description: 'orbitalEventCutStory', afterWeek: 2, budgetChange: -20 },
  },

  costs: {
    assess: { weeks: 1, credits: 8, label: 'orbitalAssess' },
    trade: { weeks: 1, credits: 5, label: 'orbitalTrade' },
    prelim: { weeks: 1, credits: 6, label: 'orbitalPrelim' },
    freeze: { weeks: 1, credits: 8, label: 'orbitalFreeze' },
    buildStage: { weeks: 2, credits: 24, label: 'orbitalBuildStage' },
    buildAvionics: { weeks: 1, credits: 10, label: 'orbitalBuildAvionics' },
    integrate: { weeks: 1, credits: 12, label: 'orbitalIntegrate' },
    engineTest: { weeks: 1, credits: 8, label: 'orbitalEngineTest' },
    hotfire: { weeks: 1, credits: 14, label: 'orbitalHotfire' },
    linkAnalysis: { weeks: 1, credits: 4, label: 'orbitalLinkAnalysis' },
    stationTest: { weeks: 1, credits: 6, label: 'orbitalStationTest' },
    rehearse: { weeks: 1, credits: 8, label: 'orbitalRehearse' },
    retest: { weeks: 1, credits: 8, label: 'orbitalRetest' },
    wait: { weeks: 1, credits: 0, label: 'orbitalWait' },
  },
  // Changes after CDR. A remedy applied after integration makes that evidence stale and needs a retest.
  remedies: {
    retarget: { weeks: 1, credits: 0, label: 'orbitalRemedyRetarget', description: 'orbitalRemedyRetargetDetail', requires: 'orbitalRequiresSso' },
    adapter: { weeks: 1, credits: 8, label: 'orbitalRemedyAdapter', description: 'orbitalRemedyAdapterDetail', requires: 'orbitalRequiresStandardAdapter' },
    dropDiagnostics: { weeks: 1, credits: 4, label: 'orbitalRemedyDropDiagnostics', description: 'orbitalRemedyDropDiagnosticsDetail', requires: 'orbitalRequiresDiagnostics' },
    dualStation: { weeks: 1, credits: 10, label: 'orbitalRemedyDualStation', description: 'orbitalRemedyDualStationDetail', requires: 'orbitalRequiresSingle' },
  },

  // PDR needs margin ≥ 0 at the low end of the known shortfall range. FRR needs current integration evidence, the same
  // margin check, pass capacity ≥ confirmationUnits and a signed acceptance for every believed risk above
  // reviewRiskThreshold, which includes a defect that a test found and the player chose not to fix.
  gates: {
    MDR: { work: ['assess'], pass: 'orbitalMdrPass' },
    PDR: { work: ['prelim'], pass: 'orbitalPdrPass' },
    CDR: { work: ['freeze'], pass: 'orbitalCdrPass' },
    FRR: { work: ['buildStage', 'buildAvionics', 'integrate'], pass: 'orbitalFrrPass' },
  },

  segments: [
    { id: 'ascent', label: 'orbitalAscentTitle', carried: 'orbitalAscentCarried' },
    { id: 'pass', label: 'orbitalPassTitle', carried: 'orbitalPassCarried' },
  ],
  passPlans: {
    confirmFirst: { label: 'orbitalPassConfirmFirst', description: 'orbitalPassConfirmFirstDetail', diagnosticsFirst: false },
    diagnosticsFirst: { label: 'orbitalPassDiagnosticsFirst', description: 'orbitalPassDiagnosticsFirstDetail', diagnosticsFirst: true },
  },

  outcomes: {
    extra: { label: 'orbitalOutcomeExtra', description: 'orbitalOutcomeExtraDetail' },
    success: { label: 'orbitalOutcomeSuccess', description: 'orbitalOutcomeSuccessDetail' },
    incomplete: { label: 'orbitalOutcomeIncomplete', description: 'orbitalOutcomeIncompleteDetail' },
    stopped: { label: 'orbitalOutcomeStopped', description: 'orbitalOutcomeStoppedDetail' },
  },

  sources: {
    segments: { source: 'NASA, Design and Develop Science Missions, slide 8', url: 'https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf#page=8' },
    massRatio: { source: 'NASA Glenn, Beginner’s Guide to Aeronautics: Mass Ratios', url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/mass-ratios/' },
    performanceMargin: { source: 'NASA CubeSat 101 §1.3', url: 'https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=17' },
    massProperties: { source: 'NASA CubeSat 101 §6.4', url: 'https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=65' },
    verificationMethods: { source: 'NASA Systems Engineering Handbook §5.3 Product Verification', url: 'https://www.nasa.gov/reference/5-3-product-verification/' },
    hotfire: { source: 'NASA, Green Run Update: Full Duration Hot Fire Successfully Completed', url: 'https://www.nasa.gov/blogs/missions/2021/03/18/green-run-update-full-duration-hot-fire-successfully-completed-on-mar-18/' },
    flightData: { source: 'NASA NTRS, End-to-End Assessment of Artemis-1 Development Flight Instrumentation', url: 'https://ntrs.nasa.gov/citations/20200003089' },
    tradeSpace: { source: 'JPL, Space Mission Concept Development Using Concept Maturity Levels', url: 'https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299' },
    studyProducts: { source: 'NASA GSFC Mission Design Lab', url: 'https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/' },
    trajectory: { source: 'NASA General Mission Analysis Tool (GMAT)', url: 'https://software.nasa.gov/software/GSC-19468-1' },
    retest: { source: 'NASA CubeSat 101 §6.9.1–6.9.2', url: 'https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=69' },
    reviews: { source: 'NASA NPR 7123.1D Appendix G', url: 'https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_7123_001D_&page_name=AppendixG' },
  },
} as const satisfies OrbitalShape & Record<string, unknown>

export const orbitalDepartments = ['propulsion', 'avionics', 'ground'] as const
export type OrbitalDepartment = typeof orbitalDepartments[number]
export const orbitalProposals = {
  propulsion: { label: 'orbitalPropulsion', options: ['adapter', 'dropDiagnostics'], fallback: 'adapter', brief: 'orbitalPropulsionBrief' },
  avionics: { label: 'orbitalAvionics', options: ['dropDiagnostics', 'dualStation'], fallback: 'dropDiagnostics', brief: 'orbitalAvionicsBrief' },
  ground: { label: 'orbitalGround', options: ['dualStation'], fallback: 'dualStation', brief: 'orbitalGroundBrief' },
} as const satisfies Record<OrbitalDepartment, { label: Message; options: readonly (keyof typeof orbitalLaunch.remedies)[]; fallback: keyof typeof orbitalLaunch.remedies; brief: Message }>

export type OrbitalDesign = {
  orbit: keyof typeof orbitalLaunch.orbits
  stage: keyof typeof orbitalLaunch.stages
  telemetry: keyof typeof orbitalLaunch.telemetry
  adapter: keyof typeof orbitalLaunch.adapters
  ground: keyof typeof orbitalLaunch.grounds
}
export type OrbitalRisk = keyof typeof orbitalLaunch.risks
// What the player has learned so far: the lift verification level and the state of the link item.
export type OrbitalKnowledge = { lift: number; link: DefectState; handover?: boolean }
export type OrbitalPlan = keyof typeof orbitalLaunch.passPlans
export const orbitalRiskIds = Object.keys(orbitalLaunch.risks) as OrbitalRisk[]
export const orbitalUnknown: OrbitalKnowledge = { lift: 0, link: untested }

// What the chosen stage lifts to the chosen orbit by analysis, before the hidden shortfall.
export function orbitalCapacity(design: OrbitalDesign) {
  return orbitalLaunch.stages[design.stage].capacityKg - orbitalLaunch.orbits[design.orbit ?? 'low'].capacityLossKg
}

export function orbitalCarried(design: OrbitalDesign) {
  return orbitalLaunch.testPayloadKg + orbitalLaunch.telemetry[design.telemetry].massKg + orbitalLaunch.adapters[design.adapter].massKg
}

// The true shortfall of each stage, fixed by the seed. The player sees it only as the known range in orbitalRisks.
export function orbitalShortfall(seed: number, stage: OrbitalDesign['stage']) {
  return hiddenValue(seed, `orbital:lift:${stage}`, orbitalLaunch.stages[stage].shortfallKg)
}

export function orbitalLinkMaturity(design: OrbitalDesign): Maturity {
  return design.telemetry === 'diagnostics' || design.ground === 'dual' ? 'new' : 'heritage'
}

// Each data chain is its own item with its own truth. Changing the telemetry package or the stations starts a new one.
export function orbitalLinkId(design: OrbitalDesign) {
  return `orbital:link:${design.telemetry}:${design.ground}`
}

export function sameOrbitalLink(a: OrbitalDesign, b: OrbitalDesign) {
  return orbitalLinkId(a) === orbitalLinkId(b)
}

// Runs the next link verification level and returns the new state. 'found' is bad news the player has to answer.
export function verifyOrbitalLink(seed: number, design: OrbitalDesign, state: DefectState) {
  return verifyDefect(seed, orbitalLinkId(design), orbitalLinkMaturity(design), state)
}

// What the workbench shows for each item: the player's current belief, not the truth.
export function orbitalRisks(seed: number, design: OrbitalDesign, known: OrbitalKnowledge) {
  const stage = orbitalLaunch.stages[design.stage]
  const limit = orbitalCapacity(design) - orbitalCarried(design)
  const range = knownRange(stage.shortfallKg, orbitalShortfall(seed, design.stage), known.lift)
  const maturity = orbitalLinkMaturity(design)
  return {
    lift: { id: 'lift', level: known.lift, maturity: stage.maturity as Maturity, severity: orbitalLaunch.risks.lift.severity, known: range, limit, risk: exceedChance(range, limit) },
    link: { id: 'link', level: known.link.level, maturity, severity: orbitalLaunch.risks.link.severity, found: known.link.found, fixed: known.link.fixed, risk: defectBelief(maturity, known.link) },
  } as const
}

// Margin at the low end of the known range. Negative means the stack is known to be too heavy.
export function orbitalBestMargin(seed: number, design: OrbitalDesign, known: OrbitalKnowledge) {
  const { known: range, limit } = orbitalRisks(seed, design, known).lift
  return limit - range.min
}

export function orbitalDegradedCapacity(design: OrbitalDesign, known: OrbitalKnowledge) {
  const handover = known.handover ?? known.link.level >= 2
  return !handover && design.ground === 'dual' ? orbitalLaunch.grounds.single.degradedCapacity
    : orbitalLaunch.grounds[design.ground].degradedCapacity
}

// The forecast is built from the player's beliefs and assumes orbit confirmation is sent first.
export function orbitalOdds(seed: number, design: OrbitalDesign, known: OrbitalKnowledge) {
  const ground = orbitalLaunch.grounds[design.ground]
  return missionOdds(Object.values(orbitalRisks(seed, design, known)), failed =>
    (failed.has('link') ? orbitalDegradedCapacity(design, known) : ground.capacity) >= orbitalLaunch.confirmationUnits)
}

// For the debrief: the next verification step for an item and what it would have told the player.
// It reads the truth, so it must not be shown on the workbench. null at the top level or once a defect is found.
export function orbitalNextStep(seed: number, design: OrbitalDesign, known: OrbitalKnowledge, id: OrbitalRisk) {
  const level = id === 'lift' ? known.lift : known.link.level
  if (level >= topLevel || (id === 'link' && (known.link.found || known.link.fixed))) return null
  const work = orbitalLaunch.risks[id].steps[level] as keyof typeof orbitalLaunch.costs
  const { weeks, credits } = orbitalLaunch.costs[work]
  if (id === 'link') return { work, weeks, credits, found: testResult(seed, orbitalLinkId(design), orbitalLinkMaturity(design), level + 1) === 'found', known: null }
  const next = orbitalRisks(seed, design, { ...known, lift: level + 1 }).lift
  return { work, weeks, credits, found: next.risk === 1, known: next.known }
}

// Items the player has to sign for at flight review.
export function orbitalAcceptance(seed: number, design: OrbitalDesign, known: OrbitalKnowledge) {
  const risks = orbitalRisks(seed, design, known)
  return orbitalRiskIds.filter(id => risks[id].risk > reviewRiskThreshold)
}

// Nothing is rolled here. The flight plays out the truths drawn at the start of the run.
export function flyOrbital(seed: number, design: OrbitalDesign, known: OrbitalKnowledge, plan: OrbitalPlan) {
  const risks = orbitalRisks(seed, design, known)
  const shortfall = orbitalShortfall(seed, design.stage)
  const marginKg = risks.lift.limit - shortfall
  const outcomes: Outcome[] = [{ id: 'lift', believed: risks.lift.risk, failed: marginKg < 0, value: shortfall, limit: risks.lift.limit }]
  const flown = { outcomes, marginKg, marginProven: false, capacity: 0, confirmation: 0, diagnostics: 0, late: false, firstConfirmation: 0 }
  if (marginKg < 0) return { ...flown, outcome: 'incomplete', stop: 'ascent' } as const
  const defect = !known.link.fixed && (known.link.found || defectInFlight(seed, orbitalLinkId(design), risks.link.maturity, known.link))
  outcomes.push({ id: 'link', believed: risks.link.risk, failed: defect })
  const ground = orbitalLaunch.grounds[design.ground]
  const capacity = defect ? orbitalDegradedCapacity(design, known) : ground.capacity
  const available = orbitalLaunch.telemetry[design.telemetry].diagnosticUnits
  const first = orbitalLaunch.passPlans[plan].diagnosticsFirst
  const diagnostics = Math.min(available, first ? capacity : Math.max(0, capacity - orbitalLaunch.confirmationUnits))
  const firstConfirmation = Math.min(orbitalLaunch.confirmationUnits, capacity - (first ? diagnostics : 0))
  // A second contact can recover confirmation queued behind diagnostics on a usable link.
  const late = first && available > 0 && capacity >= orbitalLaunch.confirmationUnits
    && firstConfirmation < orbitalLaunch.confirmationUnits
  const confirmation = late ? orbitalLaunch.confirmationUnits : firstConfirmation
  const marginProven = known.lift >= topLevel && marginKg >= orbitalLaunch.marginStretchKg
  const passed = { ...flown, marginProven, capacity, confirmation, diagnostics, late, firstConfirmation }
  if (confirmation < orbitalLaunch.confirmationUnits) return { ...passed, outcome: 'incomplete', stop: 'pass' } as const
  return { ...passed, outcome: marginProven || (available > 0 && diagnostics === available) ? 'extra' : 'success', stop: '' } as const
}
