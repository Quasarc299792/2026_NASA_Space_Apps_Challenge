import type { Department } from '../missions/cubesat'

export type Rect = (color: string, x: number, y: number, width: number, height: number) => void

export function painter(ctx: CanvasRenderingContext2D): Rect {
  return (color, x, y, width, height) => {
    ctx.fillStyle = color
    ctx.fillRect(Math.round(x), Math.round(y), width, height)
  }
}

const ink = '#182f45'
const navy = '#294860'
const blue = '#547387'
const steel = '#9aadb3'
const white = '#e9ece1'
const signal = '#a7d9d3'

const teams = [
  { id: 'science', coat: '#ecece0', trim: '#5d8494', skin: '#be8b77', hair: '#2c3844' },
  { id: 'power', coat: '#668093', trim: '#a9c3c3', skin: '#8c645b', hair: '#222d3c' },
  { id: 'comms', coat: '#405d76', trim: '#aec5cb', skin: '#d3aa91', hair: '#453d4c' },
] as const

type Pose = 'idle' | 'work' | 'walk' | 'report'
export type CrewSprite = { id: Department; x: number; base: number; pose: Pose; prop?: Prop }
export type WorkSprite = { speaker: Department; progress: number }

export function drawCrew(rect: Rect, sprites: CrewSprite[], frame: number) {
  sprites.sort((a, b) => a.base - b.base)
  for (const { id, x, base, pose, prop } of sprites) crew(rect, id, x, base, pose, frame, prop)
}

export function aisleDepth(stationBase: number, approach: number) {
  return 134 + (stationBase - 134) * Math.max(0, (approach - .75) / .25)
}

export function moveToStation(station: CrewSprite, work: WorkSprite, reportX: number, x: number, base: number): CrewSprite {
  const progress = Math.min(1, work.progress / .22)
  return { ...station, x: reportX + (x - reportX) * progress, base: aisleDepth(base, progress),
    pose: progress === 1 ? 'work' : 'walk' }
}

export function crew(rect: Rect, id: Department, x: number, base: number, pose: Pose, frame: number, prop?: Prop) {
  const { coat, trim, skin, hair } = teams.find(member => member.id === id)!
  const carrying = pose === 'work' || pose === 'report' || (pose === 'walk' && prop)
  const stride = pose === 'walk' ? (frame % 2 === 0 ? -2 : 2) : 0
  const y = base - (pose === 'work' ? 44 + frame % 2 * 2 : 36) - Math.abs(stride)
  const foot = base - 3
  rect('#a5aba5', x - 13, base, 27, 3)
  rect(ink, x - 8 + stride, foot - 9, 6, 12)
  rect(ink, x + 3 - stride, foot - 9, 6, 12)
  rect(navy, x - 10 + stride, foot, 9, 4)
  rect(navy, x + 3 - stride, foot, 9, 4)
  rect(ink, x - 11, y + 15, 23, base - 25 - y)
  rect(coat, x - 9, y + 16, 19, base - 29 - y)
  rect(trim, x - 8, y + 16, 16, 2)
  rect(ink, x - 2, y + 19, 4, 2)
  rect(white, x - 7, y + 23, 4, 3)
  rect(hair, x - 8, y + 1, 17, 13)
  rect(hair, x - 6, y - 2, 13, 3)
  rect(skin, x - 6, y + 5, 13, 9)
  rect(skin, x - 3, y + 14, 7, 3)
  rect(hair, x - 6, y + 3, 11, 3)
  rect(ink, x + 3, y + 8, 2, 2)
  if (pose === 'report') rect(ink, x - 4, y + 8, 2, 2)
  if (id === 'science') {
    rect(blue, x - 6, y + 7, 6, 3)
    rect(steel, x - 5, y + 7, 3, 1)
  }
  if (id === 'comms') {
    rect(steel, x - 8, y + 4, 3, 8)
    rect(steel, x - 6, y + 11, 6, 1)
  }
  if (carrying) {
    const hand = y + 20 + frame % 2
    rect(coat, x + 9, hand, 9, 4)
    rect(skin, x + 17, hand - 1, 5, 5)
    if (prop) sprite(rect, prop, x + 17, hand - 10, 1)
    else rect(ink, x + 22, hand, 5, 2)
  } else {
    rect(coat, x - 12, y + 18, 3, 9)
    rect(skin, x - 12, y + 26, 3, 4)
  }
}


