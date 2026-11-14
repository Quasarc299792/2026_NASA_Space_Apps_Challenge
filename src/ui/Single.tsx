import { useState } from 'react'
import { nextMission } from '../game/progress'
import {
  affordable, availableWeeks, baselineRemainingCost, canConfigure, contactEvidence, currentEvidence, currentFlightSegment, currentWork,
  flightContext, passes, pendingEvent, pendingReview, pendingWorkId, repairOptions, riskAcceptance, taskOptions,
  sameDesign, workCost, type Action, type BenchLead, type ConfigStep, type Copy, type DesignOption, type SegmentEntry,
  type MissionFile as File, type Entry, type Game, type Stage, type TestFocus,
} from '../game/mission'
import { detection, percent, reviewRiskThreshold, verificationLevels } from '../game/risk'
import type { Message, Translate } from '../i18n'
import { missions, type MissionModule } from '../missions'
import { cubeSat, forecast, planContact, powerTimeline, riskDebrief, scopeSegment, testDesign, type CubeSatDesign, type CubeSatEvidence, type CubeSatGame } from '../missions/cubesat'
import { Findings, powerFinding, testedBatches } from '../missions/cubesat-ui'
import { ActionButton, Back, CostLabel, DesignSummary, Disclosure, EvidenceReport, Heading, missionMoney, money, optionValues } from './shared'
import { ReportCard } from './ReportCard'
import { Lab } from './Lab'

const stages: Stage[] = ['feasibility', 'design', 'build', 'integration', 'review', 'flight']
type Props = { game: Game; mission: MissionModule; t: Translate; send: (action: Action) => void; back: () => void; replay: (sameSeed: boolean) => void }
type Controls = Pick<Props, 'game' | 'mission' | 't' | 'send'>

