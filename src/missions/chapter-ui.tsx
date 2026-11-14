import type { ReactNode } from 'react'
import type { CostItem, Game, MissionRules } from '../game/types'
import type { Message, Translate } from '../i18n'
import { defectBelief, hasDefect, percent, testResult, topLevel, type DefectState, type Maturity, type Outcome, type Severity } from '../game/risk'
import { Disclosure, missionMoney } from '../ui/shared'
import type { MissionUi } from './index'
import { completed, nextDefectCopy, severityMessage } from './chapter'
import { flyOrbital, orbitalCarried, orbitalLaunch as orbital, orbitalLinkMaturity, orbitalNextStep, orbitalOdds, orbitalRiskIds, orbitalRisks, type OrbitalDesign } from './orbital-launch'
import { orbitalRules, orbitalState } from './orbital-rules'
import { lunarDesign, lunarPlanCost, lunarRules, lunarState, lunarStates, massBudget } from './lunar-rules'
import { lunarItemId, lunarMaturity, lunarMission as lunar, lunarOdds, lunarRisks, type LunarFlightResult } from './lunar-mission'

const levels = ['riskLevelNone', 'riskLevelAnalysis', 'riskLevelUnit', 'riskLevelEndToEnd'] as const
const inert = () => null

type WorkRisk = { label: Message; risk: number; level: number; severity: Severity; notes: ReactNode }

function RiskList({ t, risks, odds, note }: {
  t: Translate; risks: WorkRisk[]; odds: { minimum: number; noFatal: number }; note?: Message
}) {
  return <Disclosure label={t('riskTitle')} value={t('riskOddsMinimum', { percent: percent(odds.minimum) })}>
    <p>{t('riskOddsNoFatal', { percent: percent(odds.noFatal) })}</p>
    {note && <p>{t(note)}</p>}
    {risks.map(({ label, severity, risk, level, notes }) => <div className="risk-item" key={label}>
      <div className="risk-head"><strong>{t(label)}</strong><span>{t('riskChance', { percent: percent(risk) })}</span></div>
      <small>{t('riskLevel', { level: t(levels[level]) })} · {t(severityMessage(severity))}</small>
      <div>{notes}</div>
    </div>)}
    <small>{t('riskBeliefNote')}</small>
  </Disclosure>
}

function DefectNotes({ state, maturity, work, t }: { state: DefectState; maturity: Maturity; work?: CostItem; t: Translate }) {
  if (state.fixed) return <p>{t('riskFixed')}</p>
  if (state.found) return <p className="warning">{t('riskTestFound')}</p>
  const next = nextDefectCopy(state, maturity, work)
  return next && <small>{t('riskNextStep', { work: t(next.work.label), ...next.work, percent: next.belief })}</small>
}

function orbitalEstimate(game: Game, t: Translate) {
  const d = game.design as OrbitalDesign
  const known = orbitalState(game)
  const { lift, link } = orbitalRisks(game.seed, d, known)
  const work = orbital.costs[orbital.risks.lift.steps[known.lift]]
  return <>
    <p>{t('orbitalCarried', { count: orbitalCarried(d) })} · {t('orbitalCapacityAnalysis', { count: orbital.stages[d.stage].capacityKg })}</p>
    <RiskList t={t} odds={orbitalOdds(game.seed, d, known)} risks={[
      { ...lift, label: orbital.risks.lift.label, notes: <>
        <p>{t('orbitalRiskLiftDetail', { ...lift.known, margin: lift.limit })}</p>
        {work && <small>{t(known.lift + 1 === topLevel ? 'riskNextReveal' : 'riskNextRange', { ...work, work: t(work.label) })}</small>}
      </> },
      { ...link, label: orbital.risks.link.label, notes: <DefectNotes state={known.link} maturity={orbitalLinkMaturity(d)} work={orbital.costs[orbital.risks.link.steps[known.link.level]]} t={t} /> },
    ]} />
  </>
}

function lunarEstimate(game: Game, t: Translate) {
  const d = lunarDesign(game)
  const states = lunarStates(game)
  const state = lunarState(game)
  const mass = massBudget(game)
  return <>
    <p>{t('lunarPropellantLoaded', { ...mass, allocation: lunar.launchAllocationKg })} · {t('lunarPropellantNeed', { count: lunar.routes[d.route].propellantKg })}</p>
    <p>{t(mass.margin < 0 ? 'lunarMarginShort' : 'lunarMarginOk', { count: Math.abs(mass.margin) })}</p>
    {!completed(game, 'trade') && !game.evidence && <small>{t('lunarEstimateNote')}</small>}
    <RiskList t={t} odds={lunarOdds(d, states)} note="lunarForecastNote" risks={lunarRisks(d, states).map(item => ({
      ...item, label: lunar.risks[item.id].label,
      notes: state.repairs.includes(item.id) ? <p>{t('lunarFixUnconfirmed')}</p>
        : <DefectNotes state={states[item.id]} maturity={item.maturity} work={lunar.costs[lunar.risks[item.id].steps[item.level]]} t={t} />,
    }))} />
  </>
}

