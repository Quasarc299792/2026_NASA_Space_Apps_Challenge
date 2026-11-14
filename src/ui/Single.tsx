import { useState } from 'react'
import { Radio, Satellite } from 'lucide-react'
import { cubeSat as mission } from '../missions/cubesat'
import {
  affordable, availableWeeks, baselineRemainingCost, canConfigure, currentEvidence, currentWork, forecast, passes, repairOptions,
  sameDesign, testDesign, workCost, type Action, type Design, type Entry, type FlightChoice, type Game, type Remedy, type Stage,
} from '../game/mission'
import type { Message, Translate } from '../i18n'
import {
  ActionButton, Back, CostLabel, DesignSummary, Disclosure, EvidenceReport, Findings, Heading,
  money, passCount, PowerBreakdown, powerFinding, RemedyPreview, testedBatches,
} from './shared'
import { ReportCard } from './ReportCard'

const stages: Stage[] = ['feasibility', 'design', 'build', 'integration', 'review', 'flight']
type Props = { game: Game; t: Translate; send: (action: Action) => void; back: () => void; restart: () => void }

function Requirements({ t }: { t: Translate }) {
  return <ul className="requirements">
    <li>{t('briefMinimum', { count: mission.minimumBatches, orbits: mission.missionOrbits })}</li>
    <li>{t('briefExtra', { count: mission.stretchBatches })}</li>
    <li>{t('briefIcd', { count: mission.ditl.minQuietMinutes })}</li>
  </ul>
}

export function Brief({ t, begin, back, saved }: { t: Translate; begin: () => void; back: () => void; saved: boolean }) {
  return <article className="manual">
    <Back t={t} onClick={back} />
    <Heading eyebrow={t('briefTitle')} title={t(mission.title)}>{t(mission.brief)}</Heading>
    <blockquote>{t('briefDialogue')}</blockquote>
    <dl className="resource-line">
      <div><dt>{t('flightWindow')}</dt><dd>{t('weeks', { count: mission.deadline })}</dd></div>
      <div><dt>{t('budgetInitial')}</dt><dd>{money(mission.budget)}</dd></div>
    </dl>
    <Requirements t={t} />
    {saved && <p className="notice">{t('replaceSave')}</p>}
    <ActionButton onClick={begin}>{t('begin')}</ActionButton>
  </article>
}

type Option<T extends string> = { id: T; name: Message; detail: string; extra?: React.ReactNode; disabled?: boolean }

function Options<T extends string>({ legend, options, value, choose, t, layout = 'rows' }: {
  legend: Message; options: Option<T>[]; value: T | null; choose: (value: T) => void; t: Translate
  layout?: 'rows' | 'pair'
}) {
  return <fieldset className={`options ${layout}`}>
    <legend>{t(legend)}</legend>
    {options.map(option => <label className="option" key={option.id}>
      <input type="radio" name={legend} checked={value === option.id} disabled={option.disabled} onChange={() => choose(option.id)} />
      <span><strong>{t(option.name)}</strong><small>{option.detail}</small>{option.extra}</span>
    </label>)}
  </fieldset>
}

function optionList<T extends string, V extends { label: Message; description: Message }>(
  data: Record<T, V>, description: (option: V) => string,
): Option<T>[] {
  return (Object.keys(data) as T[]).map(id => ({ id, name: data[id].label, detail: description(data[id]) }))
}

