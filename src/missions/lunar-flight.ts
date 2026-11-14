import type { Copy, FlightContext, FlightSegment, MissionRules, SegmentChoice } from '../game/types'
import { lunarFlight, lunarMission as mission, type LunarFlightResult, type LunarFlightUpdate, type LunarRisk } from './lunar-mission'
import { lunarDesign, lunarState, lunarStates, massBudget, missionFile } from './lunar-rules'

type Decision = Extract<LunarFlightUpdate, { type: 'decision' }>
type StoryChoice = { id: string; label: SegmentChoice['label']; detail: Copy['message']; result?: Copy['message'];
  effect?: { credits?: number; propellantKg?: number; windows?: number } }

function replay({ game, progress }: FlightContext, id: string, decisions: string[]) {
  const state = lunarState(game)
  const simulation = lunarFlight(game.seed, {
    design: lunarDesign(game), states: lunarStates(game), marginKg: massBudget(game, true).margin,
    credits: game.credits, secondPayload: state.secondPayload, icd: state.icd ?? undefined,
  })
  let next = simulation.next()
  let step = 0
  while (!next.done) {
    const update = next.value
    if (update.type === 'segment') {
      if (mission.segments.findIndex(segment => segment.id === update.segment) > progress.steps.length) return { boundary: update }
      next = simulation.next(null)
      continue
    }
    if (step === decisions.length) return { decision: update }
    next = simulation.next(decisions[step++])
  }
  return { result: next.value, imaging: next.value.segment === id && (next.value.outcome === 'lost' || next.value.outcome === 'salvage') &&
      !next.value.engineering && progress.state.imaging === undefined }
}

const savedDecisions = (context: FlightContext) => (context.progress.state.decisions ?? []) as string[]

function describe(prompt: string, context: FlightContext, decision?: Decision) {
  if (prompt === 'plan') return { choices: Object.entries(mission.surfacePlans).map(([id, plan]) => ({ id, label: plan.label, detail: plan.description })) }
  if (prompt === 'night') return { choices: Object.entries(mission.nightPlans).map(([id, plan]) => ({ id, label: plan.label, detail: plan.description })) }
  const [kind, id] = prompt.split(':')
  if (kind === 'card') {
    const card = [...mission.launchCards, ...mission.cruiseCards, ...mission.lossCards].find(item => item.id === id)!
    return { choices: card.choices, file: missionFile(card), brief: { message: card.detail } as Copy, quote: card.quote }
  }
  const risk = id as Exclude<LunarRisk, 'night'>
  const item = mission.risks[risk]
  return { choices: mission.responses[risk], file: missionFile(item), brief: { message: item.failure, values: { kg: mission.pressureLossKg } } as Copy,
    quote: item.quote, softwareCost: decision && lunarState(context.game).icd === 'reviewed' ? 0 : 6 + (lunarState(context.game).icd === 'open' ? mission.uplinkOpenExtra : 0) }
}

function reportFor(segment: string, result: LunarFlightResult | undefined): Copy {
  if (result?.outcome === 'lost' || result?.outcome === 'salvage') {
    if (result.critical === 'reserve') return { message: 'lunarTransferFail', values: { need: -result.spareKg, margin: 0 } }
    if (result.critical !== 'choice') return { message: mission.risks[result.critical].failure, values: { kg: mission.pressureLossKg } }
  }
  if (result) return { message: 'lunarGroundReceipt', values: { count: result.batches } }
  if (segment === 'descent') return { message: 'lunarLandingComplete' }
  return { message: 'lunarSegmentComplete' }
}

const segments: FlightSegment[] = mission.segments.map(segment => {
  const { id } = segment
  function state(context: FlightContext) {
    const stage = replay(context, id, savedDecisions(context))
    const prompt = stage.imaging ? 'card:Imaging' : stage.decision?.prompt
    const options = stage.imaging ? ['Share', 'Decline'] : stage.decision?.options
    const description = prompt ? describe(prompt, context, stage.decision) : undefined
    return { ...stage, description, options, prompt }
  }
  return {
    id, title: segment.label,
    brief: context => state(context).description?.brief ?? { message: segment.carried },
    file: context => state(context).description?.file,
    quote: context => state(context).description?.quote,
    status: context => {
      const view = state(context).decision?.view
      return view && { message: 'chapterFlightResources', values: { kg: view.spareKg, credits: view.credits, windows: view.windows } }
    },
    choices: context => {
      const { description, options, decision, prompt } = state(context)
      if (!description || !options) return []
      const d = lunarDesign(context.game)
      const payload = mission.payloads[d.payload]
      return (description.choices as readonly StoryChoice[]).filter(choice => options.includes(choice.id)).map(choice => ({
        id: choice.id, label: choice.label, detail: { message: choice.detail, values: {
          credits: prompt === 'risk:software' && choice.id === 'Uplink' ? description.softwareCost! :
            prompt === 'night' ? mission.wakeCredits : Math.abs(choice.effect?.credits ?? 0),
          kg: Math.abs(choice.effect?.propellantKg ?? 0),
          windows: prompt === 'night' ? mission.wakeWindows : prompt === 'plan' ? mission.surfacePlans.diagnostics.reservedWindows :
            choice.id === 'Switch' ? mission.tiltedWindows : Math.abs(choice.effect?.windows ?? 1),
          count: prompt === 'plan' && choice.id === 'priority' ? mission.minimumBatches :
            prompt === 'plan' && choice.id === 'extra' ? Math.min(payload.maxBatches, Math.floor((decision?.view.windows ?? 0) / (payload.collectWindows + mission.downlinkWindows))) :
              mission.surfacePlans.diagnostics.reservedWindows,
        } },
      }))
    },
    resolve: (context, choice): ReturnType<FlightSegment['resolve']> => {
      const current = state(context)
      const decisions = savedDecisions(context)
      const selected = (current.description?.choices as readonly StoryChoice[] | undefined)?.find(item => item.id === choice)
      const report: Copy | undefined = selected?.result ? { message: selected.result } : undefined
      if (current.imaging && current.result) return {
        end: true, report, state: { decisions, result: current.result, imaging: choice === 'Share' },
      }
      const nextDecisions = choice === null ? decisions : [...decisions, choice]
      const next = replay(context, id, nextDecisions)
      if (next.imaging || next.decision) return { continued: true, report, state: { decisions: nextDecisions } }
      return {
        end: Boolean(next.result), report: report ?? reportFor(id, next.result),
        state: { decisions: nextDecisions, ...(next.result && { result: next.result }) },
      }
    },
  }
})

export const lunarSegments: NonNullable<MissionRules['segmentedFlight']> = {
  segments,
  finish: ({ progress }) => {
    const result = progress.state.result as LunarFlightResult
    return { ...result, choice: progress.steps.at(-1)?.choice ?? 'rest', siteConfirmed: progress.state.imaging === true,
      delivered: result.outcome === 'success' || result.outcome === 'extra', stretch: result.outcome === 'extra' }
  },
}
