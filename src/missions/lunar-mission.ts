import type { Message } from '../i18n/en'
import {
  hiddenRisk, hiddenValue, knownRange, missionOdds, residualRiskAt, reviewRiskThreshold, rollHidden, rollItem, topLevel,
  type Maturity, type Range, type Roll, type Severity,
} from '../game/risk'

type Text = { label: Message; description: Message }
type Work = { weeks: number; credits: number; label: Message }
type Source = { source: string; url: string }

type LunarShape = {
  title: Message
  brief: Message
  payloads: Record<string, Text & { massKg: number; collectWindows: number; maxBatches: number; maturity: Maturity; cost: number }>
  sensors: Record<string, Text & { massKg: number; backup: boolean; cost: number }>
  powers: Record<string, Text & { massKg: number; nightWindows: number; cost: number }>
  routes: Record<string, Text & { propellantKg: number; correctionKg: Range; maturity: Maturity; leadWeeks: number; cost: number }>
  mounts: Record<string, Text & { interfaceKg: Range; cost: number; supportSlots: number }>
  risks: Record<string, Text & { failure: Message; kind: 'hidden' | 'chance'; severity: Severity; segment: string; steps: readonly [string, string, string] }>
  requires: Record<string, string>
  partnerships: Record<string, Text & { weeks: number; advance: number; milestone: number; supportSlots: number; record: string | null }>
  records: Record<string, { label: Message; from: string; partnership: string; advanceShift: number; supportSlots: number }>
  supportUses: Record<string, { label: Message; weeksSaved: number; creditsSaved: number }>
  events: Record<string, { label: Message; description: Message; afterWeek: number; deadlineChange: number }>
  costs: Record<string, Work>
  remedies: Record<string, Work & { description: Message; requires: Message }>
  gates: Record<string, { work: readonly string[]; pass: Message }>
  segments: readonly { id: string; label: Message; carried: Message }[]
  surfacePlans: Record<string, Text & { reservedWindows: number; deliverAll: boolean }>
  outcomes: Record<string, Text>
  sources: Record<string, Source>
}

