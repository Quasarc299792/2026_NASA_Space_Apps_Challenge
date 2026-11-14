import assert from 'node:assert/strict'
import test from 'node:test'
import {
  drawFromPool, exceedChance, hiddenRisk, hiddenValue, itemRandom, knownRange, missionOdds, residualRisk, residualRiskAt,
  riskFloor, rollHidden, rollItem, seedFromText, type Maturity,
} from '../src/game/risk'

const seeds = Array.from({ length: 4000 }, (_, index) => index + 1)

test('the same seed and item always give the same draw', () => {
  for (const seed of [0, 1, 42, 2 ** 31, 2 ** 32 - 1]) {
    assert.equal(itemRandom(seed, 'lift'), itemRandom(seed, 'lift'))
    assert.deepEqual(rollItem(seed, 'landing', 0.4), rollItem(seed, 'landing', 0.4))
    assert.equal(hiddenValue(seed, 'lift', { min: 0, max: 20 }), hiddenValue(seed, 'lift', { min: 0, max: 20 }))
  }
  assert.equal(seedFromText('demo'), seedFromText('demo'))
  assert.notEqual(seedFromText('demo'), seedFromText('demo2'))
  assert.notEqual(itemRandom(7, 'lift'), itemRandom(8, 'lift'))
  assert.notEqual(itemRandom(7, 'lift'), itemRandom(7, 'link'))
  assert.notEqual(itemRandom(7, 'lift', 0), itemRandom(7, 'lift', 1))
})

test('draws are spread evenly over [0, 1)', () => {
  const values = seeds.map(seed => itemRandom(seed, 'landing:roll'))
  assert.ok(values.every(value => value >= 0 && value < 1))
  const mean = values.reduce((total, value) => total + value, 0) / values.length
  assert.ok(Math.abs(mean - 0.5) < 0.02, `mean ${mean}`)
  for (let decile = 0; decile < 10; decile += 1) {
    const share = values.filter(value => Math.floor(value * 10) === decile).length / values.length
    assert.ok(Math.abs(share - 0.1) < 0.025, `decile ${decile}: ${share}`)
  }
})

test('one item does not move another: results are uncorrelated and independent of what else is rolled', () => {
  const first = seeds.map(seed => itemRandom(seed, 'lift:roll'))
  const second = seeds.map(seed => itemRandom(seed, 'link:roll'))
  const mean = (list: number[]) => list.reduce((total, value) => total + value, 0) / list.length
  const [a, b] = [mean(first), mean(second)]
  const covariance = mean(first.map((value, index) => (value - a) * (second[index] - b)))
  const correlation = covariance / Math.sqrt(mean(first.map(value => (value - a) ** 2)) * mean(second.map(value => (value - b) ** 2)))
  assert.ok(Math.abs(correlation) < 0.05, `correlation ${correlation}`)

  // Rolling other items first, or at a different risk, leaves this item's draw untouched.
  const alone = rollItem(99, 'landing', 0.4)
  rollItem(99, 'surface', 0.2)
  rollItem(99, 'lift', 0.02)
  assert.equal(rollItem(99, 'landing', 0.1).value, alone.value)
  assert.deepEqual(rollItem(99, 'landing', 0.4), alone)
})

test('each verification level lowers the risk, by less each time, and never below the floor', () => {
  for (const maturity of Object.keys(residualRisk) as Maturity[]) {
    const levels = residualRisk[maturity]
    for (let level = 1; level < levels.length; level += 1) assert.ok(levels[level] < levels[level - 1])
    assert.ok(levels.every(risk => risk >= riskFloor))
    assert.equal(levels.at(-1), riskFloor)
    assert.equal(residualRiskAt(maturity, 9), riskFloor)
    assert.equal(residualRiskAt(maturity, -1), levels[0])
  }
  assert.ok(residualRisk.new.every((risk, level) => risk >= residualRisk.heritage[level]))
  assert.deepEqual(residualRisk.heritage, [0.2, 0.12, 0.05, 0.02])
  assert.deepEqual(residualRisk.new, [0.4, 0.25, 0.1, 0.02])
})

