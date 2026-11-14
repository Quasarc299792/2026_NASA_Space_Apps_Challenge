import type { Evidence, Game } from './types'
import { cubeSat, type CubeSatEvidence, type FlightChoice } from '../missions/cubesat'
import { missionRules } from '../missions/rules'

const key = 'space-mission.single.v2'
const legacyKey = 'space-mission.single.v1'
type LegacyEvidence = Omit<CubeSatEvidence, 'checks'> & Pick<Evidence, 'week' | 'revision'>
type LegacyGame = Omit<Game, 'deadline' | 'event' | 'events' | 'records' | 'evidence' | 'flight' | 'log'> & {
  evidence: LegacyEvidence | null
  flight: { choice: FlightChoice; batches: number; stretch: boolean; firstTx: number; diagnostics?: number; archived?: number } | null
  log: (Omit<Game['log'][number], 'report'> & { report?: LegacyEvidence })[]
}
const stages = ['feasibility', 'design', 'build', 'integration', 'review', 'flight', 'results']

export function readLocal(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}

export function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function upgradeEvidence(report: LegacyEvidence): Evidence {
  return { ...report, checks: [report.powerPass, report.dataPass, report.ditlPass] }
}

function upgradeGame(game: LegacyGame): Game | null {
  if (game.missionId !== cubeSat.id || !Array.isArray(game.log)) return null
  return {
    ...game,
    deadline: cubeSat.deadline,
    event: null,
    events: [],
    records: [],
    evidence: game.evidence ? upgradeEvidence(game.evidence) : null,
    flight: game.flight ? { ...game.flight, delivered: game.flight.batches >= cubeSat.minimumBatches } : null,
    log: game.log.map(({ report, ...entry }) => report ? { ...entry, report: upgradeEvidence(report) } : entry),
  }
}

export function readGame(): Game | null {
  const saved = readLocal(key)
  const raw = saved ?? readLocal(legacyKey)
  if (!raw) return null
  try {
    const game: Game | null = saved === null ? upgradeGame(JSON.parse(raw)) : JSON.parse(raw)
    if (!game) return null
    const mission = missionRules[game.missionId]
    if (!mission || !stages.includes(game.stage) || !Array.isArray(game.log) || !Array.isArray(game.events) || !Array.isArray(game.records)
      || !Number.isInteger(game.deadline) || !Number.isInteger(game.week) || game.week < 0
      || !Number.isInteger(game.credits) || game.credits < 0
      || (game.event !== null && !mission.events?.some(event => event.id === game.event))
      || !Object.entries(mission.groups).every(([group, { options }]) => Object.hasOwn(options, game.design?.[group]))) return null
    return game
  } catch {
    return null
  }
}

export function writeGame(game: Game) {
  return writeLocal(key, JSON.stringify(game))
}
