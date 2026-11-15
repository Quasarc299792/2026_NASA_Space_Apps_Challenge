import assert from 'node:assert/strict'
import test from 'node:test'
import { currentEvidence, currentFlightSegment, flightContext, newGame, pendingEvent, pendingReview, runMission, type Game } from '../src/game/mission'
import { completeMission, emptyProgress, isUnlocked } from '../src/game/progress'
import { orbitalState } from '../src/missions/orbital-rules'
import { lunarState } from '../src/missions/lunar-rules'

const decisions: Record<string, string> = {
  foundLink: 'continue', lab: 'accept', budgetCut: 'acknowledge', PullIn: 'Accept', SupplierDelay: 'Wait', SecondOffer: 'Alone',
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
  return events(runMission(game, { type: 'review', waivers, turn: game.log.length }))
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
  assert.deepEqual(progress.missions['orbital-launch'].records, ['orbital:onTime', 'orbital:verified'])
  const lunar = choose(newGame('lunar-mission', progress.missions['orbital-launch'].records, 1), 'funding')
  assert.equal(lunar.credits, 212)
  assert.equal(lunarState(lunar).contract?.milestone, 10)
})

test('the sun-synchronous orbit costs lift capacity and pays the sponsor premium only after delivery', () => {
  let game = newGame('orbital-launch', [], 4)
  game = runMission(game, { type: 'configure', design: { ...game.design, orbit: 'sso' } })
  game = review(tasks(events(game), ['assess', 'prelim']))
  // 106 − 20 = 86 kg of lift against 98 kg carried: the stack is over even before any shortfall.
  assert.equal(game.returned, true)
  assert.match(game.log.at(-1)?.review?.detail?.message ?? '', /orbitalPdrReturn/)
  game = runMission(game, { type: 'configure', design: { ...game.design, adapter: 'lightweight' } })
  game = review(game)
  assert.equal(game.gate, 'CDR')
  const before = game.credits
  game = task(game, 'freeze')
  // Freeze costs 8 + 30 stage + 10 telemetry + 8 adapter + 6 ground, with any sponsor premium deferred to delivery.
  assert.equal(game.credits, before - 62)
  assert.deepEqual(game.log.at(-1)?.detail, { message: 'orbitalCdrPass' })
})

test('a second ground station resets handover without invalidating the tested hardware', () => {
  let game = newGame('orbital-launch', [], 4)
  game = review(tasks(game, ['assess', 'prelim']))
  game = tasks(game, ['freeze', 'buildStage', 'buildAvionics', 'integrate', 'linkAnalysis', 'stationTest'])
  assert.equal(orbitalState(game).link.level, 2)
  game = task(game, 'dualStation')
  assert.equal(orbitalState(game).link.level, 0)
  assert.equal(orbitalState(game).handover, false)
  assert.equal(currentEvidence(game)?.revision, 0)
  assert.equal(currentEvidence(game)?.design.ground, 'dual')
})

