import { ArrowLeft, ArrowRight, Satellite } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Design, DesignOption, MissionRules, TestResult } from '../game/types'
import type { Translate } from '../i18n'
import type { MissionModule } from '../missions'

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

export function optionValues({ params, ...option }: DesignOption) {
  return { ...option, ...params } as Record<string, string | number>
}

export function DesignTags({ mission, design, t }: { mission: MissionRules; design: Design; t: Translate }) {
  return <div className="tags">
    {Object.entries(mission.groups).map(([key, group], index) => <span key={key}>
      {index === 0 && <><Satellite size={13} aria-hidden /> </>}{t(group.options[design[key]].label)}
    </span>)}
  </div>
}

export function ReportPanel({ mission, evidence, t, outdated }: {
  mission: MissionModule
  evidence: TestResult & { week?: number; revision?: number }
  t: Translate
  outdated?: boolean
}) {
  return <section className="panel report" aria-label={t('report')}>
    <div className="panel-title">
      <h2>{t('report')}</h2>
      {evidence.week !== undefined && <small>{t('evidenceWeek', { week: evidence.week, revision: evidence.revision ?? 0 })}</small>}
    </div>
    {outdated && <p className="notice">{t('oldReport')}</p>}
    <DesignTags mission={mission} design={evidence.design} t={t} />
    <mission.ui.Report evidence={evidence} t={t} />
  </section>
}
