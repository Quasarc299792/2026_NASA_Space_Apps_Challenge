import { lazy, StrictMode, Suspense, useEffect, useMemo, useReducer, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowRight, Orbit } from 'lucide-react'
import '@fontsource-variable/inter'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource/ibm-plex-mono/400.css'
import './style.css'
import spacecraft from './assets/cubesat-pixel.png'
import { type Action, type Game, type ScienceGoal, newGame, runMission } from './game/mission'
import { readGame, readLocal, writeGame, writeLocal } from './game/storage'
import { languageKey, preferredLanguage, translator, type Language, type Translate } from './i18n'
import { carriedRecords, completeMission, isUnlocked, readProgress, reputation, writeProgress, type Progress } from './game/progress'
import { commissionMission, missionCatalog, missions } from './missions'
import { lunarDiagnosticRecords } from './missions/lunar-rules'
import type { CommissionId } from './missions/cubesat-commission'
import { Brief, Single } from './ui/Single'
import { Portfolio } from './ui/Story'
import { ActionButton, Disclosure } from './ui/shared'
import { activeRoomKey, multiplayerAvailable } from './multiplayer/config'

const Team = lazy(() => import('./ui/Team'))

type Screen = 'lobby' | 'brief' | 'single' | 'team'
type SessionAction = Action | { type: 'new'; missionId: string; records: string[]; seed: number; scienceGoal?: ScienceGoal; commission?: CommissionId }

function session(game: Game | null, action: SessionAction) {
  if (action.type !== 'new') return game && runMission(game, action)
  const next = newGame(action.missionId, action.records, action.seed, action.commission)
  return action.scienceGoal ? { ...next, scienceGoal: action.scienceGoal } : next
}

// Every run gets a seed. Add ?seed=123 to the address to replay a particular run.
function runSeed() {
  const requested = new URLSearchParams(window.location.search).get('seed')
  if (requested && /^\d{1,9}$/.test(requested)) return Number(requested)
  return crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
}

const difficulty = ['difficultyEasy', 'difficultyMedium', 'difficultyHard'] as const
const heroDetails = { cubesat: 'heroDetail', 'orbital-launch': 'heroOrbitalDetail', 'lunar-mission': 'heroLunarDetail' } as const

// The mission the lobby points at: the first unlocked one whose minimum goals are not met yet, or the last one.
function recommendedMission(progress: Progress) {
  return missionCatalog.find(item => missions[item.id] && isUnlocked(progress, item.id) && !progress.missions[item.id]?.minimum)
    ?? missionCatalog.at(-1)!
}

function Lobby({ t, game, progress, open, resume, team }: {
  t: Translate; game: Game | null; progress: Progress; open: (missionId: string) => void; resume: () => void; team: () => void
}) {
  const finished = game?.stage === 'results' && !game.playback
  const inProgress = game !== null && !finished
  const featured = inProgress ? { id: game.missionId, title: missions[game.missionId].title } : recommendedMission(progress)
  const first = !inProgress && featured.id === missionCatalog[0].id && !progress.missions[featured.id]
  return <>
    <section className="lobby">
      <div className="lobby-copy">
        <p className="eyebrow">{t('challenge')}</p>
        <h1>{first ? t('heroTitle') : t(inProgress ? 'heroContinue' : 'heroNext', { mission: t(featured.title) })}</h1>
        <p className="lobby-intro">{t(heroDetails[featured.id as keyof typeof heroDetails] ?? 'heroDetail')}</p>
        <p className="lobby-duration">{t('duration', { minutes: missions[featured.id].playMinutes })} · {t('single')}</p>
        <div className="action-row">
          <ActionButton onClick={inProgress ? resume : () => open(featured.id)}>{t(inProgress ? 'continue' : 'briefAction')}</ActionButton>
          {finished && <button className="text-button" onClick={resume}>{t('previousResults')}</button>}
        </div>
      </div>
      <figure className="lobby-art">
        <img src={spacecraft} alt={t('lobbyArtAlt')} width={128} height={80} fetchPriority="high" />
        <figcaption>{t('lobbyArtCaption')}</figcaption>
      </figure>
    </section>
    <section className="mission-cards" aria-labelledby="mission-list">
      <div className="mission-cards-head">
        <h2 id="mission-list">{t('missionList')}</h2>
        <p>{t('reputation')} · {reputation(progress)} <small>{t('reputationDetail')}</small></p>
      </div>
      <ol>
        {missionCatalog.map(({ id, title }, index) => {
          const record = progress.missions[id]
          const unlocked = Boolean(missions[id]) && isUnlocked(progress, id)
          return <li key={id} data-mission={id} className={unlocked ? 'mission-card' : 'mission-card locked'}>
            <span className="eyebrow">{t('missionNumber', { count: index + 1 })} · {t(difficulty[index] ?? 'difficultyHard')}</span>
            <strong>{t(title)}</strong>
            <small>{t('duration', { minutes: missions[id]?.playMinutes ?? '?' })}</small>
            <small className={record?.minimum ? 'good' : undefined}>{!missions[id] ? t('planned')
              : record?.stretch ? t('missionStretchDone') : record?.minimum ? t('missionMinimumDone')
              : unlocked ? t('missionOpen') : t('unlockAfter', { mission: t(missionCatalog[index - 1].title) })}</small>
            {unlocked && <button className="button secondary" onClick={() => open(id)}>{t('openMission')}</button>}
          </li>
        })}
      </ol>
    </section>
    <Portfolio progress={progress} t={t} />
    <div className="lobby-links">
      {multiplayerAvailable ? <button className="lobby-team" onClick={team}>
        <span>{t('multiplayer')}</span><small>{t('teamSize')}</small><ArrowRight size={17} aria-hidden />
      </button> : <Disclosure label={t('multiplayer')} value={t('teamSize')}><p>{t('roomDisabled')}</p></Disclosure>}
    </div>
  </>
}

