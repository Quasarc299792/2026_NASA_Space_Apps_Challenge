import { useState } from 'react'
import { Check, ChevronRight, CircleAlert, Radio, Satellite, Timer, TriangleAlert, Wallet } from 'lucide-react'
import {
  affordable, availableWeeks, baselineRemainingCost, canConfigure, currentEvidence, currentWork, passes, pendingEvent, repairOptions,
  sameDesign, workCost, type Action, type Design, type DesignOption, type Entry, type Game, type Stage,
} from '../game/mission'
import type { Message, Translate } from '../i18n'
import type { MissionModule } from '../missions'
import { ActionButton, Back, CostLabel, DesignTags, Heading, Metric, optionValues, ReportPanel } from './shared'

const stages: Stage[] = ['feasibility', 'design', 'build', 'integration', 'review', 'flight']

type Props = {
  game: Game; mission: MissionModule; t: Translate; send: (action: Action) => void; back: () => void; restart: () => void
  next: Message | null
}

export function Brief({ mission, t, begin, back, saved }: {
  mission: MissionModule; t: Translate; begin: () => void; back: () => void; saved: boolean
}) {
  return <>
    <Back t={t} onClick={back} />
    <div className="brief-layout">
      <section className="panel brief-main">
        <Heading eyebrow={t('briefTitle')} title={t(mission.title)}>{t(mission.brief)}</Heading>
        <blockquote>{t(mission.dialogue)}</blockquote>
        <mission.ui.Requirements t={t} />
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

function optionList(data: Record<string, DesignOption>, t: Translate): Option<string>[] {
  return Object.entries(data).map(([id, option]) => ({ id, name: option.label, detail: t(option.description, optionValues(option)) }))
}

function Config({ game, mission, t, send }: Pick<Props, 'game' | 'mission' | 't' | 'send'>) {
  const { design } = game
  function choose(key: string, value: string) {
    send({ type: 'configure', design: { ...design, [key]: value } as Design })
  }

  return <section className="panel">
    <h2>{t('configuration')}</h2>
    <div className="config-grid">
      {Object.entries(mission.groups).map(([key, group]) => <Options key={key} legend={group.legend}
        options={optionList(group.options, t)} value={design[key]} choose={value => choose(key, value)} t={t} />)}
    </div>
  </section>
}

function Estimate({ game, mission, t }: Pick<Props, 'game' | 'mission' | 't'>) {
  const cost = baselineRemainingCost(game)
  return <section className="panel estimate">
    <h2>{t('estimate')}</h2>
    <mission.ui.Estimate design={game.design} t={t} />
    {cost > 0 && <div className="estimate-line"><span>{t('designCost')}</span><strong>{t('credits', { count: cost })}</strong></div>}
  </section>
}

function logLabel(mission: MissionModule, entry: Entry): Message {
  if (entry.label) return entry.label
  switch (entry.id) {
    case 'approve': return 'logApprove'
    case 'return': return 'logReturn'
    case 'operate': return 'logOperate'
    case 'analysisConflict':
    case 'analysisClear': return entry.id
    default: return mission.costs[entry.id].label
  }
}

function DecisionLog({ game, mission, t }: Pick<Props, 'game' | 'mission' | 't'>) {
  if (!game.log.length) return null
  return <section className="panel">
    <h2>{t('log')}</h2>
    <ol className="decision-log">
      {game.log.map((entry, index) => <li key={index}>
        <div className="row"><strong>{t(logLabel(mission, entry))}</strong><small>{t('logWeek', { week: entry.week })} · {t('logCost', { count: entry.cost })}</small></div>
        <DesignTags mission={mission} design={entry.design} t={t} />
        {entry.report && <small className={passes(entry.report) ? 'good' : 'bad'}>
          {t(passes(entry.report) ? 'pass' : 'fail')} · <mission.ui.ReportSummary evidence={entry.report} t={t} />
        </small>}
      </li>)}
    </ol>
  </section>
}

function MissionEvent({ game, t, send }: Pick<Props, 'game' | 't' | 'send'>) {
  const event = pendingEvent(game)
  if (!event) return null
  return <section className="panel repair" role="alertdialog" aria-labelledby="mission-event">
    <div className="row"><h2 id="mission-event">{t(event.title)}</h2><TriangleAlert size={20} className="bad" aria-hidden /></div>
    <p>{t(event.detail)}</p>
    {event.choices.map(choice => <div className="repair-option" key={choice.id}>
      <div><strong>{t(choice.label)}</strong><small>{t(choice.detail)}</small></div>
      <button className="button secondary" onClick={() => send({ type: 'choose', choice: choice.id })}>{t('eventChoose')}</button>
    </div>)}
  </section>
}

function Flight({ game, mission, t, send }: Pick<Props, 'game' | 'mission' | 't' | 'send'>) {
  const [choice, setChoice] = useState(mission.flightChoices[0])
  const evidence = currentEvidence(game)
  if (!evidence) return null
  return <section className="panel flight-panel">
    <div className="flight-visual" aria-hidden><div><Satellite size={42} strokeWidth={1.2} /><i /><Radio size={32} strokeWidth={1.2} /></div></div>
    <div className="flow" aria-label={t('flight')}><span>{t('separation')}</span><ChevronRight size={14} /><span>{t('payload')}</span><ChevronRight size={14} /><span>{t('ground')}</span></div>
    <Options legend="ground" value={choice} choose={setChoice} t={t} options={mission.ui.flightOptions(evidence, t)} />
    <ActionButton onClick={() => send({ type: 'fly', choice })}>{t('runFlight')}</ActionButton>
  </section>
}

function Results({ game, mission, t, back, restart, next }: Props) {
  const { flight, stop } = game
  const outcome = !flight ? mission.outcomes.stopped : flight.stretch ? mission.outcomes.extra
    : flight.delivered ? mission.outcomes.success : mission.outcomes.partial
  const stopCopy = { deadline: 'stopDeadline', funds: 'stopFunds', cancelled: 'stopCancelled' } as const
  return <>
    <Back t={t} onClick={back} />
    <Heading eyebrow={t('results')} title={t(outcome)}>{flight ? mission.ui.flightSummary(flight, t) : stop && t(stopCopy[stop])}</Heading>
    {flight?.delivered && next && <p className="notice" role="status">{t('nextUnlocked', { mission: t(next) })}</p>}
    <div className="metrics">
      <Metric label={t('usedWeeks')} value={t('weeks', { count: game.week })} detail={t('weekOf', { week: game.week, deadline: game.deadline })} />
      <Metric label={t('spentCredits')} value={t('credits', { count: mission.budget - game.credits })} detail={t('budgetOf', { count: mission.budget })} />
      <Metric label={t('progress')} value={game.gate} detail={t('gates', { gate: game.gate })} />
    </div>
    <div className="board">
      <div className="stack">
        {game.evidence
          ? <ReportPanel mission={mission} evidence={game.evidence} t={t} outdated={!currentEvidence(game)} />
          : <section className="panel"><h2>{t('report')}</h2><p>{t('noEvidence')}</p></section>}
        <DecisionLog game={game} mission={mission} t={t} />
      </div>
      <aside className="stack">
        <Estimate game={game} mission={mission} t={t} />
        <section className="panel"><h2>{t('delivery')}</h2>
          {flight ? <mission.ui.Delivery flight={flight} t={t} /> : <p>{t('noFlight')}</p>}
        </section>
        <ActionButton onClick={restart}>{t('replay')}</ActionButton>
      </aside>
    </div>
  </>
}

export function Single(props: Props) {
  const { game, mission, t, send, back } = props
  if (game.stage === 'results') return <Results {...props} />
  const work = currentWork(game)
  const cost = work && workCost(game, work)
  const checks = currentEvidence(game)
  const totalPass = checks ? checks.checks.filter(Boolean).length : 0
  const progress = stages.indexOf(game.stage)
  const event = Boolean(game.event)
  const editable = canConfigure(game) && !event
  const retest = mission.costs.integrate
  const repairs = repairOptions(game)
  const repairFits = repairs.some(remedy => availableWeeks(game) >= mission.costs[remedy].weeks + retest.weeks
    && game.credits >= mission.costs[remedy].credits + retest.credits)
  const matchingAnalysis = game.analysis && sameDesign(game.analysis.design, game.design)
  return <>
    <Back t={t} onClick={back} />
    <Heading eyebrow={`${t(mission.title)} / ${t('workbench')}`} title={t(game.stage)}>{t(game.returned ? 'returnedDetail' : mission.stageDetails[game.stage])}</Heading>
    <div className="metrics">
      <Metric label={t('time')} value={<><Timer size={19} aria-hidden />{t('weeks', { count: availableWeeks(game) })}</>}
        detail={t('weekOf', { week: game.week, deadline: game.deadline })} />
      <Metric label={t('budget')} value={<><Wallet size={19} aria-hidden />{t('credits', { count: game.credits })}</>}
        detail={t('budgetOf', { count: mission.budget })} />
      <Metric label={t('progress')} value={checks ? `${totalPass} / ${checks.checks.length}` : t(passes(mission.test(game.design)) ? 'estimateOnTrack' : 'estimateAtRisk')}
        detail={checks ? t('report') : t('gates', { gate: game.gate })} />
    </div>
    <ol className="stage-track">
      {stages.map((stage, index) => <li key={stage} aria-current={index === progress ? 'step' : undefined}>
        {index < progress ? <Check size={13} aria-hidden /> : <i />} {t(stage)}
      </li>)}
    </ol>
    <div className="board">
      <div className="stack">
        <MissionEvent game={game} t={t} send={send} />
        {editable && <Config game={game} mission={mission} send={send} t={t} />}
        {game.stage === 'build' && <section className="panel"><h2>{t('configuration')}</h2><DesignTags mission={mission} design={game.design} t={t} /></section>}
        {game.analysis && editable && <section className="panel">
          <h2>{t('analysisReport')}</h2>
          {!matchingAnalysis && <p>{t('analysisOld')}</p>}
          <DesignTags mission={mission} design={game.analysis.design} t={t} />
          <mission.ui.Forecast forecast={game.analysis.forecast} t={t} />
        </section>}
        {game.evidence && <ReportPanel mission={mission} evidence={game.evidence} t={t} outdated={!checks} />}
        {game.stage === 'flight' && <Flight game={game} mission={mission} t={t} send={send} />}
        {game.returned && !event && <section className="panel repair">
          <div className="row"><h2>{t('returned')}</h2><CircleAlert size={20} className="bad" aria-hidden /></div>
          <p>{t('retestAdditional', retest)}</p>
          {!repairFits && <p className="notice">{t('noRepairTime')}</p>}
          {repairs.map(remedy => {
            const fix = mission.costs[remedy]
            return <div className="repair-option" key={remedy}>
              <div><strong>{t(fix.label)}</strong><mission.ui.RemedyPreview design={game.design} remedy={remedy} t={t} /></div>
              <button className="button secondary" disabled={!affordable(game, fix)} onClick={() => send({ type: 'repair', remedy })}>
                {t('repair')} <CostLabel t={t} {...fix} />
              </button>
            </div>
          })}
        </section>}
        {!event && work && cost && <div className="action-row">
          <ActionButton disabled={!affordable(game, cost)} onClick={() => send({ type: 'work' })}>
            {t(work === 'integrate' && game.evidence ? 'retest' : mission.costs[work].label)} <CostLabel t={t} {...cost} />
          </ActionButton>
          {editable && <button className="button secondary" disabled={Boolean(matchingAnalysis) || !affordable(game, mission.costs.analyze)}
            onClick={() => send({ type: 'analyze' })}>{t('analyze')} <CostLabel t={t} {...mission.costs.analyze} /></button>}
        </div>}
        {!event && game.stage === 'review' && !game.returned && <ActionButton onClick={() => send({ type: 'review' })}>{t('submitReview')}</ActionButton>}
        {!event && game.stage !== 'flight' && (game.stage !== 'review' || game.returned) && <div className="action-row quiet">
          <button className="text-button" onClick={() => send({ type: 'wait' })}>{t('wait')}</button>
          <button className="text-button" onClick={() => window.confirm(t('cancelPrompt')) && send({ type: 'cancel' })}>{t('cancel')}</button>
        </div>}
      </div>
      <aside className="stack">
        <Estimate game={game} mission={mission} t={t} />
        <section className="panel mini-brief">
          <h2>{t('briefTitle')}</h2>
          <mission.ui.Requirements t={t} compact />
        </section>
      </aside>
    </div>
  </>
}
