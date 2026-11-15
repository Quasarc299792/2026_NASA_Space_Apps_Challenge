import { lunarMission } from '../missions/lunar-mission'
import { capabilityFor, commissionFor, commissionPlan, commissions, type CommissionId } from '../missions/cubesat-commission'
import { CommissionNote, CommissionOption, CommissionPlan, CommissionRepairs, CommissionReport } from '../missions/cubesat-commission-ui'
import { useEffect, useRef, useState } from 'react'
import { fundingReduced, missionSpending, nextMission, type Progress } from '../game/progress'
import {
  affordable, availableWeeks, baselineRemainingCost, canConfigure, contactEvidence, currentEvidence, currentFlightSegment, currentWork,
  flightContext, optionCost, passes, pendingEvent, pendingReview, pendingWorkId, repairOptions, riskAcceptance, taskOptions,
  sameDesign, workCost, type Action, type BenchLead, type ConfigStep, type ScienceGoal, type Copy, type DesignOption, type SegmentEntry,
  type MissionFile as File, type Entry, type Game, type TestFocus,
} from '../game/mission'
import { detection, percent, reviewRiskThreshold, verificationLevels } from '../game/risk'
import type { Message, Translate } from '../i18n'
import { missions, type MissionModule } from '../missions'
import { cubeSat, forecast, planContact, riskDebrief, testDesign, type CubeSatDesign, type CubeSatEvidence, type CubeSatGame, type CubeSatRisk } from '../missions/cubesat'
import { CubeSatDebrief, Findings, testedBatches, verificationEntry } from '../missions/cubesat-ui'
import { ActionButton, Back, CostLabel, DesignSummary, Disclosure, EvidenceReport, Heading, missionMoney, money, optionValues } from './shared'
import { ReportCard } from './ReportCard'
import { phaseGate, phaseOf, phases, phaseSource, type Phase } from '../game/phase'
import { Lab } from './Lab'
import { Portfolio, StoryBrief, StoryDebrief } from './Story'
import { MissionFlow } from './Lore'

type Props = { game: Game; mission: MissionModule; progress: Progress; t: Translate; send: (action: Action) => void; back: () => void; replay: (sameSeed: boolean, goal?: ScienceGoal) => void; open: (missionId: string) => void }
type Controls = Pick<Props, 'game' | 'mission' | 't' | 'send'>

const goalBatches = (goal?: ScienceGoal) => goal === 'stretch' ? cubeSat.stretchBatches : cubeSat.minimumBatches

export function Brief({ mission, t, begin, back, saved }: {
  mission: MissionModule; t: Translate; begin: (commission?: CommissionId) => void; back: () => void; saved: boolean
}) {
  const isCubeSat = mission.id === cubeSat.id
  const [commission, setCommission] = useState<CommissionId>('river')
  return <article className="manual mission-brief">
    <Back t={t} onClick={back} />
    <Heading eyebrow={t('briefTitle')} title={t(mission.title)}>{t(mission.brief)}</Heading>
    <StoryBrief missionId={mission.id} t={t} />
    <dl className="resource-line">
      <div><dt>{t(isCubeSat ? 'briefDeadlineLabel' : 'flightWindow')}</dt><dd>{t('weeks', { count: mission.deadline })}</dd></div>
      <div><dt>{t('budgetInitial')}</dt><dd>{missionMoney(mission, mission.budget, t)}</dd></div>
    </dl>
    {!isCubeSat && <mission.ui.Requirements t={t} />}
    {!isCubeSat && <p className="action-note">{t('creditsNote')}</p>}
    {isCubeSat && <>
      <Options legend="commissionChoose" layout="pair" value={commission} choose={setCommission} t={t}
        options={(Object.keys(commissions) as CommissionId[]).map(id => ({ id, name: commissions[id].name,
          detail: t(commissions[id].brief, { required: commissions[id].required }) }))} />
      <CommissionNote t={t} />
    </>}
    {saved && <p className="notice">{t('replaceSave')}</p>}
    <ActionButton onClick={() => begin(isCubeSat ? commission : undefined)}>{t('begin')}</ActionButton>
    {isCubeSat && <Disclosure label={t('storyHowToPlay')}>
      <ol>
        <li>{t('storyHowPlan')}</li>
        <li>{t('storyHowVerify')}</li>
        <li>{t('storyHowDeliver')}</li>
      </ol>
      <PhaseTable t={t} />
    </Disclosure>}
    {isCubeSat && <MissionFlow t={t} />}
    <Disclosure label={t('glossaryTitle')}><Glossary t={t} /></Disclosure>
    {!isCubeSat && <Disclosure label={t('missionStory')}><blockquote>{t(mission.dialogue)}</blockquote></Disclosure>}
  </article>
}

export function phaseLabel(phase: Phase, t: Translate) {
  const gate = phaseGate[phase]
  return gate ? t('phaseWithGate', { phase: t(`phase${phase}`), gate }) : t(`phase${phase}`)
}

// NASA's project life cycle next to what the player does in each phase. current marks where the run is.
export function PhaseTable({ t, current }: { t: Translate; current?: Phase }) {
  return <div className="phase-table">
    <p>{t('phaseTableIntro')}</p>
    <table>
      <thead><tr><th scope="col">{t('phaseColumn')}</th><th scope="col">{t('phaseReviewColumn')}</th><th scope="col">{t('phaseGameColumn')}</th></tr></thead>
      <tbody>{phases.map(phase => {
        const gate = phaseGate[phase]
        return <tr key={phase} aria-current={phase === current ? 'step' : undefined}>
          <th scope="row">{t(`phase${phase}`)}</th>
          <td>{gate ? t(`gate${gate}`) : '—'}</td>
          <td>{t(`phaseGame${phase}`)}</td>
        </tr>
      })}</tbody>
    </table>
    <small>{t('phasePreA')}</small>
    <small>{t('phaseSourceNote')} <a href={phaseSource.url} target="_blank" rel="noreferrer">{phaseSource.source}</a></small>
  </div>
}