function App() {
  const [language, setLanguage] = useState<Language>(preferredLanguage)
  const [screen, setScreen] = useState<Screen>(() => multiplayerAvailable && readLocal(activeRoomKey) ? 'team' : 'lobby')
  const [game, dispatch] = useReducer(session, null, readGame)
  const [progress, setProgress] = useState(readProgress)
  const [selected, setSelected] = useState(missionCatalog[0].id)
  const [saved, setSaved] = useState(true)
  const t = useMemo(() => translator(language), [language])

  useEffect(() => {
    document.documentElement.lang = language
    document.title = t('app')
    writeLocal(languageKey, language)
  }, [language, t])

  useEffect(() => {
    if (!game) return
    setSaved(writeGame(game))
    if (!game.playback) setProgress(current => completeMission(current, game))
  }, [game])

  useEffect(() => { writeProgress(progress) }, [progress])

  useEffect(() => { window.scrollTo(0, 0) }, [screen, game?.stage, game?.returned, game?.event, game?.flightProgress?.turn])

  function open(missionId: string) {
    setSelected(missionId)
    setScreen('brief')
  }

  function begin(commission?: CommissionId) {
    dispatch({ type: 'new', missionId: selected, records: carriedRecords(progress), seed: runSeed(), commission })
    setScreen('single')
  }

  function replay(sameSeed: boolean, goal?: ScienceGoal) {
    if (!game) return
    dispatch({ type: 'new', missionId: game.missionId, records: game.missionId === 'lunar-mission' && sameSeed
      ? [...new Set([...game.records, ...lunarDiagnosticRecords(game)])] : game.records, scienceGoal: goal ?? game.scienceGoal, commission: game.commission,
      seed: sameSeed ? game.seed : crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000 })
    window.scrollTo(0, 0)
  }

  function back() {
    if (screen === 'team') writeLocal(activeRoomKey, null)
    setScreen('lobby')
  }

  return <>
    <header className="topbar">
      <div className="topbar-inner">
        <button className="brand" onClick={back} aria-label={t('lobby')}><Orbit size={25} aria-hidden /><span>{t('app')}</span></button>
        <div className="language">
          <button aria-pressed={language === 'en'} lang="en" onClick={() => setLanguage('en')}>EN</button>
          <button aria-pressed={language === 'zh-TW'} lang="zh-TW" onClick={() => setLanguage('zh-TW')}>繁中</button>
        </div>
      </div>
    </header>
    <main className="shell">
      {!saved && <p className="notice" role="status">{t('saveFailed')}</p>}
      {screen === 'lobby' && <Lobby t={t} game={game} progress={progress} open={open} resume={() => setScreen('single')} team={() => setScreen('team')} />}
      {screen === 'brief' && <Brief key={selected} mission={selected === commissionMission.id ? commissionMission : missions[selected]} t={t} saved={Boolean(game)} back={back} begin={begin} />}
      {screen === 'single' && game && <Single game={game} mission={game.commission ? commissionMission : missions[game.missionId]} progress={progress} send={dispatch} back={back} replay={replay} open={open} t={t} />}
      {screen === 'team' && <Suspense fallback={<p role="status">{t('roomConnecting')}</p>}><Team t={t} back={back} /></Suspense>}
    </main>
  </>
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
