import { lazy, StrictMode, Suspense, useEffect, useMemo, useReducer, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowRight, Clock3, Globe2, LockKeyhole, Moon, Orbit, Radio, Rocket, Satellite, UsersRound } from 'lucide-react'
import '@fontsource-variable/inter'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource/ibm-plex-mono/400.css'
import './style.css'
import earth from './assets/blue-marble.jpg'
import { type Action, type Game, newGame, runMission } from './game/mission'
import { readGame, readLocal, writeGame, writeLocal } from './game/storage'
import { languageKey, preferredLanguage, translator, type Language, type Translate } from './i18n'
import { cubeSat, nextMissions } from './missions/cubesat'
import { Brief, Single } from './ui/Single'
import { ActionButton } from './ui/shared'
import { activeRoomKey, multiplayerAvailable } from './multiplayer/config'

const Team = lazy(() => import('./ui/Team'))

type Screen = 'lobby' | 'brief' | 'single' | 'team'
type SessionAction = Action | { type: 'new' }

function session(game: Game | null, action: SessionAction) {
  return action.type === 'new' ? newGame() : game && runMission(game, action)
}

function Lobby({ t, saved, open, resume, team }: { t: Translate; saved: boolean; open: () => void; resume: () => void; team: () => void }) {
  return <>
    <section className="hero">
      <div className="earth-art" aria-hidden>
        <div className="orbit orbit-outer" /><div className="orbit orbit-inner" />
        <img src={earth} alt="" fetchPriority="high" />
        <Satellite className="hero-satellite" size={44} strokeWidth={1.15} />
      </div>
      <div className="hero-copy">
        <span className="eyebrow"><i className="signal" /> {t('challenge')}</span>
        <h1>{t('heroTitle')}</h1>
        <p>{t('heroDetail')}</p>
        <div className="action-row">
          <ActionButton onClick={saved ? resume : open}>{t(saved ? 'continue' : 'briefAction')}</ActionButton>
          {saved && <button className="button secondary" onClick={open}>{t('newMission')}</button>}
        </div>
      </div>
      <a className="art-credit" href="https://science.nasa.gov/resource/blue-marble-2002/" target="_blank" rel="noreferrer">{t('artCredit')}</a>
    </section>
    <section className="mission-list" aria-labelledby="mission-selection">
      <div className="row list-heading"><h2 id="mission-selection">{t('missionSelect')}</h2><small>{t('reputation')} · {t('planned')}</small></div>
      <div className="mission-cards">
        <button className="mission-card available" onClick={open}>
          <Satellite size={23} aria-hidden /><span><strong>{t('cubesat')}</strong>
            <small><Clock3 size={13} aria-hidden /> {t('duration', { minutes: cubeSat.playMinutes })} · {t('single')}</small>
          </span><ArrowRight size={18} aria-hidden />
        </button>
        {nextMissions.map(({ id, title }) => {
          const Icon = id === 'orbital-launch' ? Rocket : Moon
          return <div className="mission-card planned" key={id}>
            <Icon size={23} aria-hidden /><span><strong>{t(title)}</strong><small>{t('planned')}</small></span><LockKeyhole size={15} aria-hidden />
          </div>
        })}
      </div>
    </section>
    <section className="panel team-entry">
      <div className="tile-icon"><UsersRound size={21} aria-hidden /></div>
      <div><h2>{t('multiplayer')}</h2><p>{t('teamLobbyDetail')} · {t('teamSize')}</p></div>
      {multiplayerAvailable ? <button className="button secondary" onClick={team}>{t('multiplayer')} <ArrowRight size={17} aria-hidden /></button>
        : <small>{t('roomDisabled')}</small>}
    </section>
  </>
}

function App() {
  const [language, setLanguage] = useState<Language>(preferredLanguage)
  const [screen, setScreen] = useState<Screen>(() => multiplayerAvailable && readLocal(activeRoomKey) ? 'team' : 'lobby')
  const [game, dispatch] = useReducer(session, null, readGame)
  const [saved, setSaved] = useState(true)
  const t = useMemo(() => translator(language), [language])

  useEffect(() => {
    document.documentElement.lang = language
    document.title = t('app')
    writeLocal(languageKey, language)
  }, [language, t])

  useEffect(() => {
    if (game) setSaved(writeGame(game))
  }, [game])

  useEffect(() => { window.scrollTo(0, 0) }, [screen, game?.stage, game?.returned])

  function begin() {
    dispatch({ type: 'new' })
    setScreen('single')
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
          <Globe2 size={16} aria-hidden />
          <button aria-pressed={language === 'en'} lang="en" onClick={() => setLanguage('en')}>EN</button>
          <button aria-pressed={language === 'zh-TW'} lang="zh-TW" onClick={() => setLanguage('zh-TW')}>繁中</button>
        </div>
      </div>
    </header>
    <main className="shell">
      {!saved && <p className="notice" role="status">{t('saveFailed')}</p>}
      {screen === 'lobby' && <Lobby t={t} saved={Boolean(game)} open={() => setScreen('brief')} resume={() => setScreen('single')} team={() => setScreen('team')} />}
      {screen === 'brief' && <Brief t={t} saved={Boolean(game)} back={back} begin={begin} />}
      {screen === 'single' && game && <Single game={game} send={dispatch} back={back} restart={begin} t={t} />}
      {screen === 'team' && <Suspense fallback={<p role="status">{t('roomConnecting')}</p>}><Team t={t} back={back} /></Suspense>}
      <footer><Radio size={15} aria-hidden /> {t('challenge')}</footer>
    </main>
  </>
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
