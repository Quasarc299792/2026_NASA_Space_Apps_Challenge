import assert from 'node:assert/strict'
import test from 'node:test'
import { availableWeeks, currentEvidence, newGame, pendingReview, runMission, type Action, type Game } from '../src/game/mission'
import { carriedRecords, completeMission, emptyProgress, reputation } from '../src/game/progress'
import { readGame, writeGame } from '../src/game/storage'
import { missionRules } from '../src/missions/rules'
import { fixtureMission } from './fixtures/mission-engine'

missionRules[fixtureMission.id] = fixtureMission

function reload(game: Game) {
  const data = new Map<string, string>()
  const local = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) }
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: local })
  try {
    assert.equal(writeGame(game), true)
    const restored = readGame()
    assert.deepEqual(restored, game)
    return restored!
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
}

function task(game: Game, id: string) {
  return runMission(game, { type: 'task', task: id, turn: game.log.length })
}

function readyToIntegrate() {
  let game = task(newGame(fixtureMission.id, ['support']), 'assess')
  assert.equal(pendingReview(game), null)
  assert.equal(task(game, 'freeze'), game)
  game = task(game, 'prelim')
  game = runMission(game, { type: 'review' })
  assert.equal(game.returned, true)
  assert.equal(game.log.at(-1)?.review?.gate, 'PDR')
  const week = game.week
  game = runMission(game, { type: 'configure', design: { route: 'lowEnergy' } })
  game = runMission(game, { type: 'review' })
  assert.equal(game.gate, 'CDR')
  assert.equal(game.week, week)
  const changed = runMission(game, { type: 'configure', design: { route: 'direct' } })
  assert.equal(changed.gate, 'PDR')
  assert.equal(task(changed, 'freeze'), changed)
  return task(game, 'freeze')
}

const keep = { type: 'choose', event: 'pull-in', choice: 'keep' } as const
const cut = { ...keep, choice: 'cut' } as const
const waive = { type: 'review', waivers: ['reserve'] } as const

test('paid multiweek work pauses and resumes from v2, then custom FRR approves at the effective deadline', () => {
  const integration = readyToIntegrate()
  const start: Action = { type: 'task', task: 'integrate', turn: integration.log.length }
  const paused = reload(runMission(integration, start))
  assert.equal(paused.week, 4)
  assert.equal(paused.event, 'pull-in')
  assert.equal(paused.pendingWork?.remaining, 2)
  assert.equal(paused.credits, integration.credits - 8)
  assert.equal(paused.missionState?.support, 0)
  assert.equal(paused.evidence, null)
  assert.equal(runMission(paused, start), paused)
  assert.equal(runMission(paused, { ...keep, event: 'stale' }), paused)
  assert.equal(runMission(paused, waive), paused)

  let game = runMission(paused, keep)
  assert.equal(game.stage, 'review')
  assert.equal(game.week, 6)
  assert.equal(availableWeeks(game), 0)
  assert.equal(game.credits, paused.credits)
  assert.equal(game.evidence?.week, 6)
  assert.equal(game.log.filter(entry => entry.id === 'integrate' && entry.report).length, 1)
  assert.equal(runMission(game, keep), game)
  assert.equal(runMission(game, start), game)
  assert.equal(runMission(game, { type: 'review', waivers: ['unknown'] }), game)

  const stale = { ...game, revision: 1 }
  assert.equal(currentEvidence(stale), null)
  assert.equal(runMission(stale, waive), stale)
  const negative = { ...game, evidence: { ...game.evidence!, margin: -1 } }
  assert.equal(runMission(negative, waive), negative)

  game = runMission(game, waive)
  assert.equal(game.returned, true)
  assert.deepEqual(game.log.at(-1)?.review?.waivers, [])
  game = task(game, 'verify')
  const unwaived = runMission(game, { type: 'review' })
  assert.equal(unwaived.returned, true)
  const approved = reload(runMission(unwaived, waive))
  assert.equal(approved.stage, 'flight')
  assert.equal(approved.returned, false)
  assert.equal(approved.log.at(-1)?.review?.detail?.message, 'orbitalFrrPassAnalysis')
  assert.deepEqual(approved.log.at(-1)?.review?.waivers.map(item => item.id), ['reserve'])
  assert.equal(approved.credits, game.credits)
})