export const lunarMission = {
  id: 'lunar-mission',
  title: 'lunar',
  brief: 'lunarBriefStory',
  deadline: 20,
  budget: 150,
  playMinutes: '15–25',
  minimumBatches: 1,
  stretchBatches: 2,
  initialDesign: { payload: 'basic', sensor: 'single', power: 'dayOnly', route: 'direct', mount: 'standard' },

  // Mass budget. Propellant loaded = launchAllocationKg − dry mass, so every kilogram of dry mass costs a kilogram of propellant.
  launchAllocationKg: 500,
  busDryKg: 190,

  // Surface timeline, counted in operations windows across one lunar day.
  daylightWindows: 4,
  degradedWindows: 2,
  downlinkWindows: 1,
  surfaceLossWindows: 1,

  payloads: {
    basic: { label: 'lunarPayloadBasic', description: 'lunarPayloadBasicDetail', massKg: 20, collectWindows: 2, maxBatches: 2, maturity: 'heritage', cost: 20 },
    advanced: { label: 'lunarPayloadAdvanced', description: 'lunarPayloadAdvancedDetail', massKg: 30, collectWindows: 1, maxBatches: 3, maturity: 'new', cost: 34 },
  },
  sensors: {
    single: { label: 'lunarSensorSingle', description: 'lunarSensorSingleDetail', massKg: 6, backup: false, cost: 12 },
    redundant: { label: 'lunarSensorRedundant', description: 'lunarSensorRedundantDetail', massKg: 12, backup: true, cost: 24 },
  },
  powers: {
    dayOnly: { label: 'lunarPowerDayOnly', description: 'lunarPowerDayOnlyDetail', massKg: 0, nightWindows: 0, cost: 0 },
    extended: { label: 'lunarPowerExtended', description: 'lunarPowerExtendedDetail', massKg: 12, nightWindows: 2, cost: 16 },
  },
  routes: {
    direct: { label: 'lunarRouteDirect', description: 'lunarRouteDirectDetail', propellantKg: 270, correctionKg: { min: 4, max: 11 }, maturity: 'heritage', leadWeeks: 0, cost: 0 },
    lowEnergy: { label: 'lunarRouteLowEnergy', description: 'lunarRouteLowEnergyDetail', propellantKg: 252, correctionKg: { min: 2, max: 13 }, maturity: 'new', leadWeeks: 2, cost: 6 },
  },
  // interfaceKg is the range of as-built mass the payload interface adds. The true value is hidden: the trade study
  // halves the range and the integration weighing reveals it. The lightweight mount is paid for with credits or with
  // one partner support slot.
  mounts: {
    standard: { label: 'lunarMountStandard', description: 'lunarMountStandardDetail', interfaceKg: { min: 4, max: 15 }, cost: 0, supportSlots: 0 },
    lightweight: { label: 'lunarMountLightweight', description: 'lunarMountLightweightDetail', interfaceKg: { min: 1, max: 4 }, cost: 16, supportSlots: 1 },
  },

  // Flight risk items. steps are the works that raise the item to analysis, unit test and end-to-end test, in order.
  // correction is a hidden value: fatal when the transfer needs more than the propellant margin. landing is fatal with
  // a single sensor and a tilted landing with the backup. surface costs surfaceLossWindows operations windows.
  // The landing is always a new design. The surface item follows the payload and the correction follows the route.
  risks: {
    correction: { label: 'lunarRiskCorrection', description: 'lunarRiskCorrectionDetail', failure: 'lunarRiskCorrectionFailure', kind: 'hidden', severity: 'fatal', segment: 'transfer', steps: ['navAnalysis', 'thrusterTest', 'navRehearsal'] },
    landing: { label: 'lunarRiskLanding', description: 'lunarRiskLandingDetail', failure: 'lunarRiskLandingFailure', kind: 'chance', severity: 'fatal', segment: 'landing', steps: ['descentSim', 'sensorTest', 'rehearse'] },
    surface: { label: 'lunarRiskSurface', description: 'lunarRiskSurfaceDetail', failure: 'lunarRiskSurfaceFailure', kind: 'chance', severity: 'degraded', segment: 'surface', steps: ['thermalAnalysis', 'thermalTest', 'dayRehearsal'] },
  },
  // Unit tests need the frozen design. End-to-end tests need the built lander, or the ground system for the surface day.
  requires: { thrusterTest: 'freeze', sensorTest: 'freeze', thermalTest: 'freeze', navRehearsal: 'buildFlight', rehearse: 'buildFlight', dayRehearsal: 'buildGround' },

  // Offers stay open until PDR. Contract weeks use main-work turns and must be delivered before FRR.
  // The advance is paid on signing. The milestone payment and support slots arrive on delivery.
  partnerships: {
    funding: { label: 'lunarOfferFunding', description: 'lunarOfferFundingDetail', weeks: 2, advance: 40, milestone: 20, supportSlots: 0, record: 'onTime' },
    tech: { label: 'lunarOfferTech', description: 'lunarOfferTechDetail', weeks: 3, advance: 0, milestone: 0, supportSlots: 3, record: 'verified' },
    decline: { label: 'lunarOfferDecline', description: 'lunarOfferDeclineDetail', weeks: 0, advance: 0, milestone: 0, supportSlots: 0, record: null },
  },
  // Track records from the orbital launch chapter. Each improves one offer and is never required to pass.
  records: {
    onTime: { label: 'lunarRecordOnTime', from: 'orbital-launch', partnership: 'funding', advanceShift: 10, supportSlots: 0 },
    verified: { label: 'lunarRecordVerified', from: 'orbital-launch', partnership: 'tech', advanceShift: 0, supportSlots: 1 },
  },
  supportUses: {
    buildFlight: { label: 'lunarSupportBuildFlight', weeksSaved: 1, creditsSaved: 10 },
    integrate: { label: 'lunarSupportIntegrate', weeksSaved: 1, creditsSaved: 10 },
    mount: { label: 'lunarSupportMount', weeksSaved: 0, creditsSaved: 16 },
    // One verification step run at the partner's facility. It still takes its week and costs nothing.
    verify: { label: 'lunarSupportVerify', weeksSaved: 0, creditsSaved: 0 },
  },

  events: {
    pullIn: { label: 'lunarEventPullInTitle', description: 'lunarEventPullInStory', afterWeek: 4, deadlineChange: -2 },
  },

  costs: {
    contract: { weeks: 1, credits: 0, label: 'lunarContractWork' },
    assess: { weeks: 1, credits: 8, label: 'lunarAssess' },
    trade: { weeks: 1, credits: 6, label: 'lunarTrade' },
    prelim: { weeks: 1, credits: 8, label: 'lunarPrelim' },
    detail: { weeks: 1, credits: 8, label: 'lunarDetail' },
    freeze: { weeks: 1, credits: 10, label: 'lunarFreeze' },
    buildFlight: { weeks: 3, credits: 34, label: 'lunarBuildFlight' },
    buildPayload: { weeks: 2, credits: 16, label: 'lunarBuildPayload' },
    buildGround: { weeks: 1, credits: 10, label: 'lunarBuildGround' },
    integrate: { weeks: 2, credits: 24, label: 'lunarIntegrate' },
    navAnalysis: { weeks: 1, credits: 4, label: 'lunarNavAnalysis' },
    thrusterTest: { weeks: 1, credits: 8, label: 'lunarThrusterTest' },
    navRehearsal: { weeks: 1, credits: 12, label: 'lunarNavRehearsal' },
    descentSim: { weeks: 1, credits: 4, label: 'lunarDescentSim' },
    sensorTest: { weeks: 1, credits: 8, label: 'lunarSensorTest' },
    rehearse: { weeks: 1, credits: 10, label: 'lunarRehearse' },
    thermalAnalysis: { weeks: 1, credits: 4, label: 'lunarThermalAnalysis' },
    thermalTest: { weeks: 1, credits: 8, label: 'lunarThermalTest' },
    dayRehearsal: { weeks: 1, credits: 10, label: 'lunarDayRehearsal' },
    retest: { weeks: 1, credits: 10, label: 'lunarRetest' },
    wait: { weeks: 1, credits: 0, label: 'lunarWait' },
  },
  // Changes after CDR. Any remedy applied after integration makes the evidence stale and needs a retest.
  remedies: {
    mount: { weeks: 1, credits: 16, label: 'lunarRemedyMount', description: 'lunarRemedyMountDetail', requires: 'lunarRequiresCredits' },
    partnerMount: { weeks: 1, credits: 0, label: 'lunarRemedyPartnerMount', description: 'lunarRemedyPartnerMountDetail', requires: 'lunarRequiresSlot' },
    dropKit: { weeks: 1, credits: 0, label: 'lunarRemedyDropKit', description: 'lunarRemedyDropKitDetail', requires: 'lunarRequiresKit' },
    reroute: { weeks: 1, credits: 6, label: 'lunarRemedyReroute', description: 'lunarRemedyRerouteDetail', requires: 'lunarRequiresLead' },
    basicPayload: { weeks: 1, credits: 8, label: 'lunarRemedyBasicPayload', description: 'lunarRemedyBasicPayloadDetail', requires: 'lunarRequiresAdvanced' },
  },

  // PDR needs the best-case margin (low end of the interface range) to cover the low end of the correction range.
  // FRR needs current integration evidence, a delivered contract, the weighed margin covering the low end of the
  // correction range, and a signed acceptance for every flight risk above reviewRiskThreshold.
  gates: {
    MDR: { work: ['assess'], pass: 'lunarMdrPass' },
    PDR: { work: ['prelim'], pass: 'lunarPdrPass' },
    CDR: { work: ['detail', 'freeze'], pass: 'lunarCdrPass' },
    FRR: { work: ['buildFlight', 'buildPayload', 'buildGround', 'integrate'], pass: 'lunarFrrPass' },
  },
  segments: [
    { id: 'launch', label: 'lunarLaunchTitle', carried: 'lunarLaunchCarried' },
    { id: 'transfer', label: 'lunarTransferTitle', carried: 'lunarTransferCarried' },
    { id: 'landing', label: 'lunarLandingTitle', carried: 'lunarLandingCarried' },
    { id: 'surface', label: 'lunarSurfaceTitle', carried: 'lunarSurfaceCarried' },
  ],
  surfacePlans: {
    priority: { label: 'lunarSurfacePriority', description: 'lunarSurfacePriorityDetail', reservedWindows: 0, deliverAll: false },
    extra: { label: 'lunarSurfaceExtra', description: 'lunarSurfaceExtraDetail', reservedWindows: 0, deliverAll: true },
    diagnostics: { label: 'lunarSurfaceDiagnostics', description: 'lunarSurfaceDiagnosticsDetail', reservedWindows: 2, deliverAll: true },
  },

  outcomes: {
    extra: { label: 'lunarOutcomeExtra', description: 'lunarOutcomeExtraDetail' },
    success: { label: 'lunarOutcomeSuccess', description: 'lunarOutcomeSuccessDetail' },
    noData: { label: 'lunarOutcomeNoData', description: 'lunarOutcomeNoDataDetail' },
    lost: { label: 'lunarOutcomeLost', description: 'lunarOutcomeLostDetail' },
    stopped: { label: 'lunarOutcomeStopped', description: 'lunarOutcomeStoppedDetail' },
  },

  sources: {
    segments: { source: 'NASA, Design and Develop Science Missions, slide 8', url: 'https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf#page=8' },
    weighing: { source: 'NASA, Design and Develop Science Missions, slide 19', url: 'https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf#page=19' },
    tradeSpace: { source: 'JPL, Space Mission Concept Development Using Concept Maturity Levels', url: 'https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299' },
    studyProducts: { source: 'NASA GSFC Mission Design Lab', url: 'https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/' },
    trajectory: { source: 'NASA General Mission Analysis Tool (GMAT)', url: 'https://software.nasa.gov/software/GSC-19468-1' },
    lowEnergy: { source: 'NASA, CAPSTONE Uses Gravity on Unusual, Efficient Route to the Moon', url: 'https://www.nasa.gov/missions/small-satellite-missions/capstone-uses-gravity-on-unusual-efficient-route-to-the-moon/' },
    massMargin: { source: 'NASA CubeSat 101 §6.4', url: 'https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=65' },
    integration: { source: 'NASA CubeSat 101 §2.11', url: 'https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=33' },
    retest: { source: 'NASA CubeSat 101 §6.9.1–6.9.2', url: 'https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=69' },
    reviews: { source: 'NASA NPR 7123.1D Appendix G', url: 'https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_7123_001D_&page_name=AppendixG' },
    propulsionLoss: { source: 'NASA, Science, Data Collection Ongoing Aboard Peregrine Mission One', url: 'https://www.nasa.gov/blogs/missions/2024/01/11/nasa-science-data-collection-ongoing-aboard-peregrine-mission-one/' },
    landingSensor: { source: 'NASA, Tech Contributes to Soft Moon Landing', url: 'https://www.nasa.gov/news-release/nasa-tech-contributes-to-soft-moon-landing-agency-science-underway/' },
    tiltedLanding: { source: 'NASA Receives Some Data Before Intuitive Machines Ends Lunar Mission', url: 'https://www.nasa.gov/news-release/nasa-receives-some-data-before-intuitive-machines-ends-lunar-mission/' },
    lunarDay: { source: 'NASA Science Continues After Firefly’s First Moon Mission Concludes', url: 'https://www.nasa.gov/news-release/nasa-science-continues-after-fireflys-first-moon-mission-concludes/' },
  },
} as const satisfies LunarShape & Record<string, unknown>