const glossary = ['glossaryBatch', 'glossaryWatt', 'glossaryMargin', 'glossaryHeritage', 'glossaryReviews', 'glossaryVerification',
  'glossaryDitl', 'glossaryWindow', 'glossaryCredits', 'glossaryPayload', 'glossaryPass', 'glossaryInclination', 'glossarySso',
  'glossaryUpperStage', 'glossaryHotFire', 'glossaryRedundancy', 'glossaryRisk'] as const

// Short definitions for the terms the workbench uses without explaining.
function Glossary({ t }: { t: Translate }) {
  return <dl className="glossary">
    {glossary.map(key => <div key={key}><dt>{t(`${key}Term`)}</dt><dd>{t(key)}</dd></div>)}
  </dl>
}

type Option<T extends string> = {
  id: T; name: Message; nameValues?: Record<string, string | number>; detail: string; extra?: React.ReactNode; disabled?: boolean
}

function Options<T extends string>({ legend, options, value, choose, t, layout = 'rows' }: {
  legend: Message; options: Option<T>[]; value: T | null; choose: (value: T) => void; t: Translate
  layout?: 'rows' | 'pair'
}) {
  return <fieldset className={`options ${layout}`}>
    <legend className={layout === 'pair' && legend !== 'scienceGoal' && legend !== 'commissionChoose' ? 'visually-hidden' : undefined}>{t(legend)}</legend>
    {options.map(option => <label className="option" key={option.id}>
      <input type="radio" name={legend} checked={value === option.id} disabled={option.disabled} onChange={() => choose(option.id)} />
      <span><strong>{t(option.name, option.nameValues)}</strong><small>{option.detail}</small>{option.extra}</span>
    </label>)}
  </fieldset>
}

function optionList(data: Record<string, DesignOption>, t: Translate, mission: MissionModule): Option<string>[] {
  return Object.entries(data).map(([id, option]) => ({ id, name: option.label, detail: t(option.description, optionValues(option, mission)) }))
}

function CubeSatBlockers({ result, t }: { result: CubeSatEvidence; t: Translate }) {
  if (passes(result)) return null
  return <div className="warning">
    <ul className="findings">
      {!result.powerPass && <li>{t('planPowerFix')}</li>}
      {!result.massPass && <li>{t('planMassFix', { mass: result.mass, limit: result.massLimit })}</li>}
      {!result.ditlPass && <li>{t('earlyTransmissionEstimate', result.ditl)} {t('planRadioFix')}</li>}
      {result.powerPass && !result.dataPass && <li>
        {t('dataShortfallEstimate', { count: result.batches, minimum: cubeSat.minimumBatches })} {t('planBelowMinimum')}
      </li>}
    </ul>
  </div>
}

function CubeSatForecast({ game, mission, t }: Pick<Controls, 'game' | 'mission' | 't'>) {
  const result = testDesign(game.design as CubeSatDesign)
  const goal = goalBatches(game.scienceGoal)
  const reserve = game.credits - baselineRemainingCost(game)
  const clear = passes(result)
  return <section className="plan-preview" aria-label={t('planPreview')} aria-live="polite">
    <dl className="forecast-metrics">
      <div className={result.massPass ? undefined : 'bad'}>
        <dt>{t('planMassLabel')}</dt>
        <dd>{t('massUse', { mass: result.mass, limit: result.massLimit })}</dd>
      </div>
      <div className={result.powerPass ? undefined : 'bad'}>
        <dt>{t('planPowerLabel')}</dt>
        <dd>{t('powerUse', { peak: result.peak, available: result.available })}</dd>
      </div>
      <div className={clear && result.batches >= goal ? undefined : 'bad'}>
        <dt>{t('planDataLabel')}</dt>
        <dd>{clear ? t('planDataMetric', { count: result.batches, goal }) : t('planBlocked')}</dd>
      </div>
      <div className={reserve < 0 ? 'bad' : undefined}>
        <dt>{t(reserve < 0 ? 'planOverBudgetLabel' : 'planReserveLabel')}</dt>
        <dd>{missionMoney(mission, Math.abs(reserve), t)}</dd>
      </div>
    </dl>
    <CubeSatBlockers result={result} t={t} />
  </section>
}

function ConfigSwitch<T extends string>({ items, active, label, choose }: {
  items: { id: T; name: string }[]; active: T; label: string; choose: (id: T) => void
}) {
  return <div className="config-switch" role="group" aria-label={label}>
    {items.map(item => <button type="button" key={item.id}
      aria-pressed={active === item.id} onClick={() => choose(item.id)}>{item.name}</button>)}
  </div>
}

const configPrompts = {
  launch: ['chooseLaunch', 'review', 'reportLaunch'],
  payload: ['chooseCamera', 'science', 'reportPayload'],
  supply: ['choosePower', 'power', 'reportSupply'],
  schedule: ['chooseSchedule', 'comms', 'reportSchedule'],
  radio: ['chooseRadio', 'comms', 'reportRadio'],
} as const

const nextStepLabels = { launch: 'nextLaunch', payload: 'nextPayload', supply: 'nextSupply', schedule: 'nextSchedule', radio: 'nextRadio' } as const

