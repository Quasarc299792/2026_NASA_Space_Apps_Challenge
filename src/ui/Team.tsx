import { useEffect, useState } from 'react'
import { Check, Radio, UsersRound } from 'lucide-react'
import { passes } from '../game/mission'
import { readLocal, writeLocal } from '../game/storage'
import type { Message, Translate } from '../i18n'
import { cubeSatMission } from '../missions'
import {
  cubeSat, departments, forecast, proposals, resolveTeamReview, reviewDesign, type Department, type MultiplayerRemedy,
} from '../missions/cubesat'
import { PowerReadout, RemedyPreview } from '../missions/cubesat-ui'
import { claimRole, confirmRoom, createRoom, openRoom, roomIdentity, RoomError, submitProposal, watchRoom } from '../multiplayer/client'
import { activeRoomKey } from '../multiplayer/config'
import { hasPlayerProposal, proposalFor, roleFor, roles, type Room } from '../multiplayer/model'
import { ActionButton, Back, CostLabel, DesignTags, Heading, Metric, ReportPanel } from './shared'

const current = forecast(reviewDesign)
const baseWeek = cubeSat.costs.assess.weeks + cubeSat.costs.freeze.weeks + cubeSat.costs.build.weeks + cubeSat.costs.integrate.weeks
const baseBudget = cubeSat.budget - cubeSat.payloads[reviewDesign.payload].cost - cubeSat.supplies[reviewDesign.supply].cost
  - cubeSat.costs.assess.credits - cubeSat.costs.freeze.credits - cubeSat.costs.build.credits - cubeSat.costs.integrate.credits

const departmentContext = {
  science: { batches: cubeSat.payloads[reviewDesign.payload].batches, minimum: cubeSat.minimumBatches, loss: cubeSat.schedules.stagger.batchLoss },
  power: { bus: cubeSat.busWatts, payload: current.payloadWatts, radio: cubeSat.downlinkWatts, peak: current.peak, available: current.available },
  comms: { capacity: current.contactCapacity, staggered: resolveTeamReview('stagger').evidence.batches },
}

const errors = {
  missing: 'roomErrorMissing', invalid: 'roomErrorInvalid', closed: 'roomErrorClosed', taken: 'roomErrorTaken',
  role: 'roomErrorRole', stale: 'roomErrorStale', waiting: 'roomErrorWaiting', network: 'roomErrorNetwork',
} as const satisfies Record<RoomError['reason'], Message>

function roleBrief(department: Department, t: Translate) {
  return t(proposals[department].brief, departmentContext[department])
}

function PlayerProposal({ department, room, t, disabled, onSubmit }: {
  department: Department; room: Room; t: Translate; disabled: boolean
  onSubmit: (remedy: MultiplayerRemedy) => void
}) {
  const previous = room.proposals[department]?.remedy
  const [draft, setDraft] = useState<MultiplayerRemedy | null>(null)
  const selected = draft ?? previous
  return <section className="panel proposal-panel">
    <h2>{t(department)}</h2>
    <p>{roleBrief(department, t)}</p>
    <fieldset className="options" disabled={disabled}>
      <legend>{t('teamProposal')}</legend>
      {proposals[department].options.map(remedy => <label className="option" key={remedy}>
        <input type="radio" name="player-proposal" checked={selected === remedy} onChange={() => setDraft(remedy)} />
        <span><strong>{t(cubeSat.costs[remedy].label)}</strong><RemedyPreview t={t} design={reviewDesign} remedy={remedy} />
          <CostLabel t={t} {...resolveTeamReview(remedy)} />
        </span>
      </label>)}
    </fieldset>
    <ActionButton disabled={disabled || !selected || previous === selected} onClick={() => selected && onSubmit(selected)}>
      {t(previous ? 'reviseProposal' : 'submitProposal')}
    </ActionButton>
  </section>
}

type Selection = { department: Department; remedy: MultiplayerRemedy }

