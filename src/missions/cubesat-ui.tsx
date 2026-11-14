import { Check, CircleAlert, Flag, Radio, Satellite } from 'lucide-react'
import type { Translate } from '../i18n'
import type { MissionUi } from '.'
import { applyRemedy, cubeSat, forecast, testDesign, type CubeSatDesign, type CubeSatEvidence, type Remedy } from './cubesat'

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

function Report({ evidence, t }: { evidence: CubeSatEvidence; t: Translate }) {
  const { ditl } = evidence
  return <>
    <div className="check">
      <div className="row"><h3>{t('powerCheck')}</h3><Status pass={evidence.powerPass} t={t} /></div>
      <PowerReadout estimate={evidence} t={t} />
    </div>
    <div className="check">
      <div className="row"><h3>{t('dataCheck')}</h3><Status pass={evidence.dataPass} t={t} /></div>
      <p>{t('dataThreshold', { count: evidence.testedBatches ?? (evidence.powerPass ? evidence.batches : 0), minimum: cubeSat.minimumBatches })}</p>
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
  </>
}

export function RemedyPreview({ design, remedy, t }: { design: CubeSatDesign; remedy: Remedy; t: Translate }) {
  const evidence = testDesign(applyRemedy(design, remedy))
  return <small>{t('powerUse', { peak: evidence.peak, available: evidence.available })} · {t('dataThreshold', { count: evidence.batches, minimum: cubeSat.minimumBatches })}
    {remedy === 'compliant' && <> · {t('timestamp', { count: evidence.ditl.firstTx })}</>}
  </small>
}

function Requirements({ t, compact }: { t: Translate; compact?: boolean }) {
  const minimum = t('briefMinimum', { count: cubeSat.minimumBatches, orbits: cubeSat.missionOrbits })
  const icd = t('briefIcd', { count: cubeSat.ditl.minQuietMinutes })
  if (compact) return <><p>{minimum}</p><p>{icd}</p></>
  return <ul className="requirements">
    <li><Flag size={18} aria-hidden />{minimum}</li>
    <li><Satellite size={18} aria-hidden />{t('briefExtra', { count: cubeSat.stretchBatches })}</li>
    <li><Radio size={18} aria-hidden />{icd}</li>
  </ul>
}

export const cubeSatUi: MissionUi = {
  Requirements,
  Estimate: ({ design, t }) => {
    const estimate = forecast(design as CubeSatDesign)
    return <>
      <PowerReadout estimate={estimate} t={t} />
      <div className="estimate-line"><span>{t('estimatedDelivery')}</span><strong>{estimate.batches}</strong></div>
    </>
  },
  Forecast: ({ forecast: estimate, t }) => <PowerReadout estimate={estimate as ReturnType<typeof forecast>} t={t} />,
  Report: ({ evidence, t }) => <Report evidence={evidence as CubeSatEvidence} t={t} />,
  ReportSummary: ({ evidence, t }) => <>{t('powerUse', { peak: evidence.peak, available: evidence.available })} · {t('ditlRule', evidence.ditl)}</>,
  RemedyPreview: ({ design, remedy, t }) => <RemedyPreview design={design as CubeSatDesign} remedy={remedy as Remedy} t={t} />,
  Delivery: ({ flight, t }) => <>
    <p>{t('flightBatches', { count: flight.batches })}</p>
    {Boolean(flight.diagnostics) && <p>{t('flightDiagnosticsSent')}</p>}
    <small>{t('firstTx')} · {t('timestamp', { count: flight.firstTx })}</small>
  </>,
  flightOptions: (evidence, t) => [
    { id: 'priority', name: 'flightPriority', detail: t('flightPriorityDetail', { count: cubeSat.minimumBatches }) },
    { id: 'extra', name: 'flightExtra', detail: t('flightExtraDetail', { count: evidence.batches }) },
    { id: 'diagnostics', name: 'flightDiagnostics', detail: t('flightDiagnosticsDetail', { count: cubeSat.diagnosticBatches }) },
  ],
  flightSummary: (flight, t) => t('flightBatches', { count: flight.batches }),
}
