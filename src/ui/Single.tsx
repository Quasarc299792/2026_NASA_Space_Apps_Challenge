import { useState } from 'react'
import { Check, ChevronRight, CircleAlert, Flag, Radio, Satellite, Timer, Wallet } from 'lucide-react'
import { cubeSat as mission } from '../missions/cubesat'
import {
  affordable, availableWeeks, baselineRemainingCost, canConfigure, currentEvidence, currentWork, forecast, passes, repairOptions,
  sameDesign, testDesign, workCost, type Action, type Design, type Entry, type FlightChoice, type Game, type Stage,
} from '../game/mission'
import type { Message, Translate } from '../i18n'
import { ActionButton, Back, CostLabel, DesignTags, EvidenceReport, Heading, Metric, PowerReadout, RemedyPreview } from './shared'

const stages: Stage[] = ['feasibility', 'design', 'build', 'integration', 'review', 'flight']
const stageDetails = {
  feasibility: 'feasibilityDetail', design: 'designDetail', build: 'buildDetail',
  integration: 'integrationDetail', review: 'reviewDetail', flight: 'flightDetail',
} as const

type Props = { game: Game; t: Translate; send: (action: Action) => void; back: () => void; restart: () => void }

export function Brief({ t, begin, back, saved }: { t: Translate; begin: () => void; back: () => void; saved: boolean }) {
  return <>
    <Back t={t} onClick={back} />
    <div className="brief-layout">
      <section className="panel brief-main">
        <Heading eyebrow={t('briefTitle')} title={t(mission.title)}>{t(mission.brief)}</Heading>
        <blockquote>{t('briefDialogue')}</blockquote>
        <ul className="requirements">
          <li><Flag size={18} aria-hidden />{t('briefMinimum', { count: mission.minimumBatches, orbits: mission.missionOrbits })}</li>
          <li><Satellite size={18} aria-hidden />{t('briefExtra', { count: mission.stretchBatches })}</li>
          <li><Radio size={18} aria-hidden />{t('briefIcd', { count: mission.ditl.minQuietMinutes })}</li>
        </ul>
        {saved && <p className="notice">{t('replaceSave')}</p>}
        <ActionButton onClick={begin}>{t('begin')}</ActionButton>
      </section>
      <aside className="panel brief-facts">
        <Metric label={t('time')} value={t('weeks', { count: mission.deadline })} />
        <Metric label={t('budget')} value={t('credits', { count: mission.budget })} />
        <Metric label={t('single')} value={t('duration', { minutes: mission.playMinutes })} />
      </aside>
    </div>
  </>
}

type Option<T extends string> = { id: T; name: Message; detail: string }

