import type { Copy, CostItem, Design, DesignOption, Evidence, Game, Review } from '../game/types'
import type { Message } from '../i18n'
import { believedRisk, detection, percent, topLevel, type DefectState, type Maturity, type Severity } from '../game/risk'

export function completed(game: Game, id: string) {
  return game.log.some(entry => (entry.id === id || entry.id === `lab:${id}` || entry.id === `support:${id}`) && !entry.incomplete)
}

export function evidenceFor(game: Game, checks: boolean[], details: Record<string, unknown>): Evidence {
  return { ...details, design: game.design, week: game.week, revision: game.revision, checks }
}

export function optionGroup<T extends { label: Message; description: Message; cost: number }>(
  legend: Message, options: Record<string, T>, params: (option: T, id: string) => DesignOption['params'],
) {
  return { legend, options: Object.fromEntries(Object.entries(options).map(([id, option]) => [id, {
    label: option.label, description: option.description, cost: option.cost, params: params(option, id),
  }])) }
}

export function freezeDesign(game: Game) {
  return { ...game, stage: 'build', gate: 'CDR', returned: false } as const
}

export function reviseDesign(game: Game, design: Design) {
  return { ...game, design, revision: game.revision + 1, returned: false,
    stage: game.evidence ? 'integration' as const : game.stage }
}

export const severityMessage = (severity: Severity) => severity === 'fatal' ? 'riskSeverityFatal' : 'riskSeverityDegraded'

export function riskIssue(id: string, label: Message, risk: number, severity: Severity): Review['issues'][number] {
  const detail: Copy = { message: label }
  if (risk === 1 && severity === 'fatal') return { detail: { message: 'riskKnownFatal' }, item: label }
  return { detail, waiver: { id: `risk:${id}`, label, detail: {
    message: severity === 'fatal' ? 'riskSignFatal' : 'riskSignDegraded', values: { percent: percent(risk) },
  } } }
}

// What a verification step told the player, named after the item it looked at.
export function verificationCopy(state: DefectState, found: Message = 'riskTestFound', item?: { label: Message; before: number; after: number }): Copy {
  if (state.found) return { message: found }
  const percentMissed = percent(1 - detection[state.level])
  return item
    ? { message: 'riskTestPassedItem', values: { percent: percentMissed, before: percent(item.before), after: percent(item.after) }, labels: { item: item.label } }
    : { message: 'riskTestPassed', values: { percent: percentMissed } }
}

export function nextDefectCopy(state: DefectState, maturity: Maturity, work?: CostItem) {
  if (!work || state.level >= topLevel || state.found || state.fixed) return null
  return { work, belief: percent(believedRisk(maturity, state.level + 1)) }
}

export function approvedWeek(game: Game) {
  return [...game.log].reverse().find(entry => entry.review?.gate === 'FRR' && entry.review.passed)?.week
}
