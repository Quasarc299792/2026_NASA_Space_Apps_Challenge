import { commissionRules } from './cubesat-commission'
import type { Game } from '../game/types'
import type { Message } from '../i18n/en'
import type { MissionRules } from '../game/types'
import { cubeSatRules } from './cubesat'
import { orbitalRules } from './orbital-rules'
import { lunarRules } from './lunar-rules'

export const missionRules: Record<string, MissionRules> = {
  [cubeSatRules.id]: cubeSatRules,
  [orbitalRules.id]: orbitalRules,
  [lunarRules.id]: lunarRules,
}

export function getMissionRules(game: Pick<Game, 'missionId' | 'commission'>): MissionRules {
  return game.missionId === cubeSatRules.id && game.commission !== undefined ? commissionRules : missionRules[game.missionId]
}

export const missionCatalog: readonly { id: string; title: Message; deadline: number }[] =
  [cubeSatRules, orbitalRules, lunarRules].map(({ id, title, deadline }) => ({ id, title, deadline }))