function CubeSatConfig({ game, mission, t, send }: Controls) {
  const [inspect, setInspect] = useState<ConfigStep | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const moveFocus = useRef(false)
  const design = game.design as CubeSatDesign
  const feasibility = game.stage === 'feasibility'
  const steps = mission.configurationSteps?.[game.stage] ?? []
  const current: ConfigStep = game.configStep && steps.includes(game.configStep) ? game.configStep : steps[0]
  const following = steps[steps.indexOf(current) + 1]
  const step = inspect ?? current
  const work = feasibility ? 'assess' : 'freeze'
  const cost = workCost(game, work)
  const [prompt, speaker, advice] = configPrompts[step]
  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    heading.current?.focus({ preventScroll: true })
    heading.current?.scrollIntoView({ block: 'nearest' })
  }, [step])
  const options = optionList(mission.groups[step].options, t, mission).map(option => {
    const alternative = { ...design, [step]: option.id }
    const result = testDesign(alternative)
    const delta = optionCost(mission, alternative) - optionCost(mission, design)
    const clear = passes(result)
    const capacity = step === 'schedule' ? t('planScheduleEffect', {
      collected: result.collectedBatches, count: result.batches,
    }) : clear ? t('planOptionDelivery', { count: result.batches }) : t('planBlocked')
    return { ...option, extra: <small className={clear ? 'option-forecast' : 'option-forecast bad'}>
      {step === 'launch' || step === 'payload' || step === 'supply'
        ? <>{t('massUse', { mass: result.mass, limit: result.massLimit })} · </> : null}
      {step !== 'launch' && <>{t('powerUse', { peak: result.peak, available: result.available })} · </>}{capacity}
      {step === 'schedule' && !clear && <> · {t('planBlocked')}</>}
      {step === 'supply' && delta !== 0 && <> · {t(delta > 0 ? 'planHardwareMore' : 'planHardwareLess', { cost: money(Math.abs(delta)) })}</>}
      {step === 'launch' && delta !== 0 && <> · {t(delta > 0 ? 'planLaunchMore' : 'planLaunchLess', { cost: money(Math.abs(delta)) })}</>}
      {step === 'launch' && cubeSat.launches[option.id as CubeSatDesign['launch']].leadWeeks > 0 && <> · {t('launchEarlierDelivery', { count: cubeSat.launches[option.id as CubeSatDesign['launch']].leadWeeks })}</>}
    </small> }
  })
  function show(item: ConfigStep | null) {
    moveFocus.current = true
    setInspect(item)
  }
  return <div className="decisions config-workspace">
    <h2 className="config-prompt" ref={heading} tabIndex={-1}>{t(prompt)}</h2>
    <ReportCard speaker={speaker} t={t}><p>{t(advice, { minutes: cubeSat.ditl.minQuietMinutes })}</p></ReportCard>
    <Options key={step} legend={step} layout="pair" options={options} value={design[step]}
      choose={value => send({ type: 'configure', design: { ...design, [step]: value } })} t={t} />
    <CubeSatForecast game={game} mission={mission} t={t} />
    {inspect ? <ActionButton onClick={() => show(null)}>{t('returnToCurrentStep')}</ActionButton>
      : following ? <ActionButton onClick={() => {
        moveFocus.current = true
        send({ type: 'configStep', step: following })
      }}><span className="next-action-prefix" aria-hidden="true">{t('nextStep')}</span>
        {t(nextStepLabels[following])}</ActionButton>
        : <ActionButton disabled={!affordable(game, cost)} onClick={() => send({ type: 'work' })}>
          {t(mission.costs[work].label)} <CostLabel t={t} mission={mission} {...cost} />
        </ActionButton>}
    {!inspect && <Disclosure key={`other-settings:${current}`} label={t('editOtherSettings')}>
      <ul className="config-summary">
        {(Object.keys(configPrompts) as ConfigStep[]).filter(item => item !== current).map(item => {
          const group = mission.groups[item]
          return <li key={item}>
            <button className="text-button" type="button" onClick={() => show(item)}>
              <span>{t(group.legend)}</span><small>{t(group.options[design[item]].label)}</small>
            </button>
          </li>
        })}
      </ul>
    </Disclosure>}
  </div>
}

function copy(t: Translate, text: Copy) {
  const labels = Object.fromEntries(Object.entries(text.labels ?? {}).map(([name, key]) => [name, t(key)]))
  return t(text.message, { ...text.values, ...labels })
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
        <p>{t(fundingReduced(mission, entry) ? 'logFundingReduction' : 'logCost', { count: missionMoney(mission, entry.cost, t) })}</p>
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
    <ActionButton disabled={!affordable(game, cost)} onClick={() => send({ type: 'runLab', benchLead, testFocus })}>
      {t(!build && game.evidence ? 'retest' : mission.costs[work].label)} <CostLabel t={t} mission={mission} {...cost} />
    </ActionButton>
    {build ? <>
      <Disclosure label={t('benchChoice')}>
        <ReportCard speaker="assembly" t={t}><p>{t('reportBenchChoice')}</p></ReportCard>
        <Options legend="benchChoice" value={benchLead} choose={setBenchLead} t={t} options={[
          { id: 'science', name: 'benchScience', detail: t('benchScienceDetail') },
          { id: 'power', name: 'benchPower', detail: t('benchPowerDetail') },
        ]} />
      </Disclosure>
    </> : <>
      <Disclosure label={t('focusChoice')}>
        <p>{t('reportIntegrationFocus')}</p>
        <Options legend="focusChoice" value={testFocus} choose={setTestFocus} t={t} options={[
          { id: 'imaging', name: 'focusImaging', detail: t('focusImagingDetail') },
          { id: 'downlink', name: 'focusRadio', detail: t('focusRadioDetail') },
        ]} />
      </Disclosure>
    </>}
  </>
}

const levelNames = { none: 'riskLevelNone', analysis: 'riskLevelAnalysis', unit: 'riskLevelUnit', endToEnd: 'riskLevelEndToEnd' } as const