function Config({ game, t, send }: Pick<Props, 'game' | 't' | 'send'>) {
  const { design } = game
  const result = testDesign(design)
  function choose<K extends keyof Design>(key: K, value: Design[K]) {
    send({ type: 'configure', design: { ...design, [key]: value } })
  }

  const feasibility = game.stage === 'feasibility'
  const hardware = <>
    <div className="reported-choice">
      <ReportCard speaker="science" t={t}><p>{t(feasibility ? 'reportPayload' : 'reportPayloadRevision', { count: mission.minimumBatches })}</p></ReportCard>
      <Options legend="payload" layout="pair" options={optionList(mission.payloads, option => t(option.description, { ...option, cost: money(option.cost) }))}
        value={design.payload} choose={value => choose('payload', value)} t={t} />
    </div>
    <div className="reported-choice">
      <ReportCard speaker="power" t={t}><p>{t(feasibility ? 'reportSupply' : 'reportSupplyRevision')}</p></ReportCard>
      <Options legend="supply" layout="pair" options={optionList(mission.supplies, option => t(option.description, { ...option, cost: money(option.cost) }))}
        value={design.supply} choose={value => choose('supply', value)} t={t} />
    </div>
  </>

  return <div className="decisions">
    {feasibility ? hardware : <>
      <div className="reported-choice">
        <ReportCard speaker="comms" t={t}><p>{t('reportSchedule')}</p></ReportCard>
        <Options legend="schedule" layout="pair" options={optionList(mission.schedules, option => t(option.description, { count: option.batchLoss }))}
          value={design.schedule} choose={value => choose('schedule', value)} t={t} />
      </div>
      <div className="reported-choice">
        <ReportCard speaker="comms" t={t}><p>{t('reportRadio', { minutes: mission.ditl.minQuietMinutes })}</p></ReportCard>
        <Options legend="radio" layout="pair" options={optionList(mission.radios, option => t(option.description, { minutes: option.firstTxMinutes, capacity: option.groundCapacity }))}
          value={design.radio} choose={value => choose('radio', value)} t={t} />
      </div>
      <Disclosure label={t('hardwareChoices')}><div className="decisions">{hardware}</div></Disclosure>
    </>}
    {(!result.powerPass || (game.stage === 'design' && (!result.ditlPass || !result.dataPass))) && <div className="warning" aria-live="polite">
      {!result.powerPass && <p>{powerFinding(result, t)}</p>}
      {game.stage === 'design' && !result.ditlPass && <p>{t('earlyTransmissionEstimate', result.ditl)}</p>}
      {game.stage === 'design' && result.powerPass && !result.dataPass &&
        <p>{t('dataShortfallEstimate', { count: result.batches, minimum: mission.minimumBatches })}</p>}
    </div>}
  </div>
}

function logLabel(id: Entry['id']): Message {
  switch (id) {
    case 'approve': return 'logApprove'
    case 'return': return 'logReturn'
    case 'operate': return 'logOperate'
    case 'analysisConflict':
    case 'analysisClear': return id
    default: return mission.costs[id].label
  }
}

function DecisionLog({ game, t }: Pick<Props, 'game' | 't'>) {
  return <ol className="decision-log">
    {game.log.map((entry, index) => <li key={index}>
      <Disclosure label={t(logLabel(entry.id))} value={t('logWeek', { week: entry.week })}>
        <p>{t('logCost', { count: money(entry.cost) })}</p>
        <DesignSummary design={entry.design} t={t} />
        {entry.report && <EvidenceReport evidence={entry.report} t={t} />}
      </Disclosure>
    </li>)}
  </ol>
}

function Flight({ game, t, send }: Pick<Props, 'game' | 't' | 'send'>) {
  const [choice, setChoice] = useState<FlightChoice>('priority')
  const evidence = currentEvidence(game)
  if (!evidence) return null
  return <>
    <ReportCard speaker="ground" t={t}><p>{t('reportFlight')}</p></ReportCard>
    <div className="flight-visual" aria-hidden><Satellite size={34} strokeWidth={1.2} /><i /><Radio size={26} strokeWidth={1.2} /></div>
    <Options legend="ground" value={choice} choose={setChoice} t={t} options={[
      { id: 'priority', name: 'flightPriority', detail: t('flightPriorityDetail', { count: mission.minimumBatches }) },
      { id: 'extra', name: 'flightExtra', detail: t('flightExtraDetail', { count: evidence.batches }) },
      { id: 'diagnostics', name: 'flightDiagnostics', detail: t('flightDiagnosticsDetail', { count: mission.diagnosticBatches }) },
    ]} />
    <ActionButton onClick={() => send({ type: 'fly', choice })}>{t('runFlight')}</ActionButton>
  </>
}