function RiskResults({ game, rules, t, children }: { game: Game; rules: MissionRules; t: Translate; children?: ReactNode }) {
  const signed = game.log.find(entry => entry.review?.gate === 'FRR' && entry.review.passed)?.review?.waivers ?? []
  return <section className="risk-panel">
    <h2>{t('riskFlightTitle')}</h2>
    {children}
    {signed.length > 0 && <p>{t('riskAccepted', { items: signed.map(item => t(item.label)).join(t('listSeparator')) })}</p>}
    <small>{t('riskSeed', { seed: game.seed })} · {t('budgetLabel')} {missionMoney(rules, game.flight?.credits ?? game.credits, t)}</small>
  </section>
}

function OrbitalDebrief({ game, t }: { game: Game; t: Translate }) {
  const d = game.design as OrbitalDesign
  const knowledge = orbitalState(game)
  const outcomes = (game.flight?.outcomes ?? []) as Outcome[]
  return <RiskResults game={game} t={t} rules={orbitalRules}>
    {orbitalRiskIds.map(id => {
      const outcome = outcomes.find(item => item.id === id)
      const next = outcome?.failed && orbitalNextStep(game.seed, d, knowledge, id)
      return <div key={id} className="risk-item">
        <strong>{t(orbital.risks[id].label)}</strong>
        <p>{outcome ? t(outcome.failed ? 'riskFlightFailed' : 'riskFlightHeld', { item: t(orbital.risks[id].label), percent: percent(outcome.believed) }) : t('chapterDebriefUntested')}</p>
        {next && <p>{t(next.known ? 'riskDebriefRange' : next.found ? 'riskDebriefNext' : 'riskDebriefMissed', {
          weeks: next.weeks, ...next.known, work: t(orbital.costs[next.work].label), cost: next.credits, unit: 'kg',
        })}</p>}
        {id === 'link' && knowledge.link.fixed && <p>{t('chapterDebriefFixed')}</p>}
      </div>
    })}
  </RiskResults>
}

function LunarDebrief({ game, t }: { game: Game; t: Translate }) {
  const state = lunarState(game)
  const d = lunarDesign(game)
  const states = lunarStates(game)
  const flight = game.flight as LunarFlightResult & { siteConfirmed: boolean } | null
  const risks = lunarRisks(d, states)
  const tag = state.contract?.ended ? lunar.tags.ended : state.contract?.left === 0 ?
    state.contract.kind === 'funding' ? lunar.tags.renewed : lunar.tags.coauthor : lunar.tags.independent
  return <RiskResults game={game} rules={lunarRules} t={t}>
    <p>{t(tag)}</p>
    {state.secondPayload && <p>{t(lunar.tags.hosted)}</p>}
    {state.governmentCold && <p>{t(lunar.tags.distant)}</p>}
    {flight?.engineering && <p>{t(lunar.tags.engineering)}</p>}
    {flight?.cruiseData && <p>{t(lunar.tags.cruiseData)}</p>}
    {flight?.siteConfirmed && <p>{t(lunar.tags.siteConfirmed)}</p>}
    {flight && <p>{t('lunarFlightRemaining', { kg: flight.spareKg, credits: flight.credits })}</p>}
    {flight && risks.map(({ id, level, risk }) => {
      const item = lunar.risks[id]
      const state = states[id]
      const maturity = lunarMaturity(d, id)
      const identity = lunarItemId(d, id)
      const hit = flight.steps.some(step => step.failed === id)
      const flew = flight.flown.includes(id)
      const next = level < topLevel && !state.found && item.steps[level]
      const cost = next ? lunar.costs[next] : null
      return <div key={id} className="risk-item">
        <strong>{t(item.label)}</strong>
        <p>{t('riskLevel', { level: t(levels[level]) })} · {t(hasDefect(game.seed, identity, maturity) ? 'lunarTruthDefect' : 'lunarTruthClean')}</p>
        <p>{flew ? t(hit ? 'riskFlightFailed' : 'riskFlightHeld', { item: t(item.label), percent: percent(risk) }) : t('chapterDebriefUntested')}</p>
        {state.fixed && <p>{t('chapterDebriefFixed')}</p>}
        {hit && cost && <p>{t(flight.exposed.includes(id) && !hasDefect(game.seed, identity, maturity) ? 'lunarExposedDefect'
          : testResult(game.seed, identity, maturity, level + 1) === 'found' ? 'riskDebriefNext' : 'riskDebriefMissed', {
          work: t(cost.label), weeks: cost.weeks, cost: cost.credits,
        })}</p>}
      </div>
    })}
  </RiskResults>
}