export const lunarDepartments = ['science', 'flight', 'dynamics', 'ground'] as const
export type LunarDepartment = typeof lunarDepartments[number]
export const lunarProposals = {
  science: { label: 'lunarScience', options: ['dropKit', 'basicPayload'], fallback: 'dropKit', brief: 'lunarScienceBrief' },
  flight: { label: 'lunarFlight', options: ['mount', 'partnerMount'], fallback: 'mount', brief: 'lunarFlightBrief' },
  dynamics: { label: 'lunarDynamics', options: ['reroute'], fallback: 'reroute', brief: 'lunarDynamicsBrief' },
  ground: { label: 'lunarGround', options: ['dropKit', 'reroute'], fallback: 'reroute', brief: 'lunarGroundBrief' },
} as const satisfies Record<LunarDepartment, { label: Message; options: readonly (keyof typeof lunarMission.remedies)[]; fallback: keyof typeof lunarMission.remedies; brief: Message }>

export type LunarDesign = {
  payload: keyof typeof lunarMission.payloads
  sensor: keyof typeof lunarMission.sensors
  power: keyof typeof lunarMission.powers
  route: keyof typeof lunarMission.routes
  mount: keyof typeof lunarMission.mounts
}
export type LunarRisk = keyof typeof lunarMission.risks
export type LunarLevels = Record<LunarRisk, number>
export type LunarPlan = keyof typeof lunarMission.surfacePlans
// interface: 0 before the trade study, 1 after it, topLevel once the assembled spacecraft has been weighed.
export type LunarKnowledge = LunarLevels & { interface: number }
export const lunarRiskIds = Object.keys(lunarMission.risks) as LunarRisk[]

