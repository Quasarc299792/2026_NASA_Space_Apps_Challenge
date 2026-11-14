import type { Message } from '../i18n/en'
import {
  hiddenRisk, hiddenValue, knownRange, missionOdds, residualRiskAt, reviewRiskThreshold, rollHidden, rollItem, topLevel,
  type Maturity, type Range, type Roll, type Severity,
} from '../game/risk'

type Text = { label: Message; description: Message }
type Work = { weeks: number; credits: number; label: Message }
type Source = { source: string; url: string }

type OrbitalShape = {
  title: Message
  brief: Message
  stages: Record<string, Text & { capacityKg: number; shortfallKg: Range; maturity: Maturity; cost: number }>
  telemetry: Record<string, Text & { massKg: number; diagnosticUnits: number; cost: number }>
  adapters: Record<string, Text & { massKg: number; cost: number }>
  grounds: Record<string, Text & { capacity: number; degradedCapacity: number; cost: number }>
  risks: Record<string, Text & { failure: Message; kind: 'hidden' | 'chance'; severity: Severity; segment: string; steps: readonly [string, string, string] }>
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
  initialDesign: { stage: 'standard', telemetry: 'basic', adapter: 'standard', ground: 'single' },

  // Performance. Margin = stage capacity to the target orbit − carried mass.
  // The stage delivers capacityKg minus a hidden shortfall drawn from shortfallKg at the start of the run.
  // Each lift verification step halves the range the player sees. The hot-fire test reveals the value.
  testPayloadKg: 70,
  marginStretchKg: 25,

  // Data, counted in units that fit in the first ground pass.
  confirmationUnits: 2,

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

  // Risk items. steps are the works that raise the item to analysis, unit test and end-to-end test, in that order.
  // lift is a hidden value and the chapter's only fatal item. link is a chance of failure and only degrades the pass.
  // The link counts as a new design when the diagnostics package or a second station is in the chain.
  risks: {
    lift: { label: 'orbitalRiskLift', description: 'orbitalRiskLiftDetail', failure: 'orbitalRiskLiftFailure', kind: 'hidden', severity: 'fatal', segment: 'ascent', steps: ['trade', 'engineTest', 'hotfire'] },
    link: { label: 'orbitalRiskLink', description: 'orbitalRiskLinkDetail', failure: 'orbitalRiskLinkFailure', kind: 'chance', severity: 'degraded', segment: 'pass', steps: ['linkAnalysis', 'stationTest', 'rehearse'] },
  },
  // Unit tests need the frozen design. The hot-fire needs the built stage and the rehearsal the built avionics.
  requires: { engineTest: 'freeze', stationTest: 'freeze', hotfire: 'buildStage', rehearse: 'buildAvionics' },

  // Offered at the start when the CubeSat chapter ended with a partner-verified end-to-end record.
  labSlot: {
    label: 'orbitalLabSlot',
    description: 'orbitalLabSlotDetail',
    from: 'cubesat',
    expiresWeek: 8,
    uses: {
      integrate: { label: 'orbitalLabSlotIntegrate', creditsSaved: 12 },
      rehearse: { label: 'orbitalLabSlotRehearse', creditsSaved: 8 },
    },
  },
  // Track records this chapter can pass on. The lunar chapter reads them as `onTime` and `verified`.
  // onTime: minimum met and FRR approved by onTimeWeek. verified: minimum met with every risk item verified at FRR
  // and at least verifiedLevels verification steps done in total.
  onTimeWeek: 10,
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
    adapter: { weeks: 1, credits: 8, label: 'orbitalRemedyAdapter', description: 'orbitalRemedyAdapterDetail', requires: 'orbitalRequiresStandardAdapter' },
    dropDiagnostics: { weeks: 1, credits: 4, label: 'orbitalRemedyDropDiagnostics', description: 'orbitalRemedyDropDiagnosticsDetail', requires: 'orbitalRequiresDiagnostics' },
    dualStation: { weeks: 1, credits: 10, label: 'orbitalRemedyDualStation', description: 'orbitalRemedyDualStationDetail', requires: 'orbitalRequiresSingle' },
  },

  // PDR needs margin ≥ 0 at the low end of the known shortfall range. FRR needs current integration evidence, the same
  // margin check, pass capacity ≥ confirmationUnits and a signed acceptance for every risk above reviewRiskThreshold.
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
  stage: keyof typeof orbitalLaunch.stages
  telemetry: keyof typeof orbitalLaunch.telemetry
  adapter: keyof typeof orbitalLaunch.adapters
  ground: keyof typeof orbitalLaunch.grounds
}
export type OrbitalRisk = keyof typeof orbitalLaunch.risks
export type OrbitalLevels = Record<OrbitalRisk, number>
export type OrbitalPlan = keyof typeof orbitalLaunch.passPlans
export const orbitalRiskIds = Object.keys(orbitalLaunch.risks) as OrbitalRisk[]

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

