import assert from 'node:assert/strict'
import test from 'node:test'
import {
  believedRisk, defectBelief, defectChance, defectInFlight, detection, drawFromPool, exceedChance, hasDefect, hiddenValue, itemRandom,
  knownRange, missionOdds, seedFromText, testResult, untested, verifyDefect, wouldDetect, type DefectState, type Maturity,
} from '../src/game/risk'

const seeds = Array.from({ length: 4000 }, (_, index) => index + 1)
const maturities = Object.keys(defectChance) as Maturity[]
const close = (actual: number, expected: number, tolerance: number, label = '') =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${label} expected ${expected}, got ${actual}`)

test('the same seed and item always give the same truth and the same test results', () => {
  for (const seed of [0, 1, 42, 2 ** 31, 2 ** 32 - 1]) {
    assert.equal(itemRandom(seed, 'lift'), itemRandom(seed, 'lift'))
    assert.equal(hasDefect(seed, 'landing', 'new'), hasDefect(seed, 'landing', 'new'))
    assert.equal(hiddenValue(seed, 'lift', { min: 0, max: 20 }), hiddenValue(seed, 'lift', { min: 0, max: 20 }))
    for (const level of [1, 2, 3]) assert.equal(testResult(seed, 'landing', 'new', level), testResult(seed, 'landing', 'new', level))
  }
  assert.equal(seedFromText('demo'), seedFromText('demo'))
  assert.notEqual(seedFromText('demo'), seedFromText('demo2'))
  assert.notEqual(itemRandom(7, 'lift'), itemRandom(8, 'lift'))
  assert.notEqual(itemRandom(7, 'lift'), itemRandom(7, 'link'))
  assert.notEqual(itemRandom(7, 'lift', 0), itemRandom(7, 'lift', 1))
})

test('draws are spread evenly over [0, 1)', () => {
  const values = seeds.map(seed => itemRandom(seed, 'landing:truth'))
  assert.ok(values.every(value => value >= 0 && value < 1))
  close(values.reduce((total, value) => total + value, 0) / values.length, 0.5, 0.02, 'mean')
  for (let decile = 0; decile < 10; decile += 1) {
    close(values.filter(value => Math.floor(value * 10) === decile).length / values.length, 0.1, 0.025, `decile ${decile}`)
  }
})

test('one item does not move another, and a truth does not depend on what else is tested', () => {
  const first = seeds.map(seed => itemRandom(seed, 'lift:truth'))
  const second = seeds.map(seed => itemRandom(seed, 'link:truth'))
  const third = seeds.map(seed => itemRandom(seed, 'link:detect'))
  const mean = (list: number[]) => list.reduce((total, value) => total + value, 0) / list.length
  const correlation = (a: number[], b: number[]) => {
    const [ma, mb] = [mean(a), mean(b)]
    return mean(a.map((value, index) => (value - ma) * (b[index] - mb))) / Math.sqrt(mean(a.map(value => (value - ma) ** 2)) * mean(b.map(value => (value - mb) ** 2)))
  }
  assert.ok(Math.abs(correlation(first, second)) < 0.05)
  assert.ok(Math.abs(correlation(second, third)) < 0.05)

  const truth = hasDefect(99, 'landing', 'new')
  testResult(99, 'surface', 'heritage', 3)
  hiddenValue(99, 'lift', { min: 0, max: 45 })
  assert.equal(hasDefect(99, 'landing', 'new'), truth)
})

test('defects start at the stated rates and each level catches the stated share of them', () => {
  assert.deepEqual(defectChance, { heritage: 0.2, new: 0.4 })
  assert.deepEqual(detection, [0, 0.5, 0.85, 0.97])
  for (const maturity of maturities) {
    const defective = seeds.filter(seed => hasDefect(seed, 'landing', maturity))
    close(defective.length / seeds.length, defectChance[maturity], 0.025, maturity)
    for (const level of [1, 2, 3]) {
      close(defective.filter(seed => testResult(seed, 'landing', maturity, level) === 'found').length / defective.length, detection[level], 0.04, `${maturity} level ${level}`)
    }
  }
  // A clean item never fails a test, and no test runs at level 0.
  for (const seed of seeds.slice(0, 500)) {
    if (!hasDefect(seed, 'landing', 'new')) for (const level of [1, 2, 3]) assert.equal(testResult(seed, 'landing', 'new', level), 'passed')
    assert.equal(testResult(seed, 'landing', 'new', 0), 'passed')
    // A deeper level catches everything a shallower one does.
    for (const level of [1, 2]) if (wouldDetect(seed, 'landing', level)) assert.ok(wouldDetect(seed, 'landing', level + 1))
  }
})

test('the believed risk follows Bayes’ rule and matches how often a passed item is in fact defective', () => {
  close(believedRisk('new', 0), 0.4, 1e-9)
  close(believedRisk('new', 1), 0.25, 1e-9)
  close(believedRisk('new', 2), 0.4 * 0.15 / (0.4 * 0.15 + 0.6), 1e-9)
  close(believedRisk('new', 3), 0.4 * 0.03 / (0.4 * 0.03 + 0.6), 1e-9)
  close(believedRisk('heritage', 0), 0.2, 1e-9)
  close(believedRisk('heritage', 1), 0.1 / 0.9, 1e-9)
  for (const maturity of maturities) {
    for (const level of [1, 2, 3]) {
      assert.ok(believedRisk(maturity, level) < believedRisk(maturity, level - 1))
      assert.ok(believedRisk(maturity, level) > 0, 'a passed test never proves the item is clean')
      const passed = seeds.filter(seed => testResult(seed, 'landing', maturity, level) === 'passed')
      close(passed.filter(seed => hasDefect(seed, 'landing', maturity)).length / passed.length, believedRisk(maturity, level), 0.02, `${maturity} level ${level}`)
    }
  }
})

test('verification changes what the player knows and never the truth. Only a fix changes the truth', () => {
  let missed = 0
  let wasted = 0
  let caught = 0
  for (const seed of seeds.slice(0, 1000)) {
    const truth = hasDefect(seed, 'link', 'new')
    let state: DefectState = untested
    close(defectBelief('new', state), 0.4, 1e-9)
    for (let step = 0; step < 3; step += 1) {
      const next = verifyDefect(seed, 'link', 'new', state)
      if (state.found) assert.equal(next, state, 'nothing more to learn once the defect is found')
      state = next
      assert.equal(hasDefect(seed, 'link', 'new'), truth)
      assert.equal(defectInFlight(seed, 'link', 'new', state), truth)
      assert.equal(defectBelief('new', state), state.found ? 1 : believedRisk('new', state.level))
    }
    if (state.found) assert.equal(truth, true)
    caught += Number(state.found)
    missed += Number(truth && !state.found)
    wasted += Number(!truth)
    const fixed = { ...state, fixed: true }
    assert.equal(defectInFlight(seed, 'link', 'new', fixed), false)
    assert.equal(defectBelief('new', fixed), 0)
  }
  // All four cases happen: bad news, a miss by even the deepest test, and tests that only confirm.
  assert.ok(caught > 300 && missed > 0 && wasted > 500)
  // A shallow test misses far more often.
  const shallow = seeds.slice(0, 1000).filter(seed => hasDefect(seed, 'link', 'new') && testResult(seed, 'link', 'new', 1) === 'passed').length
  assert.ok(shallow > missed * 5)
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
  assert.equal(new Set(seeds.map(seed => hiddenValue(seed, 'lift', range))).size, 21)
})

test('the belief shown for a hidden value matches how often it is in fact over the limit', () => {
  const range = { min: 0, max: 20 }
  assert.equal(exceedChance(range, 20), 0)
  assert.equal(exceedChance(range, -1), 1)
  assert.equal(exceedChance({ min: 4, max: 7 }, 5), 0.5)
  for (const level of [0, 1, 2, 3]) {
    let shown = 0
    let over = 0
    for (const seed of seeds) {
      const value = hiddenValue(seed, 'lift', range)
      const belief = exceedChance(knownRange(range, value, level), 8)
      shown += belief
      over += Number(value > 8)
      if (level === 3) assert.equal(belief, Number(value > 8))
    }
    close(shown / seeds.length, over / seeds.length, 0.025, `level ${level}`)
  }
})

test('mission odds weigh every combination of failures', () => {
  assert.deepEqual(missionOdds([]), { minimum: 1, noFatal: 1 })
  const two = missionOdds([{ id: 'a', risk: 0.2, severity: 'degraded' }, { id: 'b', risk: 0.2, severity: 'degraded' }])
  close(two.minimum, 0.64, 1e-9)
  assert.equal(two.noFatal, 1)
  const items = [
    { id: 'transfer', risk: 0.1, severity: 'fatal' }, { id: 'landing', risk: 0.4, severity: 'degraded' }, { id: 'surface', risk: 0.2, severity: 'degraded' },
  ] as const
  const odds = missionOdds(items, failed => !(failed.has('landing') && failed.has('surface')))
  close(odds.noFatal, 0.9, 1e-9)
  close(odds.minimum, 0.9 * (1 - 0.4 * 0.2), 1e-9)
  close(missionOdds(items, () => true).minimum, 0.9, 1e-9, 'a failed fatal item ends the mission whatever the callback says')
})

test('event draws use the seed and ignore verification', () => {
  const pool = ['budgetCut', 'pullIn', 'supplyDelay'] as const
  assert.equal(drawFromPool(5, 'week2', []), null)
  assert.equal(drawFromPool(5, 'week2', pool), drawFromPool(5, 'week2', pool))
  assert.deepEqual(new Set(seeds.slice(0, 200).map(seed => drawFromPool(seed, 'week2', pool))), new Set(pool))
})
