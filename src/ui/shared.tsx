import { ArrowLeft, ArrowRight, Check, CircleAlert, Satellite } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cubeSat } from '../missions/cubesat'
import { applyRemedy, forecast, testDesign, type Design, type Remedy } from '../game/mission'
import type { Message, Translate } from '../i18n'

export const remedyLabels = {
  stagger: 'remedyStagger', basic: 'remedyBasic', reinforced: 'remedyReinforced', compliant: 'remedyCompliant',
} as const satisfies Record<Remedy, Message>

export function ActionButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className="button primary" {...props}>{children}<ArrowRight size={17} aria-hidden /></button>
}

export function Back({ t, onClick }: { t: Translate; onClick: () => void }) {
  return <button className="text-button" onClick={onClick}><ArrowLeft size={17} aria-hidden />{t('back')}</button>
}

export function Heading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return <header className="section-heading">
    {eyebrow && <span className="eyebrow">{eyebrow}</span>}
    <h1>{title}</h1>
    {children && <p>{children}</p>}
  </header>
}

export function Metric({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>
}

export function CostLabel({ t, weeks, credits }: { t: Translate; weeks: number; credits: number }) {
  return <span className="cost">{t('weeks', { count: weeks })} · {t('credits', { count: credits })}</span>
}

export function DesignTags({ design, t }: { design: Design; t: Translate }) {
  return <div className="tags">
    <span><Satellite size={13} aria-hidden /> {t(cubeSat.payloads[design.payload].label)}</span>
    <span>{t(cubeSat.supplies[design.supply].label)}</span>
    <span>{t(cubeSat.schedules[design.schedule].label)}</span>
    <span>{t(cubeSat.radios[design.radio].label)}</span>
  </div>
}

export function PowerReadout({ estimate, t }: { estimate: ReturnType<typeof forecast>; t: Translate }) {
  return <div className="power-readout">
    <strong>{t('powerUse', estimate)}</strong>
    <div className="power-meter" aria-hidden>
      <i className={estimate.deficit ? 'overload' : ''} style={{ width: `${Math.min(100, estimate.peak / estimate.available * 100)}%` }} />
    </div>
    <span className={estimate.deficit ? 'bad' : 'good'}>{estimate.deficit
      ? t('powerDeficit', { count: estimate.deficit })
      : t('powerMargin', { count: estimate.available - estimate.peak })}</span>
    <small>{t('powerFormula', { bus: cubeSat.busWatts, payload: estimate.payloadWatts, radio: cubeSat.downlinkWatts })}</small>
  </div>
}

function Status({ pass, t }: { pass: boolean; t: Translate }) {
  const Icon = pass ? Check : CircleAlert
  return <span className={`status ${pass ? 'good' : 'bad'}`}><Icon size={15} aria-hidden />{t(pass ? 'pass' : 'fail')}</span>
}

export function EvidenceReport({ evidence, t, outdated }: {
  evidence: ReturnType<typeof testDesign> & { week?: number; revision?: number }
  t: Translate
  outdated?: boolean
}) {
  const { ditl } = evidence
  return <section className="panel report" aria-label={t('report')}>
    <div className="panel-title">
      <h2>{t('report')}</h2>
      {evidence.week !== undefined && <small>{t('evidenceWeek', { week: evidence.week, revision: evidence.revision ?? 0 })}</small>}
    </div>
    {outdated && <p className="notice">{t('oldReport')}</p>}
    <DesignTags design={evidence.design} t={t} />
    <div className="check">
      <div className="row"><h3>{t('powerCheck')}</h3><Status pass={evidence.powerPass} t={t} /></div>
      <PowerReadout estimate={evidence} t={t} />
    </div>
    <div className="check">
      <div className="row"><h3>{t('dataCheck')}</h3><Status pass={evidence.dataPass} t={t} /></div>
      <p>{t('dataThreshold', { count: evidence.powerPass ? evidence.batches : 0, minimum: cubeSat.minimumBatches })}</p>
    </div>
    <div className="check">
      <div className="row"><h3>{t('ditl')}</h3><Status pass={evidence.ditlPass} t={t} /></div>
      <dl className="timeline">
        <div><dt>{t('separation')}</dt><dd>{t('timestamp', { count: ditl.separation })}</dd></div>
        <div><dt>{t('deployment')}</dt><dd>{t('timestamp', { count: ditl.deploy })}</dd></div>
        <div><dt>{t('firstTx')}</dt><dd>{t('timestamp', { count: ditl.firstTx })}</dd></div>
      </dl>
      <p>{t('ditlRule', ditl)}</p>
      <a href={cubeSat.ditl.url} target="_blank" rel="noreferrer">{cubeSat.ditl.source} ↗</a>
    </div>
  </section>
}

export function RemedyPreview({ design, remedy, t }: { design: Design; remedy: Remedy; t: Translate }) {
  const evidence = testDesign(applyRemedy(design, remedy))
  return <small>{t('powerUse', { peak: evidence.peak, available: evidence.available })} · {t('dataThreshold', { count: evidence.batches, minimum: cubeSat.minimumBatches })}
    {remedy === 'compliant' && <> · {t('timestamp', { count: evidence.ditl.firstTx })}</>}
  </small>
}
