import { useEffect, useId, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { studioLaunchDuration, type StudioAction } from '../game/studio-session'
import type { Stage } from '../game/types'
import type { Message, Translate } from '../i18n'
import { ActionButton } from './shared'
import { StudioAnimationButton, StudioScene } from './StudioScene'

const tutorialText: Partial<Record<Stage, Message>> = {
  feasibility: 'studioTutorialFeasibility', design: 'studioTutorialDesign', build: 'studioTutorialBuild',
  integration: 'studioTutorialTest', review: 'studioTutorialReview',
}

export function TutorialTarget({ stage, teach, complete, t, children }: {
  stage: Stage; teach: boolean; complete?: () => void; t: Translate; children: ReactNode
}) {
  const text = teach && tutorialText[stage]
  const target = useRef<HTMLDivElement>(null)
  const id = useId()
  useLayoutEffect(() => {
    if (!text) return
    const button = target.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')
    button?.setAttribute('aria-describedby', id)
    button?.focus({ preventScroll: true })
    return () => button?.removeAttribute('aria-describedby')
  }, [id, text])

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (text && event.target instanceof Element && event.target.closest('button') === target.current?.querySelector('button:not(:disabled)')) complete?.()
  }

  return <div className={text ? 'studio-tutorial-target' : 'studio-next'} ref={target} onClickCapture={onClick}>
    {text && <p id={id}>{t(text)}</p>}
    {children}
  </div>
}

export function StudioLaunch({ startedAt, t, paused, toggle, send }: {
  startedAt: number; t: Translate; paused: boolean; toggle: () => void; send: (action: StudioAction) => void
}) {
  const [elapsed, setElapsed] = useState(() => Date.now() - startedAt)
  const finish = () => send({ type: 'finishStudioLaunch', startedAt })
  useEffect(() => {
    const end = startedAt + studioLaunchDuration
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt), 100)
    const complete = window.setTimeout(() => send({ type: 'finishStudioLaunch', startedAt }), Math.max(0, end - Date.now()))
    return () => { window.clearInterval(timer); window.clearTimeout(complete) }
  }, [send, startedAt])
  const phase = elapsed < 3000 ? 'countdown' : elapsed < 3800 ? 'ignition' : 'liftoff'
  const label = phase === 'countdown' ? t('studioCountdown', { count: Math.min(3, Math.ceil((3000 - elapsed) / 1000)) })
    : t(phase === 'ignition' ? 'studioIgnition' : 'studioLiftoff')

  return <div className="studio-workspace" data-launch-phase={phase}>
    <StudioScene missionId="cubesat" t={t} launch={phase} paused={paused} animationControl={
      <StudioAnimationButton t={t} paused={paused} toggle={toggle} />
    } />
    <section className="studio-handoff" aria-label={t('studioLaunchPad')}>
      <h2 role="status">{label}</h2>
      <ActionButton className="button secondary" onClick={finish}>{t('studioSkipLaunch')}</ActionButton>
    </section>
  </div>
}
