import { defectBelief, verifyDefect } from '../src/game/risk'
import {
  flyLunar, lunarAcceptance, lunarDevDeck, lunarFlightRisks, lunarItemId, lunarMass, lunarMaturity, lunarMission as mission, lunarUntested,
  type LunarDesign, type LunarPick, type LunarRisk,
} from '../src/missions/lunar-mission'

// Development-phase rules from docs/story/lunar-mission.md. The lunar chapter is not wired into src/game/mission.ts yet,
// so the tests replay runs with this helper. The flight itself is flyLunar in the mission file.

export type Partnership = keyof typeof mission.partnerships
export type WorkId = keyof typeof mission.costs
export type Remedy = keyof typeof mission.remedies
type CardId = typeof mission.devCards[number]['id'] | typeof mission.storyEvents[number]['id']
export type Policy = Partial<Record<CardId, string>>

// What a cautious player picks when a card turns up, unless the run says otherwise.
const defaults: Record<CardId, string> = {
  PullIn: 'Accept', PartnerExit: 'Accept', CostReview: 'Grant', SecondPayload: 'Decline', SupplierDelay: 'Wait', LauncherSlip: 'Keep',
  PartsAlert: 'Fly', IcdMismatch: 'Skip', Camera: 'Decline', Review: 'Note', SecondOffer: 'Alone',
}

export const cautious: LunarPick = (prompt, options) => {
  const order: Record<string, string[]> = {
    'card:Scrub': ['Wait', 'Rush'], 'card:Weather': ['Rollback', 'Slip'], 'card:Lightning': ['Switch', 'Check'], 'card:CruiseScience': ['On', 'Off'],
    'card:Eclipse': ['Battery', 'Exposed'], 'risk:software': ['Uplink', 'Wait'], 'risk:pressure': ['Continue', 'Emergency'],
    'risk:thrusters': ['Simulate', 'Reverse', 'Flyby'], 'risk:descent': ['Patch', 'Switch'], 'risk:payload': ['Restart'], plan: ['extra'], night: ['rest'],
  }
  return order[prompt].find(choice => options.includes(choice)) ?? options[0]
}