export function Brief({ mission, t, begin, back, saved }: {
  mission: MissionModule; t: Translate; begin: () => void; back: () => void; saved: boolean
}) {
  return <article className="manual">
    <Back t={t} onClick={back} />
    <Heading eyebrow={t('briefTitle')} title={t(mission.title)}>{t(mission.brief)}</Heading>
    <blockquote>{t(mission.dialogue)}</blockquote>
    <dl className="resource-line">
      <div><dt>{t('flightWindow')}</dt><dd>{t('weeks', { count: mission.deadline })}</dd></div>
      <div><dt>{t('budgetInitial')}</dt><dd>{missionMoney(mission, mission.budget, t)}</dd></div>
    </dl>
    <mission.ui.Requirements t={t} />
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

function optionList(data: Record<string, DesignOption>, t: Translate, mission: MissionModule): Option<string>[] {
  return Object.entries(data).map(([id, option]) => ({ id, name: option.label, detail: t(option.description, optionValues(option, mission)) }))
}

function CubeSatConfig({ game, mission, t, send }: Controls) {
  const design = game.design as CubeSatDesign
  const result = testDesign(design)
  function choose(key: string, value: string) {
    send({ type: 'configure', design: { ...design, [key]: value } })
  }

  const feasibility = game.stage === 'feasibility'
  const first: ConfigStep = feasibility ? 'payload' : 'schedule'
  const second: ConfigStep = feasibility ? 'supply' : 'radio'
  const step = game.configStep === second ? second : first
  const payload = <div className="reported-choice">
    <ReportCard speaker="science" t={t}><p>{t(feasibility ? 'reportPayload' : 'reportPayloadRevision', { count: cubeSat.minimumBatches })}</p></ReportCard>
    <Options legend="payload" layout="pair" options={optionList(mission.groups.payload.options, t, mission)}
      value={design.payload} choose={value => choose('payload', value)} t={t} />
  </div>
  const supply = <div className="reported-choice">
    <ReportCard speaker="power" t={t}><p>{t(feasibility ? 'reportSupply' : 'reportSupplyRevision')}</p></ReportCard>
    <Options legend="supply" layout="pair" options={optionList(mission.groups.supply.options, t, mission)}
      value={design.supply} choose={value => choose('supply', value)} t={t} />
  </div>
  const schedule = <div className="reported-choice">
    <ReportCard speaker="comms" t={t}><p>{t('reportSchedule')}</p></ReportCard>
    <Options legend="schedule" layout="pair" options={optionList(mission.groups.schedule.options, t, mission)}
      value={design.schedule} choose={value => choose('schedule', value)} t={t} />
  </div>
  const radio = <div className="reported-choice">
    <ReportCard speaker="comms" t={t}><p>{t('reportRadio', { minutes: cubeSat.ditl.minQuietMinutes })}</p></ReportCard>
    <Options legend="radio" layout="pair" options={optionList(mission.groups.radio.options, t, mission)}
      value={design.radio} choose={value => choose('radio', value)} t={t} />
  </div>
  const choices = { payload, supply, schedule, radio }
  const work = feasibility ? 'assess' : 'freeze'
  const cost = workCost(game, work)
  return <div className="decisions">
    {choices[step]}
    {step === second && (!result.powerPass || (!feasibility && (!result.ditlPass || !result.dataPass))) && <div className="warning" aria-live="polite">
      {!result.powerPass && <p>{powerFinding(result, t)}</p>}
      {!feasibility && !result.ditlPass && <p>{t('earlyTransmissionEstimate', result.ditl)}</p>}
      {!feasibility && result.powerPass && !result.dataPass &&
        <p>{t('dataShortfallEstimate', { count: result.batches, minimum: cubeSat.minimumBatches })}</p>}
    </div>}
    <div className="action-row">
      {step === first ? <ActionButton onClick={() => send({ type: 'configStep', step: second })}>
        {t(feasibility ? 'nextSupply' : 'nextRadio')}
      </ActionButton> : <>
        <ActionButton disabled={!affordable(game, cost)} onClick={() => send({ type: 'work' })}>
          {t(mission.costs[work].label)} <CostLabel t={t} mission={mission} {...cost} />
        </ActionButton>
        <button className="text-button" onClick={() => send({ type: 'configStep', step: first })}>
          {t(feasibility ? 'backPayload' : 'backSchedule')}
        </button>
      </>}
    </div>
    {!feasibility && <Disclosure label={t('hardwareChoices')}><div className="decisions">{payload}{supply}</div></Disclosure>}
  </div>
}

function copy(t: Translate, text: Copy) {
  return t(text.message, text.values)
}

function logLabel(mission: MissionModule, { id, label }: Entry): Message {
  if (label) return label
  switch (id) {
    case 'approve': return 'logApprove'
    case 'return': return 'logReturn'
    case 'operate': return 'logOperate'
    case 'analysisConflict':
    case 'analysisClear': return id
    default: return mission.costs[id]?.label ?? 'logWork'
  }
}

function DecisionLog({ game, mission, t }: Pick<Props, 'game' | 'mission' | 't'>) {
  return <ol className="decision-log">
    {game.log.map((entry, index) => <li key={index}>
      <Disclosure label={entry.review ? t(entry.review.passed ? 'gateApproved' : 'gateReturned', { gate: entry.review.gate })
        : t(logLabel(mission, entry))} value={t('logWeek', { week: entry.week })}>
        <p>{t('logCost', { count: missionMoney(mission, entry.cost, t) })}</p>
        {entry.detail && <p>{copy(t, entry.detail)}</p>}
        {entry.incomplete && <p>{t('workInterrupted')}</p>}
        {entry.review && <>
          {entry.review.detail && <p>{copy(t, entry.review.detail)}</p>}
          {entry.review.waivers.length > 0 && <p>{t('waiversUsed', { items: entry.review.waivers.map(item => t(item.label)).join(t('listSeparator')) })}</p>}
        </>}
        <DesignSummary mission={mission} design={entry.design} t={t} />
        {entry.report && <EvidenceReport mission={mission} evidence={entry.report} t={t} />}
      </Disclosure>
    </li>)}
  </ol>
}

function BenchWork({ game, mission, t, send }: Controls) {
  const [benchLead, setBenchLead] = useState<BenchLead>('science')
  const [testFocus, setTestFocus] = useState<TestFocus>(game.testFocus ?? 'downlink')
  const build = game.stage === 'build'
  const work = build ? 'build' : 'integrate'
  const cost = workCost(game, work)
  return <>
    {build ? <>
      <ReportCard speaker="assembly" t={t}><p>{t('reportBenchChoice')}</p></ReportCard>
      <Options legend="benchChoice" value={benchLead} choose={setBenchLead} t={t} options={[
        { id: 'science', name: 'benchScience', detail: t('benchScienceDetail') },
        { id: 'power', name: 'benchPower', detail: t('benchPowerDetail') },
      ]} />
    </> : <>
      <ReportCard speaker="test" t={t}>
        <p>{t(game.evidence ? 'reviewRetest' : 'reportIntegrationFocus')}</p>
      </ReportCard>
      <Options legend="focusChoice" value={testFocus} choose={setTestFocus} t={t} options={[
        { id: 'imaging', name: 'focusImaging', detail: t('focusImagingDetail') },
        { id: 'downlink', name: 'focusRadio', detail: t('focusRadioDetail') },
      ]} />
    </>}
    <ActionButton disabled={!affordable(game, cost)} onClick={() => send({ type: 'runLab', benchLead, testFocus })}>
      {t(!build && game.evidence ? 'retest' : mission.costs[work].label)} <CostLabel t={t} mission={mission} {...cost} />
    </ActionButton>
  </>
}

const levelNames = { none: 'riskLevelNone', analysis: 'riskLevelAnalysis', unit: 'riskLevelUnit', endToEnd: 'riskLevelEndToEnd' } as const

// What the player currently believes about each risk item, and what the next verification level costs.
function RiskPanel({ game, mission, t, send }: Controls) {
  if (!mission.risks) return null
  const items = mission.risks.view(game)
  const odds = mission.risks.odds(game)
  const reserve = baselineRemainingCost(game)
  return <section className="risk-panel" aria-label={t('riskTitle')}>
    <h2>{t('riskTitle')}</h2>
    <p className="risk-odds">{t('riskOddsMinimum', { percent: percent(odds.minimum) })} · {t('riskOddsNoFatal', { percent: percent(odds.noFatal) })}</p>
    {items.map(item => {
      const { next, fix, state } = item
      const tooCostly = Boolean(next) && game.credits - next!.credits < reserve
      return <div className="risk-item" key={item.id}>
        <div className="risk-head"><strong>{t(item.label)}</strong><span>{t('riskChance', { percent: percent(item.risk) })}</span></div>
        <small>{t(item.detail)}</small>
        <small>{t(item.maturity === 'new' ? 'riskMaturityNew' : 'riskMaturityHeritage')} · {t(item.severity === 'fatal' ? 'riskSeverityFatal' : 'riskSeverityDegraded')} · {t('riskLevel', { level: t(levelNames[verificationLevels[state.level]]) })}</small>
        {state.fixed ? <p className="verified">{t('riskFixed')}</p> : state.found ? <>
          <p className="warning" role="status">{t('riskTestFound')}</p>
          <button className="button secondary" disabled={!affordable(game, fix)} onClick={() => send({ type: 'fix', risk: item.id })}>
            {t('riskFixAction', { work: t(mission.costs[fix.work].label), weeks: fix.weeks, cost: money(fix.credits) })}
          </button>
          {!affordable(game, fix) && <small>{t('riskNoFix')}</small>}
          <small>{t('riskOrFly')}</small>
        </> : <>
          {state.level > 0 && <small role="status">{t('riskTestPassed', { percent: percent(1 - detection[state.level]) })}</small>}
          {next ? <button className="button secondary" disabled={!affordable(game, next) || tooCostly} onClick={() => send({ type: 'verify', risk: item.id })}>
            {t('riskVerifyAddOn', { work: t(mission.costs[next.work].label), cost: money(next.credits), percent: percent(next.passRisk) })}
          </button> : <small>{t('riskTopLevel', { percent: percent(1 - detection[state.level]) })}</small>}
          {tooCostly && <small>{t('riskTooCostly')}</small>}
        </>}
      </div>
    })}
    <small>{t('riskBeliefNote')} {t('riskAddOnNote')}</small>
  </section>
}

// What each risk item turned out to be, what the player believed, and what the next test would have said.
function RiskDebrief({ game, mission, t }: Pick<Props, 'game' | 'mission' | 't'>) {
  if (!mission.risks) return null
  const items = mission.risks.view(game)
  return <section className="risk-panel" aria-label={t('riskFlightTitle')}>
    <h2>{t('riskFlightTitle')}</h2>
    {game.outcomes.map(outcome => {
      const item = items.find(entry => entry.id === outcome.id)
      if (!item) return null
      const next = game.missionId === cubeSat.id ? riskDebrief(game, outcome.id) : null
      const values = { item: t(item.label), percent: percent(outcome.believed) }
      return <div className="risk-item" key={outcome.id}>
        <p className={outcome.failed ? 'warning' : undefined}>{t(outcome.failed ? 'riskFlightFailed' : 'riskFlightHeld', values)}</p>
        {outcome.failed && <small>{t(item.failure)}</small>}
        {outcome.failed && <small>{item.state.found ? t('riskFlewKnowingly') : next
          ? t(next.found ? 'riskDebriefNext' : 'riskDebriefMissed', { work: t(mission.costs[next.work].label), weeks: next.weeks, cost: money(next.credits) })
          : t('riskDebriefTop')}</small>}
      </div>
    })}
    {game.outcomes.length > 0 && game.outcomes.every(outcome => !outcome.failed) && <small>{t('riskCleanAll')}</small>}
    {game.accepted.length > 0 && <small>{t('riskAccepted', { items: game.accepted.map(id => t(items.find(entry => entry.id === id)!.label)).join(', ') })}</small>}
    <small>{t('riskSeed', { seed: game.seed })} · {t('riskGameSetting')}</small>
  </section>
}

function Flight({ game, mission, t, send }: Controls) {
  const [choice, setChoice] = useState(mission.flightChoices?.[0] ?? '')
  const evidence = contactEvidence(game)
  if (!evidence) return null
  if (game.contact) {
    const { next, accepted, choice, diagnosticsPending } = game.contact
    const { batches, diagnostics } = planContact(evidence as CubeSatEvidence, choice)
    const remaining = batches - next - 1
    if (diagnosticsPending) return <>
      <ReportCard speaker="ground" t={t}>
        <p>{t('groundDiagnosticsReport', { slots: diagnostics, count: batches })}</p>
      </ReportCard>
      <ActionButton onClick={() => send({ type: 'checkDiagnostics' })}>{t('groundLogDiagnostics')}</ActionButton>
    </>
    return <>
      <ReportCard speaker="ground" t={t}>
        <p>{t(accepted < cubeSat.minimumBatches ? 'groundRequiredBatch' : 'groundExtraBatch', {
          batch: next + 1, accepted, minimum: cubeSat.minimumBatches,
        })}</p>
      </ReportCard>
      <div className="batch-record">
        <strong>{t('groundBatchId', { batch: next + 1 })}</strong>
        <span>{t(remaining === 0 ? 'groundLastBatch' : remaining === 1 ? 'groundRemainingOne' : 'groundRemaining', { count: remaining })}</span>
      </div>
      {accepted + remaining + 1 === cubeSat.minimumBatches && <p className="action-note">
        {t('groundArchiveShortfall')}
      </p>}
      <div className="action-row">
        <ActionButton onClick={() => send({ type: 'checkBatch', batch: next, deliver: true })}>{t('groundAccept')}</ActionButton>
        <button className="button secondary" onClick={() => send({ type: 'checkBatch', batch: next, deliver: false })}>{t('groundArchive')}</button>
      </div>
    </>
  }
  return <>
    {mission.contact && <ReportCard speaker="ground" t={t}><p>{t('reportFlight')}</p></ReportCard>}
    <Options legend="ground" value={choice} choose={setChoice} t={t} options={mission.ui.flightOptions?.(evidence, t) ?? []} />
    <ActionButton onClick={() => send({ type: mission.contact ? 'startContact' : 'fly', choice })}>{t('runFlight')}</ActionButton>
  </>
}

function SegmentHistory({ mission, steps, t }: { mission: MissionModule; steps: SegmentEntry[]; t: Translate }) {
  return <ol className="decision-log">
    {steps.map(step => {
      const segment = mission.segmentedFlight?.segments.find(item => item.id === step.id)
      return <li key={step.id}>
        <strong>{segment ? t(segment.title) : step.id}</strong>
        {step.updates?.map((update, index) => <p key={index}>{copy(t, update)}</p>)}
        {step.report && <p>{copy(t, step.report)}</p>}
      </li>
    })}
  </ol>
}

function SegmentControls({ game, mission, send, t }: Controls) {
  const [choice, setChoice] = useState<string | null>(null)
  const segment = currentFlightSegment(game)
  if (!segment) return null
  const context = flightContext(game)
  const brief = segment.brief?.(context)
  const file = segment.file?.(context)
  const quote = segment.quote?.(context)
  const status = segment.status?.(context)
  const choices = segment.choices?.(context) ?? []
  return <>
    {context.progress.steps.length > 0 && <SegmentHistory mission={mission} steps={context.progress.steps} t={t} />}
    <h2>{t(segment.title)}</h2>
    {brief && <p>{copy(t, brief)}</p>}
    {context.progress.updates?.map((update, index) => <p key={index}>{copy(t, update)}</p>)}
    {quote && <blockquote>{t(quote)}</blockquote>}
    {status && <p className="action-note">{copy(t, status)}</p>}
    {file && <MissionFile file={file} t={t} />}
    {choices.length > 0 && <Options legend="segmentChoices" value={choice} choose={setChoice} t={t}
      options={choices.map(option => ({ id: option.id, name: option.label, detail: copy(t, option.detail) }))} />}
    <ActionButton disabled={choices.length > 0 && !choices.some(option => option.id === choice)}
      onClick={() => send({ type: 'segment', segment: segment.id, choice, turn: context.progress.turn ?? 0 })}>{t('runSegment')}</ActionButton>
  </>
}

function ReviewControls({ game, send, t }: Controls) {
  const [selected, setSelected] = useState<string[]>([])
  const review = pendingReview(game)
  if (!review) return null
  const offered = review.issues.flatMap(issue => issue.waiver ? [issue.waiver] : [])
  const waivers = selected.filter(id => offered.some(waiver => waiver.id === id))
  const previous = [...game.log].reverse().find(entry => entry.review?.gate === review.gate)?.review
  return <>
    {previous && !previous.passed && previous.detail && <p role="status">{copy(t, previous.detail)}</p>}
    {review.issues.some(issue => !issue.waiver) && <ul>{review.issues.filter(issue => !issue.waiver).map(({ detail, item }, index) => <li key={index}>{item && `${t(item)} · `}{copy(t, detail)}</li>)}</ul>}
    {offered.length > 0 && <fieldset className="options rows">
      <legend>{t('chapterReviewSign')}</legend>
      {offered.map(waiver => <label className="option" key={waiver.id}>
        <input type="checkbox" checked={waivers.includes(waiver.id)}
          onChange={event => setSelected(event.target.checked ? [...waivers, waiver.id] : waivers.filter(id => id !== waiver.id))} />
        <span><strong>{t(waiver.label)}</strong><small>{copy(t, waiver.detail)}</small></span>
      </label>)}
    </fieldset>}
    <ActionButton onClick={() => send({ type: 'review', waivers, turn: game.log.length })}>
      {t('submitGate', { gate: review.gate })}
    </ActionButton>
  </>
}

function Results({ game, mission, t, back, replay }: Props) {
  const { flight, stop, evidence } = game
  const next = nextMission(game.missionId)
  const current = currentEvidence(game)
  const outcome = !flight ? mission.outcomes.stopped : flight.stretch ? mission.outcomes.extra
    : flight.delivered ? mission.outcomes.success : mission.outcomes.partial
  const customOutcome = mission.ui.outcome?.(game, t)
  const spent = game.log.reduce((total, entry) => total + entry.cost, 0) + (game.flight?.credits === undefined ? 0 : game.credits - game.flight.credits)
  const interrupted = mission.segmentedFlight?.segments.find(segment => segment.id === flight?.interruptedAt)
  const stopCopy = { deadline: 'stopDeadline', funds: 'stopFunds', cancelled: 'stopCancelled' } as const
  const batches = (count: number) => t('dataBatches', { count })
  return <article className="manual">
    <Heading eyebrow={t('results')} title={t(customOutcome?.title ?? outcome)}>{customOutcome?.detail ? copy(t, customOutcome.detail) : flight ? mission.ui.flightSummary(flight, t) : stop && t(stopCopy[stop])}</Heading>
    {interrupted && <p className="notice">{t('flightInterrupted', { segment: t(interrupted.title) })}</p>}
    {flight?.delivered && next && missions[next.id] && <p className="notice" role="status">{t('nextUnlocked', { mission: t(next.title) })}</p>}
    <dl className="resource-line">
      <div><dt>{t('usedWeeks')}</dt><dd>{t('weeks', { count: game.week })}</dd></div>
      <div><dt>{t('spentCredits')}</dt><dd>{missionMoney(mission, game.missionId === cubeSat.id ? mission.budget - game.credits : spent, t)}</dd></div>
    </dl>
    <section className="receipt" aria-label={t('results')}>
      <Disclosure label={t('estimate')} value={game.missionId === cubeSat.id ? batches(forecast(game.design as CubeSatDesign).batches) : undefined}>
        <mission.ui.Estimate design={game.design} game={game} t={t} />
      </Disclosure>
      {evidence ? <Disclosure label={t('report')} value={current && game.missionId === cubeSat.id
        ? t('testedData', { count: testedBatches(current as CubeSatEvidence) })
        : current ? t('checksPassed', { count: current.checks.filter(Boolean).length }) : t('noCurrentEvidence')}>
        <EvidenceReport mission={mission} evidence={evidence} t={t} outdated={!current} />
      </Disclosure> : <div className="receipt-line"><span>{t('report')}</span><small>{t('noEvidence')}</small></div>}
      {flight ? <Disclosure label={t('delivery')} value={game.missionId === cubeSat.id ? batches(flight.batches) : mission.ui.flightSummary(flight, t)}>
        <mission.ui.Delivery flight={flight} t={t} />
        {flight.segments && <SegmentHistory mission={mission} steps={flight.segments} t={t} />}
      </Disclosure> : <div className="receipt-line"><span>{t('delivery')}</span><small>{t('noFlight')}</small></div>}
    </section>
    <RiskDebrief game={game} mission={mission} t={t} />
    {mission.ui.Debrief && <mission.ui.Debrief game={game} t={t} />}
    <div className="action-row">
      <ActionButton onClick={back}>{t('home')}</ActionButton>
      <button className="button secondary" onClick={() => replay(true)}>{t('chapterReplaySame')}</button>
      <button className="button secondary" onClick={() => replay(false)}>{t('chapterReplayNew')}</button>
    </div>
    <div className="references">
      <p>{t('gates', { gate: game.gate })}</p>
      {game.log.length > 0 && <Disclosure label={t('log')}><DecisionLog game={game} mission={mission} t={t} /></Disclosure>}
    </div>
  </article>
}

function Repair({ game, mission, t, send }: Controls) {
  const [choice, select] = useState<string | null>(null)
  const retest = mission.costs.integrate
  const repairs = repairOptions(game)
  const canFinish = (remedy: string) => availableWeeks(game) >= mission.costs[remedy].weeks + retest.weeks
    && game.credits >= mission.costs[remedy].credits + retest.credits
  return <>
    <Options legend="repairChoices" value={choice} choose={select} t={t} options={repairs.map(remedy => ({
      id: remedy,
      name: mission.costs[remedy].label,
      detail: `${t('weeks', { count: mission.costs[remedy].weeks })} · ${missionMoney(mission, mission.costs[remedy].credits, t)}`,
      extra: <mission.ui.RemedyPreview design={game.design} remedy={remedy} t={t} />,
      disabled: !affordable(game, mission.costs[remedy]),
    }))} />
    <p className="action-note">{t('retestAdditional', { weeks: retest.weeks, credits: missionMoney(mission, retest.credits, t) })}</p>
    {!repairs.some(canFinish) && <p className="notice">{t('noRepairTime')}</p>}
    <ActionButton disabled={!choice || !affordable(game, mission.costs[choice])}
      onClick={() => choice && send({ type: 'repair', remedy: choice })}>{t('selectCorrection')}</ActionButton>
  </>
}

function Reference({ game, mission, t, send }: Controls) {
  const editable = canConfigure(game)
  const estimate = game.missionId === cubeSat.id ? forecast(game.design as CubeSatDesign) : null
  const cost = baselineRemainingCost(game)
  const current = currentEvidence(game)
  const matching = game.analysis && sameDesign(game.analysis.design, game.design)
  const canEnd = game.stage !== 'flight' && (mission.tasks || game.stage !== 'review' || game.returned)
  const analysisCost = mission.costs.analyze
  const latestReview = [...game.log].reverse().find(entry => entry.review)?.review
  return <aside className="references" aria-label={t('missionInfo')}>
    {latestReview?.passed && latestReview.detail && <p role="status">{copy(t, latestReview.detail)}</p>}
    {game.evidence && <Disclosure label={t('report')} value={current ? t('checksPassed', { count: current.checks.filter(Boolean).length }) : t('noCurrentEvidence')}>
      <EvidenceReport mission={mission} evidence={game.evidence} t={t} outdated={!current} />
    </Disclosure>}
    {editable && !mission.tasks && mission.forecast && analysisCost && <Disclosure label={t('analysisAction')}>
      <button className="button secondary" disabled={Boolean(matching) || !affordable(game, analysisCost)}
        onClick={() => send({ type: 'analyze' })}>{t('analyze')} <CostLabel t={t} mission={mission} {...analysisCost} /></button>
    </Disclosure>}
    {game.analysis && <Disclosure label={t('analysisReport')}>
      {!matching && <p>{t('analysisOld')}</p>}
      <DesignSummary mission={mission} design={game.analysis.design} t={t} />
      <mission.ui.Forecast design={game.analysis.design} forecast={game.analysis.forecast} t={t} />
    </Disclosure>}
    <Disclosure label={t('details')}>
      <Disclosure label={t('configuration')}><DesignSummary mission={mission} design={game.design} t={t} /></Disclosure>
      <Disclosure label={t('estimate')}>
        <dl className="fact-list">
          {estimate && <div><dt>{t('estimatedDelivery')}</dt><dd>{t('dataBatches', { count: estimate.batches })}</dd></div>}
          {cost > 0 && <div><dt>{t('designCost')}</dt><dd>{missionMoney(mission, cost, t)}</dd></div>}
        </dl>
        <mission.ui.Estimate design={game.design} game={game} t={t} />
      </Disclosure>
      <Disclosure label={t('briefTitle')}><mission.ui.Requirements t={t} /></Disclosure>
      <Disclosure label={t('process')} value={game.gate}>
        <ol className="stage-track">
          {stages.map(stage => <li key={stage} aria-current={stage === game.stage ? 'step' : undefined}>{t(stage)}</li>)}
        </ol>
      </Disclosure>
      {game.log.length > 0 && <Disclosure label={t('log')}><DecisionLog game={game} mission={mission} t={t} /></Disclosure>}
    </Disclosure>
    {canEnd && <Disclosure label={t('missionActions')}>
      <div className="action-row">
        {!mission.tasks && <button className="text-button" onClick={() => send({ type: 'wait' })}>{t('wait')}</button>}
        <button className="text-button" onClick={() => window.confirm(t('cancelPrompt')) && send({ type: 'cancel' })}>{t('cancel')}</button>
      </div>
    </Disclosure>}
  </aside>
}

function MissionFile({ file, t }: { file: File; t: Translate }) {
  return <Disclosure label={t(file.title.message, file.title.values)}>
    <p>{copy(t, file.detail)}</p>
    <ul>{file.sources.map(source => <li key={source.url}>
      <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
    </li>)}</ul>
  </Disclosure>
}

function MissionEvent({ game, mission, t, send }: Controls) {
  const event = pendingEvent(game)
  if (!event) return null
  const work = pendingWorkId(game)
  const subject = event.subject?.(game)
  return <section className="next-decision" aria-labelledby="mission-event">
    <h2 id="mission-event">{t(event.title)}</h2>
    <p>{t(event.detail, { ...event.values?.(game), ...(subject && { item: t(subject) }) })}</p>
    {event.quote && <blockquote>{t(event.quote)}</blockquote>}
    {work && <p className="notice">{t('workPaused', { work: t(mission.costs[work].label), week: game.week, count: game.pendingWork!.remaining })}</p>}
    {event.file && <MissionFile file={event.file} t={t} />}
    {event.choices.filter(choice => choice.available?.(game) !== false).map(choice => <div className="repair-option" key={choice.id}>
      <div><strong>{t(choice.label)}</strong><small>{t(choice.detail, choice.values?.(game))}</small></div>
      <button className="button secondary" onClick={() => send({ type: 'choose', event: event.id, choice: choice.id })}>{t('eventChoose')}<span className="visually-hidden"> {t(choice.label)}</span></button>
    </div>)}
  </section>
}

function MissionWork({ game, mission, t, send }: Controls) {
  const work = currentWork(game)
  const cost = !mission.tasks && work && workCost(game, work)
  const tasks = taskOptions(game)
  const last = game.log.at(-1)?.detail
  return <div className="decisions">
    {last && <p role="status">{copy(t, last)}</p>}
    {canConfigure(game) && Object.entries(mission.groups).map(([key, group]) =>
      <Options key={key} legend={group.legend} options={optionList(group.options, t, mission)} value={game.design[key]} t={t}
        choose={value => send({ type: 'configure', design: { ...game.design, [key]: value } })} />)}
    {mission.tasks ? tasks.map(task => {
      const name = t(mission.costs[task.id].label, { ...task.cost, slots: 1 })
      const support = task.id.startsWith('lab:') || task.id.startsWith('support:')
      return <ActionButton key={task.id} disabled={!affordable(game, task.cost)} onClick={() => send({ type: 'task', task: task.id, turn: game.log.length })}>
        {support ? t('lunarSupportTask', { work: name }) : name} <CostLabel t={t} mission={mission} {...task.cost} />
      </ActionButton>
    }) : work && cost && !(game.gate === 'PDR' && mission.reviews?.PDR) &&
      <ActionButton disabled={!affordable(game, cost)} onClick={() => send({ type: 'work' })}>
        {t(work === 'integrate' && game.evidence ? 'retest' : mission.costs[work].label)} <CostLabel t={t} mission={mission} {...cost} />
      </ActionButton>}
  </div>
}

export function Single(props: Props) {
  const { game, mission, t, send, back } = props
  const isCubeSat = game.missionId === cubeSat.id
  if (game.stage === 'results' && !game.playback) return <Results {...props} />
  const checks = currentEvidence(game)
  const editable = canConfigure(game)
  const stage = game.playback?.kind === 'assembly' ? 'build' : game.playback?.kind ?? game.stage
  const segment = currentFlightSegment(game)
  const customReview = stage === 'design' ? mission.reviews?.PDR : stage === 'review' ? mission.reviews?.FRR : undefined
  const latestAnalysis = editable && game.analysis && ['analysisClear', 'analysisConflict'].includes(game.log.at(-1)?.id ?? '')
    && sameDesign(game.analysis.design, game.design) ? game.analysis : null

  return <article className="single-mission">
    <Back t={t} onClick={back} />
    <Heading eyebrow={t(mission.title)} title={t(game.returned ? 'returned' : stage)}>
      {!isCubeSat && stage !== 'results' && t(game.returned ? 'returnedDetail' : mission.stageDetails[stage], { percent: percent(reviewRiskThreshold) })}
    </Heading>
    <dl className="resource-line">
      <div><dt>{t('flightWindow')}</dt><dd>{t('weeks', { count: availableWeeks(game) })}</dd></div>
      <div><dt>{t('budgetLabel')}</dt><dd>{missionMoney(mission, game.credits, t)}</dd></div>
    </dl>
    <div className="mission-layout">
      {isCubeSat && <Lab game={game as CubeSatGame} t={t} send={send} />}
      <div>
        {game.event && !game.playback && <MissionEvent {...props} />}
        {!game.event && !game.playback && mission.ui.Status && <mission.ui.Status game={game} t={t} />}
        {!game.event && !game.playback && <section className="next-decision decision-arrival" key={`${stage}:${game.returned}`}>
          {isCubeSat
            ? (stage === 'build' || stage === 'integration') && <BenchWork {...props} />
            : stage !== 'flight' && <MissionWork {...props} />}
          {isCubeSat && stage === 'review' && checks && (passes(checks)
            ? <ReportCard speaker="review" t={t}>
              <p>{t('reviewReady')}</p>
              {game.testFocus && <p>{t(game.testFocus === 'imaging' ? 'focusImagingReport' : 'focusRadioReport', {
                watts: scopeSegment(powerTimeline(checks.design as CubeSatDesign), game.testFocus).watts, available: checks.available, batches: checks.batches,
              })}</p>}
            </ReportCard>
            : <ReportCard speaker={!checks.powerPass ? 'power' : !checks.ditlPass ? 'comms' : 'science'} t={t} attention>
              <Findings evidence={checks as CubeSatEvidence} t={t} />
              {game.returned && <p>{t('labRepairChoice')}</p>}
            </ReportCard>)}
          {isCubeSat && editable && <CubeSatConfig {...props} />}
          {latestAnalysis && <p className={!mission.forecastClear?.(latestAnalysis.forecast) ? 'warning' : 'verified'} role="status">
            {t(!mission.forecastClear?.(latestAnalysis.forecast) ? 'analysisTradeoff' : 'analysisClear')}
          </p>}
          {game.returned && stage === 'review' && !mission.tasks && repairOptions(game).length > 0 && <Repair {...props} />}
          {isCubeSat && stage === 'review' && !game.returned && checks && passes(checks) && riskAcceptance(game).length > 0 && <p className="action-note">
            {t('riskSignNote', { items: mission.risks!.view(game).filter(item => item.risk > reviewRiskThreshold)
              .map(item => t('riskAcceptItem', { item: t(item.label), percent: percent(item.risk), severity: t(item.severity === 'fatal' ? 'riskSeverityFatal' : 'riskSeverityDegraded') })).join(' / ') })}
          </p>}
          {customReview ? <ReviewControls key={game.log.length} {...props} />
            : stage === 'review' && !game.returned && <ActionButton onClick={() => send({ type: 'review' })}>{t('submitReview')}</ActionButton>}
          {stage === 'flight' && (mission.segmentedFlight
            ? <SegmentControls key={`${segment?.id}:${game.flightProgress?.turn ?? 0}`} {...props} />
            : <Flight {...props} />)}
        </section>}
        {!game.event && !game.playback && stage !== 'flight' && <RiskPanel {...props} />}
        {!game.event && !game.playback && <Reference key={stage} {...props} />}
      </div>
    </div>
  </article>
}
