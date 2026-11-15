import assert from 'node:assert/strict'
import test from 'node:test'
import { believedRisk, hasDefect, reviewRiskThreshold } from '../src/game/risk'
import { en } from '../src/i18n/en'
import { zhTW } from '../src/i18n/zh-TW'
import {
  flyLunar, lunarAcceptance, lunarDevDeck, lunarFlightCards, lunarItemId, lunarMass, lunarMaturity, lunarMission as mission, lunarOdds,
  lunarProposals, lunarRiskIds, lunarSeverity, lunarUntested, type LunarDesign,
} from '../src/missions/lunar-mission'
import { cautious, start } from './lunar-run'
import { picks, playRoute, strategies, summary } from './lunar-strategies'

const seeds = Array.from({ length: 2000 }, (_, index) => index + 1)
const basic: LunarDesign = { ...mission.initialDesign }
const routes = [
  ['fundingVerify', 'cautious', 7], ['declineNone', 'cautious', 1], ['techVerify', 'cautious', 3],
  ['fundingSecond', 'cautious', 24], ['stretchNone', 'cautious', 6], ['declineNone', 'diagnostics', 1],
  ['declineNone', 'quitter', 7], ['refuseToSign', 'cautious', 1], ['overspend', 'cautious', 1],
] as const

test('a fixed-seed independent run can deliver using the production workbench', () => {
  const state = playRoute('declineNone', 'cautious', 1).get()
  assert.equal(state.flight?.outcome, 'success')
  assert.equal(state.flight?.batches, 1)
  assert.ok(state.flight?.steps.some(step => step.prompt === 'plan'))
})

test('the books balance on every route: income minus spending is what is left, and the flight only spends', () => {
  for (const [strategy, pick, seed] of routes) {
    const state = playRoute(strategy, pick, seed).get()
    assert.equal(state.income - state.spent, state.credits, `${strategy} ${seed}`)
    assert.ok(state.week <= state.due || state.stop === 'deadline', `${strategy} ${seed}`)
    if (state.flight) assert.ok(state.flight.credits <= state.credits && state.flight.spareKg <= state.margin + 4)
  }
})

test('the same seed and the same choices give exactly the same run', () => {
  for (const name of Object.keys(strategies)) for (const pick of Object.keys(picks)) for (const seed of [1, 7, 99, 1234]) {
    const [first, second] = [playRoute(name, pick, seed), playRoute(name, pick, seed)]
    assert.deepEqual(summary(first), summary(second))
    assert.deepEqual(first.get().flight?.steps, second.get().flight?.steps)
  }
})

test('verification looks at a fixed truth: the order of work and other tests never change what a test reports', () => {
  for (const seed of seeds.slice(0, 300)) {
    const reports = (order: readonly (typeof lunarRiskIds[number])[]) => {
      const run = start(seed).design({ route: 'lowEnergy' })
      run.work('assess')
      return Object.fromEntries(order.map(id => [id, run.verify(id)]))
    }
    const forward = reports(['software', 'pressure', 'thrusters', 'descent', 'payload'])
    const backward = reports(['payload', 'descent', 'thrusters', 'pressure', 'software'])
    assert.deepEqual(forward, { ...backward })
    for (const id of lunarRiskIds) if (forward[id] === 'found') assert.ok(hasDefect(seed, lunarItemId(basic, id), lunarMaturity(basic, id)))
  }
})

test('a fixed defect never shows up in flight, and an unfixed known defect always does', () => {
  let fixed = 0
  for (const seed of seeds.slice(0, 600)) {
    const states = lunarUntested()
    if (!hasDefect(seed, 'lunar:pressure', 'heritage')) continue
    const fly = (state: typeof states.pressure) => flyLunar(seed, { design: { ...basic, route: 'lowEnergy', sensor: 'redundant' }, states: { ...states, pressure: state }, marginKg: 30, credits: 40 }, cautious)
    assert.ok(fly({ level: 2, found: true, fixed: false }).failures.includes('pressure'))
    assert.ok(!fly({ level: 2, found: true, fixed: true }).failures.includes('pressure'))
    fixed += 1
  }
  assert.ok(fixed > 60)
})

