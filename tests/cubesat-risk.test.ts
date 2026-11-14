import assert from 'node:assert/strict'
import test from 'node:test'
import { contactEvidence, defaultSeed, newGame, riskAcceptance, runMission, type Game } from '../src/game/mission'
import { hasDefect, percent, topLevel } from '../src/game/risk'
import { en } from '../src/i18n/en'
import { zhTW } from '../src/i18n/zh-TW'
import { cubeSat, cubeSatRiskIds, riskDebrief, riskIdentity, riskOdds, riskView, type CubeSatRisk } from '../src/missions/cubesat'

// Route checks for the risk rules in docs/story/cubesat.md, played through the real engine with fixed seeds.

const seeds = Array.from({ length: 2000 }, (_, index) => index + 1)
const send = (game: Game, ...actions: Parameters<typeof runMission>[1][]) => actions.reduce(runMission, game)
const work = (game: Game, count: number) => send(game, ...Array.from({ length: count }, () => ({ type: 'work' }) as const))
const verify = (risk: CubeSatRisk) => ({ type: 'verify', risk }) as const
const fix = (risk: CubeSatRisk) => ({ type: 'fix', risk }) as const
const belief = (game: Game) => Object.fromEntries(riskView(game).map(item => [item.id, percent(item.risk)]))
const fly = (game: Game) => send(game, { type: 'review' }, { type: 'fly', choice: 'priority' })
const summary = (game: Game) => ({
  week: game.week, credits: game.credits, stage: game.stage, stop: game.stop, batches: game.flight?.batches ?? null, delivered: game.flight?.delivered ?? false,
  accepted: game.accepted, flew: game.outcomes.map(item => `${item.id} ${percent(item.believed)}% ${item.failed ? 'failed' : 'held'}`),
})

// Verify in the given order. Fix whatever a test finds while a week is left for it.
function verifyAndFix(game: Game, plan: readonly CubeSatRisk[]) {
  for (const risk of plan) {
    game = send(game, verify(risk))
    if (game.risks[risk]?.found && !game.risks[risk].fixed) game = send(game, fix(risk))
  }
  return game
}

const recommended: CubeSatRisk[] = ['imaging', 'imaging', 'power', 'power', 'power']
const strategies = {
  // Baseline options, both items to unit test and one to the end-to-end rehearsal.
  recommended: (seed: number) => fly(work(verifyAndFix(newGame('cubesat', [], seed), recommended), 4)),
  noOptionalVerification: (seed: number) => fly(work(newGame('cubesat', [], seed), 4)),
  everythingVerified: (seed: number) => fly(work(verifyAndFix(newGame('cubesat', [], seed), [...recommended, 'imaging']), 4)),
}

test('every risk text key exists in both dictionaries and no item is fatal', () => {
  for (const risk of Object.values(cubeSat.risks)) {
    for (const key of [risk.label, risk.detail, risk.failure, ...risk.steps.map(step => cubeSat.costs[step].label), cubeSat.costs[risk.fix].label]) {
      assert.ok(key in en && key in zhTW, key)
    }
    const costs = risk.steps.map(step => cubeSat.costs[step].credits)
    assert.equal(costs.length, topLevel)
    assert.ok(costs[0] < costs[1] && costs[1] < costs[2])
  }
  assert.ok(riskView(newGame()).every(item => item.severity === 'degraded'))
  assert.ok(cubeSatRiskIds.length <= 2)
})

test('a new mission carries its seed, and the default seed keeps every item clean', () => {
  assert.equal(newGame().seed, defaultSeed)
  assert.equal(newGame('cubesat', [], 4321).seed, 4321)
  for (const design of [{ payload: 'basic', supply: 'standard' }, { payload: 'advanced', supply: 'reinforced' }]) {
    for (const id of cubeSatRiskIds) {
      const { item, maturity } = riskIdentity(design, id)
      assert.equal(hasDefect(defaultSeed, item, maturity), false)
    }
  }
})