export type Prop = 'camera' | 'twoCameras' | 'wrench' | 'repair' | 'box' | 'map' | 'river' | 'bay'
  | 'signal' | 'dual' | 'data' | 'archive' | 'rocket' | 'upperStage' | 'adapter' | 'orbit' | 'polar'
  | 'lander' | 'fuel' | 'route' | 'battery' | 'sun' | 'moon' | 'science' | 'scale' | 'contract' | 'clock'

export function map(rect: Rect, kind: 'river' | 'bay', x: number, y: number, w: number, h: number, markers = false) {
  rect(ink, x, y, w, h)
  rect('#d9daba', x + 2, y + 2, w - 4, h - 4)
  for (let row = 2; row < h - 2; row += 2) {
    if (kind === 'bay') {
      const inset = Math.floor(w * (row < h / 2 ? .48 : .28) + row % 5)
      rect('#5a919b', x + inset, y + row, w - inset - 2, 2)
    } else {
      const bend = Math.floor(w * (0.54 + Math.sin(row / h * 5) * .19))
      rect('#6a9da2', x + bend, y + row, Math.max(3, Math.floor(w / 9)), 2)
    }
  }
  if (markers) for (const [mx, my] of [[.23, .19], [.35, .48], [.34, .72]]) {
    rect('#823f2d', x + Math.floor(w * mx), y + Math.floor(h * my), 3, 3)
  }
  rect(white, x + 3, y + h - 4, Math.floor(w * .22), 1)
}

export function receiver(r: Rect, x: number, y: number, lit = true, warning = false) {
  r(ink, x, y + 19, 31, 4)
  r(steel, x + 14, y + 8, 4, 12)
  r(white, x + 3, y + 3, 24, 3)
  r(steel, x + 6, y + 6, 18, 3)
  r(blue, x + 10, y + 9, 11, 3)
  r(white, x + 14, y, 2, 4)
  r(lit ? warning ? '#fa9c5d' : signal : blue, x + 13, y - 3, 4, 3)
}

