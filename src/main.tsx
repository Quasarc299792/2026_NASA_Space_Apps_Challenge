import { lazy, StrictMode, Suspense, useEffect, useMemo, useReducer, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowRight, Orbit } from 'lucide-react'
import '@fontsource-variable/inter'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource/ibm-plex-mono/400.css'
import './style.css'
import spacecraft from './assets/cubesat-pixel.png'
import { type Action, type Game, newGame, runMission } from './game/mission'
import { readGame, readLocal, writeGame, writeLocal } from './game/storage'
import { languageKey, preferredLanguage, translator, type Language, type Translate } from './i18n'
import { cubeSat, nextMissions } from './missions/cubesat'
import { Brief, Single } from './ui/Single'
import { ActionButton, Disclosure } from './ui/shared'
import { activeRoomKey, multiplayerAvailable } from './multiplayer/config'

const Team = lazy(() => import('./ui/Team'))

type Screen = 'lobby' | 'brief' | 'single' | 'team'
type SessionAction = Action | { type: 'new' }

function session(game: Game | null, action: SessionAction) {
  return action.type === 'new' ? newGame() : game && runMission(game, action)
}

function Lobby({ t, game, open, resume, team }: { t: Translate; game: Game | null; open: () => void; resume: () => void; team: () => void }) {
  const finished = game?.stage === 'results' && !game.playback
  const inProgress = game !== null && !finished
  return <>
    <section className="lobby">
      <div className="lobby-copy">
        <p className="eyebrow">{t('challenge')}</p>
        <h1>{t('heroTitle')}</h1>
        <p className="lobby-intro">{t('heroDetail')}</p>
        <p className="lobby-duration">{t('duration', { minutes: cubeSat.playMinutes })} · {t('single')}</p>
        <div className="action-row">
          <ActionButton onClick={inProgress ? resume : open}>{t(inProgress ? 'continue' : finished ? 'newMission' : 'briefAction')}</ActionButton>
          {inProgress && <button className="text-button" onClick={open}>{t('newMission')}</button>}
          {finished && <button className="text-button" onClick={resume}>{t('previousResults')}</button>}
        </div>
      </div>
      <figure className="lobby-art">
        <img src={spacecraft} alt={t('lobbyArtAlt')} width={128} height={80} fetchPriority="high" />
        <figcaption>{t('lobbyArtCaption')}</figcaption>
      </figure>
    </section>
    <div className="lobby-links">
      {multiplayerAvailable ? <button className="lobby-team" onClick={team}>
        <span>{t('multiplayer')}</span><small>{t('teamSize')}</small><ArrowRight size={17} aria-hidden />
      </button> : <Disclosure label={t('multiplayer')} value={t('teamSize')}><p>{t('roomDisabled')}</p></Disclosure>}
      <Disclosure label={t('availableMissions')}>
        <dl className="fact-list">
          {nextMissions.map(({ id, title }) => <div key={id}><dt>{t(title)}</dt><dd>{t('planned')}</dd></div>)}
          <div><dt>{t('reputation')}</dt><dd>{t('planned')}</dd></div>
        </dl>
      </Disclosure>
    </div>
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
          <button aria-pressed={language === 'en'} lang="en" onClick={() => setLanguage('en')}>EN</button>
          <button aria-pressed={language === 'zh-TW'} lang="zh-TW" onClick={() => setLanguage('zh-TW')}>繁中</button>
        </div>
      </div>
    </header>
    <main className="shell">
      {!saved && <p className="notice" role="status">{t('saveFailed')}</p>}
      {screen === 'lobby' && <Lobby t={t} game={game} open={() => setScreen('brief')} resume={() => setScreen('single')} team={() => setScreen('team')} />}
      {screen === 'brief' && <Brief t={t} saved={Boolean(game)} back={back} begin={begin} />}
      {screen === 'single' && game && <Single game={game} send={dispatch} back={back} t={t} />}
      {screen === 'team' && <Suspense fallback={<p role="status">{t('roomConnecting')}</p>}><Team t={t} back={back} /></Suspense>}
    </main>
  </>
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