function Results({ game, t, back, restart }: Props) {
  const { flight, stop, evidence } = game
  const current = currentEvidence(game)
  const outcome = !flight ? 'outcomeStopped' : flight.stretch ? 'outcomeExtra'
    : flight.batches >= mission.minimumBatches ? 'outcomeSuccess' : 'outcomePartial'
  const stopCopy = { deadline: 'stopDeadline', funds: 'stopFunds', cancelled: 'stopCancelled' } as const
  const batches = (count: number) => t('dataBatches', { count })
  return <article className="manual">
    <Back t={t} onClick={back} />
    <Heading eyebrow={t('results')} title={t(outcome)}>{flight ? t('flightBatches', { count: flight.batches }) : stop && t(stopCopy[stop])}</Heading>
    <dl className="resource-line">
      <div><dt>{t('usedWeeks')}</dt><dd>{t('weeks', { count: game.week })}</dd></div>
      <div><dt>{t('spentCredits')}</dt><dd>{money(mission.budget - game.credits)}</dd></div>
    </dl>
    <section className="receipt" aria-label={t('results')}>
      <Disclosure label={t('estimate')} value={batches(forecast(game.design).batches)}><PowerBreakdown design={game.design} t={t} /></Disclosure>
      {evidence ? <Disclosure label={t('report')} value={current ? t('testedData', { count: testedBatches(current) }) : t('noCurrentEvidence')}>
        <EvidenceReport evidence={evidence} t={t} outdated={!current} />
      </Disclosure> : <div className="receipt-line"><span>{t('report')}</span><small>{t('noEvidence')}</small></div>}
      {flight ? <Disclosure label={t('delivery')} value={batches(flight.batches)}>
        <p>{t('firstTx')} · {t('timestamp', { count: flight.firstTx })}</p>
        {Boolean(flight.diagnostics) && <p>{t('flightDiagnosticsSent')}</p>}
      </Disclosure> : <div className="receipt-line"><span>{t('delivery')}</span><small>{t('noFlight')}</small></div>}
    </section>
    <ActionButton onClick={restart}>{t('replay')}</ActionButton>
    <div className="references">
      <p>{t('gates', { gate: game.gate })}</p>
      {game.log.length > 0 && <Disclosure label={t('log')}><DecisionLog game={game} t={t} /></Disclosure>}
    </div>
  </article>
}

function Repair({ game, t, send }: Pick<Props, 'game' | 't' | 'send'>) {
  const [choice, select] = useState<Remedy | null>(null)
  const retest = mission.costs.integrate
  const repairs = repairOptions(game)
  const canFinish = (remedy: Remedy) => availableWeeks(game) >= mission.costs[remedy].weeks + retest.weeks
    && game.credits >= mission.costs[remedy].credits + retest.credits
  return <>
    <Options legend="repairChoices" value={choice} choose={select} t={t} options={repairs.map(remedy => ({
      id: remedy,
      name: mission.costs[remedy].label,
      detail: `${t('weeks', { count: mission.costs[remedy].weeks })} · ${money(mission.costs[remedy].credits)}`,
      extra: <RemedyPreview design={game.design} remedy={remedy} t={t} />,
      disabled: !affordable(game, mission.costs[remedy]),
    }))} />
    <p className="action-note">{t('retestAdditional', { weeks: retest.weeks, credits: money(retest.credits) })}</p>
    {!repairs.some(canFinish) && <p className="notice">{t('noRepairTime')}</p>}
    <ActionButton disabled={!choice || !affordable(game, mission.costs[choice])}
      onClick={() => choice && send({ type: 'repair', remedy: choice })}>{t('selectCorrection')}</ActionButton>
  </>
}

