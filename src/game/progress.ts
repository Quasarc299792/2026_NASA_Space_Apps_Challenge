import { getMissionRules, missionCatalog, missionRules } from '../missions/rules'
import { commissions } from '../missions/cubesat-commission'
import { currentEvidence } from './mission'
import { readLocal, writeLocal } from './storage'
import type { Entry, Game, MissionRules } from './types'

type ReportStatus = 'stopped' | 'short' | 'fulfilled' | 'extra'
type MissionReport = {
  status: ReportStatus
  weeks: number
  spent: number
  data: number
  checks: boolean[] | null
  accepted: number
  commission?: Game['commission']
  design: Game['design']
}
export type MissionRecord = { minimum: boolean; stretch: boolean; records: string[]; report?: MissionReport }
export type Progress = { missions: Record<string, MissionRecord> }

const recordName = (record: string) => record === 'onTime' || record === 'verified' ? `orbital:${record}` : record
const reportOrder: Record<ReportStatus, number> = { stopped: 0, short: 1, fulfilled: 2, extra: 3 }

export function fundingReduced(mission: MissionRules, entry: Entry) {
  return Boolean(mission.events?.some(event => event.id === entry.event && event.reducesFunding))
}

export function missionSpending(mission: MissionRules, game: Game) {
  if (game.missionId === 'cubesat') return mission.budget - game.credits
  return game.log.reduce((total, entry) => total + (fundingReduced(mission, entry) ? 0 : entry.cost), 0)
    + (game.flight?.credits === undefined ? 0 : game.credits - game.flight.credits + (game.flight.premium ?? 0))
}

function missionReport(mission: MissionRules, game: Game): MissionReport {
  const { flight } = game
  const status = !flight ? 'stopped' : flight.stretch ? 'extra' : flight.delivered ? 'fulfilled' : 'short'
  const approval = [...game.log].reverse().find(entry => entry.review?.gate === 'FRR' && entry.review.passed)?.review
  return {
    status,
    weeks: game.week,
    spent: missionSpending(mission, game),
    data: (game.missionId === 'orbital-launch' ? flight?.confirmation : flight?.batches) ?? 0,
    checks: currentEvidence(game)?.checks ?? null,
    accepted: approval?.waivers.length ?? game.accepted.length,
    commission: game.commission,
    design: game.design,
  }
}

function readReport(report: MissionReport | undefined, id: string) {
  if (!report || !Object.hasOwn(reportOrder, report.status) || !report.design || typeof report.design !== 'object'
    || Array.isArray(report.design) || ![report.weeks, report.spent, report.data, report.accepted].every(Number.isFinite)
    || (report.checks !== null && (!Array.isArray(report.checks) || !report.checks.every(check => typeof check === 'boolean')))
    || (report.commission !== undefined && (id !== 'cubesat' || !Object.hasOwn(commissions, report.commission)))) return undefined
  return report
}

const key = 'space-mission.progress.v1'
export const emptyProgress: Progress = { missions: {} }

export function readProgress(): Progress {
  try {
    const progress = JSON.parse(readLocal(key) ?? 'null') as Progress | null
    if (!progress || typeof progress.missions !== 'object' || progress.missions === null) return emptyProgress
    const missions = Object.fromEntries(Object.entries(progress.missions).filter(([id, item]) => Object.hasOwn(missionRules, id)
      && typeof item.minimum === 'boolean' && typeof item.stretch === 'boolean' && Array.isArray(item.records)))
    return { missions: Object.fromEntries(Object.entries(missions).map(([id, item]) => [id, {
      ...item, records: [...new Set(item.records.map(recordName))], report: readReport(item.report, id),
    }])) }
  } catch {
    return emptyProgress
  }
}

export function writeProgress(progress: Progress) {
  return writeLocal(key, JSON.stringify(progress))
}

export function completeMission(progress: Progress, game: Game): Progress {
  const mission = getMissionRules(game)
  if (game.stage !== 'results' || !mission) return progress
  const previous = progress.missions[game.missionId]
  const minimum = Boolean(previous?.minimum || game.flight?.delivered)
  const stretch = Boolean(previous?.stretch || game.flight?.stretch)
  const records = [...new Set([...(previous?.records ?? []), ...(mission.records?.(game) ?? [])])]
  const candidate = missionReport(mission, game)
  // Old saves may already have a better result, but no detailed report for that run.
  const best = previous?.report?.status ?? (previous?.stretch ? 'extra' : previous?.minimum ? 'fulfilled' : 'stopped')
  const report = reportOrder[candidate.status] >= reportOrder[best] ? candidate : previous?.report
  if (previous && previous.minimum === minimum && previous.stretch === stretch && previous.records.length === records.length
    && JSON.stringify(previous.report) === JSON.stringify(report)) return progress
  return { missions: { ...progress.missions, [game.missionId]: { minimum, stretch, records, report } } }
}

export function reputation(progress: Progress) {
  return Object.entries(progress.missions).reduce((total, [id, item]) => {
    const points = missionRules[id]?.reputation
    return total + (points && item.minimum ? points.minimum : 0) + (points && item.stretch ? points.stretch : 0)
  }, 0)
}

export function isUnlocked(progress: Progress, missionId: string) {
  const index = missionCatalog.findIndex(item => item.id === missionId)
  return index === 0 || (index > 0 && Boolean(progress.missions[missionCatalog[index - 1].id]?.minimum))
}

export function nextMission(missionId: string) {
  const index = missionCatalog.findIndex(item => item.id === missionId)
  return index >= 0 ? missionCatalog[index + 1] ?? null : null
}

export function carriedRecords(progress: Progress) {
  return [...new Set(Object.values(progress.missions).flatMap(item => item.records))]
}