// True values fixed by the seed. Each mount and each route has its own.
export function lunarInterface(seed: number, mount: LunarDesign['mount']) {
  return hiddenValue(seed, `lunar:interface:${mount}`, lunarMission.mounts[mount].interfaceKg)
}
export function lunarCorrection(seed: number, route: LunarDesign['route']) {
  return hiddenValue(seed, `lunar:correction:${route}`, lunarMission.routes[route].correctionKg)
}

// Propellant margin for a given interface mass.
export function lunarMargin(design: LunarDesign, interfaceKg: number) {
  const dry = lunarMission.busDryKg + lunarMission.payloads[design.payload].massKg + lunarMission.sensors[design.sensor].massKg
    + lunarMission.powers[design.power].massKg + interfaceKg
  const loaded = lunarMission.launchAllocationKg - dry
  return { dry, loaded, margin: loaded - lunarMission.routes[design.route].propellantKg }
}

export function lunarInterfaceKnown(seed: number, design: LunarDesign, known: LunarKnowledge) {
  return knownRange(lunarMission.mounts[design.mount].interfaceKg, lunarInterface(seed, design.mount), known.interface)
}

// What the workbench shows. Before the weighing the correction risk is averaged over the interface range still open.
export function lunarRisks(seed: number, design: LunarDesign, known: LunarKnowledge) {
  const route = lunarMission.routes[design.route]
  const iface = lunarInterfaceKnown(seed, design, known)
  const correction = knownRange(route.correctionKg, lunarCorrection(seed, design.route), known.correction)
  let risk = 0
  for (let kg = iface.min; kg <= iface.max; kg += 1) risk += hiddenRisk(correction, lunarMargin(design, kg).margin) / (iface.max - iface.min + 1)
  const backup = lunarMission.sensors[design.sensor].backup
  const surface = lunarMission.payloads[design.payload].maturity as Maturity
  return {
    correction: { id: 'correction', level: known.correction, maturity: route.maturity as Maturity, severity: 'fatal' as Severity, known: correction, limit: lunarMargin(design, iface.max).margin, risk },
    landing: { id: 'landing', level: known.landing, maturity: 'new' as Maturity, severity: (backup ? 'degraded' : 'fatal') as Severity, risk: residualRiskAt('new', known.landing) },
    surface: { id: 'surface', level: known.surface, maturity: surface, severity: 'degraded' as Severity, risk: residualRiskAt(surface, known.surface) },
  }
}