function TeamProposals({ room, isPm, t, disabled, onConfirm }: {
  room: Room; isPm: boolean; t: Translate; disabled: boolean
  onConfirm: (selection: Selection) => void
}) {
  const [selection, select] = useState<Selection | null>(null)
  const fresh = selection && proposalFor(room, selection.department).remedy === selection.remedy
  const ready = hasPlayerProposal(room)
  return <section className="panel proposal-panel">
    <h2>{t('allProposals')}</h2>
    {isPm && <p>{t('pmBrief')}</p>}
    <div className="proposal-list">
      {departments.map(department => {
        const { remedy, automatic } = proposalFor(room, department)
        const label = automatic ? (room.roles[department] ? 'pendingProposal' : 'automatic') : 'playerProposal'
        const detail = <span className="proposal-detail">
          <span className="row"><strong>{t(department)}</strong><small>{t(label)}</small></span>
          <strong>{t(cubeSat.costs[remedy].label)}</strong>
          <RemedyPreview t={t} design={reviewDesign} remedy={remedy} />
          <CostLabel t={t} {...resolveTeamReview(remedy)} />
        </span>
        return isPm
          ? <label className="option" key={department}>
            <input type="radio" name="pm-proposal" checked={Boolean(fresh && selection.department === department)}
              disabled={disabled} onChange={() => select({ department, remedy })} />
            {detail}
          </label>
          : <div className="proposal-row" key={department}>{detail}</div>
      })}
    </div>
    {isPm
      ? <>
        {!ready && <p>{t('waitingProposal')}</p>}
        {selection && !fresh && <p className="notice" role="status">{t('roomErrorStale')}</p>}
        <ActionButton disabled={disabled || !ready || !fresh} onClick={() => selection && onConfirm(selection)}>
          {t('confirmTeam')}
        </ActionButton>
      </>
      : <p>{t('teamWaitingResult')}</p>}
  </section>
}

function RoomResult({ room, t }: { room: Room; t: Translate }) {
  const decision = room.decision
  if (!decision) return null
  const result = resolveTeamReview(decision.remedy)
  const pass = passes(result.evidence)
  return <>
    <section className="panel result-banner">
      {pass ? <Check size={24} aria-hidden /> : <Radio size={24} aria-hidden />}
      <div>
        <h2>{t(pass ? 'teamPass' : 'teamFail')}</h2>
        <p>{t('teamResult')} · {t(cubeSat.costs[decision.remedy].label)} · {t('teamSelectedBy', { role: t(decision.department) })}</p>
        <small>{t('teamCosts')} · <CostLabel t={t} {...result} /></small>
      </div>
    </section>
    <ReportPanel mission={cubeSatMission} t={t} evidence={{ ...result.evidence, week: baseWeek + result.weeks, revision: 1 }} />
  </>
}

function RolePicker({ room, t, disabled, onClaim }: {
  room: Room; t: Translate; disabled: boolean; onClaim: (department: Department) => void
}) {
  return <section className="panel proposal-panel">
    <h2>{t('chooseRole')}</h2>
    <p>{t('chooseRoleDetail')}</p>
    <div className="proposal-list">
      {departments.map(department => <button key={department} className="button secondary row"
        disabled={disabled || Boolean(room.roles[department])} onClick={() => onClaim(department)}>
        {t(department)} <small>{t(room.roles[department] ? 'roleTaken' : 'roleOpen')}</small>
      </button>)}
    </div>
  </section>
}

