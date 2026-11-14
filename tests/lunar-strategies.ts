// Player strategies and flight choices shared by the lunar route, balance and reachability tests.
import { cautious, start, type Run } from './lunar-run'
import type { LunarRisk } from '../src/missions/lunar-mission'
import { lunarMission as mission } from '../src/missions/lunar-mission'
export function verifyPlan(run: Run, plan: readonly LunarRisk[], slotAt = -1) {
  plan.forEach((id, index) => {
    const s = run.get(); const level = s.states[id].level
    const cost = [3, 6, 10][level] ?? 99
    if (s.stop || s.week >= s.due || (index !== slotAt && s.credits < cost)) return
    if (run.verify(id, { slot: index === slotAt }) === 'found') { const t = run.get(); if (t.week < t.due && t.credits >= mission.fix.credits) run.fix(id) }
  })
}
const main = ['buildFlight', 'buildPayload', 'buildGround', 'integrate'] as const
export const strategies: Record<string, (seed: number) => Run> = {
  fundingVerify: seed => { const r = start(seed, 'funding'); r.work('assess').work('trade').design({ mount: 'lightweight' }).work('prelim').work('contract').work('contract').work('detail').work('freeze'); main.forEach(id => r.work(id)); verifyPlan(r, ['descent', 'descent', 'descent', 'payload', 'payload', 'software', 'software', 'pressure', 'pressure', 'thrusters', 'thrusters']); r.review({ waive: true }); return r },
  techVerify: seed => { const r = start(seed, 'tech', { PartnerExit: 'Negotiate', Review: 'UseSlot' }); r.design({ route: 'lowEnergy' }).work('assess').work('prelim').work('contract').work('contract').work('contract').work('detail').work('freeze').work('buildFlight', { slot: true }).work('buildPayload').work('buildGround').work('integrate', { slot: true }); verifyPlan(r, ['descent', 'descent', 'descent', 'payload', 'payload', 'software', 'pressure', 'thrusters']); r.review({ waive: true }); return r },
  declineNone: seed => { const r = start(seed).design({ route: 'lowEnergy' }); r.work('assess').work('prelim').work('detail').work('freeze'); main.forEach(id => r.work(id)); r.review({ waive: true }); return r },
  declineSome: seed => { const r = start(seed).design({ route: 'lowEnergy' }); r.work('assess').work('prelim').work('detail').work('freeze'); main.forEach(id => r.work(id)); verifyPlan(r, ['descent', 'descent', 'payload', 'payload']); r.review({ waive: true }); return r },
  stretchNone: seed => { const r = start(seed, 'funding', { Camera: 'Mount', SecondPayload: 'Light' }); r.work('assess').work('trade').design({ payload: 'advanced', route: 'lowEnergy', mount: 'lightweight' }).work('prelim').work('contract').work('contract').work('detail').work('freeze'); main.forEach(id => r.work(id)); r.review({ waive: true }); return r },
  lidarVerify: seed => { const r = start(seed, 'funding'); r.work('assess').work('trade').design({ mount: 'lightweight', sensor: 'redundant', route: 'lowEnergy' }).work('prelim').work('contract').work('contract').work('detail').work('freeze'); main.forEach(id => r.work(id)); verifyPlan(r, ['descent', 'descent', 'software', 'software', 'pressure', 'pressure', 'thrusters', 'payload']); r.review({ waive: true }); return r },
}
import type { LunarPick } from '../src/missions/lunar-mission'
const prefer = (order: Record<string, string[]>): LunarPick => (prompt, options, view) => order[prompt]?.find(c => options.includes(c)) ?? cautious(prompt, options, view)
export const picks: Record<string, LunarPick> = {
  cautious,
  diagnostics: prefer({ plan: ['diagnostics'] }),
  wake: prefer({ night: ['wake'] }),
  bold: prefer({ 'card:Scrub': ['Rush'], 'card:Weather': ['Slip'], 'card:Lightning': ['Press'], 'card:CruiseScience': ['Off'], 'card:Eclipse': ['Exposed'], 'risk:software': ['Disable'], 'risk:thrusters': ['Reverse', 'Simulate'], 'risk:descent': ['Switch'], 'risk:payload': ['LowRate'], night: ['wake'] }),
  quitter: prefer({ 'card:CruiseScience': ['Off'], 'risk:pressure': ['Diagnose'], 'risk:thrusters': ['Flyby'], 'risk:descent': ['Abort'], 'risk:payload': ['Engineering'] }),
  salvager: prefer({ 'risk:pressure': ['Flyby'], 'risk:thrusters': ['Flyby'], 'risk:descent': ['Abort'], 'risk:payload': ['Engineering'] }),
}
Object.assign(strategies, {
  fundingSecond: (seed: number) => { const r = start(seed, 'funding', { SecondPayload: 'Light', IcdMismatch: 'Review', PartsAlert: 'Inspect' }); r.work('assess').work('trade').design({ mount: 'lightweight' }).work('prelim').work('contract').work('contract').work('detail').work('freeze'); main.forEach(id => r.work(id)); verifyPlan(r, ['descent', 'descent', 'payload', 'payload', 'software', 'software', 'pressure', 'pressure', 'thrusters', 'thrusters']); r.review({ waive: true }); return r },
  overspend: (seed: number) => { const r = start(seed).design({ payload: 'advanced', sensor: 'redundant', route: 'lowEnergy' }); r.work('assess').work('prelim').work('detail').work('freeze'); main.forEach(id => r.work(id)); r.review({ waive: true }); return r },
  standDown: (seed: number) => { const r = start(seed, 'decline', { CostReview: 'Stop' }).design({ payload: 'advanced', sensor: 'redundant', route: 'lowEnergy' }); r.work('assess').work('prelim').work('detail').work('freeze'); main.forEach(id => r.work(id)); r.review({ waive: true }); return r },
})
strategies.refuseToSign = seed => { const r = start(seed).design({ route: 'lowEnergy' }); r.work('assess').work('prelim').work('detail').work('freeze'); main.forEach(id => r.work(id)); verifyPlan(r, ['descent', 'descent', 'payload', 'payload']); if (!r.review({ accept: false }).passed) while (!r.get().stop) r.work('wait'); return r }

// One line per run for the route tests and the route tables in docs/story/lunar-mission.md.
export function summary(run: Run) {
  const state = run.get()
  const flight = state.flight
  return {
    week: state.week, spent: state.spent, income: state.income, credits: state.credits, due: state.due, margin: state.margin,
    events: state.events.map(event => `${event.week}:${event.card}:${event.choice ?? '-'}`).join(' '),
    levels: Object.entries(state.states).map(([id, item]) => `${id}${item.level}${item.fixed ? 'F' : item.found ? '!' : ''}`).join(' '),
    accepted: state.accepted.join(','),
    flight: flight ? `${flight.steps.map(step => step.failed ? `X${step.failed}` : `${step.prompt}=${step.choice}`).join(' ')} | batches ${flight.batches} spare ${flight.spareKg} credits ${flight.credits}` : '',
    ending: `${run.ending().outcome}/${run.ending().closing}`,
  }
}
export function playRoute(name: string, pick: string, seed: number) {
  const run = strategies[name](seed)
  if (run.get().approvedWeek) run.fly(picks[pick])
  return run
}