// Props share a 24×24 grid, including the objects carried by the crew.
export function sprite(rect: Rect, kind: Prop, x: number, y: number, scale = 1) {
  const r: Rect = (color, left, top, w, h) => rect(color, x + Math.round(left * scale), y + Math.round(top * scale),
    Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)))
  const gold = '#f5c279'
  const teal = '#50938d'
  const lens = (left: number, top: number, size: number) => {
    r(ink, left, top, size, size)
    r(steel, left + 1, top + 1, size - 2, size - 2)
    r(navy, left + 3, top + 3, size - 6, size - 6)
    r(signal, left + 4, top + 4, 2, 2)
  }
  switch (kind) {
    case 'camera':
    case 'twoCameras':
      r(ink, 1, 6, 22, 14); r(steel, 2, 7, 20, 4); r(blue, 3, 11, 18, 7)
      r(ink, 4, 4, 6, 3); lens(4, 8, 11)
      if (kind === 'twoCameras') lens(14, 10, 8)
      return
    case 'repair':
      sprite(r, 'camera', 0, 8, .88)
      sprite(r, 'wrench', 9, -2, .7)
      return
    case 'wrench':
      r(ink, 12, 2, 9, 9); r(steel, 13, 1, 3, 7); r(steel, 19, 1, 3, 8)
      for (let i = 0; i < 12; i += 2) { r(ink, 4 + i, 17 - i, 6, 5); r(white, 5 + i, 18 - i, 3, 2) }
      return
    case 'box':
      r(ink, 1, 7, 22, 14); r('#a7784f', 2, 9, 20, 11); r(gold, 2, 6, 20, 4); r(white, 9, 12, 6, 3)
      return
    case 'map':
    case 'river':
    case 'bay':
      map(r, kind === 'bay' ? 'bay' : 'river', 0, 3, 24, 17, true)
      return
    case 'signal':
    case 'dual':
      receiver(r, 2, 4)
      if (kind === 'dual') receiver((c, px, py, w, h) => r(c, px * .55 + 12, py * .55, w * .55, h * .55), 2, 3)
      return
    case 'archive':
      r(ink, 1, 5, 22, 16); r(blue, 2, 8, 20, 12); r(gold, 3, 4, 8, 4); r(steel, 4, 12, 16, 2); r(steel, 4, 16, 11, 2)
      return
    case 'data':
    case 'science':
      r(ink, 0, 5, 18, 16); r(white, 1, 6, 16, 14); r(teal, 3, 8, 12, 8); r(gold, 10, 9, 3, 3)
      r(ink, 19, 9, 4, 3); r(teal, 19, 14, 4, 3)
      return
    case 'rocket':
    case 'upperStage':
      r(steel, 10, 1, 4, 2); r(white, 8, 3, 8, 15); r(steel, 13, 5, 3, 13); r(ink, 6, 17, 12, 3)
      r(kind === 'upperStage' ? gold : teal, 8, 9, 8, 4)
      if (kind === 'rocket') { r(gold, 9, 20, 6, 2); r('#df8062', 11, 22, 2, 2) }
      return
    case 'adapter':
    case 'scale':
      r(ink, 2, 15, 20, 7); r(steel, 3, 14, 18, 4); r(kind === 'scale' ? signal : gold, 7, 18, 10, 2)
      r(blue, 5, 8, 14, 6); r(white, 8, 6, 8, 3)
      return
    case 'route':
    case 'orbit':
    case 'polar':
      r(navy, 6, 6, 12, 12); r(teal, 8, 4, 8, 16); r(signal, 9, 7, 4, 4)
      for (let i = 0; i < 7; i += 1) {
        const row = kind === 'polar' ? 2 + i * 3 : 12 + (i - 3) * (kind === 'route' ? -3 : 1)
        r(gold, i * 3 + 1, row, 2, 2)
      }
      return
    case 'lander':
      r(ink, 6, 4, 12, 15); r(gold, 7, 6, 10, 10); r(white, 10, 2, 4, 5); r(navy, 8, 8, 8, 4)
      r(steel, 3, 17, 5, 3); r(steel, 16, 17, 5, 3); r(ink, 1, 20, 7, 2); r(ink, 16, 20, 7, 2)
      return
    case 'fuel':
    case 'battery':
      r(ink, 6, 2, 12, 20); r(steel, 8, 0, 8, 3); r(blue, 8, 4, 8, 16)
      r(kind === 'fuel' ? teal : gold, 9, 9, 6, 10); r(white, 10, 5, 2, 12)
      return
    case 'sun':
    case 'moon':
      r(kind === 'moon' ? steel : gold, 7, 4, 10, 16); r(kind === 'moon' ? steel : gold, 4, 7, 16, 10)
      r(kind === 'moon' ? navy : white, 11, 6, 7, 9)
      return
    case 'clock':
      r(ink, 3, 3, 18, 18); r(steel, 5, 5, 14, 14); r(navy, 11, 6, 2, 8); r(navy, 11, 12, 6, 2)
      return
    case 'contract':
      r(ink, 4, 1, 16, 22); r(white, 5, 2, 14, 20)
      for (const row of [6, 10, 14]) r(blue, 8, row, 8, 1)
      r(teal, 13, 17, 4, 3)
  }
}
