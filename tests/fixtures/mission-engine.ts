import type { MissionRules } from '../../src/game/types'

const costs = {
  assess: { label: 'orbitalAssess', weeks: 1, credits: 2 },
  prelim: { label: 'orbitalPrelim', weeks: 1, credits: 3 },
  freeze: { label: 'orbitalFreeze', weeks: 1, credits: 4 },
  integrate: { label: 'orbitalIntegrate', weeks: 3, credits: 9 },
  verify: { label: 'lunarContractWork', weeks: 0, credits: 0 },
} as const

export const fixtureMission: MissionRules = {
  id: 'engine-fixture',
  title: 'orbital',
  brief: 'orbitalBriefStory',
  dialogue: 'briefDialogue',
  playMinutes: '5',
  budget: 30,
  deadline: 8,
  reputation: { minimum: 2, stretch: 1 },
  groups: {
    route: { legend: 'lunarRoute', options: {
      direct: { label: 'lunarRouteDirect', description: 'lunarRouteDirectDetail' },
      lowEnergy: { label: 'lunarRouteLowEnergy', description: 'lunarRouteLowEnergyDetail' },
    } },
  },
  initialDesign: { route: 'direct' },
  stageDetails: {
    feasibility: 'feasibilityDetail', design: 'designDetail', build: 'buildDetail',
    integration: 'integrationDetail', review: 'reviewDetail', flight: 'flightDetail',
  },
  outcomes: { stopped: 'outcomeStopped', extra: 'outcomeExtra', success: 'outcomeSuccess', partial: 'outcomePartial' },
  costs,
  initialize: game => ({ ...game, missionState: { support: Number(game.records.includes('support')), signed: false } }),
  effectiveDeadline: game => game.deadline - Number(game.design.route === 'lowEnergy'),
  tasks: {
    assess: {
      plan: game => game.stage === 'feasibility' ? costs.assess : null,
      complete: game => ({ ...game, stage: 'design', gate: 'PDR' }),
    },
    prelim: {
      plan: game => game.gate === 'PDR' && !game.missionState?.prelim ? costs.prelim : null,
      complete: game => ({ ...game, missionState: { ...game.missionState, prelim: true } }),
    },
    freeze: {
      plan: game => game.stage === 'design' && game.gate === 'CDR' ? costs.freeze : null,
      complete: game => ({ ...game, stage: 'integration' }),
    },
    integrate: {
      plan: game => game.stage === 'integration'
        ? { ...costs.integrate, credits: costs.integrate.credits - Number(game.missionState?.support) } : null,
      start: game => ({ ...game, missionState: { ...game.missionState, support: 0 } }),
      complete: game => ({
        ...game, stage: 'review', evidence: { design: game.design, checks: [false], week: game.week, revision: game.revision, margin: 4 },
      }),
    },
    verify: {
      plan: game => game.stage === 'review' && !game.missionState?.signed ? costs.verify : null,
      complete: game => ({ ...game, missionState: { ...game.missionState, signed: true } }),
    },
  },
  events: [{
    id: 'pull-in', title: 'lunarEventPullInTitle', detail: 'lunarEventPullInStory',
    trigger: game => game.week === 4,
    choices: [
      { id: 'keep', label: 'lunarEventAcknowledge', detail: 'lunarEventPullInChange',
        values: game => ({ before: game.deadline, after: game.deadline - 1 }),
        apply: game => ({ ...game, deadline: game.deadline - 1 }) },
      { id: 'cut', label: 'lunarEventAcknowledge', detail: 'lunarEventPullInChange',
        values: game => ({ before: game.deadline, after: game.deadline - 2 }),
        apply: game => ({ ...game, deadline: game.deadline - 2 }) },
    ],
  }],
  reviews: {
    PDR: game => game.missionState?.prelim ? {
      issues: game.design.route === 'direct' ? [{ detail: { message: 'orbitalFrrReturnMargin', values: { count: 1 } } }] : [],
    } : null,
    FRR: (game, evidence) => ({
      issues: [
        ...(!evidence ? [{ detail: { message: 'orbitalFrrReturnEvidence' as const } }] : []),
        ...(!game.missionState?.signed ? [{ detail: { message: 'lunarContractCheck' as const } }] : []),
        ...(evidence ? [{
          detail: { message: 'lunarWaiverPrompt' as const },
          waiver: evidence.margin >= 0 ? {
            id: 'reserve', label: 'lunarWaiverReserve' as const,
            detail: { message: 'lunarWaiverReserveDetail' as const, values: { margin: evidence.margin, need: 2 } },
          } : undefined,
        }] : []),
      ],
      approve: { message: 'orbitalFrrPassAnalysis' },
      return: { message: 'orbitalFrrReturn' },
    }),
  },
  segmentedFlight: {
    segments: [
      {
        id: 'launch', title: 'lunarLaunchTitle',
        resolve: () => ({ state: { launched: true }, report: { message: 'lunarLaunchCarried' } }),
      },
      {
        id: 'transfer', title: 'lunarTransferTitle',
        choices: () => [
          { id: 'nominal', label: 'lunarRouteLowEnergy', detail: { message: 'lunarTransferCarried' } },
          { id: 'shortfall', label: 'lunarRouteDirect', detail: { message: 'lunarTransferCarried' } },
        ],
        resolve: ({ progress }, choice) => ({
          failed: choice === 'shortfall' || !progress.state.launched,
          state: { ...progress.state, trajectory: choice },
        }),
      },
      {
        id: 'landing', title: 'lunarLandingTitle',
        resolve: () => ({ report: { message: 'lunarLandingNominal' } }),
      },
    ],
    finish: ({ progress }, interruptedAt) => ({
      choice: String(progress.state.trajectory), delivered: !interruptedAt, stretch: !interruptedAt,
    }),
  },
  records: game => game.flight?.delivered ? ['verified'] : [],
}