test('a shorter deadline interrupts paid work and also prevents late FRR', () => {
  const paused = reload(task(readyToIntegrate(), 'integrate'))
  const stopped = runMission(paused, cut)
  assert.equal(stopped.stage, 'results')
  assert.equal(stopped.stop, 'deadline')
  assert.equal(stopped.week, 4)
  assert.equal(stopped.credits, paused.credits)
  assert.equal(stopped.pendingWork, undefined)
  assert.equal(stopped.evidence, null)
  assert.equal(stopped.log.at(-1)?.incomplete, true)
  assert.equal(stopped.log.at(-1)?.cost, 8)
  assert.equal(runMission(stopped, keep), stopped)
  const review = task(runMission(paused, keep), 'verify')
  const overdue = runMission({ ...review, deadline: stopped.deadline }, waive)
  assert.equal(overdue.stop, 'deadline')
  assert.equal(overdue.gate, 'CDR')
  assert.equal(completeMission(emptyProgress, overdue).missions[fixtureMission.id].minimum, false)
})

test('a final-week event resolves before work produces evidence', () => {
  const id = 'finish-week-fixture'
  missionRules[id] = {
    ...fixtureMission, id,
    events: [{ ...fixtureMission.events![0], trigger: game => game.week === 6 }],
  }
  const paused = reload(task({ ...readyToIntegrate(), missionId: id }, 'integrate'))
  assert.equal(paused.pendingWork?.remaining, 0)
  assert.equal(paused.evidence, null)
  assert.equal(runMission(paused, cut).evidence, null)
  const completed = runMission(paused, keep)
  assert.equal(completed.evidence?.week, 6)
  assert.equal(completed.stage, 'review')
})

test('segmented flight saves choices and state, settles once, and records early interruption', () => {
  const review = task(runMission(task(readyToIntegrate(), 'integrate'), keep), 'verify')
  const approved = runMission(review, waive)
  const launch = { type: 'segment', segment: 'launch', choice: null } as const
  const transfer = { type: 'segment', segment: 'transfer', choice: 'nominal' } as const
  const landing = { type: 'segment', segment: 'landing', choice: null } as const
  assert.equal(runMission(approved, transfer), approved)

  const launched = reload(runMission(approved, launch))
  assert.equal(runMission(launched, launch), launched)
  assert.equal(runMission(launched, { ...transfer, choice: 'invalid' }), launched)

  const failed = runMission(launched, { ...transfer, choice: 'shortfall' })
  assert.equal(failed.stage, 'results')
  assert.equal(failed.flight?.interruptedAt, 'transfer')
  assert.deepEqual(failed.flight?.segments?.map(segment => segment.id), ['launch', 'transfer'])
  assert.equal(failed.flight?.delivered, false)
  assert.equal(runMission(failed, landing), failed)
  const failedProgress = completeMission(emptyProgress, failed)
  assert.equal(reputation(failedProgress), 0)
  assert.deepEqual(carriedRecords(failedProgress), [])

  const transferred = reload(runMission(launched, transfer))
  const success = reload(runMission(transferred, landing))
  assert.equal(success.flight?.delivered, true)
  assert.equal(success.flight?.stretch, true)
  assert.equal(success.flight?.choice, 'nominal')
  assert.deepEqual(success.flight?.segments?.map(segment => segment.id), ['launch', 'transfer', 'landing'])
  assert.equal(success.log.filter(entry => entry.id === 'operate').length, 1)
  assert.equal(runMission(success, landing), success)
  const progress = completeMission(failedProgress, success)
  assert.equal(reputation(progress), 3)
  assert.deepEqual(carriedRecords(progress), ['verified'])
  assert.deepEqual(newGame(fixtureMission.id, carriedRecords(progress)).records, ['verified'])
  assert.equal(completeMission(progress, success), progress)
})