export default function Team({ t, back }: { t: Translate; back: () => void }) {
  const [code, setCode] = useState(() => readLocal(activeRoomKey) ?? '')
  const [input, setInput] = useState('')
  const [room, setRoom] = useState<Room | null>(null)
  const [uid, setUid] = useState('')
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState(false)
  const [error, setError] = useState<Message | null>(null)

  useEffect(() => {
    if (!code) return
    let active = true
    let stop: (() => void) | undefined
    function failed(err: unknown) {
      if (!active) return
      setError(err instanceof RoomError ? errors[err.reason] : errors.network)
      setRoom(null)
      setOnline(false)
      setCode('')
      writeLocal(activeRoomKey, null)
    }
    roomIdentity().then(id => {
      if (!active) return
      setUid(id)
      stop = watchRoom(code, (data, fromCache) => {
        if (!fromCache && data.decision && !roleFor(data, id)) {
          failed(new RoomError('closed'))
          return
        }
        setOnline(!fromCache)
        setRoom(data)
      }, failed)
    }).catch(failed)
    return () => { active = false; stop?.() }
  }, [code])

  async function perform(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try { await action() }
    catch (err) { setError(err instanceof RoomError ? errors[err.reason] : errors.network) }
    finally { setBusy(false) }
  }

  function goToRoom(roomCode: string) {
    writeLocal(activeRoomKey, roomCode)
    setCode(roomCode)
  }

  function leave() {
    writeLocal(activeRoomKey, null)
    back()
  }

  const role = room && roleFor(room, uid)
  const result = room?.decision && resolveTeamReview(room.decision.remedy)
  const disabled = busy || !online

  return <>
    <Back t={t} onClick={leave} />
    <Heading eyebrow={t('multiplayer')} title={t('roomTitle')}>{t('roomIntro')}</Heading>
    {error && <p role="alert" className="notice">{t(error)}</p>}
    {!code && <div className="board">
      <section className="panel team-form">
        <ActionButton disabled={busy} onClick={() => void perform(async () => goToRoom(await createRoom()))}>
          {t('createRoom')}
        </ActionButton>
        <form onSubmit={event => {
          event.preventDefault()
          const normalized = input.trim().toUpperCase()
          void perform(async () => { await openRoom(normalized); goToRoom(normalized) })
        }}>
          <label htmlFor="room-code">{t('roomCode')}</label>
          <div className="action-row">
            <input id="room-code" value={input} autoCapitalize="characters" spellCheck={false}
              onChange={event => setInput(event.target.value.toUpperCase())} required maxLength={8} />
            <button className="button secondary" disabled={busy}>{t('joinRoom')}</button>
          </div>
        </form>
      </section>
      <section className="panel"><h2>{t('teamSize')}</h2><p>{roles.map(item => t(item)).join(' · ')}</p></section>
    </div>}
    {code && !room && <p role="status">{t('roomConnecting')}</p>}
    {room && <>
      {!online && <p role="status" className="notice">{t('roomOffline')}</p>}
      <div className="metrics">
        <Metric label={t('roomCode')} value={code} detail={t('roomCodeDetail')} />
        <Metric label={t('time')} value={t('weeks', { count: cubeSat.deadline - baseWeek - (result ? result.weeks : 0) })}
          detail={t('round', { count: room.roundId.split('-').at(-1) ?? '' })} />
        <Metric label={t('budget')} value={t('credits', { count: baseBudget - (result ? result.credits : 0) })} />
      </div>
      <div className="board">
        <div className="stack">
          {room.decision ? <RoomResult room={room} t={t} /> : <>
            {!role && <RolePicker room={room} t={t} disabled={disabled}
              onClaim={department => void perform(() => claimRole(code, department))} />}
            {role && role !== 'pm' && <PlayerProposal key={role} department={role} room={room} t={t} disabled={disabled}
              onSubmit={remedy => void perform(() => submitProposal(code, role, room.roundId, remedy))} />}
            {role && <TeamProposals room={room} isPm={role === 'pm'} t={t} disabled={disabled}
              onConfirm={({ department, remedy }) => void perform(() => confirmRoom(code, department, room.roundId, remedy))} />}
          </>}
        </div>
        <aside className="stack">
          <section className="panel">
            <h2>{t('teamCurrent')}</h2>
            <DesignTags mission={cubeSatMission} t={t} design={reviewDesign} />
            <PowerReadout t={t} estimate={current} />
          </section>
          <section className="panel">
            <h2 className="icon-title"><UsersRound size={18} aria-hidden />{t('teamSize')}</h2>
            <ul className="role-list">
              {roles.map(item => <li key={item}><span>{t(item)}</span><small>{t(room.roles[item] ? 'roleTaken' : 'roleOpen')}</small></li>)}
            </ul>
          </section>
        </aside>
      </div>
    </>}
  </>
}
