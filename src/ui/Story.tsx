import type { Game } from '../game/types'
import type { Progress } from '../game/progress'
import type { Message, Translate } from '../i18n'
import { commissionMission, missionCatalog, missions } from '../missions'
import { commissions } from '../missions/cubesat-commission'
import { DesignSummary, Disclosure, missionMoney } from './shared'
import { ChapterCard, ChapterRecap, Prologue } from './Lore'

const chapters = {
  cubesat: { title: 'storyFirstLight', opening: 'storyFirstOffer', complete: 'storyFirstComplete', short: 'storyFirstShort' },
  'orbital-launch': { title: 'storySecondAttempt', opening: 'storyOrbitalOffer', complete: 'storyOrbitalComplete', short: 'storyOrbitalShort' },
  'lunar-mission': { title: 'storyLunarContract', opening: 'storyLunarOffer', complete: 'storyLunarComplete', short: 'storyLunarShort' },
} as const

function chapterFor(id: string) {
  return chapters[id as keyof typeof chapters]
}

export function StoryBrief({ missionId, t }: { missionId: string; t: Translate }) {
  const chapter = chapterFor(missionId)
  if (!chapter) return null
  const first = missionId === 'cubesat'
  return <section className="story-panel" aria-label={t('missionStory')}>
    <h2>{t(chapter.title)}</h2>
    {first && <>
      <p>{t('storyPast')}</p>
      <Disclosure label={t('storyPrologue')}>
        <Prologue t={t} />
      </Disclosure>
      <p><strong>Alex</strong> · {t('storyAlexFirst')}</p>
    </>}
    <p><strong>{first || missionId === 'lunar-mission' ? 'Samuel' : 'Alex'}</strong> · {t(chapter.opening)}</p>
    {first && <p><strong>Elena</strong> · {t('storyElenaFirst')}</p>}
    {missionId === 'orbital-launch' && <p><strong>Elena</strong> · {t('storyOrbitalArchive')}</p>}
    <ChapterCard missionId={missionId} t={t} />
  </section>
}

export function StoryDebrief({ game, t }: { game: Game; t: Translate }) {
  const chapter = chapterFor(game.missionId)
  if (!chapter) return null
  const lunar = game.missionId === 'lunar-mission'
  const result = game.flight?.delivered ? chapter.complete : game.flight ? chapter.short : 'storyHeldLaunch'
  return <section className="story-panel" aria-label={t('missionStory')}>
    <h2>{t(lunar ? 'storyEpilogue' : 'storyDebrief')}</h2>
    <p><strong>{game.flight?.delivered ? 'Samuel' : 'Elena'}</strong> · {t(result)}</p>
    {lunar && <p><strong>Alex</strong> · {t(game.flight?.delivered ? 'storyNewProposal' : 'storyReturnToLab')}</p>}
    <ChapterRecap missionId={game.missionId} t={t} />
  </section>
}

const earnedLabels: Record<string, Message> = {
  'cubesat:partnerVerified': 'storyRecordLab',
  'orbital:onTime': 'storyRecordAdvance',
  'orbital:verified': 'storyRecordSupport',
  'orbital:provenMargin': 'storyRecordMargin',
  'lunar:returnedReserve': 'storyRecordReserve',
}

export function Portfolio({ progress, t }: { progress: Progress; t: Translate }) {
  if (Object.keys(progress.missions).length === 0) return null
  return <Disclosure label={t('storyPortfolio')}>
    <p>{t('storyPortfolioDetail')}</p>
    {missionCatalog.map(({ id, title }) => {
      const record = progress.missions[id]
      const report = record?.report
      const mission = report?.commission ? commissionMission : missions[id]
      const earned = (record?.records ?? []).filter(item => Object.hasOwn(earnedLabels, item))
      const outcome = record?.stretch ? 'missionStretchDone' : record?.minimum ? 'missionMinimumDone'
        : report?.status === 'stopped' ? 'noFlight' : record ? 'storyRecordShort' : 'storyRecordPending'
      return <Disclosure key={id} label={t(title)} value={t(outcome)}>
        {report ? <>
          {report.commission && <p>{t(commissions[report.commission].name)}</p>}
          <dl className="fact-list">
            <div><dt>{t('usedWeeks')}</dt><dd>{t('weeks', { count: report.weeks })}</dd></div>
            <div><dt>{t('spentCredits')}</dt><dd>{missionMoney(mission, report.spent, t)}</dd></div>
            {report.status !== 'stopped' && <div><dt>{t('delivery')}</dt><dd>
              {t(id === 'orbital-launch' ? 'storyConfirmation' : 'dataBatches', { count: report.data })}
            </dd></div>}
            <div><dt>{t('report')}</dt><dd>{report.checks ? t('checksPassed', {
              count: report.checks.filter(Boolean).length, total: report.checks.length,
            }) : t('noEvidence')}</dd></div>
            {report.accepted > 0 && <div><dt>{t('storyAcceptedRisks')}</dt><dd>{report.accepted}</dd></div>}
          </dl>
          <Disclosure label={t('configuration')}><DesignSummary mission={mission} design={report.design} t={t} /></Disclosure>
        </> : record && <p>{t('storyOlderRecord')}</p>}
        {!record && <p>{t('storyRecordPending')}</p>}
        {earned.length > 0 && <ul>{earned.map(item => <li key={item}>{t(earnedLabels[item])}</li>)}</ul>}
      </Disclosure>
    })}
  </Disclosure>
}
