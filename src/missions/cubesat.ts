export const cubeSat = {
  id: 'cubesat',
  title: 'cubesat',
  brief: 'briefStory',
  deadline: 6,
  budget: 100,
  playMinutes: '3–5',
  minimumBatches: 2,
  stretchBatches: 4,
  missionOrbits: 1,
  busWatts: 2,
  downlinkWatts: 4,
  groundCapacity: 5,
  payloads: {
    basic: { label: 'payloadBasic', description: 'payloadBasicDetail', watts: 3, batches: 2, cost: 14 },
    advanced: { label: 'payloadAdvanced', description: 'payloadAdvancedDetail', watts: 7, batches: 5, cost: 21 },
  },
  supplies: {
    standard: { label: 'powerStandard', description: 'powerStandardDetail', watts: 10, cost: 12 },
    reinforced: { label: 'powerReinforced', description: 'powerReinforcedDetail', watts: 14, cost: 22 },
  },
  schedules: {
    overlap: { label: 'scheduleOverlap', description: 'scheduleOverlapDetail', batchLoss: 0 },
    stagger: { label: 'scheduleStagger', description: 'scheduleStaggerDetail', batchLoss: 2 },
  },
  radios: {
    compliant: { label: 'radioCompliant', description: 'radioCompliantDetail', firstTxMinutes: 32, groundCapacity: 4 },
    early: { label: 'radioEarly', description: 'radioEarlyDetail', firstTxMinutes: 20, groundCapacity: 5 },
  },
  ditl: {
    separationMinutes: 0,
    deployMinutes: 15,
    minQuietMinutes: 30,
    source: 'NASA CubeSat 101 §6.9.1',
    url: 'https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=68',
  },
  costs: {
    assess: { weeks: 1, credits: 6 },
    analyze: { weeks: 1, credits: 5 },
    freeze: { weeks: 1, credits: 6 },
    build: { weeks: 1, credits: 9 },
    integrate: { weeks: 1, credits: 8 },
    wait: { weeks: 1, credits: 0 },
    stagger: { weeks: 1, credits: 6 },
    basic: { weeks: 1, credits: 10 },
    reinforced: { weeks: 1, credits: 16 },
    compliant: { weeks: 1, credits: 5 },
  },
} as const

export const nextMissions = [
  { id: 'orbital-launch', title: 'orbital', deadline: 12 },
  { id: 'lunar-mission', title: 'lunar', deadline: 20 },
] as const

export const departments = ['science', 'power', 'comms'] as const
export type Department = typeof departments[number]
export const proposals = {
  science: { options: ['stagger', 'basic'], fallback: 'stagger', brief: 'scienceBrief' },
  power: { options: ['stagger', 'reinforced'], fallback: 'reinforced', brief: 'powerBrief' },
  comms: { options: ['stagger', 'reinforced'], fallback: 'stagger', brief: 'commsBrief' },
} as const satisfies Record<Department, { options: readonly string[]; fallback: string; brief: string }>