test('independent lunar development and seven-stage flight deliver on the documented seed', () => {
  let game = choose(newGame('lunar-mission', [], 1), 'decline')
  game = runMission(game, { type: 'configure', design: { ...game.design, route: 'lowEnergy' } })
  game = review(tasks(game, ['assess', 'prelim']))
  game = tasks(game, ['detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'integrate'])
  assert.equal(game.week, 13)
  assert.equal(game.credits, 28)
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
  assert.equal(game.flight?.outcome, 'lost')
  assert.equal(game.flight?.siteConfirmed, true)
  assert.ok(!game.flight?.segments?.some(step => step.id === 'surface'))
  assert.deepEqual(game.flight?.segments?.at(-1)?.updates, undefined)
})

test('a hot fire can force orbit renegotiation while preserving the interface evidence', () => {
  let game = newGame('orbital-launch', [], 2)
  game = runMission(game, { type: 'configure', design: { ...game.design, orbit: 'sso', adapter: 'lightweight' } })
  game = task(game, 'assess')
  assert.equal(runMission(game, { type: 'configure', design: { ...game.design, orbit: 'low' } }), game)
  game = review(task(game, 'prelim'))
  game = tasks(game, ['freeze', 'buildStage', 'buildAvionics', 'integrate', 'trade', 'engineTest', 'hotfire'])
  game = review(game)
  assert.equal(game.returned, true)
  const testedWeek = currentEvidence(game)?.week
  game = task(game, 'retarget')
  assert.equal(game.design.orbit, 'low')
  assert.equal(orbitalState(game).lift, 3)
  assert.equal(currentEvidence(game)?.week, testedWeek)
  const result = fly(review(game))
  assert.equal(result.flight?.premium, 0)
})

test('the cut shows the revised work cost, reopens PDR and preserves stage analysis for both candidates', () => {
  let game = newGame('orbital-launch', [], 4)
  game = runMission(game, { type: 'configure', design: { ...game.design, stage: 'highMargin', telemetry: 'diagnostics' } })
  game = tasks(game, ['assess', 'trade', 'prelim'])
  const waivers = pendingReview(game)!.issues.flatMap(item => item.waiver ? [item.waiver.id] : [])
  game = runMission(game, { type: 'review', waivers })
  const cut = pendingEvent(game)!
  assert.equal(cut.id, 'budgetCut')
  const adjusted = cut.choices.find(choice => choice.id === 'baseline')!
  const unchanged = cut.choices.find(choice => choice.id === 'acknowledge')!
  assert.ok(Number(adjusted.values?.(game).cost) < Number(unchanged.values?.(game).cost))
  const unchangedGame = choose({ ...game, credits: game.credits - 12 }, 'acknowledge')
  assert.equal(runMission(unchangedGame, { type: 'task', task: 'freeze', turn: unchangedGame.log.length }), unchangedGame)
  game = choose(game, 'baseline')
  assert.equal(game.gate, 'PDR')
  assert.equal(game.design.stage, 'standard')
  assert.equal(orbitalState(game).lift, 1)
})

test('diagnostics-first trades the on-time record for diagnostics and does not lose required confirmation', () => {
  let game = newGame('orbital-launch', [], 4)
  game = runMission(game, { type: 'configure', design: { ...game.design, telemetry: 'diagnostics', adapter: 'lightweight' } })
  game = review(tasks(game, ['assess', 'prelim']))
  game = review(tasks(game, ['freeze', 'buildStage', 'buildAvionics', 'integrate']))
  game = runMission(game, { type: 'segment', segment: 'ascent', choice: null, turn: 0 })
  const apply = (choice: string) => runMission(game, { type: 'segment', segment: 'pass', choice, turn: 1 })
  const early = apply('confirmFirst')
  const late = apply('diagnosticsFirst')
  assert.equal(early.flight?.confirmation, 2)
  assert.equal(late.flight?.confirmation, 2)
  assert.equal(late.flight?.diagnostics, 3)
  assert.equal(late.flight?.credits, early.flight?.credits - 10)
  assert.ok(completeMission(emptyProgress, early).missions['orbital-launch'].records.includes('orbital:onTime'))
  assert.ok(!completeMission(emptyProgress, late).missions['orbital-launch'].records.includes('orbital:onTime'))
})

test('a verified handover can carry confirmation without making the detected fault disappear', () => {
  let game = task(newGame('orbital-launch', [], 3), 'assess')
  game = task(game, 'linkAnalysis')
  assert.equal(orbitalState(game).link.found, true)
  game = review(task(game, 'prelim'))
  game = tasks(game, ['freeze', 'dualStation'])
  assert.equal(orbitalState(game).link.found, true)
  assert.equal(orbitalState(game).handover, false)
  game = tasks(game, ['handover', 'buildStage', 'buildAvionics', 'integrate'])
  assert.equal(orbitalState(game).handover, true)
  const finished = fly(review(game))
  assert.equal(finished.flight?.capacity, 3)
  assert.equal(finished.flight?.delivered, true)
  assert.equal(finished.flight?.outcomes[1].failed, true)
})

test('lunar flight review cannot waive propellant below the regular maneuver and a reroute needs fresh evidence', () => {
  let game = choose(newGame('lunar-mission', [], 1), 'decline')
  game = review(tasks(game, ['assess', 'prelim']))
  game = tasks(game, ['detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'integrate'])
  const actual = currentEvidence(game)!
  assert.equal(actual.margin, 4)
  const restriction = pendingReview(game)!.issues.find(issue => issue.detail.message === 'lunarFrrReturnCorrection')
  assert.deepEqual(restriction?.detail.values, { margin: 4, need: 6 })
  assert.equal(restriction?.waiver, undefined)
  assert.equal(review(game).stage, 'review')
  game = task(game, 'reroute')
  assert.equal(currentEvidence(game), null)
  const retested = task(game, 'retest')
  assert.equal(currentEvidence(retested)?.margin, 16)
})

test('late lunar funding pays the displayed advance exactly once', () => {
  let game = choose(newGame('lunar-mission', [], 1), 'decline')
  game = review(tasks(game, ['assess', 'prelim']))
  game = tasks(game, ['detail', 'freeze'])
  game = runMission(game, { type: 'task', task: 'buildFlight', turn: game.log.length })
  const offered = pendingEvent(game)!
  assert.equal(offered.id, 'SecondOffer')
  const funding = offered.choices.find(choice => choice.id === 'Funding')!
  assert.equal(choose(game, 'Funding').credits - game.credits, funding.values?.(game).credits)
})

test('a found and repaired landing sensor satisfies the grant and invalidates integrated evidence', () => {
  let game = choose(newGame('lunar-mission', [], 1), 'decline')
  game = runMission(game, { type: 'configure', design: { ...game.design, route: 'lowEnergy' } })
  game = review(tasks(game, ['assess', 'prelim']))
  game = tasks(game, ['detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'integrate'])
  game = { ...game, credits: 100, missionState: { ...game.missionState, grant: true },
    risks: { ...game.risks, descent: { level: 1, found: true, fixed: false } } }
  assert.ok(pendingReview(game)!.issues.some(issue => issue.detail.message === 'lunarGrantCondition'))
  const fixed = task(game, 'fix:descent')
  assert.equal(currentEvidence(fixed), null)
  const tested = task(fixed, 'retest')
  assert.ok(!pendingReview(tested)!.issues.some(issue => issue.detail.message === 'lunarGrantCondition'))
  assert.equal(review(tested).stage, 'flight')
})
