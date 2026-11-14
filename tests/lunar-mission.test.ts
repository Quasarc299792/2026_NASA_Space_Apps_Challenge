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

// Checks for docs/story/lunar-mission.md. The lunar chapter is not wired into src/game/mission.ts yet, so the
// development phase is replayed by tests/lunar-run.ts and the flight by flyLunar in the mission file.

const seeds = Array.from({ length: 2000 }, (_, index) => index + 1)
const basic: LunarDesign = { ...mission.initialDesign }

// One fixed-seed route for every cell of the ending matrix: strategy, flight choices, seed and the whole run.
const routes: readonly [string, string, number, ReturnType<typeof summary>][] = [
  ["fundingVerify", "cautious", 7, {"week":24,"spent":208,"income":222,"credits":14,"due":24,"margin":12,"events":"4:PullIn:Accept 5:Camera:Decline 10:LauncherSlip:Keep 16:PartsAlert:Fly","levels":"software2F pressure2 thrusters0 descent1F payload2 night0","accepted":"thrusters","flight":"card:Scrub=Wait card:CruiseScience=On plan=extra | batches 1 spare 6 credits 2","ending":"success/checked"}],
  ["declineNone", "cautious", 1, {"week":13,"spent":146,"income":162,"credits":16,"due":22,"margin":16,"events":"4:SupplierDelay:Wait 8:SecondOffer:Alone 10:PullIn:Accept","levels":"software0 pressure0 thrusters0 descent0 payload0 night0","accepted":"software,pressure,thrusters,descent,payload","flight":"card:Lightning=Check card:Eclipse=Exposed plan=extra night=rest | batches 1 spare 10 credits 16","ending":"success/unchecked"}],
  ["techVerify", "cautious", 3, {"week":19,"spent":160,"income":162,"credits":2,"due":22,"margin":16,"events":"4:IcdMismatch:Skip 5:Review:UseSlot 10:PullIn:Accept 16:LauncherSlip:Keep","levels":"software2 pressure0 thrusters0 descent3 payload2 night0","accepted":"software,pressure,thrusters","flight":"card:Scrub=Rush Xpressure risk:pressure=Continue card:Eclipse=Exposed plan=extra | batches 1 spare 4 credits 2","ending":"success/recovered"}],
  ["fundingSecond", "cautious", 24, {"week":24,"spent":207,"income":240,"credits":33,"due":24,"margin":8,"events":"4:PullIn:Accept 5:Camera:Decline 10:IcdMismatch:Review 16:SecondPayload:Light","levels":"software3 pressure2 thrusters0 descent1F payload2 night0","accepted":"thrusters","flight":"card:Weather=Rollback card:CruiseScience=On plan=extra night=rest | batches 1 spare 2 credits 23","ending":"extra/checked"}],
  ["stretchNone", "cautious", 26, {"week":15,"spent":182,"income":248,"credits":66,"due":22,"margin":8,"events":"4:PullIn:Accept 5:Camera:Mount 10:SecondPayload:Light","levels":"software0 pressure0 thrusters0 descent0 payload0 night0","accepted":"software,pressure,thrusters,descent,payload","flight":"card:Scrub=Wait card:Eclipse=Exposed plan=extra night=rest | batches 1 spare 4 credits 58","ending":"extra/unchecked"}],
  ["stretchNone", "cautious", 6, {"week":15,"spent":182,"income":248,"credits":66,"due":22,"margin":8,"events":"4:SecondPayload:Light 5:Camera:Mount 10:PullIn:Accept","levels":"software0 pressure0 thrusters0 descent0 payload0 night0","accepted":"software,pressure,thrusters,descent,payload","flight":"card:Weather=Rollback Xthrusters risk:thrusters=Simulate card:Eclipse=Exposed Xpayload risk:payload=Restart plan=extra night=rest | batches 1 spare 2 credits 54","ending":"extra/recovered"}],
  ["declineNone", "cautious", 7, {"week":12,"spent":146,"income":162,"credits":16,"due":22,"margin":16,"events":"4:PullIn:Accept 8:SecondOffer:Alone 10:LauncherSlip:Keep","levels":"software0 pressure0 thrusters0 descent0 payload0 night0","accepted":"software,pressure,thrusters,descent,payload","flight":"card:Scrub=Wait Xsoftware risk:software=Uplink card:CruiseScience=Off Xdescent | batches 0 spare 12 credits 2","ending":"lost/listed"}],
  ["fundingVerify", "cautious", 99, {"week":24,"spent":208,"income":222,"credits":14,"due":24,"margin":12,"events":"4:PullIn:Accept 5:Camera:Decline 10:IcdMismatch:Skip 16:PartsAlert:Fly","levels":"software2 pressure2 thrusters0 descent3 payload2 night0","accepted":"software,thrusters","flight":"card:Lightning=Check Xdescent | batches 0 spare 4 credits 14","ending":"lost/missed"}],
  ["declineNone", "cautious", 12, {"week":12,"spent":146,"income":162,"credits":16,"due":22,"margin":16,"events":"4:PullIn:Accept 8:SecondOffer:Alone 10:IcdMismatch:Skip","levels":"software0 pressure0 thrusters0 descent0 payload0 night0","accepted":"software,pressure,thrusters,descent,payload","flight":"card:Scrub=Wait card:CruiseScience=On Xdescent | batches 0 spare 12 credits 4","ending":"salvage/listed"}],
  ["fundingVerify", "cautious", 157, {"week":24,"spent":208,"income":222,"credits":14,"due":24,"margin":12,"events":"4:PullIn:Accept 5:Camera:Decline 10:IcdMismatch:Skip 16:PartsAlert:Fly","levels":"software2 pressure2 thrusters0 descent3 payload2 night0","accepted":"software,thrusters","flight":"card:Lightning=Check card:CruiseScience=On Xdescent | batches 0 spare 4 credits 10","ending":"salvage/missed"}],
  ["techVerify", "cautious", 2, {"week":19,"spent":160,"income":162,"credits":2,"due":22,"margin":16,"events":"4:PullIn:Accept 5:Review:UseSlot 10:LauncherSlip:Keep 16:PartsAlert:Fly","levels":"software2 pressure0 thrusters0 descent3 payload2 night0","accepted":"software,pressure,thrusters","flight":"card:Lightning=Check card:Eclipse=Exposed Xpayload risk:payload=Restart plan=extra | batches 0 spare 10 credits 2","ending":"noData/listed"}],
  ["fundingVerify", "cautious", 174, {"week":23,"spent":202,"income":202,"credits":0,"due":24,"margin":12,"events":"4:PartnerExit:Accept 8:SecondOffer:Alone 10:PullIn:Accept 16:LauncherSlip:Keep","levels":"software2 pressure1 thrusters0 descent3 payload2 night0","accepted":"software,pressure,thrusters","flight":"card:Scrub=Rush card:CruiseScience=Off Xpayload risk:payload=Restart plan=extra | batches 0 spare 6 credits 0","ending":"noData/missed"}],
  ["fundingVerify", "diagnostics", 1, {"week":24,"spent":202,"income":222,"credits":20,"due":24,"margin":12,"events":"4:SupplierDelay:Wait 5:Camera:Decline 10:PullIn:Accept 16:IcdMismatch:Skip","levels":"software2 pressure1 thrusters0 descent3 payload2 night0","accepted":"software,pressure,thrusters","flight":"card:Lightning=Check card:Eclipse=Exposed plan=diagnostics night=rest | batches 0 spare 4 credits 20","ending":"noData/tradeoff"}],
  ["refuseToSign", "cautious", 1, {"week":22,"spent":158,"income":162,"credits":4,"due":22,"margin":16,"events":"4:SupplierDelay:Wait 8:SecondOffer:Alone 10:PullIn:Accept 16:LauncherSlip:Keep","levels":"software0 pressure0 thrusters0 descent2 payload1 night0","accepted":"","flight":"","ending":"stopped/deadline"}],
  ["overspend", "cautious", 1, {"week":11,"spent":152,"income":162,"credits":10,"due":22,"margin":0,"events":"4:SupplierDelay:Wait 8:SecondOffer:Alone 10:PullIn:Accept","levels":"software0 pressure0 thrusters0 descent0 payload0 night0","accepted":"","flight":"","ending":"stopped/funds"}],
  ["standDown", "cautious", 5, {"week":4,"spent":98,"income":150,"credits":52,"due":24,"margin":0,"events":"4:CostReview:Stop","levels":"software0 pressure0 thrusters0 descent0 payload0 night0","accepted":"","flight":"","ending":"stopped/cancelled"}],
]

