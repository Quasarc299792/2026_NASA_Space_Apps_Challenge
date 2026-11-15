import { availableWeeks, currentFlightSegment, flightContext, newGame, pendingEvent, pendingReview, runMission, taskOptions, type Game } from '../src/game/mission'
import { lunarMission as mission, type LunarDesign, type LunarFlightResult, type LunarPick, type LunarRisk } from '../src/missions/lunar-mission'
import { lunarState, lunarStates, massBudget } from '../src/missions/lunar-rules'

export type Partnership = keyof typeof mission.partnerships
export type WorkId = keyof typeof mission.costs
export type Remedy = keyof typeof mission.remedies
type CardId = typeof mission.devCards[number]['id'] | typeof mission.storyEvents[number]['id']
export type Policy = Partial<Record<CardId, string>>

// What a cautious player picks when a card turns up, unless the run says otherwise.
const defaults: Record<CardId, string> = {
  PullIn: 'Accept', PartnerExit: 'Accept', CostReview: 'Grant', SecondPayload: 'Decline', SupplierDelay: 'Wait', LauncherSlip: 'Keep',
  PartsAlert: 'Fly', IcdMismatch: 'Skip', Camera: 'Room', Review: 'Note', SecondOffer: 'Alone',
}

export const cautious: LunarPick = (prompt, options) => {
  const order: Record<string, string[]> = {
    'card:Scrub': ['Wait', 'Rush'], 'card:Weather': ['Rollback', 'Slip'], 'card:Lightning': ['Switch', 'Check'], 'card:CruiseScience': ['On', 'Off'],
    'card:Eclipse': ['Battery', 'Exposed'], 'risk:software': ['Uplink', 'Wait'], 'risk:pressure': ['Continue', 'Emergency'],
    'risk:thrusters': ['Simulate', 'Reverse', 'Flyby'], 'risk:descent': ['Patch', 'Switch'], 'risk:payload': ['Restart'], plan: ['priority', 'extra'], night: ['rest'],
  }
  return order[prompt]?.find(choice => options.includes(choice)) ?? options[0]
}

export function start(seed: number, partnership: Partnership = 'decline', policy: Policy = {}) {
  let game = newGame(mission.id, [], seed)
  let mount: LunarDesign['mount'] | undefined

  function settle() {
    for (let event = pendingEvent(game); event; event = pendingEvent(game)) {
      const choices = event.choices.filter(choice => choice.available?.(game) !== false)
      const wanted = policy[event.id as CardId] ?? defaults[event.id as CardId]
      const choice = choices.find(choice => choice.id === (event!.id === 'offers' ? partnership : wanted)) ?? choices[0]
      const next = runMission(game, { type: 'choose', event: event.id, choice: choice.id })
      if (next === game) throw new Error(`${event.id} rejected ${choice.id}`)
      game = next
    }
  }

  function review() {
    const options = pendingReview(game)
    if (options) {
      const waivers = options.issues.flatMap(issue => issue.waiver ? [issue.waiver.id] : [])
      game = runMission(game, { type: 'review', waivers, turn: game.log.length })
      settle()
    }
  }

  function doTask(id: string) {
    const next = runMission(game, { type: 'task', task: id, turn: game.log.length })
    game = next
    settle()
  }

  settle()
  const run = {
    snapshot: () => game,
    design(change: Partial<LunarDesign>) {
      const { mount: selected, ...architecture } = change
      mount = selected ?? mount
      game = runMission(game, { type: 'configure', design: { ...game.design, ...architecture } as Game['design'] })
      if (mount && game.gate === 'CDR') game = runMission(game, { type: 'configure', design: { ...game.design, mount } })
      return run
    },
    work(id: WorkId, option: { slot?: boolean; mountSlot?: boolean } = {}) {
      if (id === 'detail' && mount) run.design({ mount })
      const supported = `support:${id}`
      doTask((option.slot || option.mountSlot) && taskOptions(game).some(task => task.id === supported) ? supported : id)
      if (id === 'prelim') review()
      return run
    },
    verify(id: LunarRisk, option: { slot?: boolean } = {}) {
      const key = mission.risks[id].steps[lunarStates(game)[id].level]
      const previous = game
      const supported = `support:${key}`
      if (key) doTask(option.slot && taskOptions(game).some(task => task.id === supported) ? supported : key)
      return game === previous ? 'unavailable' : lunarStates(game)[id].found ? 'found' : 'passed'
    },
    fix(id: LunarRisk) { const previous = game; doTask(`fix:${id}`); return game !== previous },
    review(option: { waive?: boolean; accept?: boolean } = {}) {
      if (game.stage === 'integration' && game.evidence) doTask('retest')
      if (option.accept !== false) review()
      return { passed: game.stage === 'flight' }
    },
    fly(pick: LunarPick = cautious) {
      for (let segment = currentFlightSegment(game); segment; segment = currentFlightSegment(game)) {
        const context = flightContext(game)
        const options = segment.choices?.(context) ?? []
        const id = options.length
          ? pick(options[0].prompt ?? segment.id, options.map(choice => choice.id), options[0].resources ?? { spareKg: 0, credits: game.credits, windows: 0 })
          : null
        const next = runMission(game, { type: 'segment', segment: segment.id, choice: id, turn: context.progress.turn ?? 0 })
        if (next === game) throw new Error(`${segment.id} rejected ${id}`)
        game = next
      }
      return game.flight as LunarFlightResult | null
    },
    get: () => {
      const spent = game.log.reduce((sum, entry) => sum + entry.cost, 0)
      return {
        week: game.week, credits: game.credits, spent, income: game.credits + spent,
        due: game.week + availableWeeks(game), margin: massBudget(game, true).margin, slots: lunarState(game).slots,
        states: lunarStates(game), stop: game.stop, flight: game.flight as LunarFlightResult | null,
        events: game.log.filter(entry => entry.event).map(entry => ({
          week: entry.week, card: entry.event, choice: game.events.find(event => event.startsWith(entry.event + ':'))?.slice(entry.event!.length + 1),
        })),
        accepted: game.log.find(entry => entry.review?.gate === 'FRR' && entry.review.passed)?.review?.waivers.map(waiver => waiver.id) ?? [],
        approvedWeek: game.stage === 'flight' ? game.week : 0,
      }
    },
    ending() {
      if (game.flight) return { outcome: game.flight.outcome, closing: game.flight.closing }
      return { outcome: 'stopped', closing: game.stop ?? 'pending' }
    },
  }
  return run
}

export type Run = ReturnType<typeof start>
