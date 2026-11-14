// Shared risk rules: verification lowers uncertainty, not the chance of failure.
// A test never changes the hardware. It changes what the player knows about it.
// Every truth is drawn from the seed when the run starts and nothing is rolled in flight.
// Pure functions only, no Math.random. Every percentage and range here is a game setting, not a NASA figure.

export const verificationLevels = ['none', 'analysis', 'unit', 'endToEnd'] as const
export type VerificationLevel = 0 | 1 | 2 | 3
export type Maturity = 'heritage' | 'new'
export type Severity = 'degraded' | 'fatal'
export type Range = { min: number; max: number }
export const topLevel: VerificationLevel = 3

// Chance that an item starts the run with a defect.
export const defectChance: Record<Maturity, number> = { heritage: 0.2, new: 0.4 }
// Chance that verification at each level catches a defect that is there. No level catches everything.
export const detection: readonly [number, number, number, number] = [0, 0.5, 0.85, 0.97]
// At flight review, a believed risk above this needs the player's signature to fly with it.
export const reviewRiskThreshold = 0.05

function hash(text: string) {
  let value = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 0x01000193)
  }
  return value >>> 0
}

// mulberry32. Returns a generator of numbers in [0, 1).
export function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = state
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

export function seedFromText(text: string) {
  return hash(text)
}

// Each item draws from its own stream, keyed by seed and item ID, so the order of play and
// the amount of other work done never change an item's truth or its test results.
export function itemRandom(seed: number, itemId: string, draw = 0) {
  const random = seededRandom(hash(`${seed >>> 0}:${itemId}:${draw}`))
  random()
  return random()
}

function level(value: number) {
  return Math.max(0, Math.min(topLevel, Math.trunc(value)))
}

// --- Defects: the truth is yes or no ---

// Whether the item has a defect. Fixed by the seed at the start of the run.
export function hasDefect(seed: number, itemId: string, maturity: Maturity) {
  return itemRandom(seed, `${itemId}:truth`) < defectChance[maturity]
}

// Whether verification at this level would catch a defect in this item. Also fixed by the seed, and a deeper
// level catches everything a shallower one does.
export function wouldDetect(seed: number, itemId: string, verification: number) {
  return itemRandom(seed, `${itemId}:detect`) < detection[level(verification)]
}

// What a test at this level reports. 'passed' does not prove the item is clean: a shallow test can miss.
export function testResult(seed: number, itemId: string, maturity: Maturity, verification: number) {
  return hasDefect(seed, itemId, maturity) && wouldDetect(seed, itemId, verification) ? 'found' : 'passed'
}

// The player's belief that a defect is still there after verification at this level found nothing (Bayes' rule).
export function believedRisk(maturity: Maturity, verification: number) {
  const missed = defectChance[maturity] * (1 - detection[level(verification)])
  return missed / (missed + 1 - defectChance[maturity])
}

export type DefectState = { level: number; found: boolean; fixed: boolean }
export const untested: DefectState = { level: 0, found: false, fixed: false }

// Belief for an item in play: certain once a test has found the defect, gone once it has been fixed.
export function defectBelief(maturity: Maturity, state: DefectState) {
  return state.fixed ? 0 : state.found ? 1 : believedRisk(maturity, state.level)
}

// Runs the next verification level and returns the new state.
export function verifyDefect(seed: number, itemId: string, maturity: Maturity, state: DefectState): DefectState {
  if (state.fixed || state.found || state.level >= topLevel) return state
  return { ...state, level: state.level + 1, found: testResult(seed, itemId, maturity, state.level + 1) === 'found' }
}

// Whether the defect is there in flight. A fix changes the truth. Verification never does.
export function defectInFlight(seed: number, itemId: string, maturity: Maturity, state: DefectState) {
  return !state.fixed && hasDefect(seed, itemId, maturity)
}

// --- Hidden values: the truth is a number ---

// An integer fixed at the start of the run that the player sees only as a range.
export function hiddenValue(seed: number, itemId: string, range: Range) {
  return range.min + Math.floor(itemRandom(seed, `${itemId}:value`) * (range.max - range.min + 1))
}

// What the player knows about a hidden value. Each level below the top halves the range around the true value.
// The top level reveals it. The halves are fixed cuts of the starting range, so the true value stays evenly
// likely across whatever range is shown and the displayed odds stay honest.
export function knownRange(range: Range, value: number, verification: number): Range {
  if (verification >= topLevel) return { min: value, max: value }
  let { min, max } = range
  for (let step = 0; step < verification && max > min; step += 1) {
    const middle = min + Math.ceil((max - min + 1) / 2) - 1
    if (value <= middle) max = middle
    else min = middle + 1
  }
  return { min, max }
}

// The player's belief that a hidden value is above what the design can absorb: the share of the known range over the limit.
export function exceedChance(known: Range, limit: number) {
  const size = known.max - known.min + 1
  return Math.max(0, Math.min(size, known.max - Math.max(limit, known.min - 1))) / size
}

// --- Whole mission ---

// One line of the run record for each item that flew: what the player believed and what was true.
export type Outcome = { id: string; believed: number; failed: boolean; value?: number; limit?: number }
export type RiskEstimate = { id: string; risk: number; severity: Severity }

// Two forecasts for the whole flight, from the player's current beliefs. `minimumMet` says whether the minimum
// requirement survives a given set of failed items. A failed fatal item always ends the mission.
// Items are independent, so every combination is weighed.
export function missionOdds(items: readonly RiskEstimate[], minimumMet: (failed: ReadonlySet<string>) => boolean = failed => failed.size === 0) {
  let minimum = 0
  for (let mask = 0; mask < 2 ** items.length; mask += 1) {
    let chance = 1
    let fatal = false
    const failed = new Set<string>()
    items.forEach((item, index) => {
      const fails = Boolean(mask & (1 << index))
      chance *= fails ? item.risk : 1 - item.risk
      if (fails) { failed.add(item.id); fatal ||= item.severity === 'fatal' }
    })
    if (chance > 0 && !fatal && minimumMet(failed)) minimum += chance
  }
  const noFatal = items.reduce((total, item) => item.severity === 'fatal' ? total * (1 - item.risk) : total, 1)
  return { minimum, noFatal }
}

// External events come from a pool and use the same seed. Verification never changes these draws.
export function drawFromPool<T>(seed: number, drawId: string, pool: readonly T[]): T | null {
  return pool.length ? pool[Math.floor(itemRandom(seed, `event:${drawId}`) * pool.length)] : null
}

export function percent(risk: number) {
  return Math.round(risk * 100)
}