test('seed 6, tests that only confirm: the recommended verification passes and the mission delivers', () => {
  let game = newGame('cubesat', [], 6)
  assert.deepEqual(belief(game), { imaging: 20, power: 20 })
  assert.deepEqual(riskOdds(game), { minimum: 0.6400000000000001, noFatal: 1 })
  game = send(game, verify('imaging'))
  assert.deepEqual([game.week, game.credits, game.risks.imaging, belief(game).imaging], [0, 96, { level: 1, found: false, fixed: false }, 11])
  game = verifyAndFix(game, ['imaging', 'power', 'power', 'power'])
  assert.deepEqual(belief(game), { imaging: 4, power: 1 })
  assert.deepEqual(game.log.map(entry => entry.id), ['imagingAnalysis', 'imagingBench', 'powerAnalysis', 'powerLoadTest', 'powerRehearsal'])
  assert.deepEqual(summary(strategies.recommended(6)), {
    week: 4, credits: 11, stage: 'results', stop: null, batches: 2, delivered: true, accepted: [], flew: ['imaging 4% held', 'power 1% held'],
  })
  // The untested run on the same seed delivers too. The tests bought confidence, not a different satellite.
  assert.deepEqual(summary(strategies.noOptionalVerification(6)), {
    week: 4, credits: 45, stage: 'results', stop: null, batches: 2, delivered: true, accepted: ['imaging', 'power'], flew: ['imaging 20% held', 'power 20% held'],
  })
})

test('seed 13, bad news: analysis finds a charging defect, and the player fixes it or flies with it knowingly', () => {
  let game = send(newGame('cubesat', [], 13), verify('power'))
  assert.deepEqual([game.risks.power, belief(game).power], [{ level: 1, found: true, fixed: false }, 100])
  assert.equal(send(game, verify('power')), game, 'nothing left to learn about a defect that has been found')
  const fixed = send(game, fix('power'))
  assert.deepEqual([fixed.week, fixed.credits, fixed.risks.power, belief(fixed).power], [1, 91, { level: 1, found: true, fixed: true }, 0])
  assert.deepEqual(summary(fly(work(fixed, 4))), {
    week: 5, credits: 36, stage: 'results', stop: null, batches: 2, delivered: true, accepted: ['imaging'], flew: ['imaging 20% held', 'power 0% held'],
  })
  // Left unfixed, the review asks for a signature on a known problem and the batch is lost.
  game = work(game, 4)
  assert.deepEqual(riskAcceptance(game), ['imaging', 'power'])
  assert.deepEqual(summary(fly(game)), {
    week: 4, credits: 41, stage: 'results', stop: null, batches: 1, delivered: false, accepted: ['imaging', 'power'], flew: ['imaging 20% held', 'power 100% failed'],
  })
})

test('seeds 21 and 44, tests can miss: a pass lowers the believed risk and leaves the defect where it was', () => {
  // Seed 21: the charging analysis passes, the lamp test catches the defect.
  let game = send(newGame('cubesat', [], 21), verify('power'))
  assert.deepEqual([game.risks.power.found, belief(game).power], [false, 11])
  game = send(game, verify('power'))
  assert.deepEqual([game.risks.power.found, belief(game).power], [true, 100])
  // Seed 44: analysis and bench test pass on a defective imager. Only the end-to-end rehearsal would have caught it.
  game = send(newGame('cubesat', [], 44), verify('imaging'), verify('imaging'))
  assert.deepEqual([game.risks.imaging, belief(game).imaging], [{ level: 2, found: false, fixed: false }, 4])
  const debrief = riskDebrief(game, 'imaging')
  assert.deepEqual([debrief?.work, debrief?.credits, debrief?.found], ['imagingRehearsal', 12, true])
  const flown = fly(work(game, 4))
  assert.deepEqual([flown.flight?.batches, flown.flight?.delivered, flown.outcomes[0]], [1, false, { id: 'imaging', believed: 0.03614457831325302, failed: true }])
})

