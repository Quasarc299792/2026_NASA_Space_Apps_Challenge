import { useEffect, useRef, useState } from 'react'
import { FastForward } from 'lucide-react'
import { assemblyOrder, currentEvidence, forecast, powerTimeline, type Action, type Game } from '../game/mission'
import type { Message, Translate } from '../i18n'
import { cubeSat, departments, type Department } from '../missions/cubesat'
import { drawLab, type LabArt } from './labArt'

const segments = {
  imaging: { title: 'labImaging', work: ['science', 'power'] },
  overlap: { title: 'labOverlap', work: departments },
  handoff: { title: 'labHandoff', work: ['power'] },
  downlink: { title: 'labDownlink', work: ['power', 'comms'] },
} as const satisfies Record<string, { title: Message; work: readonly Department[] }>

const assemblyLabels = { science: 'labCalibrate', power: 'labConnect', comms: 'labBoot' } as const

export function Lab({ game, send, t }: { game: Game; send: (action: Action) => void; t: Translate }) {
  const [department, inspect] = useState<Department | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const { playback, design, stage } = game
  const orbit = stage === 'flight'
  const assembly = playback?.kind === 'assembly'
  const evidence = currentEvidence(game)
  const timeline = powerTimeline(design)
  const available = cubeSat.supplies[design.supply].watts
  const segment = playback?.kind === 'integration' ? timeline[playback.step]
    : stage === 'review' ? timeline.reduce((peak, item) => item.watts > peak.watts ? item : peak) : undefined
  const warning = Boolean(segment && segment.watts > available)
  const assemblyStep = assembly ? playback.step : -1
  const assembling = assembly ? assemblyOrder[assemblyStep] : undefined
  const active: readonly Department[] = segment ? segments[segment.id].work : assembling ? [assembling] : []
  const ready = (stage === 'integration' || stage === 'review' || orbit) && !assembly
  const installed = assembly ? assemblyOrder.slice(0, assemblyStep + 1) : ready ? departments : []
  const title = segment ? t(segments[segment.id].title)
    : assembling ? t(assemblyLabels[assembling])
    : t(orbit ? 'labAwaitContact' : ready ? 'labReady' : stage === 'build' ? 'labParts' : 'labPlanning')
  const configuration = {
    science: t(cubeSat.payloads[design.payload].label),
    power: t(cubeSat.supplies[design.supply].label),
    comms: t(cubeSat.radios[design.radio].label),
  }
  const readout = segment && t('powerUse', { peak: segment.watts, available })
  const art: LabArt = {
    design, active, installed, assemblyStep, warning, orbit, comparing: department ?? undefined,
    receiving: false, hasContact: false,
  }

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (ctx) drawLab(ctx, art)
  })

  useEffect(() => {
    if (!playback) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
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
      const index = assemblyOrder.indexOf(team)
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

  return <section className={`lab ${orbit ? 'lab-orbit' : ''} ${warning ? 'lab-warning' : ''}`} aria-label={t(orbit ? 'labOrbit' : 'labTitle')}>
    <div className="lab-head">
      <h2>{t(orbit ? 'labOrbit' : 'labTitle')}</h2>
      {playback && <button className="lab-skip" onClick={() => send({ type: 'advanceLab', playback, skip: true })}>
        <FastForward size={16} aria-hidden />{t('labSkip')}
      </button>}
    </div>
    <canvas className="lab-art" ref={canvas} width={320} height={140} aria-hidden />
    <div className="lab-readout" role="status">
      <span>{title}</span>
      {readout && <strong>{readout}</strong>}
    </div>
    {segment && !orbit && <ol className="lab-timeline" aria-label={t('labTimeline')}>
      {timeline.map(item => <li key={item.id} className={item.watts > available ? 'over-limit' : undefined}
        aria-current={item.id === segment.id ? 'step' : undefined}>
        <span>{t(segments[item.id].title)}</span><small>{item.watts} W</small>
      </li>)}
    </ol>}
    {!orbit && <div className="lab-crew">
      {departments.map(team => <button key={team} type="button" aria-pressed={department === team}
        onClick={() => inspect(department === team ? null : team)}>
        <span className={active.includes(team) ? 'crew-light active' : 'crew-light'} aria-hidden />{t(team)}
      </button>)}
    </div>}
    {!orbit && department && <p className="lab-note" role="status">{teamNote(department)}</p>}
    {stage === 'review' && !playback && evidence?.design.schedule === 'stagger' &&
      <p className="lab-note">{t('labStaggerResult', {
        loss: cubeSat.schedules.stagger.batchLoss,
        batches: evidence.batches,
        deliveryLoss: forecast({ ...design, schedule: 'overlap' }).batches - evidence.batches,
      })}</p>}
  </section>
}
