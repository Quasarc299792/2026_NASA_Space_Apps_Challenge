import type { Message } from '../i18n/en'

type Text = { label: Message; description: Message }
type Work = { weeks: number; credits: number; label: Message }
type Source = { source: string; url: string }

type LunarShape = {
  title: Message
  brief: Message
  payloads: Record<string, Text & { massKg: number; collectWindows: number; maxBatches: number; cost: number }>
  sensors: Record<string, Text & { massKg: number; backup: boolean; cost: number }>
  powers: Record<string, Text & { massKg: number; nightWindows: number; cost: number }>
  routes: Record<string, Text & { propellantKg: number; correctionKg: number; leadWeeks: number; cost: number }>
  mounts: Record<string, Text & { growthKg: number; cost: number; supportSlots: number }>
  partnerships: Record<string, Text & { weeks: number; advance: number; milestone: number; supportSlots: number; record: string | null }>
  records: Record<string, { label: Message; from: string; partnership: string; advanceShift: number; supportSlots: number }>
  supportUses: Record<string, { label: Message; weeksSaved: number; creditsSaved: number }>
  events: Record<string, { label: Message; description: Message; afterWeek: number; deadlineChange: number }>
  costs: Record<string, Work>
  remedies: Record<string, Work & { description: Message; requires: Message }>
  gates: Record<string, { work: readonly string[]; pass: Message }>
  waivers: Record<string, Text>
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
  reserveKg: 10,

  // Surface timeline, counted in operations windows across one lunar day.
  daylightWindows: 4,
  degradedWindows: 2,
  downlinkWindows: 1,

  payloads: {
    basic: { label: 'lunarPayloadBasic', description: 'lunarPayloadBasicDetail', massKg: 20, collectWindows: 2, maxBatches: 2, cost: 20 },
    advanced: { label: 'lunarPayloadAdvanced', description: 'lunarPayloadAdvancedDetail', massKg: 30, collectWindows: 1, maxBatches: 3, cost: 34 },
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
    direct: { label: 'lunarRouteDirect', description: 'lunarRouteDirectDetail', propellantKg: 270, correctionKg: 6, leadWeeks: 0, cost: 0 },
    lowEnergy: { label: 'lunarRouteLowEnergy', description: 'lunarRouteLowEnergyDetail', propellantKg: 252, correctionKg: 4, leadWeeks: 2, cost: 6 },
  },
  // growthKg is the as-built mass the payload interface adds when it is weighed at integration.
  // The lightweight mount is paid for with credits or with one partner support slot.
  mounts: {
    standard: { label: 'lunarMountStandard', description: 'lunarMountStandardDetail', growthKg: 10, cost: 0, supportSlots: 0 },
    lightweight: { label: 'lunarMountLightweight', description: 'lunarMountLightweightDetail', growthKg: 2, cost: 16, supportSlots: 1 },
  },

  // Offers stay open until PDR. Contract weeks use main-work turns and must be delivered before FRR.
  // The advance is paid on signing. The milestone payment and support slots arrive on delivery.
  partnerships: {
    funding: { label: 'lunarOfferFunding', description: 'lunarOfferFundingDetail', weeks: 2, advance: 40, milestone: 20, supportSlots: 0, record: 'onTime' },
    tech: { label: 'lunarOfferTech', description: 'lunarOfferTechDetail', weeks: 3, advance: 0, milestone: 0, supportSlots: 2, record: 'verified' },
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
    buildFlight: { weeks: 3, credits: 30, label: 'lunarBuildFlight' },
    buildPayload: { weeks: 2, credits: 16, label: 'lunarBuildPayload' },
    buildGround: { weeks: 1, credits: 8, label: 'lunarBuildGround' },
    integrate: { weeks: 2, credits: 20, label: 'lunarIntegrate' },
    rehearse: { weeks: 1, credits: 10, label: 'lunarRehearse' },
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

  // PDR also needs estimated margin ≥ reserveKg. FRR needs current integration evidence, loaded propellant ≥ route need,
  // a delivered contract, margin ≥ reserveKg and a descent rehearsal. Only the last two can be waived.
  gates: {
    MDR: { work: ['assess'], pass: 'lunarMdrPass' },
    PDR: { work: ['prelim'], pass: 'lunarPdrPass' },
    CDR: { work: ['detail', 'freeze'], pass: 'lunarCdrPass' },
    FRR: { work: ['buildFlight', 'buildPayload', 'buildGround', 'integrate'], pass: 'lunarFrrPass' },
  },
  waivers: {
    reserve: { label: 'lunarWaiverReserve', description: 'lunarWaiverReserveDetail' },
    rehearsal: { label: 'lunarWaiverRehearsal', description: 'lunarWaiverRehearsalDetail' },
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