test('a backup lidar turns a descent defect from the end of the mission into a landing', () => {
  for (const seed of seeds.slice(0, 600)) {
    if (!hasDefect(seed, 'lunar:descent', 'new')) continue
    const fly = (sensor: LunarDesign['sensor']) => flyLunar(seed, { design: { ...basic, route: 'lowEnergy', sensor }, states: lunarUntested(), marginKg: 40, credits: 40 }, cautious)
    const [single, backup] = [fly('single'), fly('redundant')]
    if (single.segment === 'descent') assert.ok(single.outcome === 'lost' || single.outcome === 'salvage')
    if (backup.failures.includes('descent')) assert.ok(!backup.upright && backup.outcome !== 'lost')
  }
  assert.equal(lunarSeverity(basic, 'descent'), 'fatal')
  assert.equal(lunarSeverity({ ...basic, sensor: 'redundant' }, 'descent'), 'degraded')
  assert.equal(lunarSeverity(basic, 'thrusters'), 'degraded')
  assert.equal(lunarSeverity(basic, 'thrusters', true), 'fatal')
})

test('the event deck: the pull-in comes in the first two draws, the rest is a full shuffle and every card turns up', () => {
  const first = new Set<string>()
  const others = mission.devCards.map(item => item.id).filter(id => id !== 'PullIn').sort()
  for (const seed of seeds) {
    const deck = lunarDevDeck(seed)
    assert.ok(deck.pullInSlot === 0 || deck.pullInSlot === 1)
    assert.deepEqual([...deck.order].sort(), others)
    assert.deepEqual(lunarDevDeck(seed), deck)
    first.add(deck.order[0])
    const flight = lunarFlightCards(seed)
    first.add(flight.launch); first.add(flight.cruise)
  }
  for (const item of [...mission.devCards.filter(card => card.id !== 'PullIn'), ...mission.launchCards, ...mission.cruiseCards]) assert.ok(first.has(item.id), item.id)
  assert.ok(mission.devCards.length + mission.launchCards.length + mission.cruiseCards.length + mission.lossCards.length >= 12)
})

test('a run that reaches flight meets five external events, six when an orbiter offers to image a lost lander', () => {
  for (const seed of seeds.slice(0, 400)) for (const name of ['fundingVerify', 'techVerify', 'declineSome']) {
    const state = strategies[name](seed).get()
    const drawn = state.events.filter(event => mission.devCards.some(item => item.id === event.card))
    assert.ok(drawn.every(event => event.choice), `${name} ${seed}`)
    assert.equal(new Set(drawn.map(event => event.card)).size, drawn.length)
    if (state.week >= 16) assert.equal(drawn.length, mission.drawWeeks.length, `${name} ${seed}`)
    assert.equal(drawn.filter(event => event.card === 'PullIn').length, state.week >= 10 ? 1 : drawn.filter(event => event.card === 'PullIn').length)
  }
})