// What the workbench shows for each risk item at the given verification levels.
export function orbitalRisks(seed: number, design: OrbitalDesign, levels: OrbitalLevels) {
  const stage = orbitalLaunch.stages[design.stage]
  const limit = stage.capacityKg - orbitalCarried(design)
  const known = knownRange(stage.shortfallKg, orbitalShortfall(seed, design.stage), levels.lift)
  const maturity = orbitalLinkMaturity(design)
  return {
    lift: { id: 'lift', level: levels.lift, maturity: stage.maturity as Maturity, severity: orbitalLaunch.risks.lift.severity, known, limit, risk: hiddenRisk(known, limit) },
    link: { id: 'link', level: levels.link, maturity, severity: orbitalLaunch.risks.link.severity, risk: residualRiskAt(maturity, levels.link) },
  } as const
}

// Margin at the low end of the known range. Negative means the stack is known to be too heavy.
export function orbitalBestMargin(seed: number, design: OrbitalDesign, levels: OrbitalLevels) {
  const { known, limit } = orbitalRisks(seed, design, levels).lift
  return limit - known.min
}

// The forecast assumes orbit confirmation is sent first.
export function orbitalOdds(seed: number, design: OrbitalDesign, levels: OrbitalLevels) {
  const ground = orbitalLaunch.grounds[design.ground]
  return missionOdds(Object.values(orbitalRisks(seed, design, levels)), failed =>
    (failed.has('link') ? ground.degradedCapacity : ground.capacity) >= orbitalLaunch.confirmationUnits)
}

// The next verification step for an item, the risk it would leave and, for lift, the range it would show.
// For lift this reads the true value, so it belongs in the debrief and not on the workbench. null at the top level.
export function orbitalNextStep(seed: number, design: OrbitalDesign, levels: OrbitalLevels, id: OrbitalRisk) {
  if (levels[id] >= topLevel) return null
  const work = orbitalLaunch.risks[id].steps[levels[id]] as keyof typeof orbitalLaunch.costs
  const { weeks, credits } = orbitalLaunch.costs[work]
  const next = orbitalRisks(seed, design, { ...levels, [id]: levels[id] + 1 })
  return { work, weeks, credits, risk: next[id].risk, known: id === 'lift' ? next.lift.known : null }
}

// Items the player has to sign for at flight review.
export function orbitalAcceptance(seed: number, design: OrbitalDesign, levels: OrbitalLevels) {
  const risks = orbitalRisks(seed, design, levels)
  return orbitalRiskIds.filter(id => risks[id].risk > reviewRiskThreshold)
}

export function flyOrbital(seed: number, design: OrbitalDesign, levels: OrbitalLevels, plan: OrbitalPlan) {
  const risks = orbitalRisks(seed, design, levels)
  const shortfall = orbitalShortfall(seed, design.stage)
  const marginKg = risks.lift.limit - shortfall
  const rolls: Roll[] = [{ ...rollHidden(seed, 'orbital:lift', risks.lift.known, shortfall, risks.lift.limit), id: 'lift' }]
  const flown = { rolls, marginKg, marginProven: false, capacity: 0, confirmation: 0, diagnostics: 0 }
  if (rolls[0].failed) return { ...flown, outcome: 'incomplete', stop: 'ascent' } as const
  rolls.push({ ...rollItem(seed, 'orbital:link', risks.link.risk), id: 'link' })
  const ground = orbitalLaunch.grounds[design.ground]
  const capacity = rolls[1].failed ? ground.degradedCapacity : ground.capacity
  const available = orbitalLaunch.telemetry[design.telemetry].diagnosticUnits
  const first = orbitalLaunch.passPlans[plan].diagnosticsFirst
  const diagnostics = Math.min(available, first ? capacity : Math.max(0, capacity - orbitalLaunch.confirmationUnits))
  const confirmation = Math.min(orbitalLaunch.confirmationUnits, capacity - (first ? diagnostics : 0))
  const marginProven = levels.lift >= topLevel && marginKg >= orbitalLaunch.marginStretchKg
  const passed = { ...flown, marginProven, capacity, confirmation, diagnostics }
  if (confirmation < orbitalLaunch.confirmationUnits) return { ...passed, outcome: 'incomplete', stop: 'pass' } as const
  return { ...passed, outcome: marginProven || (available > 0 && diagnostics === available) ? 'extra' : 'success', stop: '' } as const
}
