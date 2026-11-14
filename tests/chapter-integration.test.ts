import assert from 'node:assert/strict'
import test from 'node:test'
import { currentEvidence, currentFlightSegment, flightContext, newGame, pendingEvent, pendingReview, runMission, type Game } from '../src/game/mission'
import { completeMission, emptyProgress, isUnlocked } from '../src/game/progress'
import { orbitalState } from '../src/missions/orbital-rules'
import { lunarState } from '../src/missions/lunar-rules'

const decisions: Record<string, string> = {
  lab: 'accept', budgetCut: 'acknowledge', PullIn: 'Accept', SupplierDelay: 'Wait', SecondOffer: 'Alone',
  Review: 'Note', Camera: 'Decline', LauncherSlip: 'Keep', CostReview: 'Grant', SecondPayload: 'Decline',
  PartsAlert: 'Fly', PartnerExit: 'Accept', IcdMismatch: 'Skip',
}

function choose(game: Game, choice: string) {
  const next = runMission(game, { type: 'choose', event: game.event ?? undefined, choice })
  assert.notEqual(next, game, `${game.event} rejects ${choice}`)
  return next
}

function events(game: Game) {
  let event = pendingEvent(game)
  while (event) {
    game = choose(game, event.id.startsWith('found:') ? 'continue' : decisions[event.id])
    event = pendingEvent(game)
  }
  return game
}

function task(game: Game, id: string) {
  const next = runMission(game, { type: 'task', task: id, turn: game.log.length })
  assert.notEqual(next, game, `${id} unavailable at week ${game.week}, ${game.stage}, ${game.credits} cr`)
  return events(next)
}
function tasks(game: Game, ids: string[]) {
  return ids.reduce(task, game)
}

function review(game: Game) {
  const waivers = pendingReview(game)!.issues.flatMap(item => item.waiver ? [item.waiver.id] : [])
  return runMission(game, { type: 'review', waivers, turn: game.log.length })
}

function fly(game: Game) {
  for (let turn = 0; turn < 24 && game.stage === 'flight'; turn++) {
    const segment = currentFlightSegment(game)!
    const options = segment.choices?.(flightContext(game)) ?? []
    const choice = ['Wait', 'Check', 'Rollback', 'Uplink', 'On', 'Continue', 'Exposed', 'extra', 'rest', 'Share', 'confirmFirst']
      .find(id => options.some(option => option.id === id)) ?? options[0]?.id ?? null
    const action = { type: 'segment', segment: segment.id, choice, turn: game.flightProgress?.turn ?? 0 } as const
    const resumed = JSON.parse(JSON.stringify(game)) as Game
    const next = runMission(resumed, action)
    assert.notEqual(next, resumed)
    assert.equal(runMission(next, action), next, 'stale flight decision is ignored')
    game = next
  }
  assert.equal(game.stage, 'results')
  return game
}

test('orbital plays through the shared engine and unlocks lunar funding terms', () => {
  let game = events(newGame('orbital-launch', ['cubesat:partnerVerified'], 4))
  game = review(tasks(game, ['assess', 'prelim']))
  game = tasks(game, ['freeze', 'buildStage', 'buildAvionics', 'lab:integrate', 'linkAnalysis', 'stationTest', 'trade'])
  assert.equal(game.credits, 59)
  assert.equal(orbitalState(game).lab, false)
  assert.equal(game.week, 10)
  game = fly(review(game))
  assert.equal(game.flight?.delivered, true)
  assert.deepEqual(game.flight?.segments?.map(step => step.id), ['ascent', 'pass'])
  const progress = completeMission(emptyProgress, game)
  assert.equal(isUnlocked(progress, 'lunar-mission'), true)
  assert.deepEqual(progress.missions['orbital-launch'].records, ['onTime', 'verified'])
  const lunar = choose(newGame('lunar-mission', progress.missions['orbital-launch'].records, 1), 'funding')
  assert.equal(lunar.credits, 200)
  assert.equal(lunarState(lunar).contract?.milestone, 10)
})

test('orbital hardware changes clear affected risk knowledge and require fresh integration evidence', () => {
  let game = newGame('orbital-launch', [], 4)
  game = review(tasks(game, ['assess', 'prelim']))
  game = tasks(game, ['freeze', 'buildStage', 'buildAvionics', 'integrate', 'linkAnalysis', 'stationTest'])
  assert.equal(orbitalState(game).link.level, 2)
  game = task(game, 'dualStation')
  assert.equal(orbitalState(game).link.level, 0)
  assert.equal(currentEvidence(game), null)
  game = task(game, 'retest')
  assert.equal(currentEvidence(game)?.revision, 1)
})

test('independent lunar development and seven-stage flight deliver on the documented seed', () => {
  let game = choose(newGame('lunar-mission', [], 1), 'decline')
  game = runMission(game, { type: 'configure', design: { ...game.design, route: 'lowEnergy' } })
  game = review(tasks(game, ['assess', 'prelim']))
  game = tasks(game, ['detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'integrate'])
  assert.equal(game.week, 13)
  assert.equal(game.credits, 16)
  assert.equal(currentEvidence(game)?.margin, 16)
  game = review(game)
  assert.equal(game.log.at(-1)?.review?.waivers.length, 5)
  game = fly(game)
  assert.deepEqual(game.flight?.segments?.map(step => step.id), ['launch', 'checkout', 'transfer', 'orbit', 'descent', 'surface', 'night'])
  assert.equal(game.flight?.batches, 1)
  assert.equal(game.flight?.closing, 'unchecked')
})

test('lunar events pause paid work and distinct choices in one flight segment survive reload', () => {
  let game = choose(newGame('lunar-mission', [], 12), 'decline')
  game = runMission(game, { type: 'configure', design: { ...game.design, route: 'lowEnergy' } })
  game = review(tasks(game, ['assess', 'prelim']))
  game = task(game, 'detail')
  const pending = runMission(game, { type: 'task', task: 'freeze', turn: game.log.length })
  assert.equal(pending.event, 'PullIn')
  assert.equal(pending.pendingWork?.remaining, 0)
  game = events(JSON.parse(JSON.stringify(pending)) as Game)
  game = tasks(game, ['buildFlight', 'buildPayload', 'buildGround', 'integrate'])
  game = fly(review(game))
  assert.equal(game.flight?.outcome, 'salvage')
  assert.equal(game.flight?.siteConfirmed, true)
  assert.deepEqual(game.flight?.segments?.at(-1)?.updates, undefined)
})