function Options<T extends string>({ legend, options, value, choose, t }: {
  legend: Message; options: Option<T>[]; value: T; choose: (value: T) => void; t: Translate
}) {
  return <fieldset className="options">
    <legend>{t(legend)}</legend>
    {options.map(option => <label className="option" key={option.id}>
      <input type="radio" name={legend} checked={value === option.id} onChange={() => choose(option.id)} />
      <span><strong>{t(option.name)}</strong><small>{option.detail}</small></span>
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
  function choose<K extends keyof Design>(key: K, value: Design[K]) {
    send({ type: 'configure', design: { ...design, [key]: value } })
  }

  return <section className="panel">
    <h2>{t('configuration')}</h2>
    <div className="config-grid">
      <Options legend="payload" options={optionList(mission.payloads, option => t(option.description, option))}
        value={design.payload} choose={value => choose('payload', value)} t={t} />
      <Options legend="supply" options={optionList(mission.supplies, option => t(option.description, option))}
        value={design.supply} choose={value => choose('supply', value)} t={t} />
      <Options legend="schedule" options={optionList(mission.schedules, option => t(option.description, { count: option.batchLoss }))}
        value={design.schedule} choose={value => choose('schedule', value)} t={t} />
      <Options legend="radio" options={optionList(mission.radios, option => t(option.description, { minutes: option.firstTxMinutes, capacity: option.groundCapacity }))}
        value={design.radio} choose={value => choose('radio', value)} t={t} />
    </div>
  </section>
}

function Estimate({ game, t }: Pick<Props, 'game' | 't'>) {
  const estimate = forecast(game.design)
  const cost = baselineRemainingCost(game)
  return <section className="panel estimate">
    <h2>{t('estimate')}</h2>
    <PowerReadout estimate={estimate} t={t} />
    <div className="estimate-line"><span>{t('estimatedDelivery')}</span><strong>{estimate.batches}</strong></div>
    {cost > 0 && <div className="estimate-line"><span>{t('designCost')}</span><strong>{t('credits', { count: cost })}</strong></div>}
  </section>
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
  if (!game.log.length) return null
  return <section className="panel">
    <h2>{t('log')}</h2>
    <ol className="decision-log">
      {game.log.map((entry, index) => <li key={index}>
        <div className="row"><strong>{t(logLabel(entry.id))}</strong><small>{t('logWeek', { week: entry.week })} · {t('logCost', { count: entry.cost })}</small></div>
        <DesignTags design={entry.design} t={t} />
        {entry.report && <small className={passes(entry.report) ? 'good' : 'bad'}>
          {t(passes(entry.report) ? 'pass' : 'fail')} · {t('powerUse', { peak: entry.report.peak, available: entry.report.available })} · {t('ditlRule', entry.report.ditl)}
        </small>}
      </li>)}
    </ol>
  </section>
}

function Flight({ game, t, send }: Pick<Props, 'game' | 't' | 'send'>) {
  const [choice, setChoice] = useState<FlightChoice>('priority')
  const evidence = currentEvidence(game)
  if (!evidence) return null
  return <section className="panel flight-panel">
    <div className="flight-visual" aria-hidden><div><Satellite size={42} strokeWidth={1.2} /><i /><Radio size={32} strokeWidth={1.2} /></div></div>
    <div className="flow" aria-label={t('flight')}><span>{t('separation')}</span><ChevronRight size={14} /><span>{t('payload')}</span><ChevronRight size={14} /><span>{t('ground')}</span></div>
    <Options legend="ground" value={choice} choose={setChoice} t={t} options={[
      { id: 'priority', name: 'flightPriority', detail: t('flightPriorityDetail', { count: mission.minimumBatches }) },
      { id: 'extra', name: 'flightExtra', detail: t('flightExtraDetail', { count: evidence.batches }) },
      { id: 'diagnostics', name: 'flightDiagnostics', detail: t('flightDiagnosticsDetail', { count: mission.diagnosticBatches }) },
    ]} />
    <ActionButton onClick={() => send({ type: 'fly', choice })}>{t('runFlight')}</ActionButton>
  </section>
}

function Results({ game, t, back, restart }: Props) {
  const { flight, stop } = game
  const outcome = !flight ? 'outcomeStopped' : flight.stretch ? 'outcomeExtra'
    : flight.batches >= mission.minimumBatches ? 'outcomeSuccess' : 'outcomePartial'
  const stopCopy = { deadline: 'stopDeadline', funds: 'stopFunds', cancelled: 'stopCancelled' } as const
  return <>
    <Back t={t} onClick={back} />
    <Heading eyebrow={t('results')} title={t(outcome)}>{flight ? t('flightBatches', { count: flight.batches }) : stop && t(stopCopy[stop])}</Heading>
    <div className="metrics">
      <Metric label={t('usedWeeks')} value={t('weeks', { count: game.week })} detail={t('weekOf', { week: game.week, deadline: mission.deadline })} />
      <Metric label={t('spentCredits')} value={t('credits', { count: mission.budget - game.credits })} detail={t('budgetOf', { count: mission.budget })} />
      <Metric label={t('progress')} value={game.gate} detail={t('gates', { gate: game.gate })} />
    </div>
    <div className="board">
      <div className="stack">
        {game.evidence
          ? <EvidenceReport evidence={game.evidence} t={t} outdated={!currentEvidence(game)} />
          : <section className="panel"><h2>{t('report')}</h2><p>{t('noEvidence')}</p></section>}
        <DecisionLog game={game} t={t} />
      </div>
      <aside className="stack">
        <Estimate game={game} t={t} />
        <section className="panel"><h2>{t('delivery')}</h2>
          <p>{flight ? t('flightBatches', { count: flight.batches }) : t('noFlight')}</p>
          {Boolean(flight?.diagnostics) && <p>{t('flightDiagnosticsSent')}</p>}
          {flight && <small>{t('firstTx')} · {t('timestamp', { count: flight.firstTx })}</small>}
        </section>
        <ActionButton onClick={restart}>{t('replay')}</ActionButton>
      </aside>
    </div>
  </>
}

export function Single(props: Props) {
  const { game, t, send, back } = props
  if (game.stage === 'results') return <Results {...props} />
  const work = currentWork(game)
  const cost = work && workCost(game, work)
  const checks = currentEvidence(game)
  const totalPass = checks ? [checks.powerPass, checks.dataPass, checks.ditlPass].filter(Boolean).length : 0
  const progress = stages.indexOf(game.stage)
  const editable = canConfigure(game)
  const retest = mission.costs.integrate
  const repairs = repairOptions(game)
  const repairFits = repairs.some(remedy => availableWeeks(game) >= mission.costs[remedy].weeks + retest.weeks
    && game.credits >= mission.costs[remedy].credits + retest.credits)
  const matchingAnalysis = game.analysis && sameDesign(game.analysis.design, game.design)
  return <>
    <Back t={t} onClick={back} />
    <Heading eyebrow={`${t('cubesat')} / ${t('workbench')}`} title={t(game.stage)}>{t(game.returned ? 'returnedDetail' : stageDetails[game.stage])}</Heading>
    <div className="metrics">
      <Metric label={t('time')} value={<><Timer size={19} aria-hidden />{t('weeks', { count: availableWeeks(game) })}</>}
        detail={t('weekOf', { week: game.week, deadline: mission.deadline })} />
      <Metric label={t('budget')} value={<><Wallet size={19} aria-hidden />{t('credits', { count: game.credits })}</>}
        detail={t('budgetOf', { count: mission.budget })} />
      <Metric label={t('progress')} value={checks ? `${totalPass} / 3` : t(passes(testDesign(game.design)) ? 'estimateOnTrack' : 'estimateAtRisk')}
        detail={checks ? t('report') : t('gates', { gate: game.gate })} />
    </div>
    <ol className="stage-track">
      {stages.map((stage, index) => <li key={stage} aria-current={index === progress ? 'step' : undefined}>
        {index < progress ? <Check size={13} aria-hidden /> : <i />} {t(stage)}
      </li>)}
    </ol>
    <div className="board">
      <div className="stack">
        {editable && <Config game={game} send={send} t={t} />}
        {game.stage === 'build' && <section className="panel"><h2>{t('configuration')}</h2><DesignTags design={game.design} t={t} /></section>}
        {game.analysis && editable && <section className="panel">
          <h2>{t('analysisReport')}</h2>
          {!matchingAnalysis && <p>{t('analysisOld')}</p>}
          <DesignTags design={game.analysis.design} t={t} />
          <PowerReadout estimate={game.analysis.forecast} t={t} />
        </section>}
        {game.evidence && <EvidenceReport evidence={game.evidence} t={t} outdated={!checks} />}
        {game.stage === 'flight' && <Flight game={game} t={t} send={send} />}
        {game.returned && <section className="panel repair">
          <div className="row"><h2>{t('returned')}</h2><CircleAlert size={20} className="bad" aria-hidden /></div>
          <p>{t('retestAdditional', retest)}</p>
          {!repairFits && <p className="notice">{t('noRepairTime')}</p>}
          {repairs.map(remedy => {
            const fix = mission.costs[remedy]
            return <div className="repair-option" key={remedy}>
              <div><strong>{t(fix.label)}</strong><RemedyPreview design={game.design} remedy={remedy} t={t} /></div>
              <button className="button secondary" disabled={!affordable(game, fix)} onClick={() => send({ type: 'repair', remedy })}>
                {t('repair')} <CostLabel t={t} {...fix} />
              </button>
            </div>
          })}
        </section>}
        {work && cost && <div className="action-row">
          <ActionButton disabled={!affordable(game, cost)} onClick={() => send({ type: 'work' })}>
            {t(work === 'integrate' && game.evidence ? 'retest' : mission.costs[work].label)} <CostLabel t={t} {...cost} />
          </ActionButton>
          {editable && <button className="button secondary" disabled={Boolean(matchingAnalysis) || !affordable(game, mission.costs.analyze)}
            onClick={() => send({ type: 'analyze' })}>{t('analyze')} <CostLabel t={t} {...mission.costs.analyze} /></button>}
        </div>}
        {game.stage === 'review' && !game.returned && <ActionButton onClick={() => send({ type: 'review' })}>{t('submitReview')}</ActionButton>}
        {game.stage !== 'flight' && (game.stage !== 'review' || game.returned) && <div className="action-row quiet">
          <button className="text-button" onClick={() => send({ type: 'wait' })}>{t('wait')}</button>
          <button className="text-button" onClick={() => window.confirm(t('cancelPrompt')) && send({ type: 'cancel' })}>{t('cancel')}</button>
        </div>}
      </div>
      <aside className="stack">
        <Estimate game={game} t={t} />
        <section className="panel mini-brief">
          <h2>{t('briefTitle')}</h2>
          <p>{t('briefMinimum', { count: mission.minimumBatches, orbits: mission.missionOrbits })}</p>
          <p>{t('briefIcd', { count: testDesign(game.design).ditl.threshold })}</p>
        </section>
      </aside>
    </div>
  </>
}