test('the optional power and timing analysis also runs the analysis level of both items', () => {
  const clean = send(newGame('cubesat', [], 6), { type: 'analyze' })
  assert.deepEqual([clean.week, clean.credits, clean.risks], [1, 95, { imaging: { level: 1, found: false, fixed: false }, power: { level: 1, found: false, fixed: false } }])
  const found = send(newGame('cubesat', [], 13), { type: 'analyze' })
  assert.deepEqual(found.risks.power, { level: 1, found: true, fixed: false })
})

test('a different imager or supply is a different item: what was learned about the old one is dropped', () => {
  let game = send(newGame('cubesat', [], 6), verify('imaging'), verify('power'))
  game = send(game, { type: 'configure', design: { ...game.design, payload: 'advanced' } })
  assert.deepEqual(game.risks, { power: { level: 1, found: false, fixed: false } })
  assert.deepEqual(belief(game), { imaging: 40, power: 11 })
  // The high-resolution imager collects more than the pass can carry, so one lost batch still leaves the minimum.
  assert.ok(riskOdds(game).minimum > 0.99)
})

test('verifying everything to the top level leaves too little budget for the required work', () => {
  for (const seed of seeds.slice(0, 300)) {
    const game = strategies.everythingVerified(seed)
    const top = cubeSatRiskIds.every(id => game.risks[id]?.level === topLevel)
    if (top) assert.deepEqual([game.stage, game.stop, game.flight], ['results', 'funds', null])
    if (game.flight) assert.ok(cubeSatRiskIds.some(id => game.risks[id]?.found))
  }
  assert.deepEqual(summary(strategies.everythingVerified(6)), { week: 3, credits: 7, stage: 'results', stop: 'funds', batches: null, delivered: false, accepted: [], flew: [] })
})

test('the same seed and the same play give the same run, and test results agree with the flight', () => {
  for (const strategy of Object.values(strategies)) for (const seed of seeds.slice(0, 100)) assert.deepEqual(strategy(seed), strategy(seed))
  for (const seed of seeds.slice(0, 500)) {
    const tested = verifyAndFixNone(newGame('cubesat', [], seed))
    const flown = fly(work(tested, 4))
    for (const id of cubeSatRiskIds) {
      const { item, maturity } = riskIdentity(tested.design, id)
      const truth = hasDefect(seed, item, maturity)
      // A test never reports a defect that is not there, and the flight follows the truth whatever the tests said.
      if (tested.risks[id]?.found) assert.equal(truth, true)
      assert.equal(flown.outcomes.find(entry => entry.id === id)?.failed, truth)
    }
    const lost = flown.outcomes.filter(entry => entry.failed).length
    assert.equal(contactEvidence(flown)?.batches, Math.max(0, 2 - lost))
    // The untested run agrees on the truth.
    assert.deepEqual(strategies.noOptionalVerification(seed).outcomes.map(entry => entry.failed), flown.outcomes.map(entry => entry.failed))
  }
})

// Verify one level on each item without fixing anything.
function verifyAndFixNone(game: Game) {
  return send(game, verify('imaging'), verify('power'))
}

test('balance: success rates over 2000 seeds stay inside the design targets', () => {
  const measure = (strategy: (seed: number) => Game) => {
    const games = seeds.map(strategy)
    return { minimum: games.filter(game => game.flight?.delivered).length / games.length, launched: games.filter(game => game.flight).length / games.length }
  }
  const measured = { recommended: measure(strategies.recommended), none: measure(strategies.noOptionalVerification), everything: measure(strategies.everythingVerified) }
  if (process.env.CUBESAT_BALANCE) console.table(measured)
  assert.ok(measured.recommended.minimum >= 0.95)
  assert.ok(measured.none.minimum >= 0.6 && measured.none.minimum <= 0.75)
  assert.ok(measured.everything.launched < 0.4)
  // The forecast shown before any verification matches how often the untested baseline delivers.
  assert.ok(Math.abs(measured.none.minimum - riskOdds(newGame()).minimum) < 0.03)
})
