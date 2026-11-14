import type { Message } from '../i18n/en'
import type { DefectState, Maturity, Outcome, Severity } from './risk'

export type Design = Record<string, string>
export type Cost = { weeks: number; credits: number }
export type CostItem = Cost & { label: Message }
export type Work = 'assess' | 'freeze' | 'build' | 'integrate'
export type Stage = 'feasibility' | 'design' | 'build' | 'integration' | 'review' | 'flight' | 'results'
export type Gate = 'MDR' | 'PDR' | 'CDR' | 'FRR'
export type Stop = 'deadline' | 'funds' | 'cancelled'
export type LabPlayback = { kind: 'assembly' | 'integration'; step: number }
export type BenchLead = 'science' | 'power'
export type TestFocus = 'imaging' | 'downlink'
export type ConfigStep = 'payload' | 'supply' | 'schedule' | 'radio'
type Contact = { choice: string; next: number; accepted: number; diagnosticsPending: boolean }

export type DesignOption = { label: Message; description: Message; cost?: number; params?: Record<string, number | string> }
export type OptionGroup = { legend: Message; options: Record<string, DesignOption> }

// Mission-specific fields are produced and read only by that mission's rules and UI.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Forecast = Record<string, any>
export type TestResult = { design: Design; checks: boolean[] } & Record<string, any>
export type Evidence = TestResult & { week: number; revision: number }
export type FlightResult = { choice: string; delivered: boolean; stretch: boolean } & Record<string, any>
/* eslint-enable @typescript-eslint/no-explicit-any */

export type Entry = { id: string; week: number; cost: number; design: Design; report?: Evidence; label?: Message }

export type Game = {
  missionId: string
  stage: Stage
  week: number
  deadline: number
  credits: number
  design: Design
  revision: number
  gate: Gate
  analysis: { design: Design; forecast: Forecast } | null
  evidence: Evidence | null
  flight: FlightResult | null
  stop: Stop | null
  returned: boolean
  event: string | null
  events: string[]
  records: string[]
  log: Entry[]
  // seed fixes every hidden truth of the run. risks holds what the player has learned about each risk item,
  // accepted the risks signed for at flight review, and outcomes what each item turned out to be in flight.
  seed: number
  risks: Record<string, DefectState>
  accepted: string[]
  outcomes: Outcome[]
  playback?: LabPlayback
  benchLead?: BenchLead
  testFocus?: TestFocus
  contact?: Contact
  configStep?: ConfigStep
}

export type Action =
  | { type: 'configure'; design: Design }
  | { type: 'work' | 'analyze' | 'review' | 'wait' | 'cancel' }
  | { type: 'repair'; remedy: string }
  | { type: 'verify' | 'fix'; risk: string }
  | { type: 'fly'; choice: string }
  | { type: 'choose'; choice: string }
  | { type: 'configStep'; step: ConfigStep }
  | { type: 'runLab'; benchLead?: BenchLead; testFocus?: TestFocus }
  | { type: 'advanceLab'; playback: LabPlayback; skip?: boolean }
  | { type: 'startContact'; choice: string }
  | { type: 'checkDiagnostics' }
  | { type: 'checkBatch'; batch: number; deliver: boolean }

export type EventChoice = { id: string; label: Message; detail: Message; apply(game: Game): Game }

export type MissionEvent = {
  id: string
  title: Message
  detail: Message
  trigger(game: Game): boolean
  choices: readonly EventChoice[]
}

// One risk item as the workbench shows it. risk is the player's belief, never the truth.
export type RiskView = {
  id: string
  label: Message
  detail: Message
  failure: Message
  severity: Severity
  maturity: Maturity
  state: DefectState
  risk: number
  // The next verification level: its cost, what the player would believe after a pass and the share of defects it misses.
  next: (Cost & { work: string; passRisk: number; missRate: number }) | null
  fix: Cost & { work: string }
}

export type MissionRisks = {
  // The seeded item behind a risk for this design. A different design option is a different item.
  identity(design: Design, risk: string): { item: string; maturity: Maturity }
  view(game: Game): RiskView[]
  // Risk items whose analysis level is covered by the mission's optional design analysis.
  analysisCovers?: readonly string[]
  odds(game: Game): { minimum: number; noFatal: number }
  // The evidence as it plays out in flight once defects that were never fixed take effect.
  inFlight(game: Game, evidence: Evidence): Evidence
  outcomes(game: Game): Outcome[]
}

export type MissionRules = {
  id: string
  title: Message
  brief: Message
  dialogue: Message
  deadline: number
  budget: number
  playMinutes: string
  groups: Record<string, OptionGroup>
  initialDesign: Design
  costs: Record<Work | 'analyze' | 'wait', CostItem> & Record<string, CostItem>
  remedies: readonly string[]
  stageDetails: Record<Exclude<Stage, 'results'>, Message>
  outcomes: Record<'stopped' | 'extra' | 'success' | 'partial', Message>
  reputation: { minimum: number; stretch: number }
  flightChoices: readonly string[]
  events?: readonly MissionEvent[]
  risks?: MissionRisks
  configurationSteps?: Partial<Record<Stage, readonly ConfigStep[]>>
  labSteps?(game: Game, kind: LabPlayback['kind']): number
  contact?: {
    plan(evidence: Evidence, choice: string): { batches: number; diagnostics: number }
    finish(evidence: Evidence, choice: string, accepted: number): FlightResult
  }
  forecast(design: Design): Forecast
  forecastClear(forecast: Forecast): boolean
  test(design: Design): TestResult
  applyRemedy(design: Design, remedy: string): Design
  repairOptions(design: Design): string[]
  fly(evidence: Evidence, choice: string): FlightResult
  records?(game: Game): string[]
}