// Best case still open: lightest interface against the smallest correction. Negative means known to fail.
export function lunarBestMargin(seed: number, design: LunarDesign, known: LunarKnowledge) {
  const risks = lunarRisks(seed, design, known)
  return lunarMargin(design, lunarInterfaceKnown(seed, design, known).min).margin - risks.correction.known.min
}

export function lunarBatches(design: LunarDesign, plan: LunarPlan, failed: ReadonlySet<string>) {
  const payload = lunarMission.payloads[design.payload]
  const windows = (failed.has('landing') ? lunarMission.degradedWindows : lunarMission.daylightWindows) + lunarMission.powers[design.power].nightWindows
    - (failed.has('surface') ? lunarMission.surfaceLossWindows : 0) - lunarMission.surfacePlans[plan].reservedWindows
  const batches = Math.max(0, Math.min(payload.maxBatches, Math.floor(windows / (payload.collectWindows + lunarMission.downlinkWindows))))
  return { windows: Math.max(0, windows), batches: lunarMission.surfacePlans[plan].deliverAll ? batches : Math.min(batches, lunarMission.minimumBatches) }
}

// The forecast assumes every surface window goes to science.
export function lunarOdds(seed: number, design: LunarDesign, known: LunarKnowledge) {
  return missionOdds(Object.values(lunarRisks(seed, design, known)), failed => lunarBatches(design, 'extra', failed).batches >= lunarMission.minimumBatches)
}