export function start(seed: number, partnership: Partnership = 'decline', policy: Policy = {}) {
  const design: LunarDesign = { ...mission.initialDesign }
  const states = lunarUntested()
  const deck = lunarDevDeck(seed)
  const queue: CardId[] = [...deck.order]
  const done = new Set<string>()
  const events: { week: number; card: string; choice: string | null }[] = []
  const ledger: string[] = []
  let week = 0
  let credits: number = mission.budget
  let spent = 0
  let income: number = mission.budget
  let deadline: number = mission.deadline
  let slots = 0
  let extraKg = 0
  let flightExtra = 0
  let contract: { kind: 'funding' | 'tech'; left: number; milestone: number; slots: number; delivered: boolean; ended: boolean } | null = null
  let govCold = false
  let second = false
  let interfaceDue = false
  let mustDescent = false
  let icd: 'reviewed' | 'open' | undefined
  let frozen = false
  let stale = false
  let stop: '' | 'deadline' | 'funds' | 'cancelled' = ''
  let approvedWeek = 0
  let waived = false
  let accepted: LunarRisk[] = []
  let flight: ReturnType<typeof flyLunar> | undefined

  const due = () => deadline - mission.routes[design.route].leadWeeks
  const margin = (measured = true) => lunarMass(design, extraKg, measured).margin
  const gain = (amount: number) => { credits += amount; income += amount }
  const pay = (amount: number) => { credits -= amount; spent += amount }
  const sign = (kind: 'funding' | 'tech', late = false) => {
    const terms = late ? mission.latePartnerships[kind] : mission.partnerships[kind]
    contract = { kind, left: terms.weeks, milestone: terms.milestone, slots: terms.supportSlots, delivered: false, ended: false }
    gain(terms.advance)
  }
  const raise = (id: LunarRisk) => { states[id] = verifyDefect(seed, lunarItemId(design, id), lunarMaturity(design, id), states[id]); return states[id].found && !states[id].fixed ? 'found' : 'passed' }
  const mainlineLeft = () => (['assess', 'prelim', 'detail', 'freeze', 'buildFlight', 'buildPayload', 'buildGround', 'integrate'] as const)
    .filter(id => !done.has(id)).reduce((total, id) => total + mission.costs[id].credits + (id === 'freeze' ? hardware() : 0), 0)
  const hardware = (mountSlot = false) => mission.payloads[design.payload].cost + mission.sensors[design.sensor].cost + mission.powers[design.power].cost
    + mission.routes[design.route].cost + (mountSlot ? 0 : mission.mounts[design.mount].cost)

  function choose(card: CardId, available: readonly string[]) {
    const wanted = policy[card] ?? defaults[card]
    const choice = available.includes(wanted) ? wanted : available.includes(defaults[card]) ? defaults[card] : available[0]
    events.push({ week, card, choice })
    return choice
  }
  function draw(card: CardId): boolean {
    const skip = () => false
    if (card === 'PullIn') {
      const choice = choose(card, credits >= 10 ? ['Accept', 'Compromise', 'Refuse'] : ['Accept', 'Compromise'])
      if (choice === 'Accept') { deadline -= 2; gain(12) } else if (choice === 'Compromise') deadline -= 1
      else { pay(10); govCold = true }
    } else if (card === 'PartnerExit') {
      if (!contract || contract.delivered || contract.ended) return skip()
      const { kind } = contract
      const choice = choose(card, ['Accept', 'Switch', 'Negotiate'])
      contract.ended = true
      if (choice === 'Switch') sign(kind === 'funding' ? 'tech' : 'funding', true)
      else if (choice === 'Negotiate') { tick(); if (kind === 'funding') gain(10); else slots += 1 }
    } else if (card === 'CostReview') {
      if (credits >= mainlineLeft()) return skip()
      const choice = choose(card, ['Grant', 'Cut', 'Stop'])
      if (choice === 'Grant') { gain(16); mustDescent = true }
      else if (choice === 'Stop') stop = 'cancelled'
      else {
        if (frozen) gain((mission.payloads[design.payload].cost - mission.payloads.basic.cost + mission.powers[design.power].cost) / 2)
        if (design.payload !== 'basic') states.payload = lunarUntested().payload
        design.payload = 'basic'; design.power = 'dayOnly'
        if (done.has('integrate')) stale = true
      }
    } else if (card === 'SecondPayload') {
      if (!contract || contract.ended || govCold || second || done.has('integrate')) return skip()
      const choice = choose(card, ['Accept', 'Light', 'Decline'])
      if (choice === 'Accept') { gain(30); extraKg += 8; second = true; interfaceDue = true }
      else if (choice === 'Light') { gain(18); extraKg += 4; second = true }
    } else if (card === 'SupplierDelay') {
      if (done.has('buildFlight')) return skip()
      const choice = choose(card, credits >= 8 ? ['Wait', 'Rush', 'Stock'] : ['Wait', 'Stock'])
      if (choice === 'Wait') flightExtra += 1; else if (choice === 'Rush') pay(8); else extraKg += 4
    } else if (card === 'LauncherSlip') {
      if (choose(card, credits >= 6 ? ['Follow', 'Keep'] : ['Keep']) === 'Follow') { deadline += 2; pay(6) }
    } else if (card === 'PartsAlert') {
      const choice = choose(card, [...(credits >= 4 ? ['Inspect'] : []), ...(slots > 0 ? ['Partner'] : []), 'Fly'])
      if (choice === 'Inspect') { pay(4); tick(); raise('thrusters') } else if (choice === 'Partner') { slots -= 1; raise('thrusters') }
    } else if (card === 'IcdMismatch') {
      if (done.has('integrate')) return skip()
      if (choose(card, ['Review', 'Skip']) === 'Review') { tick(); raise('software'); icd = 'reviewed' } else icd = 'open'
    } else if (card === 'SecondOffer') {
      const choice = choose(card, ['Funding', 'Tech', ...(govCold || second ? [] : ['Government']), 'Alone'])
      if (choice === 'Funding') sign('funding', true); else if (choice === 'Tech') sign('tech', true)
      else if (choice === 'Government') { gain(30); extraKg += 8; second = true; interfaceDue = true }
    }
    return true
  }
  function tick() {
    week += 1
    const slot = (mission.drawWeeks as readonly number[]).indexOf(week)
    if (slot === deck.pullInSlot && !stop) draw('PullIn')
    else if (slot >= 0 && !stop) while (queue.length && draw(queue.shift()!) === false);
    if (week === mission.secondOfferWeek && !stop && (!contract || contract.ended)) draw('SecondOffer')
  }
  // Starts a piece of work: refuses it after the deadline week or without the credits, then pays up front.
  function begin(label: string, cost: number) {
    if (stop || flight) return false
    if (week >= due()) { stop = 'deadline'; ledger.push(`${label}: week ${week} is past the deadline ${due()}`); return false }
    if (cost > credits) { stop = 'funds'; ledger.push(`${label}: needs ${cost}, has ${credits}`); return false }
    pay(cost)
    ledger.push(`${week + 1} ${label} ${cost}`)
    return true
  }

  const run = {
    design(change: Partial<LunarDesign>) { if (frozen) throw new Error('design is frozen'); Object.assign(design, change); return run },
    sign(kind: Partnership) { if (kind !== 'decline') sign(kind); return run },
    work(id: WorkId, option: { slot?: boolean; mountSlot?: boolean } = {}) {
      const useSlot = Boolean(option.slot) && slots > 0 && (id === 'buildFlight' || id === 'integrate')
      const cost = mission.costs[id].credits + (id === 'freeze' ? hardware(option.mountSlot && slots > 0) : 0) - (useSlot ? mission.supportUses[id as 'integrate'].creditsSaved : 0)
      if (!begin(id, cost)) return run
      if (useSlot || (id === 'freeze' && option.mountSlot && slots > 0)) slots -= 1
      let worked = 0
      const weeks = () => mission.costs[id].weeks - (useSlot ? 1 : 0) + (id === 'buildFlight' ? flightExtra : 0)
      while (worked < weeks() && !stop) { tick(); worked += 1 }
      if (stop) return run
      if (id === 'contract' && contract && !contract.delivered && !contract.ended && --contract.left === 0) {
        contract.delivered = true
        gain(contract.milestone)
        slots += contract.slots
        if (contract.kind === 'funding') {
          const choice = choose('Camera', ['Mount', 'Room', 'Decline'])
          if (choice === 'Mount') { gain(8); extraKg += 2 } else if (choice === 'Room') gain(3)
        } else if (choose('Review', slots > 0 ? ['UseSlot', 'Note'] : ['Note']) === 'UseSlot') {
          slots -= 1
          const beliefs = lunarFlightRisks.map(risk => defectBelief(lunarMaturity(design, risk), states[risk]))
          raise(lunarFlightRisks[beliefs.indexOf(Math.max(...beliefs))])
        }
      }
      if (id === 'freeze') frozen = true
      if (id === 'integrate' || id === 'retest') stale = false
      if (id === 'secondInterface') interfaceDue = false
      if (id !== 'contract' && id !== 'wait') done.add(id)
      return run
    },
    // Runs the item's next verification level. Returns what the test reported.
    verify(id: LunarRisk, option: { slot?: boolean } = {}) {
      const level = states[id].level + 1
      const step = mission.risks[id].steps[level - 1] as WorkId
      const needs = level === 1 ? 'assess' : level === 2 ? mission.risks[id].unitNeeds : 'integrate'
      if (level > 3 || !done.has(needs) || states[id].found || states[id].fixed) return 'unavailable' as const
      const useSlot = Boolean(option.slot) && slots > 0
      if (!begin(step, useSlot ? 0 : mission.costs[step].credits)) return 'unavailable' as const
      if (useSlot) slots -= 1
      tick()
      return raise(id)
    },
    fix(id: LunarRisk) {
      if (!states[id].found || states[id].fixed || !begin(`fix ${id}`, mission.fix.credits)) return false
      tick()
      states[id] = { ...states[id], fixed: true }
      return true
    },
    remedy(id: Remedy) {
      if (id === 'partnerMount' && slots < 1) return run
      if (!begin(id, mission.remedies[id].credits)) return run
      tick()
      if (id === 'partnerMount') slots -= 1
      if (id === 'mount' || id === 'partnerMount') design.mount = 'lightweight'
      if (id === 'dropKit') { design.power = 'dayOnly'; states.night = lunarUntested().night }
      if (id === 'reroute') design.route = 'lowEnergy'
      if (id === 'basicPayload') { design.payload = 'basic'; states.payload = lunarUntested().payload }
      if (id === 'addLidar') design.sensor = 'redundant'
      if (done.has('integrate')) stale = true
      return run
    },
    // Flight readiness review. `waive` signs the reserve waiver, `accept` signs every risk above the threshold.
    review(option: { waive?: boolean; accept?: boolean } = {}) {
      const blocks: string[] = []
      if (stop) return { passed: false, blocks: [stop] }
      if (week > due()) { stop = 'deadline'; return { passed: false, blocks: ['deadline'] } }
      if (!mission.gates.FRR.work.every(id => done.has(id)) || stale) blocks.push('evidence')
      if (contract && !contract.delivered && !contract.ended) blocks.push('contract')
      if (interfaceDue) blocks.push('interface')
      if (margin() < 0) blocks.push('propellant')
      else if (margin() < mission.reserveKg && !option.waive) blocks.push('reserve')
      const toSign = lunarAcceptance(design, states)
      if (toSign.length && option.accept === false) blocks.push('risk')
      if (mustDescent && states.descent.level < mission.checkedLevel) blocks.push('descent')
      if (blocks.length) return { passed: false, blocks }
      approvedWeek = week
      waived = margin() < mission.reserveKg
      accepted = toSign
      return { passed: true, blocks }
    },
    fly(pick: LunarPick = cautious) {
      if (!approvedWeek) throw new Error('not approved')
      flight = flyLunar(seed, { design, states, marginKg: margin(), credits, secondPayload: second, icd }, pick)
      return flight
    },
    get: () => ({ week, credits, spent, income, due: due(), margin: margin(), estimate: margin(done.has('trade')), slots, design: { ...design }, states: { ...states }, stop, events, ledger, flight, approvedWeek, waived, accepted, second, govCold, contract }),
    // The ending cell: mission result and closing.
    ending() {
      if (flight) return { outcome: flight.outcome, closing: flight.closing }
      return { outcome: 'stopped' as const, closing: (stop || 'deadline') as 'deadline' | 'funds' | 'cancelled' }
    },
  }
  if (partnership !== 'decline') sign(partnership)
  return run
}
export type Run = ReturnType<typeof start>
