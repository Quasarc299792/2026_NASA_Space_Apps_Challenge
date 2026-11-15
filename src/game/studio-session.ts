import { affordable, pendingReview, rulesFor, runMission, taskOptions } from './mission'
import type { Action, Game, Stage } from './types'

export type StudioAction = Action
  | { type: 'assignStudio'; task: string; turn: number; at: number; review?: boolean }
  | { type: 'settleStudio'; work: NonNullable<Game['studioWork']> }
  | { type: 'releaseStudio'; turn: number; at: number }
  | { type: 'finishStudioLaunch'; startedAt: number }
  | { type: 'studioTeach'; stage: Stage }

export const studioLaunchDuration = 5500

const longerWork = new Set(['build', 'buildStage', 'buildFlight', 'integrate'])
const workDuration = (task: string) => longerWork.has(task.split(':').at(-1)!) ? 6000 : 4000

function taskContext(game: Game, review?: boolean) {
  if (!review) return game
  if (!game.commission || game.stage !== 'review' || game.returned || !pendingReview(game)?.issues.length) return null
  return runMission(game, { type: 'review', turn: game.log.length })
}

export function runStudioSession(game: Game, action: StudioAction): Game {
  if (action.type === 'settleStudio') {
    if (game.studioWork !== action.work) return game
    const { studioWork, ...ready } = game
    const context = taskContext(ready, studioWork.review)
    return context ? runMission(context, { type: 'task', task: studioWork.task, turn: context.log.length }) : ready
  }
  if (action.type === 'finishStudioLaunch') {
    if (game.studioLaunch?.startedAt !== action.startedAt) return game
    const { studioLaunch: _launch, ...ready } = game
    return ready
  }
  if (game.studioWork || game.studioLaunch) return game
  if (action.type === 'studioTeach') {
    if (!game.studioTutorial || action.stage !== game.stage || game.studioTutorial.includes(action.stage)) return game
    return { ...game, studioTutorial: [...game.studioTutorial, action.stage] }
  }
  if (action.type === 'releaseStudio') {
    if (!game.commission || !Number.isFinite(action.at)) return game
    const next = runMission(game, { type: 'review', turn: action.turn })
    return game.stage === 'review' && next.stage === 'flight' ? { ...next, studioLaunch: { startedAt: action.at } } : next
  }
  if (action.type === 'assignStudio') {
    if (action.turn !== game.log.length || !Number.isFinite(action.at)) return game
    const context = taskContext(game, action.review)
    const work = context && taskOptions(context).find(task => task.id === action.task)
    if (!context || !work || !affordable(context, work.cost)) return game
    return { ...game, studioWork: { task: action.task, turn: action.turn, startedAt: action.at,
      endsAt: action.at + workDuration(action.task), ...(action.review && { review: true }) } }
  }
  return runMission(game, action)
}

// An older save has no presentation state. A stale presentation can be dropped without losing the mission.
export function restoreStudioSession(game: Game) {
  const { studioWork, studioLaunch, studioTutorial, ...rest } = game
  const workValid = studioWork && studioWork.turn === game.log.length && !game.event && !game.pendingWork
    && game.stage !== 'flight' && game.stage !== 'results' && Object.hasOwn(rulesFor(game).tasks ?? {}, studioWork.task)
    && typeof studioWork.task === 'string' && Number.isFinite(studioWork.startedAt)
    && studioWork.endsAt - studioWork.startedAt === workDuration(studioWork.task)
  const launchValid = studioLaunch && game.commission && game.stage === 'flight' && !game.flightProgress
    && Number.isFinite(studioLaunch.startedAt)
  return { ...rest, ...(workValid && { studioWork }), ...(launchValid && { studioLaunch }),
    ...(game.commission && Array.isArray(studioTutorial) && { studioTutorial }) }
}
