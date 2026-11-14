import { ArrowLeft, ArrowRight, Check, CircleAlert } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cubeSat } from '../missions/cubesat'
import { applyRemedy, testDesign, type Design, type Remedy } from '../game/mission'
import type { Translate } from '../i18n'

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function money(credits: number) {
  return dollars.format(credits * cubeSat.dollarsPerCredit)
}

export function ActionButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className="button primary" {...props}>{children}<ArrowRight size={17} aria-hidden /></button>
}

export function Back({ t, onClick }: { t: Translate; onClick: () => void }) {
  return <button className="text-button back" onClick={onClick}><ArrowLeft size={16} aria-hidden />{t('back')}</button>
}

export function Heading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return <header className="section-heading">
    {eyebrow && <span className="eyebrow">{eyebrow}</span>}
    <h1>{title}</h1>
    {children && <p>{children}</p>}
  </header>
}

export function Disclosure({ label, value, children }: { label: string; value?: ReactNode; children: ReactNode }) {
  return <details className="disclosure">
    <summary><span>{label}</span>{value !== undefined && <span className="disclosure-value">{value}</span>}</summary>
    <div className="disclosure-body">{children}</div>
  </details>
}

export function CostLabel({ t, weeks, credits }: { t: Translate; weeks: number; credits: number }) {
  return <span className="cost">{t('weeks', { count: weeks })} · {money(credits)}</span>
}

export function DesignSummary({ design, t }: { design: Design; t: Translate }) {
  return <dl className="fact-list">
    <div><dt>{t('payload')}</dt><dd>{t(cubeSat.payloads[design.payload].label)}</dd></div>
    <div><dt>{t('supply')}</dt><dd>{t(cubeSat.supplies[design.supply].label)}</dd></div>
    <div><dt>{t('schedule')}</dt><dd>{t(cubeSat.schedules[design.schedule].label)}</dd></div>
    <div><dt>{t('radio')}</dt><dd>{t(cubeSat.radios[design.radio].label)}</dd></div>
  </dl>
}

type TestResult = ReturnType<typeof testDesign>
type PowerValues = Pick<TestResult, 'payloadWatts' | 'peak' | 'available'>
type Evidence = TestResult & { week?: number; revision?: number }

export function PowerBreakdown({ design, t, result = testDesign(design) }: { design: Design; t: Translate; result?: PowerValues }) {
  return <>
    <dl className="fact-list">
      <div><dt>{t('bus')}</dt><dd>{cubeSat.busWatts} W</dd></div>
      <div><dt>{t(cubeSat.payloads[design.payload].label)}</dt><dd>{result.payloadWatts} W</dd></div>
      <div><dt>{t('downlinkRadio')}</dt><dd>{cubeSat.downlinkWatts} W</dd></div>
      <div><dt>{t('powerDemand')}</dt><dd>{result.peak} W</dd></div>
      <div><dt>{t(cubeSat.supplies[design.supply].label)}</dt><dd>{result.available} W</dd></div>
    </dl>
    <p>{t(design.schedule === 'overlap' ? 'powerConcurrent' : 'powerSequential')}</p>
  </>
}

function Status({ pass, t }: { pass: boolean; t: Translate }) {
  const Icon = pass ? Check : CircleAlert
  return <span className={`status ${pass ? 'good' : 'bad'}`}><Icon size={15} aria-hidden />{t(pass ? 'pass' : 'fail')}</span>
}

export function powerFinding(result: TestResult, t: Translate) {
  return t(result.design.schedule === 'overlap' ? 'powerConflict' : 'powerInsufficient', { peak: result.peak, available: result.available })
}

export function testedBatches(evidence: TestResult) {
  return evidence.testedBatches ?? (evidence.powerPass ? evidence.batches : 0)
}

export function passCount(evidence: TestResult) {
  return [evidence.powerPass, evidence.dataPass, evidence.ditlPass].filter(Boolean).length
}

export function Findings({ evidence, t }: { evidence: TestResult; t: Translate }) {
  return <ul className="findings">
    {!evidence.powerPass && <li>{powerFinding(evidence, t)}</li>}
    {!evidence.ditlPass && <li>{t('earlyTransmission', evidence.ditl)}</li>}
    {evidence.powerPass && !evidence.dataPass && <li>{t('dataShortfall', { count: testedBatches(evidence), minimum: cubeSat.minimumBatches })}</li>}
  </ul>
}

export function EvidenceReport({ evidence, t, outdated }: { evidence: Evidence; t: Translate; outdated?: boolean }) {
  const { ditl } = evidence
  return <div className="report">
    {outdated && <p className="notice">{t('oldReport')}</p>}
    {evidence.week !== undefined && <small>{t('evidenceWeek', { week: evidence.week, revision: evidence.revision ?? 0 })}</small>}
    <Disclosure label={t('powerCheck')} value={<Status pass={evidence.powerPass} t={t} />}>
      <PowerBreakdown design={evidence.design} result={evidence} t={t} />
    </Disclosure>
    <div className="check row">
      <span>{t('dataCheck')}<small>{t('dataThreshold', { count: testedBatches(evidence), minimum: cubeSat.minimumBatches })}</small></span>
      <Status pass={evidence.dataPass} t={t} />
    </div>
    <Disclosure label={t('ditl')} value={<Status pass={evidence.ditlPass} t={t} />}>
      <dl className="fact-list">
        <div><dt>{t('separation')}</dt><dd>{t('timestamp', { count: ditl.separation })}</dd></div>
        <div><dt>{t('deployment')}</dt><dd>{t('timestamp', { count: ditl.deploy })}</dd></div>
        <div><dt>{t('firstTx')}</dt><dd>{t('timestamp', { count: ditl.firstTx })}</dd></div>
      </dl>
      <p>{t('ditlRule', ditl)}</p>
      <a href={cubeSat.ditl.url} target="_blank" rel="noreferrer">{cubeSat.ditl.source} ↗</a>
    </Disclosure>
  </div>
}

export function RemedyPreview({ design, remedy, t }: { design: Design; remedy: Remedy; t: Translate }) {
  const result = testDesign(applyRemedy(design, remedy))
  return <small>{remedy === 'compliant'
    ? `${t('firstTx')} ${t('timestamp', { count: result.ditl.firstTx })}`
    : `${t('powerUse', { peak: result.peak, available: result.available })} · ${t('dataBatches', { count: result.batches })}`}</small>
}
