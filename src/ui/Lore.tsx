import type { Message, Translate } from '../i18n'
import { Disclosure } from './shared'

type Fact = { text: Message; source: string; url: string }
type Line = readonly [speaker: 'Alex' | 'Elena' | 'screen' | 'narrator', text: Message]

const bsf = (chapter: string) => `https://science.nasa.gov/learn/basics-of-space-flight/${chapter}/`
const cubeSat101 = (page: number) => `https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=${page}`
const issFacts = 'https://www.nasa.gov/international-space-station/space-station-facts-and-figures/'

const prologue: Line[] = [
  ['screen', 'loreP01Screen'],
  ['Alex', 'loreP01Alex1'], ['Elena', 'loreP01Elena1'], ['screen', 'loreP01Warning'],
  ['Elena', 'loreP01Elena2'], ['Alex', 'loreP01Alex2'], ['Elena', 'loreP01Elena3'], ['narrator', 'loreP01Sign'],
  ['screen', 'loreP02Liftoff'], ['Elena', 'loreP02Elena1'], ['screen', 'loreP02Warning'], ['Elena', 'loreP02Elena2'],
  ['Alex', 'loreP02Alex'], ['screen', 'loreP02Lost'],
  ['narrator', 'loreP03Narrator1'], ['narrator', 'loreP03Narrator2'], ['screen', 'loreP03Later'],
]

