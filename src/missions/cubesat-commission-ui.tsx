import { availableWeeks, currentEvidence } from '../game/mission'
import type { Design, Evidence, Game, TestResult } from '../game/types'
import type { Translate } from '../i18n'
import { ActionButton, CostLabel, money } from '../ui/shared'
import type { MissionUi } from './index'
import { capabilityFor, commissionFor, commissionForecast, commissionPlan, commissionRepairs, commissionRules } from './cubesat-commission'
import { cubeSat } from './cubesat'

export function CommissionNote({ t }: { t: Translate }) {
  const source = cubeSat.sources[2]
  return <p className="action-note">{t('commissionUsageNote')} <a href={source.url + '#page=14'} target="_blank" rel="noreferrer">{source.source}</a></p>
}

export function CommissionPlan({ game, t }: { game: Game; t: Translate }) {
  const plan = commissionPlan(game)
  const kit = capabilityFor(game.design)
  const source = cubeSat.sources[3]
  return <section className="plan-preview" aria-label={t('planPreview')}>
    <dl className="forecast-metrics">
      <div><dt>{t('commissionPrimaryInstrument')}</dt><dd>{t(commissionFor(game).instrument)}</dd></div>
      <div className={plan.mass > plan.massLimit ? 'bad' : undefined}><dt>{t('planMassLabel')}</dt><dd>{t('massUse', { mass: plan.mass, limit: plan.massLimit })}</dd></div>
      <div><dt>{t('planPowerLabel')}</dt><dd>{t('powerUse', plan)}</dd></div>
      <div><dt>{t('commissionPassBudget')}</dt><dd>{t('commissionCapacity', plan)}</dd></div>
    </dl>
    <p className={plan.spareWeeks < 0 || plan.spareCredits < 0 ? 'warning' : 'action-note'}>{t('commissionPlanBudget', {
      ...plan, cost: money(plan.credits), reserve: money(plan.spareCredits),
    })}</p>
    {plan.mass > plan.massLimit && <p className="warning">{t('massFinding', { mass: plan.mass, limit: plan.massLimit })}</p>}
    {kit.backup && <p>{t(game.commission === 'bay' ? 'commissionBayAuxEffect' : 'commissionAuxEffect', { instrument: t(commissionFor(game).auxiliary) })}</p>}
    {kit.backup && <p>{t('commissionRecoveryBudget', { weeks: commissionRules.costs.correctLate.weeks + commissionRules.costs.retest.weeks,
      cost: money(commissionRules.costs.correctLate.credits + commissionRules.costs.retest.credits),
      stripWeeks: commissionRules.costs.retest.weeks, stripCost: money(commissionRules.costs.strip.credits + commissionRules.costs.retest.credits) })}</p>}
    {game.stage === 'design' && kit.backup && <p className="action-note">{t('commissionScreenNote')} <a href={source.url} target="_blank" rel="noreferrer">{source.source}</a></p>}
  </section>
}

export function CommissionOption({ game, design, t }: { game: Game; design: Design; t: Translate }) {
  const plan = commissionPlan(game, design)
  return <small>{t('commissionOptionNumbers', { ...plan, cost: money(plan.credits) })}</small>
}

export function CommissionRepairs({ game, t, run }: { game: Game; t: Translate; run: (id: string) => void }) {
  const repairs = commissionRepairs(game)
  if (!repairs.length) return null
  return <section className="decisions">
    <h2>{t('repairChoices')}</h2>
    {repairs.map(option => <div key={option.id}>
      <ActionButton disabled={!option.fits} onClick={() => run(option.id)}>
        {t(option.cost.label)} <CostLabel t={t} weeks={option.weeks} credits={option.credits} />
      </ActionButton>
      <p className="action-note">{t(option.id === 'strip' ? 'commissionStripDetail' : 'commissionCorrectDetail')}</p>
      {!option.fits && <p className="warning">{t('noRepairTime')}</p>}
    </div>)}
  </section>
}

function Report({ evidence, t }: { evidence: TestResult; t: Translate }) {
  const source = cubeSat.ditl
  return <div aria-label={t('report')}>
    <p>{t('commissionReadings', { ...evidence, ...evidence.ditl })}</p>
    <p>{t('commissionCapacity', evidence)}</p>
    {evidence.capability !== 'baseline' && capabilityFor(evidence.design).backup && <p className={evidence.auxPass ? 'good' : 'bad'}>
      {t(evidence.auxPass ? 'commissionInterfacePassed' : 'commissionInterfaceFailed')}
    </p>}
    <p className="action-note">{t('commissionDitlNote')} <a href={source.url} target="_blank" rel="noreferrer">{source.source}</a></p>
  </div>
}

export function CommissionReport({ game, t }: { game: Game; t: Translate }) {
  const evidence = currentEvidence(game) as Evidence | null
  return evidence && <section className="evidence-status">
    <h2>{t('report')}</h2><Report evidence={evidence} t={t} />
  </section>
}

export const commissionUi: MissionUi = {
  sources: cubeSat.sources,
  verificationWork: new Set(['screen']),
  Requirements: () => null,
  Estimate: ({ game, t }) => <p>{t('commissionCapacity', commissionForecast(game))}</p>,
  Forecast: () => null,
  Report,
  RemedyPreview: () => null,
  Delivery: ({ flight, t }) => <p>{t('commissionArchive', { count: flight.archived })}</p>,
  flightSummary: (flight, t) => t('commissionFinalReceipt', { count: flight.batches }),
  outcome: (game) => {
    if (!game.flight) return { title: 'outcomeStopped' }
    return { title: game.flight.stretch ? 'commissionOutcomeExtra' : game.flight.delivered ? 'commissionOutcomeSuccess' : 'commissionOutcomePartial' }
  },
  Debrief: ({ game, t }) => {
    const client = commissionFor(game)
    const { flight } = game
    const decision = [...game.log].reverse().find(entry => ['correctEarly', 'correctLate', 'strip', 'screen'].includes(entry.id))
    const repair = commissionRepairs(game)
    const cost = decision && commissionRules.costs[decision.id]
    const retest = decision?.id === 'strip' || decision?.id === 'correctLate'
      ? game.log.slice(game.log.indexOf(decision) + 1).find(entry => entry.id === 'retest') : undefined
    return <section className="evidence-status">
      <h2>{t(client.name)}</h2>
      {flight ? <>
        <p>{t(flight.delivered ? client.delivered : 'commissionShortfall', { count: flight.primary, required: client.required })}</p>
        {flight.assisted && <p>{t('commissionSubstituted', { batches: flight.primary, capacity: flight.capacity })}</p>}
        {flight.extra && <p>{t(flight.extra === 'north' ? client.northImpact : client.southImpact)}</p>}
        <p>{t('commissionArchive', { count: flight.archived })}</p>
        {commissionRules.records?.(game)?.length ? <p>{t('commissionLabReward')}</p> : null}
      </> : game.stop === 'deadline' || game.stop === 'funds' ? <>
        <p>{t('commissionStopped', { week: game.week + availableWeeks(game), weeks: availableWeeks(game), credits: money(game.credits) })}</p>
        {repair.map(item => <p key={item.id}>{t(item.cost.label)} · {t('repairAndRetest', { weeks: item.weeks, cost: money(item.credits) })}</p>)}
      </> : null}
      {decision?.detail && cost && <p>{t(decision.detail.message)} {t('commissionDecisionSpent', {
        cost: money(decision.cost + (retest?.cost ?? 0)), weeks: cost.weeks + (retest ? commissionRules.costs.retest.weeks : 0),
      })}</p>}
    </section>
  },
}