function Reference({ game, t, send }: Pick<Props, 'game' | 't' | 'send'>) {
  const editable = canConfigure(game)
  const estimate = forecast(game.design)
  const cost = baselineRemainingCost(game)
  const current = currentEvidence(game)
  const matching = game.analysis && sameDesign(game.analysis.design, game.design)
  const canEnd = game.stage !== 'flight' && (game.stage !== 'review' || game.returned)
  return <aside className="references" aria-label={t('missionInfo')}>
    {game.evidence && <Disclosure label={t('report')} value={current ? t('checksPassed', { count: passCount(current) }) : t('noCurrentEvidence')}>
      <EvidenceReport evidence={game.evidence} t={t} outdated={!current} />
    </Disclosure>}
    {editable && <Disclosure label={t('analysisAction')}>
      <button className="button secondary" disabled={Boolean(matching) || !affordable(game, mission.costs.analyze)}
        onClick={() => send({ type: 'analyze' })}>{t('analyze')} <CostLabel t={t} {...mission.costs.analyze} /></button>
    </Disclosure>}
    {game.analysis && <Disclosure label={t('analysisReport')}>
      {!matching && <p>{t('analysisOld')}</p>}
      <DesignSummary design={game.analysis.design} t={t} />
      <PowerBreakdown design={game.analysis.design} result={game.analysis.forecast} t={t} />
    </Disclosure>}
    <Disclosure label={t('details')}>
      <Disclosure label={t('configuration')}><DesignSummary design={game.design} t={t} /></Disclosure>
      <Disclosure label={t('estimate')}>
        <dl className="fact-list">
          <div><dt>{t('estimatedDelivery')}</dt><dd>{t('dataBatches', { count: estimate.batches })}</dd></div>
          {cost > 0 && <div><dt>{t('designCost')}</dt><dd>{money(cost)}</dd></div>}
        </dl>
        <PowerBreakdown design={game.design} t={t} />
      </Disclosure>
      <Disclosure label={t('briefTitle')}><Requirements t={t} /></Disclosure>
      <Disclosure label={t('process')} value={game.gate}>
        <ol className="stage-track">
          {stages.map(stage => <li key={stage} aria-current={stage === game.stage ? 'step' : undefined}>{t(stage)}</li>)}
        </ol>
      </Disclosure>
      {game.log.length > 0 && <Disclosure label={t('log')}><DecisionLog game={game} t={t} /></Disclosure>}
    </Disclosure>
    {canEnd && <Disclosure label={t('missionActions')}>
      <div className="action-row">
        <button className="text-button" onClick={() => send({ type: 'wait' })}>{t('wait')}</button>
        <button className="text-button" onClick={() => window.confirm(t('cancelPrompt')) && send({ type: 'cancel' })}>{t('cancel')}</button>
      </div>
    </Disclosure>}
  </aside>
}

export function Single(props: Props) {
  const { game, t, send, back } = props
  if (game.stage === 'results') return <Results {...props} />
  const work = currentWork(game)
  const cost = work && workCost(game, work)
  const checks = currentEvidence(game)
  const editable = canConfigure(game)
  const stage = game.stage
  const latestAnalysis = editable && game.analysis && ['analysisClear', 'analysisConflict'].includes(game.log.at(-1)?.id ?? '')
    && sameDesign(game.analysis.design, game.design) ? game.analysis : null

  return <article className="manual">
    <Back t={t} onClick={back} />
    <Heading eyebrow={t('cubesat')} title={t(game.returned ? 'returned' : stage)} />
    <dl className="resource-line">
      <div><dt>{t('flightWindow')}</dt><dd>{t('weeks', { count: availableWeeks(game) })}</dd></div>
      <div><dt>{t('budgetLabel')}</dt><dd>{money(game.credits)}</dd></div>
    </dl>
    <section className="next-decision decision-arrival" key={`${stage}:${game.returned}`}>
      {stage === 'build' && <ReportCard speaker="assembly" t={t}><p>{t('reportBuild')}</p></ReportCard>}
      {stage === 'integration' && <ReportCard speaker="test" t={t}>
        <p>{t(game.evidence ? 'reviewRetest' : 'reportIntegration')}</p>
      </ReportCard>}
      {stage === 'review' && checks && (passes(checks)
        ? <ReportCard speaker="review" t={t}><p>{t('reviewReady')}</p></ReportCard>
        : <div>
          <ReportCard speaker="review" t={t} attention>
            <Findings evidence={checks} t={t} />
            {game.returned && <p>{t('reportReviewBlocked')}</p>}
          </ReportCard>
          {!checks.powerPass && <Disclosure label={t('powerBreakdown')}>
            <PowerBreakdown design={checks.design} result={checks} t={t} />
          </Disclosure>}
        </div>)}
      {editable && <Config game={game} t={t} send={send} />}
      {latestAnalysis && <p className={latestAnalysis.forecast.deficit ? 'warning' : 'verified'} role="status">
        {t(latestAnalysis.forecast.deficit ? 'analysisTradeoff' : 'analysisClear')}
      </p>}
      {game.returned && <Repair game={game} t={t} send={send} />}
      {work && cost && <ActionButton disabled={!affordable(game, cost)} onClick={() => send({ type: 'work' })}>
        {t(work === 'integrate' && game.evidence ? 'retest' : mission.costs[work].label)} <CostLabel t={t} {...cost} />
      </ActionButton>}
      {stage === 'review' && !game.returned && <ActionButton onClick={() => send({ type: 'review' })}>{t('submitReview')}</ActionButton>}
      {stage === 'flight' && <Flight game={game} t={t} send={send} />}
    </section>
    <Reference key={stage} game={game} t={t} send={send} />
  </article>
}
