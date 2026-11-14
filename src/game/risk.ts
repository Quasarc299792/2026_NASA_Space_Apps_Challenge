// Shared risk rules: verification buys down uncertainty. Pure functions only, no Math.random.
// Every percentage and range here is a game setting, not a NASA figure.

export const verificationLevels = ['none', 'analysis', 'unit', 'endToEnd'] as const
export type VerificationLevel = 0 | 1 | 2 | 3
export type Maturity = 'heritage' | 'new'
export type Severity = 'degraded' | 'fatal'
export type Range = { min: number; max: number }

export const riskFloor = 0.02
// Chance of failure left after each verification level. A new design starts higher and never drops below the floor.
export const residualRisk: Record<Maturity, readonly [number, number, number, number]> = {
  heritage: [0.2, 0.12, 0.05, riskFloor],
  new: [0.4, 0.25, 0.1, riskFloor],
}
export const topLevel: VerificationLevel = 3

export function residualRiskAt(maturity: Maturity, level: number) {
  return residualRisk[maturity][Math.max(0, Math.min(topLevel, Math.trunc(level)))]
}

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
// the amount of other work done never change an item's result.
export function itemRandom(seed: number, itemId: string, draw = 0) {
  const random = seededRandom(hash(`${seed >>> 0}:${itemId}:${draw}`))
  random()
  return random()
}

// Hidden value: an integer fixed at the start of the run that the player sees only as a range.
export function hiddenValue(seed: number, itemId: string, range: Range) {
  return range.min + Math.floor(itemRandom(seed, `${itemId}:value`) * (range.max - range.min + 1))
}

// What the player knows about a hidden value. Each level below the top halves the range around the true value.
// The top level reveals it. The halves are fixed cuts of the starting range, so the true value stays evenly
// likely across whatever range is shown and the displayed odds stay honest.
export function knownRange(range: Range, value: number, level: number): Range {
  if (level >= topLevel) return { min: value, max: value }
  let { min, max } = range
  for (let step = 0; step < level && max > min; step += 1) {
    const middle = min + Math.ceil((max - min + 1) / 2) - 1
    if (value <= middle) max = middle
    else min = middle + 1
  }
  return { min, max }
}

// Share of a known range that is above what the design can absorb.
export function exceedChance(known: Range, limit: number) {
  const size = known.max - known.min + 1
  return Math.max(0, Math.min(size, known.max - Math.max(limit, known.min - 1))) / size
}

// Risk shown for a hidden-value item: the share of the range the design cannot absorb, plus the floor on the rest.
export function hiddenRisk(known: Range, limit: number) {
  const exceed = exceedChance(known, limit)
  return exceed + (1 - exceed) * riskFloor
}

export type Roll = { id: string; risk: number; value: number; failed: boolean; hidden?: number; limit?: number }

// One roll per item per flight. `value` is the number drawn, kept for the run record.
export function rollItem(seed: number, itemId: string, risk: number): Roll {
  const value = itemRandom(seed, `${itemId}:roll`)
  return { id: itemId, risk, value, failed: value < risk }
}

// A hidden-value item fails when the true value is above the limit. Otherwise only the floor is rolled.
export function rollHidden(seed: number, itemId: string, known: Range, value: number, limit: number): Roll {
  const residual = itemRandom(seed, `${itemId}:roll`)
  return { id: itemId, risk: hiddenRisk(known, limit), value: residual, failed: value > limit || residual < riskFloor, hidden: value, limit }
}

export type RiskEstimate = { id: string; risk: number; severity: Severity }

// Two forecasts for the whole flight. `minimumMet` says whether the minimum requirement survives a given set of
// failed items. A failed fatal item always ends the mission. Items are independent, so every combination is weighed.
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