// What the player currently believes about each risk item, and what the next verification level costs.
function RiskPanel({ game, mission, t, send }: Controls) {
  if (!mission.risks) return null
  const items = mission.risks.view(game)
  const isCubeSat = game.missionId === cubeSat.id
  const odds = !isCubeSat || passes(testDesign(game.design as CubeSatDesign)) ? mission.risks.odds(game) : null
  const reserve = baselineRemainingCost(game)
  return <section className="risk-panel" aria-label={t('riskTitle')}>
    {odds && (isCubeSat ? <div className="risk-odds">
      <p>{t('riskOrbitAssumption')}</p>
      <p>{t('riskOrbitDelivery', { percent: percent(odds.minimum), count: cubeSat.minimumBatches })}</p>
    </div> : <p className="risk-odds">{t('riskOddsMinimum', { percent: percent(odds.minimum) })} · {t('riskOddsNoFatal', { percent: percent(odds.noFatal) })}</p>)}
    {items.map(item => {
      const { next, fix, state } = item
      const tooCostly = Boolean(next) && game.credits - next!.credits < reserve
      const verification = isCubeSat && state.found ? verificationEntry(game, item.id as CubeSatRisk) : undefined
      return <div className="risk-item" key={item.id}>
        <strong>{t(item.label)}</strong>
        <small>{t(item.detail)}</small>
        <small>{t(item.maturity === 'new' ? 'riskMaturityNew' : 'riskMaturityHeritage')} · {t(item.severity === 'fatal' ? 'riskSeverityFatal' : 'riskSeverityDegraded')} · {t('riskLevel', { level: t(levelNames[verificationLevels[state.level]]) })}</small>
        {state.fixed ? <p className="verified">{t('riskFixed')}</p> : state.found ? <>
          <p className="warning" role="status">{verification
            ? t('riskTestFoundBy', { work: t(mission.costs[verification.id]?.label ?? 'analyze') })
            : t('riskTestFound')}</p>
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
        <small>{t('riskChance', { percent: percent(item.risk) })}</small>
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
    {game.accepted.length > 0 && <small>{t('riskAccepted', { items: game.accepted.map(id => t(items.find(entry => entry.id === id)!.label)).join(t('listSeparator')) })}</small>}
    <small>{t('riskSeed', { seed: game.seed })} · {t('riskGameSetting')}</small>
  </section>
}

function Flight({ game, mission, t, send }: Controls) {
  const [choice, setChoice] = useState(game.missionId === cubeSat.id && game.scienceGoal === 'stretch' ? 'extra' : mission.flightChoices?.[0] ?? '')
  const evidence = contactEvidence(game)
  if (!evidence) return null
  if (game.contact) {
    const { next, accepted, choice, diagnosticsPending } = game.contact
    const { batches, diagnostics } = planContact(evidence as CubeSatEvidence, choice)
    const remaining = batches - next - 1
    const minimum = cubeSat.minimumBatches
    const goal = goalBatches(game.scienceGoal)
    const reachable = accepted + batches - next
    const archiveMisses = [goal, minimum].find(threshold => reachable === threshold)
    const progress = <p className="action-note" role="status">{t('contactProgress', {
      accepted, remaining: batches - next, minimumGap: Math.max(0, minimum - accepted), goalGap: Math.max(0, goal - accepted),
    })}</p>
    if (diagnosticsPending) return <>
      <ReportCard speaker="ground" t={t}>
        <p>{t('groundDiagnosticsReport', { slots: diagnostics, count: batches })}</p>
      </ReportCard>
      {progress}
      <ActionButton onClick={() => send({ type: 'checkDiagnostics' })}>{t('groundLogDiagnostics')}</ActionButton>
    </>
    return <>
      <div className="batch-record">
        <strong>{t('groundBatchId', { batch: next + 1 })}</strong>
        <span>{t(remaining === 0 ? 'groundLastBatch' : remaining === 1 ? 'groundRemainingOne' : 'groundRemaining', { count: remaining })}</span>
      </div>
      {progress}
      {archiveMisses !== undefined && <p className="warning" id="archive-impact">
        {t(archiveMisses === minimum ? 'groundArchiveShortfall' : 'archiveGoalShortfall', { goal })}
      </p>}
      <div className="action-row">
        <ActionButton onClick={() => send({ type: 'checkBatch', batch: next, deliver: true })}>{t('groundAccept')}</ActionButton>
        <button className="button secondary" aria-describedby={archiveMisses === undefined ? undefined : 'archive-impact'}
          onClick={() => send({ type: 'checkBatch', batch: next, deliver: false })}>{t('groundArchive')}</button>
      </div>
    </>
  }
  const plan = mission.contact && planContact(evidence as CubeSatEvidence, choice)
  const all = mission.contact && planContact(evidence as CubeSatEvidence, 'extra')
  const goal = goalBatches(game.scienceGoal)
  const minimum = cubeSat.minimumBatches
  const missed = plan && all && [minimum, goal].find(threshold => plan.batches < threshold && all.batches >= threshold)
  return <>
    {mission.contact && <ReportCard speaker="ground" t={t}>
      <p>{t('contactEstimate', { count: testedBatches(evidence as CubeSatEvidence) })}</p>
    </ReportCard>}
    <Options legend="ground" value={choice} choose={setChoice} t={t} options={mission.ui.flightOptions?.(evidence, t) ?? []} />
    {missed && <p className="warning" role="status">{t(missed === minimum ? 'contactPlanMissesMinimum' : 'contactPlanMissesGoal', { goal })}</p>}
    {all && all.batches < goal && <p className="action-note">{t('contactCapacityBelowGoal', { count: all.batches, goal })}</p>}
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
  // A decision with a single option starts selected, so the player is not asked to pick the only choice.
  const [choice, setChoice] = useState<string | null>(() => {
    const only = currentFlightSegment(game)?.choices?.(flightContext(game)) ?? []
    return only.length === 1 ? only[0].id : null
  })
  const segment = currentFlightSegment(game)
  if (!segment) return null
  const context = flightContext(game)
  const brief = segment.brief?.(context)
  const file = segment.file?.(context)
  const quote = segment.quote?.(context)
  const status = segment.status?.(context)
  const lastReport = context.progress.steps.at(-1)?.report
  const choices = segment.choices?.(context) ?? []
  return <>
    <h2>{t(segment.title)}</h2>
    {brief && <p>{copy(t, brief)}</p>}
    {game.commission && lastReport && <p role="status">{copy(t, lastReport)}</p>}
    {context.progress.updates?.map((update, index) => <p key={index}>{copy(t, update)}</p>)}
    {status && <p className="action-note">{copy(t, status)}</p>}
    {choices.length > 0 && <Options legend="segmentChoices" value={choice} choose={setChoice} t={t}
      options={choices.map(option => ({ id: option.id, name: option.label, detail: copy(t, option.detail), extra: option.consequence &&
        <small className={option.warning ? 'bad' : undefined}>{copy(t, option.consequence)}</small>,
      }))} />}
    <ActionButton disabled={choices.length > 0 && !choices.some(option => option.id === choice)}
      onClick={() => send({ type: 'segment', segment: segment.id, choice, turn: context.progress.turn ?? 0 })}>{t(segment.action ?? 'runSegment')}</ActionButton>
    {quote && <Disclosure label={t('missionStory')}><blockquote>{t(quote)}</blockquote></Disclosure>}
    {file && <MissionFile file={file} t={t} />}
    {context.progress.steps.length > 0 && <Disclosure label={t('flightHistory')}>
      <SegmentHistory mission={mission} steps={context.progress.steps} t={t} />
    </Disclosure>}
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
    {review.gate === 'FRR' && <p className="action-note"><strong>Elena</strong> · {t(offered.length ? 'storyReviewRisk' : 'storyReviewEvidence')}</p>}
    {previous && !previous.passed && previous.detail && <p className="warning" role="status">{copy(t, previous.detail)}</p>}
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

function evidenceStatus(current: ReturnType<typeof currentEvidence>, t: Translate) {
  return current
    ? t('checksPassed', { count: current.checks.filter(Boolean).length, total: current.checks.length })
    : t('noCurrentEvidence')
}

function CubeSatReviewStatus({ game, t }: Pick<Props, 'game' | 't'>) {
  const evidence = currentEvidence(game) as CubeSatEvidence | null
  const result = evidence ?? testDesign(game.design as CubeSatDesign)
  const status = evidence ? passes(evidence) ? 'evidencePassed' : 'evidenceReturned'
    : game.evidence ? 'evidenceRetest' : 'evidencePending'
  return <section className="evidence-status" aria-label={t('releaseStatus')}>
    <h2>{t('releaseStatus')} · <span>{t(status)}</span></h2>
    {status === 'evidenceRetest' && <p className="warning">{t('evidenceRetestWhy')}</p>}
    {evidence && !passes(evidence) && <div className="warning">
      <Findings evidence={evidence} t={t} />
      {!evidence.ditlPass && <p>{t('ditlComparison', evidence.ditl)}</p>}
    </div>}
    <Disclosure label={t('releaseRules')}>
      <p>{t('releaseThresholds', { available: result.available, count: cubeSat.minimumBatches, minutes: result.ditl.threshold, limit: result.massLimit })}</p>
    </Disclosure>
  </section>
}

// Four plain criteria the challenge asks a score to reward: success, science value, efficient use of resources and
// good engineering decisions. Each is shown with its reason, so the rating explains itself.
function MissionRating({ game, mission, t }: Pick<Props, 'game' | 'mission' | 't'>) {
  const { flight } = game
  const left = game.missionId === cubeSat.id ? game.credits : flight?.credits ?? game.credits
  const reserveTarget = game.missionId === lunarMission.id ? lunarMission.returnedReserveForEfficiency : Math.ceil(mission.budget / 10)
  const criteria = [
    { id: 'ratingDelivered', met: Boolean(flight?.delivered) },
    { id: 'ratingStretch', met: Boolean(flight?.stretch) },
    { id: 'ratingReserve', met: Boolean(flight?.delivered) && left >= reserveTarget },
    { id: 'ratingVerified', met: game.log.some(entry => mission.ui.verificationWork?.has(entry.id.replace(/^(lab|support):/, '')) && !entry.incomplete)
      && !mission.ui.knownDefectAtLaunch?.(game) },
  ] as const
  const stars = criteria.filter(item => item.met).length
  return <section className="mission-rating" aria-label={t('ratingTitle')}>
    <strong>{t('ratingTitle')} · {'★'.repeat(stars)}{'☆'.repeat(criteria.length - stars)}</strong>
    <ul>{criteria.map(item => <li key={item.id} className={item.met ? 'good' : undefined}>
      {item.met ? '✓' : '·'} {t(item.id === 'ratingReserve' && game.missionId === lunarMission.id ? 'lunarRatingReserve' : item.id,
        { percent: 10, target: reserveTarget })}
    </li>)}</ul>
  </section>
}

function Results({ game, mission, progress, t, back, replay, open }: Props) {
  const { flight, stop, evidence } = game
  const legacyCubeSat = game.missionId === cubeSat.id && !game.commission
  const next = nextMission(game.missionId)
  const current = currentEvidence(game)
  const outcome = !flight ? mission.outcomes.stopped : flight.stretch ? mission.outcomes.extra
    : flight.delivered ? mission.outcomes.success : mission.outcomes.partial
  const customOutcome = mission.ui.outcome?.(game, t)
  const interrupted = mission.segmentedFlight?.segments.find(segment => segment.id === flight?.interruptedAt)
  const stopCopy = { deadline: 'stopDeadline', funds: 'stopFunds', cancelled: 'stopCancelled', margin: 'orbitalStopMargin' } as const
  const batches = (count: number) => t('dataBatches', { count })
  return <article className="manual">
    <Heading eyebrow={`${t('results')} · ${t('phaseF')}`} title={t(customOutcome?.title ?? outcome)}>{customOutcome?.detail ? copy(t, customOutcome.detail) : flight ? mission.ui.flightSummary(flight, t) : stop && t(stopCopy[stop])}</Heading>
    {interrupted && <p className="notice">{t('flightInterrupted', { segment: t(interrupted.title) })}</p>}
    {flight?.delivered && next && missions[next.id] && <p className="notice" role="status">{t('nextUnlocked', { mission: t(next.title) })}</p>}
    <dl className="resource-line">
      <div><dt>{t('usedWeeks')}</dt><dd>{t('weeks', { count: game.week })}</dd></div>
      <div><dt>{t('spentCredits')}</dt><dd>{missionMoney(mission, missionSpending(mission, game), t)}</dd></div>
    </dl>
    {legacyCubeSat && <CubeSatDebrief game={game} goal={goalBatches(game.scienceGoal)} t={t} />}
    {mission.ui.Debrief && <mission.ui.Debrief game={game} t={t} />}
    <section className="receipt" aria-label={t('results')}>
      <Disclosure label={t('estimate')} value={legacyCubeSat
        ? passes(testDesign(game.design as CubeSatDesign)) ? batches(forecast(game.design as CubeSatDesign).batches) : t('planBlocked')
        : undefined}>
        <mission.ui.Estimate design={game.design} game={game} t={t} />
      </Disclosure>
      {evidence ? <Disclosure label={t('report')} value={current && legacyCubeSat
        ? t('testedData', { count: testedBatches(current as CubeSatEvidence) })
        : evidenceStatus(current, t)}>
        <EvidenceReport mission={mission} evidence={evidence} t={t} outdated={!current} />
      </Disclosure> : <div className="receipt-line"><span>{t('report')}</span><small>{t('noEvidence')}</small></div>}
      {flight ? <Disclosure label={t('delivery')} value={game.missionId === cubeSat.id ? batches(flight.batches) : mission.ui.flightSummary(flight, t)}>
        <mission.ui.Delivery flight={flight} t={t} />
        {flight.segments && <SegmentHistory mission={mission} steps={flight.segments} t={t} />}
      </Disclosure> : <div className="receipt-line"><span>{t('delivery')}</span><small>{t('noFlight')}</small></div>}
    </section>
    <RiskDebrief game={game} mission={mission} t={t} />
    <MissionRating game={game} mission={mission} t={t} />
    <StoryDebrief game={game} t={t} />
    {game.missionId === 'lunar-mission' && <Portfolio progress={progress} t={t} />}
    {legacyCubeSat && flight?.delivered && !flight.stretch && game.scienceGoal !== 'stretch' &&
      <p className="action-note">{t('tryChallenge', { count: cubeSat.stretchBatches })}</p>}
    <div className="action-row">
      {flight?.delivered && next && <ActionButton onClick={() => open(next.id)}>{t('nextBrief', { mission: t(next.title) })}</ActionButton>}
      <button className="button secondary" onClick={back}>{t('home')}</button>
      {legacyCubeSat && flight?.delivered && !flight.stretch && game.scienceGoal !== 'stretch' &&
        <button className="button secondary" onClick={() => replay(true, 'stretch')}>{t('tryChallengeAction')}</button>}
      <button className="button secondary" onClick={() => replay(true)}>{t('chapterReplaySame')}</button>
      <button className="button secondary" onClick={() => replay(false)}>{t('chapterReplayNew')}</button>
    </div>
    <div className="references">
      <Disclosure label={t('phaseTableTitle')}><PhaseTable t={t} current="F" /></Disclosure>
      {mission.ui.sources && <Disclosure label={t('nasaSources')}>
        <p>{t('nasaSourcesDetail')}</p>
        <ul>{mission.ui.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.source}</a></li>)}</ul>
      </Disclosure>}
      {game.missionId !== cubeSat.id && <p>{t('gates', { gate: game.gate })}</p>}
      {game.log.length > 0 && <Disclosure label={t('log')}><DecisionLog game={game} mission={mission} t={t} /></Disclosure>}
    </div>
  </article>
}

function Repair({ game, mission, t, send }: Controls) {
  const [choice, select] = useState<string | null>(null)
  const retest = workCost(game, 'integrate')
  const repairs = repairOptions(game)
  return <>
    <Options legend="repairChoices" value={choice} choose={select} t={t} options={repairs.map(remedy => {
      const correction = mission.costs[remedy]
      const total = { weeks: correction.weeks + retest.weeks, credits: correction.credits + retest.credits }
      return {
        id: remedy,
        name: correction.label,
        detail: t('repairAndRetest', { weeks: total.weeks, cost: missionMoney(mission, total.credits, t) }),
        extra: <>
          <small className={affordable(game, total) ? 'good' : 'bad'}>{t(affordable(game, total) ? 'repairFits' : 'noRepairTime')}</small>
          <mission.ui.RemedyPreview design={game.design} remedy={remedy} t={t} />
        </>,
        disabled: !affordable(game, correction),
      }
    })} />
    <ActionButton disabled={!choice || !affordable(game, mission.costs[choice])}
      onClick={() => choice && send({ type: 'repair', remedy: choice })}>{t('selectCorrection')}</ActionButton>
  </>
}

function Reference({ game, mission, t, send }: Controls) {
  const editable = canConfigure(game)
  const estimate = game.missionId === cubeSat.id ? testDesign(game.design as CubeSatDesign) : null
  const cost = baselineRemainingCost(game)
  const current = currentEvidence(game)
  const matching = game.analysis && sameDesign(game.analysis.design, game.design)
  const canEnd = game.stage !== 'flight' && (mission.tasks || game.stage !== 'review' || game.returned)
  const analysisCost = mission.costs.analyze
  const wait = taskOptions(game).find(task => task.id === 'wait')
  return <aside className="references" aria-label={t('missionInfo')}>
    {game.evidence && <Disclosure label={t('report')} value={evidenceStatus(current, t)}>
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
    {(!editable || game.missionId !== cubeSat.id) && <Disclosure label={t('estimate')}>
      <dl className="fact-list">
        {estimate && <div><dt>{t('planDataLabel')}</dt><dd>{passes(estimate) ? t('dataBatches', { count: estimate.batches }) : t('planBlocked')}</dd></div>}
        {cost > 0 && <div><dt>{t('designCost')}</dt><dd>{missionMoney(mission, cost, t)}</dd></div>}
      </dl>
      {mission.ui.Status ? <mission.ui.Status game={game} t={t} /> : <mission.ui.Estimate design={game.design} game={game} t={t} />}
    </Disclosure>}
    <Disclosure label={t('glossaryTitle')}><Glossary t={t} /></Disclosure>
    <Disclosure label={t('details')}>
      {game.stage !== 'results' && <p>{t(game.returned ? 'returnedDetail' : mission.stageDetails[game.stage], { percent: percent(reviewRiskThreshold) })}</p>}
      <Disclosure label={t('configuration')}><DesignSummary mission={mission} design={game.design} t={t} /></Disclosure>
      <Disclosure label={t('briefTitle')}><mission.ui.Requirements t={t} /></Disclosure>
      <Disclosure label={t('phaseTableTitle')} value={`Phase ${phaseOf(game)}`}>
        <PhaseTable t={t} current={phaseOf(game)} />
      </Disclosure>
      {game.log.length > 0 && <Disclosure label={t('log')}><DecisionLog game={game} mission={mission} t={t} /></Disclosure>}
    </Disclosure>
    {canEnd && <Disclosure label={t('missionActions')}>
      <div className="action-row">
        {!mission.tasks && <button className="text-button" onClick={() => send({ type: 'wait' })}>{t('wait')}</button>}
        {wait && <button className="text-button" disabled={!affordable(game, wait.cost)}
          onClick={() => send({ type: 'task', task: wait.id, turn: game.log.length })}>
          {t(mission.costs[wait.id].label)} <CostLabel t={t} mission={mission} {...wait.cost} />
        </button>}
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
    {game.missionId === 'orbital-launch' && event.id === 'foundLink' &&
      <p className="action-note"><strong>Elena</strong> · {t('storyOrbitalFound')}</p>}
    {work && <p className="notice">{t(game.pendingWork!.remaining ? 'workPaused' : 'workPausedDone', { work: t(mission.costs[work].label), week: game.week, count: game.pendingWork!.remaining })}</p>}
    <div className="event-choices">
      {event.choices.filter(choice => choice.available?.(game) !== false).map(choice => {
        const label = t(choice.label)
        const detailId = `${event.id}-${choice.id}-detail`
        return <ActionButton className="button secondary event-option" key={choice.id} aria-label={`${t('eventChoose')} ${label}`}
          aria-describedby={detailId}
          onClick={() => send({ type: 'choose', event: event.id, choice: choice.id })}>
          <span><strong>{label}</strong><small id={detailId}>{t(choice.detail, choice.values?.(game))}</small></span>
        </ActionButton>
      })}
    </div>
    {event.quote && <Disclosure label={t('missionStory')}><blockquote>{t(event.quote)}</blockquote></Disclosure>}
    {event.file && <MissionFile file={event.file} t={t} />}
  </section>
}

function ChapterConfig({ game, mission, t, send }: Controls) {
  const groups = Object.entries(mission.groups).filter(([id]) => mission.configurable?.(game, id) !== false)
  const [selected, select] = useState(groups[0]?.[0])
  const active = groups.some(([id]) => id === selected) ? selected : groups[0]?.[0]
  if (active === undefined) return null
  const group = mission.groups[active]
  return <div className="decisions chapter-config">
    {groups.length > 1 && <ConfigSwitch active={active} label={t('configuration')} choose={select}
      items={groups.map(([id, item]) => ({ id, name: t(item.legend) }))} />}
    <Options key={active} legend={group.legend} layout="pair" options={optionList(group.options, t, mission)} value={game.design[active]} t={t}
      choose={value => send({ type: 'configure', design: { ...game.design, [active]: value } })} />
  </div>
}

function MissionWork({ game, mission, t, send }: Controls) {
  const work = currentWork(game)
  const cost = !mission.tasks && work && workCost(game, work)
  const tasks = taskOptions(game).filter(task => task.id !== 'wait')
  const primary = tasks.filter(task => game.returned || !mission.ui.optionalTasks?.has(task.id))
  const optional = tasks.filter(task => !game.returned && mission.ui.optionalTasks?.has(task.id))
  const last = game.log.at(-1)?.detail
  function renderTask(task: (typeof tasks)[number], secondary = false) {
    const name = t(mission.costs[task.id].label, { ...task.cost, slots: 1 })
    const support = task.id.startsWith('lab:') || task.id.startsWith('support:')
    return <div key={task.id}>
      <ActionButton {...(secondary && { className: 'button secondary' })}
        disabled={!affordable(game, task.cost)} onClick={() => send({ type: 'task', task: task.id, turn: game.log.length })}>
        {support ? t(task.id.startsWith('lab:') ? 'orbitalSupportTask' : 'lunarSupportTask', { work: name }) : name} <CostLabel t={t} mission={mission} {...task.cost} />
      </ActionButton>
      {mission.ui.TaskNote && <mission.ui.TaskNote game={game} task={task.id} cost={task.cost} t={t} />}
    </div>
  }
  return <div className="decisions">
    {last && game.log.at(-1)?.review === undefined && <p className="action-note" role="status">{copy(t, last)}</p>}
    {game.log.at(-1)?.review?.passed && game.log.at(-1)?.review?.detail && <p className="verified" role="status">{copy(t, game.log.at(-1)!.review!.detail!)}</p>}
    {canConfigure(game) && <ChapterConfig game={game} mission={mission} t={t} send={send} />}
    {mission.ui.Preview && <div className="forecast-line"><mission.ui.Preview game={game} t={t} /></div>}
    {mission.tasks ? <div className="task-list">{primary.map(task => renderTask(task))}</div>
      : work && cost && !(game.gate === 'PDR' && mission.reviews?.PDR) &&
      <ActionButton disabled={!affordable(game, cost)} onClick={() => send({ type: 'work' })}>
        {t(work === 'integrate' && game.evidence ? 'retest' : mission.costs[work].label)} <CostLabel t={t} mission={mission} {...cost} />
      </ActionButton>}
    {optional.length > 0 && <Disclosure label={t('optionalTasks')}>
      <div className="task-list">{optional.map(task => renderTask(task, true))}</div>
    </Disclosure>}
  </div>
}

function MissionTools({ game, mission, t, send }: Controls) {
  return <Reference key={game.stage} game={game} mission={mission} t={t} send={send} />
}

// The verification choice sits in the main column with a one-line summary, so a first-time player sees it.
function CubeSatRiskChecks({ game, mission, t, send }: Controls) {
  const items = mission.risks?.view(game) ?? []
  const open = items.filter(item => !item.state.fixed && item.risk > reviewRiskThreshold)
  return <Disclosure label={t('optionalRiskChecks')} value={open.length
    ? t('riskSummary', { count: open.length, items: open.map(item => `${t(item.label)} ${percent(item.risk)}%`).join(t('listSeparator')) })
    : t('riskSummaryClear')}>
    <RiskPanel game={game} mission={mission} t={t} send={send} />
  </Disclosure>
}

function CommissionWorkbench({ game, mission, t, send }: Controls) {
  const client = commissionFor(game)
  const tasks = taskOptions(game)
  const run = (task: string) => send({ type: 'task', task, turn: game.log.length })
  const decision = game.log.at(-1)?.detail
  const screened = game.log.some(entry => entry.id === 'screen')
  const stage = game.stage
  const configuration = <div className="decisions">
      {Object.entries(mission.groups).map(([id, group]) => <Options key={id} legend={group.legend} t={t}
        value={game.design[id]} choose={value => send({ type: 'configure', design: { ...game.design, [id]: value } })}
        options={optionList(group.options, t, mission).map(option => ({
          ...option, extra: <CommissionOption game={game} design={{ ...game.design, [id]: option.id }} t={t} />,
        }))} />)}
    </div>
  return <>
    <p>{t(client.brief, { required: client.required })}</p>
    {decision && game.log.at(-1)?.review === undefined && <p role="status">{copy(t, decision)}</p>}
    {stage === 'feasibility' && configuration}
    {stage === 'design' && !screened && <Disclosure label={t('commissionEditPlan')}>{configuration}</Disclosure>}
    {(stage === 'feasibility' || stage === 'design') && <CommissionPlan game={game} t={t} />}
    {stage === 'design' && !screened && capabilityFor(game.design).backup && !tasks.some(task => task.id === 'screen') &&
      <p className="warning">{t('commissionScreenUnavailable', { weeks: mission.costs.screen.weeks, cost: money(mission.costs.screen.credits) })}</p>}
    {stage === 'design' && !tasks.some(task => task.id === 'freeze') &&
      (commissionPlan(game).spareWeeks < 0 || commissionPlan(game).spareCredits < 0) && <p className="warning">{t('commissionCannotFreeze')}</p>}
    {stage === 'design' && <CommissionRepairs game={game} t={t} run={run} />}
    {stage === 'review' && <CommissionReport game={game} t={t} />}
    {stage === 'review' && game.returned ? <CommissionRepairs game={game} t={t} run={run} />
      : stage === 'review' && <ReviewControls game={game} mission={mission} t={t} send={send} />}
    <div className="task-list">
      {tasks.filter(task => !['correctEarly', 'correctLate', 'strip'].includes(task.id)).map(({ id, cost }) =>
        <ActionButton key={id} disabled={!affordable(game, cost)} onClick={() => run(id)}>
          {t(mission.costs[id].label)} <CostLabel t={t} mission={mission} {...cost} />
        </ActionButton>)}
    </div>
    {stage !== 'flight' && <button className="text-button" onClick={() => send({ type: 'cancel' })}>{t('cancel')}</button>}
  </>
}

export function Single(props: Props) {
  const { game, mission, t, send, back } = props
  const isCubeSat = game.missionId === cubeSat.id && !game.commission
  if (game.stage === 'results' && !game.playback) return <Results {...props} />
  const checks = currentEvidence(game)
  const editable = canConfigure(game)
  const stage = game.playback?.kind === 'assembly' ? 'build' : game.playback?.kind ?? game.stage
  const segment = currentFlightSegment(game)
  const customReview = stage === 'design' ? mission.reviews?.PDR : stage === 'review' ? mission.reviews?.FRR : undefined
  const latestAnalysis = editable && game.analysis && ['analysisClear', 'analysisConflict'].includes(game.log.at(-1)?.id ?? '')
    && sameDesign(game.analysis.design, game.design) ? game.analysis : null
  const latestReview = [...game.log].reverse().find(entry => entry.review)?.review

  const phase = phaseOf(game, stage)
  return <article className="single-mission">
    <div className="mission-heading">
      <Heading eyebrow={t(mission.title)} title={t(game.returned ? 'returned' : stage)} />
      <Back t={t} onClick={back} />
    </div>
    <div className="mission-steps" aria-label={t('process')}>
      <span aria-current="step">{phaseLabel(phase, t)}</span>
      <progress value={phases.indexOf(phase) + 1} max={phases.length} aria-label={t('process')} />
    </div>
    <dl className="resource-line mission-resources">
      {isCubeSat && stage === 'flight' ? <>
        <div><dt>{t('groundPassLabel')}</dt><dd>{t(game.contact ? 'contactInProgress' : 'contactPending')}</dd></div>
        <div><dt>{t('delivery')}</dt><dd>{t('dataBatches', { count: game.contact?.accepted ?? 0 })}</dd></div>
      </> : <>
        <div><dt>{t('flightWindow')}</dt><dd>{t('weeks', { count: availableWeeks(game) })}</dd></div>
        <div><dt>{t('budgetLabel')}</dt><dd>{missionMoney(mission, game.credits, t)}</dd></div>
      </>}
      {game.commission && <div><dt>{t('commissionChoose')}</dt><dd>{t(commissionFor(game).name)}</dd></div>}
      {isCubeSat && <div><dt>{t('scienceGoal')}</dt><dd>{t('dataBatches', { count: goalBatches(game.scienceGoal) })}</dd></div>}
    </dl>
    <div className={game.playback ? 'mission-layout playback-layout' : 'mission-layout'}>
      {game.playback ? <div className="next-decision">
        <p className="action-note">{t(game.playback.kind === 'assembly' ? 'assemblyPlaybackPurpose' : 'integrationPlaybackPurpose')}</p>
        <Lab game={game as CubeSatGame} t={t} send={send} />
      </div> : <div className="mission-controls">
        {game.event && <MissionEvent {...props} />}
        {!game.event && <section className="next-decision decision-arrival" key={`${stage}:${game.returned}`}>
          {game.commission ? (stage === 'flight'
            ? <SegmentControls key={segment?.id} {...props} />
            : <CommissionWorkbench {...props} />) : <>
          {isCubeSat && (stage === 'review' || (stage === 'integration' && game.evidence)) && <CubeSatReviewStatus game={game} t={t} />}
          {isCubeSat && (stage === 'build' || stage === 'integration') && !game.evidence &&
            <p>{t(mission.stageDetails[stage])}</p>}
          {!isCubeSat && stage === 'flight' && latestReview?.passed && latestReview.detail && <p role="status">{copy(t, latestReview.detail)}</p>}
          {isCubeSat
            ? (stage === 'build' || stage === 'integration') && <BenchWork {...props} />
            : stage !== 'flight' && <MissionWork {...props} />}
          {isCubeSat && editable && <CubeSatConfig {...props} />}
          {isCubeSat && stage !== 'flight' && !game.returned && <CubeSatRiskChecks {...props} />}
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
          </>}
        </section>}
      </div>}
      {isCubeSat && !game.event && !game.playback && <div className="mission-lab">
        <Lab key={stage} game={game as CubeSatGame} t={t} send={send} compact={!game.contact} />
      </div>}
      {!game.commission && !game.event && !game.playback && <div className="mission-reference">
        {isCubeSat && editable ? <Disclosure label={t('missionTools')}><MissionTools {...props} /></Disclosure>
          : <MissionTools {...props} />}
      </div>}
    </div>
  </article>
}