test('every ending has a fixed-seed route with the documented weeks, spending, events and result', () => {
  for (const [strategy, pick, seed, expected] of routes) assert.deepEqual(summary(playRoute(strategy, pick, seed)), expected, `${strategy} ${pick} ${seed}`)
  assert.deepEqual(routes.map(route => route[3].ending).sort(), mission.endings.map(ending => `${ending.outcome}/${ending.closing}`).sort())
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

// Balance. The README has no target table for this chapter yet, so these bands are the ones proposed in
// docs/story/lunar-mission.md, measured over 2,000 seeds with the cautious flight choices.
const targets: Record<string, [number, number]> = {
  declineNone: [0.35, 0.5], declineSome: [0.52, 0.68], techVerify: [0.72, 0.87], fundingVerify: [0.75, 0.9], lidarVerify: [0.72, 0.87], stretchNone: [0.5, 0.67],
}
test('balance: each strategy meets the minimum within its target band over 2,000 seeds', () => {
  const rates: Record<string, number> = {}
  for (const [name, [low, high]] of Object.entries(targets)) {
    const met = seeds.filter(seed => { const ending = playRoute(name, 'cautious', seed).ending().outcome; return ending === 'success' || ending === 'extra' }).length
    rates[name] = met / seeds.length
    assert.ok(rates[name] >= low && rates[name] <= high, `${name}: ${rates[name]}`)
  }
  // Looking pays: the same self-funded design does better with some verification, and a partner does better still.
  assert.ok(rates.declineSome > rates.declineNone + 0.1 && rates.fundingVerify > rates.declineSome + 0.1 && rates.techVerify > rates.declineSome + 0.1)
})

test('reachability: every cell of the ending matrix turns up across strategies, choices and seeds', () => {
  const cells = new Set<string>()
  for (const name of Object.keys(strategies)) for (const pick of Object.keys(picks)) for (const seed of seeds.slice(0, 300)) {
    const ending = playRoute(name, pick, seed).ending()
    cells.add(`${ending.outcome}/${ending.closing}`)
  }
  const matrix = mission.endings.map(ending => `${ending.outcome}/${ending.closing}`)
  assert.deepEqual([...cells].sort(), [...matrix].sort())
  for (const outcome of Object.keys(mission.outcomes)) assert.ok(matrix.filter(cell => cell.startsWith(`${outcome}/`)).length >= 2, outcome)
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