test('rolls fail at the stated rate', () => {
  for (const risk of [0.02, 0.2, 0.4]) {
    const failures = seeds.filter(seed => rollItem(seed, 'landing', risk).failed).length / seeds.length
    assert.ok(Math.abs(failures - risk) < 0.025, `risk ${risk}: ${failures}`)
  }
  assert.equal(seeds.some(seed => rollItem(seed, 'x', 0).failed), false)
})

test('a hidden value stays inside every range shown, and the range narrows to the value itself', () => {
  const range = { min: 0, max: 20 }
  for (const seed of seeds.slice(0, 500)) {
    const value = hiddenValue(seed, 'lift', range)
    let previous = range
    for (let level = 0; level <= 3; level += 1) {
      const known = knownRange(range, value, level)
      assert.ok(known.min <= value && value <= known.max)
      assert.ok(known.min >= previous.min && known.max <= previous.max)
      if (level > 0 && previous.max > previous.min) assert.ok(known.max - known.min < previous.max - previous.min)
      previous = known
    }
    assert.deepEqual(previous, { min: value, max: value })
  }
  const counts = new Map<number, number>()
  for (const seed of seeds) { const value = hiddenValue(seed, 'lift', range); counts.set(value, (counts.get(value) ?? 0) + 1) }
  assert.equal(counts.size, 21)
})

test('the risk shown for a hidden value matches how often it fails', () => {
  const range = { min: 0, max: 20 }
  assert.equal(exceedChance(range, 20), 0)
  assert.equal(exceedChance(range, -1), 1)
  assert.equal(exceedChance({ min: 4, max: 7 }, 5), 0.5)
  assert.equal(hiddenRisk(range, 20), riskFloor)
  assert.equal(hiddenRisk(range, -1), 1)
  for (const level of [0, 1, 2, 3]) {
    let shown = 0
    let failed = 0
    for (const seed of seeds) {
      const value = hiddenValue(seed, 'lift', range)
      const roll = rollHidden(seed, 'lift', knownRange(range, value, level), value, 8)
      shown += roll.risk
      failed += Number(roll.failed)
      assert.ok(roll.risk >= riskFloor)
      if (value > 8) assert.equal(roll.failed, true)
    }
    assert.ok(Math.abs(shown - failed) / seeds.length < 0.025, `level ${level}: shown ${shown / seeds.length}, failed ${failed / seeds.length}`)
  }
})

test('mission odds weigh every combination of failures', () => {
  assert.deepEqual(missionOdds([]), { minimum: 1, noFatal: 1 })
  const two = missionOdds([{ id: 'a', risk: 0.2, severity: 'degraded' }, { id: 'b', risk: 0.2, severity: 'degraded' }])
  assert.ok(Math.abs(two.minimum - 0.64) < 1e-9)
  assert.equal(two.noFatal, 1)

  const items = [
    { id: 'transfer', risk: 0.1, severity: 'fatal' }, { id: 'landing', risk: 0.4, severity: 'degraded' }, { id: 'surface', risk: 0.2, severity: 'degraded' },
  ] as const
  // The minimum survives one degraded failure but not both.
  const odds = missionOdds(items, failed => !(failed.has('landing') && failed.has('surface')))
  assert.ok(Math.abs(odds.noFatal - 0.9) < 1e-9)
  assert.ok(Math.abs(odds.minimum - 0.9 * (1 - 0.4 * 0.2)) < 1e-9)
  // A failed fatal item ends the mission whatever the callback says.
  assert.ok(Math.abs(missionOdds(items, () => true).minimum - 0.9) < 1e-9)

  let met = 0
  for (const seed of seeds) {
    const failed = new Set(items.filter(item => rollItem(seed, item.id, item.risk).failed).map(item => item.id))
    met += Number(!failed.has('transfer') && !(failed.has('landing') && failed.has('surface')))
  }
  assert.ok(Math.abs(met / seeds.length - odds.minimum) < 0.025)
})

test('event draws use the seed and ignore verification', () => {
  const pool = ['budgetCut', 'pullIn', 'supplyDelay'] as const
  assert.equal(drawFromPool(5, 'week2', []), null)
  assert.equal(drawFromPool(5, 'week2', pool), drawFromPool(5, 'week2', pool))
  assert.deepEqual(new Set(seeds.slice(0, 200).map(seed => drawFromPool(seed, 'week2', pool))), new Set(pool))
})