export const orbitalUi: MissionUi = {
  Requirements: ({ t }) => <>
    <p>{t('orbitalBriefMinimum', { payload: orbital.testPayloadKg, units: orbital.confirmationUnits })}</p>
    <p>{t('orbitalBriefExtra', { margin: orbital.marginStretchKg, units: orbital.telemetry.diagnostics.diagnosticUnits })}</p>
  </>,
  Status: ({ game, t }) => <>{orbitalState(game).lab && <p>{t(game.week < orbital.labSlot.expiresWeek ? 'orbitalLabSlotDetail' : 'orbitalLabSlotExpired', { week: orbital.labSlot.expiresWeek })}</p>}
    {orbitalEstimate(game, t)}</>,
  Estimate: ({ game, t }) => orbitalEstimate(game, t),
  Forecast: inert, RemedyPreview: inert,
  Report: ({ evidence, t }) => <p>{t('orbitalInterfaceResult', { count: evidence.carried })}</p>,
  Delivery: ({ flight, t }) => <p>{t('orbitalPassReceipt', { confirmation: flight.confirmation, diagnostics: flight.diagnostics })}</p>,
  Debrief: OrbitalDebrief,
  flightSummary: (flight, t) => flight.stop === 'ascent' ? t('orbitalIncompleteOrbit')
    : t('orbitalPassReceipt', { confirmation: flight.confirmation, diagnostics: flight.diagnostics }),
  outcome: game => {
    if (!game.flight) return { title: orbital.outcomes.stopped.label, detail: { message: game.stop === 'funds' ? 'orbitalStopFunds' : game.stop === 'cancelled' ? 'orbitalStopCancelled' : 'orbitalStopDeadline' } }
    const result = game.flight as typeof game.flight & ReturnType<typeof flyOrbital>
    return { title: orbital.outcomes[result.outcome].label, detail: { message: orbital.outcomes[result.outcome].description } }
  },
}

export const lunarUi: MissionUi = {
  Requirements: ({ t }) => <>
    <p>{t('lunarBriefMinimum', { count: lunar.minimumBatches })}</p>
    <p>{t('lunarBriefExtra', { count: lunar.stretchBatches })}</p>
    <p>{t('lunarBriefMass', { allocation: lunar.launchAllocationKg })}</p>
  </>,
  Status: ({ game, t }) => {
    const state = lunarState(game)
    const contract = state.contract
    const plan = lunarPlanCost(game)
    return <>
      {plan.weeks > 0 && <p>{t('chapterPlan', plan)}</p>}
      {contract && !contract.ended && <p>{contract.left ? t('lunarContractProgress', { weeks: contract.weeks, done: contract.weeks - contract.left }) : t('lunarContractDelivered')}
        {' · '}{t('lunarSupportSlots', { count: state.slots })}</p>}
      {lunarEstimate(game, t)}
    </>
  },
  Estimate: ({ game, t }) => lunarEstimate(game, t),
  Forecast: inert, RemedyPreview: inert,
  Report: ({ evidence, t }) => <>
    <p>{t('lunarWeighingResult', { measured: evidence.mount, dry: evidence.dry })}</p>
    <p>{t('lunarPropellantLoaded', { allocation: lunar.launchAllocationKg, loaded: evidence.loaded, dry: evidence.dry })}</p>
  </>,
  Delivery: ({ flight, t }) => <p>{t('lunarGroundReceipt', { count: flight.batches })}</p>,
  Debrief: LunarDebrief,
  flightSummary: (flight, t) => t('lunarGroundReceipt', { count: flight.batches }),
  outcome: (game, t) => {
    const flight = game.flight as LunarFlightResult | null
    const ending = lunar.endings.find(item => item.outcome === (flight?.outcome ?? 'stopped') && item.closing === (flight?.closing ?? game.stop))
    if (!ending) return { title: lunar.outcomes.stopped.label }
    const states = lunarStates(game)
    const risk = flight && (flight.outcome === 'success' || flight.outcome === 'extra' ? flight.failures[0] : flight.critical)
    const critical = risk && risk !== 'choice' && risk !== 'reserve' ? risk : null
    const id = critical ?? 'descent'
    const level = critical ? states[id].level : 0
    const next = critical && lunar.risks[id].steps[level]
    const cost = next ? lunar.costs[next] : null
    const d = lunarDesign(game)
    return { title: lunar.outcomes[ending.outcome].label, detail: { message: ending.text, values: {
      item: t(critical ? lunar.risks[id].label : 'lunarWaiverReserve'),
      level: t(levels[level]), weeks: cost?.weeks ?? 0, credits: cost?.credits ?? Math.max(0, lunarPlanCost(game).credits - game.credits),
      percent: percent(critical ? defectBelief(lunarMaturity(d, id), states[id]) :
        flight?.flown.reduce((chance, item) => chance * (1 - defectBelief(lunarMaturity(d, item), states[item])), 1) ?? 0),
      count: flight?.flown.filter(item => !states[item].fixed && states[item].level < lunar.checkedLevel).length ?? 0,
      segment: t(lunar.segments.find(segment => segment.id === flight?.segment)?.label ?? 'lunarLaunchTitle'),
    } } }
  },
}
