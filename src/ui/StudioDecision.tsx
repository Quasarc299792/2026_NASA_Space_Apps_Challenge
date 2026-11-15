import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import type { Translate } from '../i18n'
import { ActionButton } from './shared'
import { arrivalTime, motionQuery, type Illustration } from './StudioScene'

export function StudioDecision({ title, label, t, languageControls, children, incoming = false, secondary = false, paused = false, onSkip }: {
  title: string; label: string; t: Translate; languageControls?: ReactNode; children: ReactNode;
  incoming?: boolean; secondary?: boolean; paused?: boolean; onSkip?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [handled, setHandled] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const headingId = useId()
  const dialogId = useId()

  useEffect(() => {
    if (!incoming || handled || paused) return
    const motion = window.matchMedia(motionQuery)
    const report = () => {
      if (document.querySelector('dialog[open]')) return
      setOpen(true)
      setHandled(true)
    }
    if (motion.matches) report()
    else {
      const timer = window.setTimeout(report, arrivalTime)
      return () => window.clearTimeout(timer)
    }
  }, [incoming, handled, paused])

  useEffect(() => {
    const node = dialog.current
    if (open && node && !node.open) {
      node.showModal()
      heading.current?.focus()
    }
  }, [open])

  function show() {
    setHandled(true)
    setOpen(true)
    if (incoming) onSkip?.()
  }

  function dismiss() {
    dialog.current?.close()
    setOpen(false)
    trigger.current?.focus({ preventScroll: true })
  }

  return <>
    <ActionButton ref={trigger} className={secondary ? 'button secondary' : 'button primary'} aria-haspopup="dialog"
      aria-controls={open ? dialogId : undefined} onClick={show}>{label}</ActionButton>
    {open && <dialog id={dialogId} className="studio-dialog" aria-labelledby={headingId} ref={dialog}
      onCancel={event => { event.preventDefault(); dismiss() }}>
      <header className="studio-dialog-header">
        <h2 ref={heading} tabIndex={-1} id={headingId}>{title}</h2>
        <div className="studio-dialog-tools">{languageControls}
          <button type="button" className="studio-close" aria-label={t('studioClose')} onClick={dismiss}><X size={20} aria-hidden /></button>
        </div>
      </header>
      <div className="studio-dialog-body">{children}</div>
      <footer className="studio-dialog-footer"><button type="button" className="text-button" onClick={dismiss}>{t('studioDone')}</button></footer>
    </dialog>}
  </>
}

const configurationArt: Record<string, Record<string, Illustration>> = {
  launch: { iss: { prop: 'camera', extra: 'orbit' }, rideshare: { prop: 'rocket', extra: 'polar' } },
  capability: { baseline: 'camera', pointing: { prop: 'camera', extra: 'route' }, sensor: 'twoCameras',
    combined: { prop: 'twoCameras', extra: 'route' } },
  orbit: { low: 'orbit', sso: 'polar' },
  stage: { standard: 'rocket', highMargin: 'upperStage' },
  telemetry: { basic: 'signal', diagnostics: { prop: 'signal', extra: 'archive' } },
  adapter: { standard: 'scale', lightweight: 'adapter' },
  ground: { single: 'signal', dual: 'dual' },
  payload: { basic: 'camera', advanced: 'twoCameras' },
  sensor: { single: { prop: 'lander', extra: 'camera' }, redundant: { prop: 'lander', extra: 'twoCameras' } },
  power: { dayOnly: 'sun', extended: { prop: 'moon', extra: 'battery' } },
  route: { direct: { prop: 'lander', extra: 'fuel' }, lowEnergy: { prop: 'route', extra: 'clock' } },
  mount: { standard: 'scale', lightweight: 'adapter' },
}

export function designIllustration(group: string, option: string): Illustration {
  return configurationArt[group]?.[option] ?? 'data'
}

const choiceArt: Record<string, Illustration> = {
  accept: { prop: 'contract', extra: 'wrench' }, decline: 'box',
  funding: { prop: 'contract', extra: 'clock' }, tech: { prop: 'wrench', extra: 'contract' },
  preserveLift: 'upperStage', preserveData: { prop: 'signal', extra: 'archive' }, baseline: 'rocket', acknowledge: 'data',
  confirmFirst: { prop: 'signal', extra: 'data' }, diagnosticsFirst: { prop: 'archive', extra: 'signal' },
  priority: { prop: 'science', extra: 'signal' }, extra: { prop: 'twoCameras', extra: 'data' }, diagnostics: 'archive',
  hosted: { prop: 'science', extra: 'contract' },
  wake: { prop: 'moon', extra: 'battery' }, rest: 'moon', Check: 'scale', Wait: 'clock', Rush: 'rocket',
  Rollback: 'wrench', Slip: { prop: 'rocket', extra: 'clock' }, Switch: { prop: 'route', extra: 'wrench' },
  On: 'science', Off: 'box', Battery: 'battery', Exposed: { prop: 'science', extra: 'moon' },
  Uplink: 'signal', Emergency: { prop: 'fuel', extra: 'signal' }, Continue: 'route',
  Simulate: { prop: 'fuel', extra: 'data' }, Reverse: 'orbit', Flyby: 'polar',
  Patch: 'wrench', LowRate: { prop: 'signal', extra: 'clock' }, Restart: { prop: 'science', extra: 'wrench' },
  Engineering: 'archive', Abort: 'route', Share: 'data', Decline: 'box',
  Accept: 'contract', Refuse: 'clock', Negotiate: { prop: 'contract', extra: 'clock' }, Grant: 'wrench',
  Light: 'adapter', Inspect: 'scale', Skip: 'clock', Room: 'signal', Mount: 'camera', UseSlot: 'wrench', Note: 'data',
  Alone: 'box', Funding: 'contract', Government: { prop: 'contract', extra: 'science' }, Stop: 'box', Keep: 'clock',
  Review: 'data', Separate: 'wrench', Fly: 'lander', Follow: 'rocket',
}

export function choiceIllustration(id: string, commission?: 'bay' | 'river'): Illustration {
  if (id === 'north' || id === 'south') return { prop: commission ?? 'river', extra: 'data', side: id }
  return choiceArt[id] ?? 'data'
}

const taskArt: Record<string, Illustration> = {
  assess: 'map', screen: 'scale', freeze: 'data', build: 'wrench', buildStage: 'upperStage', buildAvionics: 'data',
  buildFlight: 'lander', buildPayload: 'camera', buildGround: 'signal',
  integrate: 'scale', retest: { prop: 'scale', extra: 'wrench' }, hotfire: 'rocket', engineTest: 'upperStage',
  trade: 'scale', linkAnalysis: 'signal', stationTest: 'dual', rehearse: { prop: 'signal', extra: 'clock' },
  retarget: 'orbit', adapter: 'adapter', dropDiagnostics: 'box', dualStation: 'dual', fixLink: 'repair',
  reroute: 'route', mount: 'adapter', partnerMount: { prop: 'adapter', extra: 'contract' }, dropKit: 'battery',
  addLidar: 'twoCameras', basicPayload: 'camera', contract: 'contract', handover: 'signal', wait: 'clock',
}

export function taskIllustration(id: string): Illustration {
  if (id.startsWith('lab:') || id.startsWith('support:')) return { prop: 'wrench', extra: 'contract' }
  if (id.startsWith('contract:')) return choiceIllustration(id.split(':')[1])
  return taskArt[id] ?? 'wrench'
}
