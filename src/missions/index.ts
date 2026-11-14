import type { ReactNode } from 'react'
import type { Copy, Design, Evidence, FlightResult, Forecast, Game, MissionRules, TestResult } from '../game/types'
import type { Message, Translate } from '../i18n'
import { cubeSatRules } from './cubesat'
import { cubeSatUi } from './cubesat-ui'
import { orbitalRules } from './orbital-rules'
import { lunarRules } from './lunar-rules'
import { orbitalUi, lunarUi } from './chapter-ui'

export type FlightOption = { id: string; name: Message; detail: string }

export type MissionUi = {
  Requirements(props: { t: Translate }): ReactNode
  Estimate(props: { design: Design; game: Game; t: Translate }): ReactNode
  Forecast(props: { design: Design; forecast: Forecast; t: Translate }): ReactNode
  Report(props: { evidence: TestResult; t: Translate }): ReactNode
  RemedyPreview(props: { design: Design; remedy: string; t: Translate }): ReactNode
  Delivery(props: { flight: FlightResult; t: Translate }): ReactNode
  Debrief?(props: { game: Game; t: Translate }): ReactNode
  Status?(props: { game: Game; t: Translate }): ReactNode
  outcome?(game: Game, t: Translate): { title: Message; detail?: Copy }
  flightOptions?(evidence: Evidence, t: Translate): FlightOption[]
  flightSummary(flight: FlightResult, t: Translate): string
}

export type MissionModule = MissionRules & { ui: MissionUi }

export const cubeSatMission: MissionModule = { ...cubeSatRules, ui: cubeSatUi }

export const missions: Record<string, MissionModule> = {
  [cubeSatMission.id]: cubeSatMission,
  [orbitalRules.id]: { ...orbitalRules, ui: orbitalUi },
  [lunarRules.id]: { ...lunarRules, ui: lunarUi },
}

export { missionCatalog } from './rules'
