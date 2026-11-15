import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, FastForward } from 'lucide-react'
import { contactEvidence, currentEvidence, type Action } from '../game/mission'
import type { Message, Translate } from '../i18n'
import { benchSequence, cubeSat, departments, forecast, planContact, powerTimeline, scopeSegment, type CubeSatEvidence, type CubeSatGame, type Department } from '../missions/cubesat'
import { drawLab, type LabArt } from './labArt'

const reducedMotion = '(prefers-reduced-motion: reduce)'

const segments = {
  imaging: { title: 'labImaging', work: ['science', 'power'] },
  overlap: { title: 'labOverlap', work: departments },
  handoff: { title: 'labHandoff', work: ['power'] },
  downlink: { title: 'labDownlink', work: ['power', 'comms'] },
} as const satisfies Record<string, { title: Message; work: readonly Department[] }>

const assemblyLabels = { science: 'labCalibrate', power: 'labConnect', comms: 'labBoot' } as const

export function Lab({ game, send, t, compact = false }: {
  game: CubeSatGame; send: (action: Action) => void; t: Translate; compact?: boolean
}) {
  const [department, inspect] = useState<Department | null>(null)
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()
  const canvas = useRef<HTMLCanvasElement>(null)
  const { playback, design, stage, contact } = game
  const orbit = stage === 'flight'
  const assembly = playback?.kind === 'assembly'
  const evidence = currentEvidence(game) as CubeSatEvidence | null
  const timeline = powerTimeline(design)
  const available = cubeSat.supplies[design.supply].watts
  const flown = contactEvidence(game) as CubeSatEvidence | null
  const receiving = contact && flown ? planContact(flown, contact.choice) : null
  const sequence = benchSequence(game.benchLead)
  const scope = game.testFocus && scopeSegment(timeline, game.testFocus)
  const segment = playback?.kind === 'integration' ? timeline[playback.step]
    : stage === 'review' ? timeline.find(item => item.watts > available) ?? scope ?? timeline.at(-1) : undefined
  const tracked = scope && segment?.id === scope.id
  const warning = Boolean(segment && segment.watts > available)
  const assemblyStep = assembly ? playback.step : -1
  const assembling = assembly ? sequence[assemblyStep] : undefined
  const active: readonly Department[] = segment ? segments[segment.id].work : assembling ? [assembling] : []
  const ready = (stage === 'integration' || stage === 'review' || orbit) && !assembly
  const installed = assembly ? sequence.slice(0, assemblyStep + 1) : ready ? departments : []
  const received = contact && receiving
    ? contact.diagnosticsPending ? t('groundReceivingDiagnostics') : t('groundReceived', { next: contact.next + 1, total: receiving.batches })
    : null
  const title = segment ? t(segments[segment.id].title)
    : assembling ? t(assemblyLabels[assembling])
    : received ?? t(orbit ? 'labAwaitContact' : ready ? 'labReady' : stage === 'build' ? 'labParts' : 'labPlanning')
  const configuration = {
    science: t(cubeSat.payloads[design.payload].label),
    power: t(cubeSat.supplies[design.supply].label),
    comms: t(cubeSat.radios[design.radio].label),
  }
  const readout = segment && t('powerUse', { peak: segment.watts, available })
  const art: LabArt = {
    design, active, installed, assemblyStep, warning, orbit, comparing: department ?? undefined,
    receiving: Boolean(receiving), received: contact?.next ?? 0,
  }

  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!context) return
    const motion = window.matchMedia(reducedMotion)
    let frame = 0
    let timer: number | undefined
    const paint = () => {
      window.clearInterval(timer)
      frame = 0
      drawLab(context, art, 0)
      if (!motion.matches && (playback || receiving)) {
        timer = window.setInterval(() => {
          frame += 1
          drawLab(context, art, frame % 4)
          if (!playback && frame === 4) window.clearInterval(timer)
        }, 230)
      }
    }
    paint()
    motion.addEventListener('change', paint)
    return () => {
      window.clearInterval(timer)
      motion.removeEventListener('change', paint)
    }
  })

  useEffect(() => {
    if (!playback) return
    const motion = window.matchMedia(reducedMotion)
    const advance = (skip = false) => send({ type: 'advanceLab', playback, skip })
    // Checkpoints survive reload. Reduced motion compresses each beat and still leaves the result visible.
    const delay = motion.matches ? 400 : warning ? 2400 : 1400
    const timer = window.setTimeout(() => advance(), delay)
    const onMotionChange = () => { if (motion.matches) advance(true) }
    motion.addEventListener('change', onMotionChange)
    return () => {
      window.clearTimeout(timer)
      motion.removeEventListener('change', onMotionChange)
    }
  }, [playback, send, warning])

  function teamNote(team: Department) {
    const config = configuration[team]
    if (assembly) {
      const index = sequence.indexOf(team)
      if (team === assembling) return t(assemblyLabels[team])
      return t(index < assemblyStep ? 'labBenchVerified' : team === 'comms' ? 'labWaitClearance' : 'labBenchQueued', { config })
    }
    if (segment) {
      if (team === 'power') return t(warning ? 'labPowerLimit' : 'labPowerWatch', { watts: segment.watts, available })
      if (team === 'science') return t(active.includes(team) ? 'labScienceImaging' : 'labScienceDone', { config })
      return t(active.includes(team) ? 'labCommsSending' : 'labRadioWaiting')
    }
    return t(ready ? 'labBenchVerified' : 'labBenchQueued', { config })
  }

  return <section className={`lab ${orbit ? 'lab-orbit' : ''} ${warning ? 'lab-warning' : ''} ${compact ? 'lab-compact' : ''}`}
    aria-label={t(orbit ? 'labOrbit' : 'labTitle')}>
    {compact ? <button type="button" className="lab-preview-toggle" aria-expanded={expanded} aria-controls={detailsId}
      onClick={() => setExpanded(!expanded)}>
      {t(orbit ? 'labOrbit' : 'labTitle')}<ChevronDown size={16} aria-hidden />
    </button> : <div className="lab-head">
      <h2>{t(orbit ? 'labOrbit' : 'labTitle')}</h2>
      {playback && <button className="lab-skip" onClick={() => send({ type: 'advanceLab', playback, skip: true })}>
        <FastForward size={16} aria-hidden />{t('labSkip')}
      </button>}
    </div>}
    <div className="lab-scene">
      <canvas className="lab-art" ref={canvas} width={320} height={140} aria-hidden />
      {tracked && <span className="lab-focus">{t(playback ? 'labScope' : 'labScopeSaved')}</span>}
    </div>
    <div id={detailsId} className="lab-details" hidden={compact && !expanded}>
      <div className="lab-readout" role="status">
        <span>{title}</span>
        {readout && <strong>{readout}</strong>}
      </div>
      {contact && <p className="lab-note">{t('groundTally', { accepted: contact.accepted, archived: contact.next - contact.accepted })}</p>}
      {segment && <ol className="lab-timeline" aria-label={t('labTimeline')}>
        {timeline.map((item, index) => <li key={item.id} className={item.watts > available ? 'over-limit' : undefined}
          aria-current={item.id === segment.id ? 'step' : undefined}>
          <span>{t(segments[item.id].title)}</span>
          <small>{playback && index > playback.step ? t('labSegmentPending') : `${item.watts} W`}</small>
        </li>)}
      </ol>}
      {!orbit && <div className="lab-crew">
        {departments.map(team => <button key={team} type="button" aria-pressed={department === team}
          aria-description={active.includes(team) ? t('labActive', { team: t(team) }) : undefined}
          onClick={() => inspect(department === team ? null : team)}>
          <span className={active.includes(team) ? 'crew-light active' : 'crew-light'} aria-hidden />{t(team)}
        </button>)}
      </div>}
      {!orbit && department && <p className="lab-note" role="status">{teamNote(department)}</p>}
      {stage === 'integration' && !playback && game.benchLead && !game.evidence && <p className="lab-note">
        {t(game.benchLead === 'science' ? 'labBenchScienceResult' : 'labBenchPowerResult', {
          camera: configuration.science, watts: cubeSat.payloads[design.payload].watts, available,
        })}
      </p>}
      {stage === 'review' && !playback && evidence?.powerPass && evidence.design.schedule === 'stagger' &&
        <p className="lab-note">{t('labStaggerResult', {
          loss: cubeSat.schedules.stagger.batchLoss,
          batches: evidence.batches,
          deliveryLoss: forecast({ ...design, schedule: 'overlap' }).batches - evidence.batches,
        })}</p>}
    </div>
  </section>
}
