import type { Game, Gate, Stage } from './types'

// NASA project life-cycle phases (NPR 7120.5F, Figure 2-5). The game skips Pre-Phase A (concept studies, MCR):
// every mission starts with its concept already chosen. Its four reviews are the ones NASA holds in Phases A to D.
export const phases = ['A', 'B', 'C', 'D', 'E', 'F'] as const
export type Phase = typeof phases[number]

export const phaseSource = {
  source: 'NASA NPR 7120.5F, Chapter 2, Figure 2-5 (NASA Project Life Cycle)',
  url: 'https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_7120_005F_&page_name=Chapter2',
}

// The review that closes each phase in the game. Phases E and F have none here.
export const phaseGate: Record<Phase, Gate | null> = { A: 'MDR', B: 'PDR', C: 'CDR', D: 'FRR', E: null, F: null }

// Design work stays in Phase B until PDR passes. After that the detailed design and its freeze (CDR) are Phase C.
export function phaseOf(game: Pick<Game, 'stage' | 'gate'>, stage: Stage = game.stage): Phase {
  switch (stage) {
    case 'feasibility': return 'A'
    case 'design': return game.gate === 'CDR' ? 'C' : 'B'
    case 'build': return 'C'
    case 'integration':
    case 'review': return 'D'
    case 'flight': return 'E'
    case 'results': return 'F'
  }
}