const prologueFacts: Fact[] = [
  { text: 'loreFactChallenger', source: 'Rogers Commission Report, Ch. V', url: 'https://history.nasa.gov/rogersrep/v1ch5.htm' },
  { text: 'loreFactPolarLander', source: 'NASA NSSDCA: Mars Polar Lander', url: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1999-001A' },
]

const flow: { stage: Message; fact: Fact }[] = [
  { stage: 'loreFlowPreA', fact: { text: 'loreFactSelection', source: 'Basics of Space Flight, Ch. 7', url: bsf('chapter7-1') } },
  { stage: 'loreFlowA', fact: { text: 'loreFactGravityAssist', source: 'Basics of Space Flight, Ch. 7', url: bsf('chapter7-2') } },
  { stage: 'loreFlowB', fact: { text: 'loreFactLateChange', source: 'Basics of Space Flight, Ch. 7', url: bsf('chapter7-2') } },
  { stage: 'loreFlowCD', fact: { text: 'loreFactThermalVacuum', source: 'Basics of Space Flight, Ch. 7', url: bsf('chapter7-2') } },
  { stage: 'loreFlowE', fact: { text: 'loreFactDataOverwrite', source: 'Basics of Space Flight, Ch. 7', url: bsf('chapter7-2') } },
  { stage: 'loreFlowEnd', fact: { text: 'loreFactVoyager', source: 'Basics of Space Flight, Ch. 17', url: bsf('chapter17-1') } },
]

const chapters: Record<string, { card: Message[]; facts: Fact[]; recap: Message[] }> = {
  cubesat: {
    card: ['loreCard1Goal', 'loreCard1Choose', 'loreCard1Trade', 'loreCard1Lose'],
    facts: [
      { text: 'loreFactCubeSat', source: 'NASA CubeSat 101, p. 12', url: cubeSat101(12) },
      { text: 'loreFactCsli', source: 'NASA CubeSat Launch Initiative', url: 'https://www.nasa.gov/kennedy/launch-services-program/cubesat-launch-initiative/' },
      { text: 'loreFactOrbitFall', source: 'NASA Space Station Facts and Figures', url: issFacts },
      { text: 'loreFactLandsat', source: 'NASA Landsat', url: 'https://landsat.gsfc.nasa.gov/about/' },
      { text: 'loreFactInverseSquare', source: 'Basics of Space Flight, Ch. 6', url: bsf('chapter6-1') },
      { text: 'loreFactGroundStation', source: 'NASA CubeSat 101, p. 30', url: cubeSat101(30) },
      { text: 'loreFactBreakOnGround', source: 'NASA CubeSat 101, p. 24', url: cubeSat101(24) },
      { text: 'loreFactTestAsYouFly', source: 'NASA Systems Engineering Handbook §5.3', url: 'https://www.nasa.gov/reference/5-3-product-verification/' },
    ],
    recap: ['loreRecap1a', 'loreRecap1b', 'loreRecap1c', 'loreRecap1d'],
  },
  'orbital-launch': {
    card: ['loreCard2Goal', 'loreCard2Choose', 'loreCard2Trade', 'loreCard2Event', 'loreCard2Lose'],
    facts: [
      { text: 'loreFactEquator', source: 'Basics of Space Flight, Ch. 14', url: bsf('chapter14-1') },
      { text: 'loreFactLaunchWindow', source: 'Basics of Space Flight, Ch. 14', url: bsf('chapter14-1') },
      { text: 'loreFactStages', source: 'Basics of Space Flight, Ch. 14', url: bsf('chapter14-1') },
      { text: 'loreFactHubble', source: 'NASA Science: Hubble’s Mirror Flaw', url: 'https://science.nasa.gov/mission/hubble/observatory/design/optics/hubbles-mirror-flaw/' },
      { text: 'loreFactMco', source: 'NASA Science: Mars Climate Orbiter', url: 'https://science.nasa.gov/mission/mars-climate-orbiter/' },
      { text: 'loreFactArtemisScrub', source: 'NASA Blog: Artemis I launch attempt scrubbed', url: 'https://www.nasa.gov/blogs/missions/2022/09/03/artemis-i-launch-attempt-scrubbed/' },
    ],
    recap: ['loreRecap2a', 'loreRecap2b', 'loreRecap2c', 'loreRecap2d'],
  },
  'lunar-mission': {
    card: ['loreCard3Goal', 'loreCard3Partners', 'loreCard3Choose', 'loreCard3Trade', 'loreCard3Day', 'loreCard3Lose'],
    facts: [
      { text: 'loreFactClps', source: 'NASA CLPS', url: 'https://www.nasa.gov/commercial-lunar-payload-services/commercial-lunar-payload-services-update/' },
      { text: 'loreFactMoon', source: 'NASA Science: Moon Facts', url: 'https://science.nasa.gov/moon/facts/' },
      { text: 'loreFactCourse', source: 'Basics of Space Flight, Ch. 13', url: bsf('chapter13-1') },
      { text: 'loreFactDsn', source: 'Basics of Space Flight, Ch. 18', url: bsf('chapter18-1') },
      { text: 'loreFactAerobraking', source: 'Basics of Space Flight, Ch. 16', url: bsf('chapter16-1') },
      { text: 'loreFactLanding', source: 'NASA: Peregrine Mission One concludes', url: 'https://www.nasa.gov/news-release/nasa-science-astrobotic-peregrine-mission-one-concludes/' },
      { text: 'loreFactFuelEnd', source: 'Basics of Space Flight, Ch. 17', url: bsf('chapter17-1') },
    ],
    recap: ['loreRecap3a', 'loreRecap3b', 'loreRecap3c'],
  },
}

function Facts({ facts, t }: { facts: Fact[]; t: Translate }) {
  return <ul className="lore-facts">{facts.map(fact => <li key={fact.text}>
    {t(fact.text)} <small><a href={fact.url} target="_blank" rel="noreferrer">{fact.source}</a></small>
  </li>)}</ul>
}

export function Prologue({ t }: { t: Translate }) {
  return <>
    <div className="lore-script">{prologue.map(([speaker, text]) => speaker === 'screen'
      ? <p key={text} className="lore-screen"><strong>{t(text)}</strong></p>
      : <p key={text}>{speaker === 'narrator' ? <em>{t(text)}</em> : <><strong>{speaker}</strong> · {t(text)}</>}</p>)}</div>
    <p className="action-note">{t('loreTermTelemetry')}</p>
    <Disclosure label={t('loreFactsTitle')}><Facts facts={prologueFacts} t={t} /></Disclosure>
  </>
}

export function MissionFlow({ t }: { t: Translate }) {
  return <Disclosure label={t('loreFlowTitle')}>
    <p>{t('loreFlowIntro')}</p>
    <ol className="lore-flow">{flow.map(({ stage, fact }) => <li key={stage}>
      <strong>{t(stage)}</strong>
      <Facts facts={[fact]} t={t} />
    </li>)}</ol>
  </Disclosure>
}

export function ChapterCard({ missionId, t }: { missionId: string; t: Translate }) {
  const chapter = chapters[missionId]
  if (!chapter) return null
  return <>
    <Disclosure label={t('loreCardTitle')}><ul>{chapter.card.map(key => <li key={key}>{t(key)}</li>)}</ul></Disclosure>
    <Disclosure label={t('loreFactsTitle')}><Facts facts={chapter.facts} t={t} /></Disclosure>
  </>
}

export function ChapterRecap({ missionId, t }: { missionId: string; t: Translate }) {
  const chapter = chapters[missionId]
  if (!chapter) return null
  return <Disclosure label={t('loreRecapTitle')}><ul>{chapter.recap.map(key => <li key={key}>{t(key)}</li>)}</ul></Disclosure>
}