export function lunarAcceptance(seed: number, design: LunarDesign, known: LunarKnowledge) {
  const risks = lunarRisks(seed, design, known)
  return lunarRiskIds.filter(id => risks[id].risk > reviewRiskThreshold)
}

// The next verification step for a flight risk and what it would leave. Reads true values: debrief only.
export function lunarNextStep(seed: number, design: LunarDesign, known: LunarKnowledge, id: LunarRisk) {
  if (known[id] >= topLevel) return null
  const work = lunarMission.risks[id].steps[known[id]] as keyof typeof lunarMission.costs
  const { weeks, credits } = lunarMission.costs[work]
  const next = lunarRisks(seed, design, { ...known, [id]: known[id] + 1 })
  return { work, weeks, credits, risk: next[id].risk, known: id === 'correction' ? next.correction.known : null }
}

export function flyLunar(seed: number, design: LunarDesign, known: LunarKnowledge, plan: LunarPlan) {
  const risks = lunarRisks(seed, design, known)
  const margin = lunarMargin(design, lunarInterface(seed, design.mount)).margin
  const correction = lunarCorrection(seed, design.route)
  const rolls: Roll[] = [{ ...rollHidden(seed, 'lunar:correction', risks.correction.known, correction, margin), id: 'correction', risk: risks.correction.risk }]
  const lost = (stop: string) => ({ rolls, margin, correction, tilted: false, windows: 0, delivered: 0, outcome: 'lost', stop }) as const
  if (rolls[0].failed) return lost('transfer')
  rolls.push({ ...rollItem(seed, 'lunar:landing', risks.landing.risk), id: 'landing' })
  const tilted = rolls[1].failed
  if (tilted && !lunarMission.sensors[design.sensor].backup) return lost('landing')
  rolls.push({ ...rollItem(seed, 'lunar:surface', risks.surface.risk), id: 'surface' })
  const failed = new Set(rolls.filter(roll => roll.failed).map(roll => roll.id))
  const { windows, batches } = lunarBatches(design, plan, failed)
  const outcome = batches >= lunarMission.stretchBatches ? 'extra' : batches >= lunarMission.minimumBatches ? 'success' : 'noData'
  return { rolls, margin, correction, tilted, windows, delivered: batches, outcome, stop: '' } as const
}