test('mass, verification ladder and review thresholds match the story document', () => {
  assert.equal(lunarMass(basic).margin, 4)
  assert.equal(lunarMass({ ...basic, mount: 'lightweight' }).margin, 12)
  assert.equal(lunarMass({ ...basic, route: 'lowEnergy' }).margin, 16)
  assert.equal(lunarMass(basic, 0, false).margin, 14)
  const ladder = lunarRiskIds.flatMap(id => mission.risks[id].steps.map(step => mission.costs[step]))
  assert.equal(ladder.length, 18)
  assert.equal(ladder.reduce((total, step) => total + step.weeks, 0), 18)
  assert.equal(ladder.reduce((total, step) => total + step.credits, 0), 114)
  const mainline = (['assess', 'prelim', 'detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'integrate'] as const).map(id => mission.costs[id])
  assert.equal(mainline.reduce((total, step) => total + step.weeks, 0), 12)
  assert.equal(mainline.reduce((total, step) => total + step.credits, 0) + mission.payloads.basic.cost + mission.sensors.single.cost, 140)
  // Unverified items are all above the signing threshold. A heritage item clears it at unit test, a new one only end to end.
  assert.deepEqual(lunarAcceptance(basic, lunarUntested()), ['software', 'pressure', 'thrusters', 'descent', 'payload'])
  assert.ok(believedRisk('heritage', 2) < reviewRiskThreshold && believedRisk('new', 2) > reviewRiskThreshold && believedRisk('new', 3) < reviewRiskThreshold)
  const odds = lunarOdds(basic, lunarUntested())
  assert.ok(Math.abs(odds.noFatal - 0.6) < 1e-9 && odds.minimum < odds.noFatal)
})

test('production play over 2,000 seeds exercises funding, evidence and surface decisions', () => {
  const rates = Object.fromEntries(['declineNone', 'declineSome', 'fundingVerify', 'techVerify', 'stretchNone'].map(name => {
    const delivered = seeds.filter(seed => {
      const result = playRoute(name, 'cautious', seed).get().flight
      return result?.outcome === 'success' || result?.outcome === 'extra'
    }).length
    return [name, delivered / seeds.length]
  }))
  if (process.env.LUNAR_BALANCE) console.table(rates)
  for (const rate of Object.values(rates)) assert.ok(rate > 0.1 && rate < 0.95, JSON.stringify(rates))
  assert.ok(rates.fundingVerify > rates.declineNone, JSON.stringify(rates))
})

test('production routes reach both useful deliveries and losses', () => {
  const outcomes = new Set(seeds.slice(0, 120).flatMap(seed => [
    playRoute('declineNone', 'cautious', seed).ending().outcome,
    playRoute('stretchNone', 'bold', seed).ending().outcome,
  ]))
  for (const outcome of ['lost', 'salvage', 'success', 'noData']) assert.ok(outcomes.has(outcome), outcome)
})

function keysIn(value: unknown, found = new Set<string>()): Set<string> {
  if (typeof value === 'string' && /^lunar[A-Z]?/.test(value) && value in en) found.add(value)
  else if (value && typeof value === 'object') Object.values(value).forEach(item => keysIn(item, found))
  return found
}
const variables = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort().join()

test('both dictionaries hold every lunar text key, with the same variables in each language', () => {
  assert.deepEqual(Object.keys(zhTW).sort(), Object.keys(en).sort())
  const used = keysIn({ mission, lunarProposals })
  assert.ok(used.size > 350, `${used.size}`)
  const dictionaries: Record<string, string>[] = [en, zhTW]
  for (const key of Object.keys(en).filter(name => name.startsWith('lunar'))) {
    for (const dictionary of dictionaries) assert.ok(dictionary[key]?.trim(), key)
    assert.equal(variables(dictionaries[0][key]), variables(dictionaries[1][key]), key)
  }
  // Every card and every failure response has a title, a situation, a line of dialogue, a mission file, choices and results.
  const cards = [...mission.storyEvents, ...mission.devCards, ...mission.launchCards, ...mission.cruiseCards, ...mission.lossCards]
  for (const item of cards) {
    for (const key of [item.title, item.detail, item.quote, item.file]) assert.ok(key in en, key)
    assert.ok(item.choices.length >= 2 && item.choices.length <= 4, item.id)
    assert.ok(item.history.every(id => id in mission.sources), item.id)
  }
  for (const id of lunarRiskIds) assert.ok(mission.risks[id].history.every(source => source in mission.sources), id)
  for (const source of Object.values(mission.sources)) assert.match(source.url, /^https:\/\/([\w-]+\.)*(nasa\.gov|jpl\.nasa\.gov)\//)
})

test('sheltering during the eclipse explains the missing science without inventing a payload fault', () => {
  const flight = flyLunar(1, { design: basic, states: lunarUntested(), marginKg: 16, credits: 30, revised: true },
    (prompt, options, view) => prompt === 'card:Eclipse' ? 'Shelter' : cautious(prompt, options, view))
  assert.equal(flight.critical, 'windows')
  assert.deepEqual(flight.surface, { landed: 3, usable: 2, each: 3, spends: [{ source: 'eclipse', count: 1 }] })
  assert.equal(flight.steps.some(step => step.prompt === 'night'), false)
})

test('hosted reflector needs alignment and leaves time for the commissioned science', () => {
  const design = { ...basic, power: 'extended' } as const
  const setup = { design, states: lunarUntested(), marginKg: 24, credits: 30, revised: true, secondPayload: true }
  const flight = flyLunar(1, setup, (prompt, options, view) => prompt === 'plan' ? 'hosted' : cautious(prompt, options, view))
  assert.equal(flight.secondPayloadUsable, true)
  assert.equal(flight.outcome, 'extra')
  assert.ok(flight.surface?.spends?.some(spend => spend.source === 'hosted' && spend.count === 1))
  assert.equal(flyLunar(1, setup, cautious).secondPayloadUsable, false)
})
