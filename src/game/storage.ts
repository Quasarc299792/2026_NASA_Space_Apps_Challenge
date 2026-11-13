import type { Game } from './mission'
import { cubeSat } from '../missions/cubesat'

const key = 'space-mission.single.v1'
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

export function readGame(): Game | null {
  const raw = readLocal(key)
  if (!raw) return null
  try {
    const game: Game = JSON.parse(raw)
    if (game.missionId !== cubeSat.id || !stages.includes(game.stage) || !Array.isArray(game.log)
      || !Number.isInteger(game.week) || game.week < 0 || game.week > cubeSat.deadline
      || !Number.isInteger(game.credits) || game.credits < 0
      || !Object.hasOwn(cubeSat.payloads, game.design.payload) || !Object.hasOwn(cubeSat.supplies, game.design.supply)
      || !Object.hasOwn(cubeSat.schedules, game.design.schedule) || !Object.hasOwn(cubeSat.radios, game.design.radio)) return null
    return game
  } catch {
    return null
  }
}

export function writeGame(game: Game) {
  return writeLocal(key, JSON.stringify(game))
}
