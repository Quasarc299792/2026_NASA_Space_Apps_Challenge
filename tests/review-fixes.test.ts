import assert from 'node:assert/strict'
import test from 'node:test'
import { newGame, pendingEvent, pendingReview, runMission, type Game } from '../src/game/mission'
import { lunarMission, lunarPlanBatches } from '../src/missions/lunar-mission'
import { lunarRules } from '../src/missions/lunar-rules'

// Rules added after the game review in docs/game-review.md.

function settle(game: Game) {
  for (let event = pendingEvent(game); event; event = pendingEvent(game)) {
    game = runMission(game, { type: 'choose', event: event.id, choice: event.choices.find(choice => choice.available?.(game) !== false)!.id })
  }
  return game
}

function tasks(game: Game, ids: string[]) {
  return ids.reduce((current, id) => {
    const next = settle(runMission(current, { type: 'task', task: id, turn: current.log.length }))
    assert.notEqual(next, current, `${id} unavailable`)
    return next
  }, game)
}

test('a flight review returned only for missing signatures says so and counts them', () => {
  let game = settle(newGame('orbital-launch', [], 4))
  game = tasks(game, ['assess', 'prelim'])
  game = settle(runMission(game, { type: 'review',
    waivers: pendingReview(game)!.issues.flatMap(issue => issue.waiver ? [issue.waiver.id] : []), turn: game.log.length,
  }))
  game = tasks(game, ['freeze', 'buildStage', 'buildAvionics', 'integrate'])
  const review = pendingReview(game)!
  assert.ok(review.issues.length > 0 && review.issues.every(issue => issue.waiver), 'only signatures are open')
  const returned = runMission(game, { type: 'review', waivers: [], turn: game.log.length })
  assert.equal(returned.returned, false)
  assert.deepEqual(returned.log.at(-1)?.review?.detail, { message: 'reviewUnsigned', values: { count: review.issues.length } })
})

test('the surface plan forecast uses the same window arithmetic as the flight', () => {
  const design = lunarMission.initialDesign
  // The survey spectrometer needs 2 windows to collect and 1 to downlink.
  assert.deepEqual(lunarPlanBatches(design, 'extra', 3), { each: 3, batches: 1 })
  assert.deepEqual(lunarPlanBatches(design, 'priority', 1), { each: 3, batches: 0 })
  assert.deepEqual(lunarPlanBatches(design, 'diagnostics', 3), { each: 3, batches: 0 })
  assert.deepEqual(lunarPlanBatches(design, 'extra', 5, 2), { each: 4, batches: 1 })
  assert.deepEqual(lunarPlanBatches({ ...design, payload: 'advanced' }, 'extra', 5), { each: 2, batches: 2 })
})

test('skipping the interface review warns about the extra uplink cost, not zero', () => {
  const card = lunarRules.events!.find(event => event.id === 'IcdMismatch')!
  const skip = card.choices.find(choice => choice.id === 'Skip')!
  assert.equal(skip.values?.(newGame('lunar-mission', [], 1)).credits, lunarMission.uplinkOpenExtra)
})

test('every workbench stage sits in a NASA life-cycle phase and each phase is closed by its review', async () => {
  const { phaseOf, phaseGate } = await import('../src/game/phase')
  const at = (stage: Game['stage'], gate: Game['gate'] = 'MDR') => phaseOf({ stage, gate })
  assert.deepEqual([at('feasibility'), at('design', 'PDR'), at('design', 'CDR'), at('build', 'CDR'), at('integration', 'CDR'),
    at('review', 'CDR'), at('flight', 'FRR'), at('results', 'FRR')], ['A', 'B', 'C', 'C', 'D', 'D', 'E', 'F'])
  assert.deepEqual(phaseGate, { A: 'MDR', B: 'PDR', C: 'CDR', D: 'FRR', E: null, F: null })
  // A chapter run moves through the phases in order as its reviews pass.
  let game = settle(newGame('orbital-launch', [], 4))
  const seen = [phaseOf(game)]
  game = tasks(game, ['assess', 'prelim'])
  seen.push(phaseOf(game))
  game = settle(runMission(game, { type: 'review',
    waivers: pendingReview(game)!.issues.flatMap(issue => issue.waiver ? [issue.waiver.id] : []), turn: game.log.length,
  }))
  seen.push(phaseOf(game))
  game = tasks(game, ['freeze', 'buildStage', 'buildAvionics', 'integrate'])
  seen.push(phaseOf(game))
  assert.deepEqual(seen, ['A', 'B', 'C', 'D'])
})
