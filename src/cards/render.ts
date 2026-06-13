// src/cards/render.ts
//
// Canvas card renderer.
//   • Face-up: suit symbol + rank in corner + centred label
//   • Face-back: geometric diamond pattern
//   • Decks: stacked offset cards (top card face-up or all face-back)
//   • Shuffle animation: cards scatter outward then reform into stack

import type { Card, StandardCard, TarotCard } from './types.js'
import type { PlacedDeck, LooseCard, Position } from '../store/tableStore.js'
import type { ShuffleAnimation } from '../store/tableStore.js'

// ── Constants ────────────────────────────────────────────────────────
const CARD_W = 120
const CARD_H = 170
const RADIUS = 10

const SUIT_SYMBOLS: Record<string, string> = {
  hearts:   '♥',
  diamonds: '♦',
  clubs:    '♣',
  spades:   '♠',
}

const SUIT_COLORS: Record<string, string> = {
  hearts:   '#e74c3c',
  diamonds: '#e74c3c',
  clubs:    '#e2e8f0',
  spades:   '#e2e8f0',
}

const TAROT_SUIT_SYMBOLS: Record<string, string> = {
  wands:     '🪄',
  cups:      '🏆',
  swords:    '⚔️',
  pentacles: '🪙',
}

// ── Helpers ───────────────────────────────────────────────────────────
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ── Easing: smooth scatter ↔ reform ─────────────────────────────────
// t goes 0→1 over the animation duration.
// Phase 1 (0→0.5): scatter outward. Phase 2 (0.5→1): reform.
function shuffleEase(t: number): number {
  // t=0 → 0, t=0.5 → 1, t=1 → 0  (triangle wave, smooth)
  if (t < 0.5) {
    // ease-in-out for scatter
    return 2 * t * t  // quadratic ease-in for first quarter
  }
  // Actually let's use a proper ease-in-out triangle:
  // 0→0.5: 2t², 0.5→1: 1 - 2(t-0.5)²  ... no.
  // Simple approach: 0→0.5 maps to 0→1, 0.5→1 maps to 1→0
  const phase = t < 0.5 ? t * 2 : 2 - t * 2
  // ease-in-out cubic
  return phase < 0.5
    ? 4 * phase * phase * phase
    : 1 - Math.pow(-2 * phase + 2, 3) / 2
}

// ── Face-back (geometric pattern) ────────────────────────────────────
function drawCardBack(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
) {
  // Card body
  drawRoundRect(ctx, x, y, CARD_W, CARD_H, RADIUS)
  ctx.fillStyle = '#1a1a2e'
  ctx.fill()
  ctx.strokeStyle = '#30363d'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Inner border
  const inset = 8
  drawRoundRect(ctx, x + inset, y + inset, CARD_W - inset * 2, CARD_H - inset * 2, RADIUS - 2)
  ctx.strokeStyle = '#4a4a6a'
  ctx.lineWidth = 1
  ctx.stroke()

  // Diamond grid pattern
  const stepX = 18
  const stepY = 18
  ctx.strokeStyle = '#2a2a4a'
  ctx.lineWidth = 0.8
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 7; col++) {
      const cx = x + inset + 6 + col * stepX
      const cy = y + inset + 6 + row * stepY
      if (cx > x + CARD_W - inset - 6 || cy > y + CARD_H - inset - 6) continue
      const half = 5
      ctx.beginPath()
      ctx.moveTo(cx, cy - half)
      ctx.lineTo(cx + half, cy)
      ctx.lineTo(cx, cy + half)
      ctx.lineTo(cx - half, cy)
      ctx.closePath()
      ctx.stroke()
    }
  }
}

// ── Face-up: Standard card ───────────────────────────────────────────
function drawStandardCard(
  ctx: CanvasRenderingContext2D,
  card: StandardCard,
  x: number, y: number,
) {
  const sym = SUIT_SYMBOLS[card.suit] ?? ''
  const color = SUIT_COLORS[card.suit] ?? '#e2e8f0'

  // Card body
  drawRoundRect(ctx, x, y, CARD_W, CARD_H, RADIUS)
  ctx.fillStyle = '#f0f0f0'
  ctx.fill()
  ctx.strokeStyle = '#30363d'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Corner rank + suit (top-left)
  ctx.fillStyle = color
  ctx.font = 'bold 18px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(card.rank, x + 8, y + 6)
  ctx.font = '18px system-ui, sans-serif'
  ctx.fillText(sym, x + 8, y + 26)

  // Corner rank + suit (bottom-right, rotated)
  ctx.save()
  ctx.translate(x + CARD_W - 8, y + CARD_H - 6)
  ctx.rotate(Math.PI)
  ctx.font = 'bold 18px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(card.rank, 0, 0)
  ctx.font = '18px system-ui, sans-serif'
  ctx.fillText(sym, 0, 20)
  ctx.restore()

  // Centre suit large
  ctx.fillStyle = color
  ctx.font = '52px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(sym, x + CARD_W / 2, y + CARD_H / 2)

  // Thin divider line under top-left label
  ctx.strokeStyle = '#c0c0c0'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(x + 6, y + 48)
  ctx.lineTo(x + 32, y + 48)
  ctx.stroke()
}

// ── Face-up: Tarot card ──────────────────────────────────────────────
function drawTarotCard(
  ctx: CanvasRenderingContext2D,
  card: TarotCard,
  x: number, y: number,
) {
  // Card body — gold-tinted for tarot
  drawRoundRect(ctx, x, y, CARD_W, CARD_H, RADIUS)
  const grad = ctx.createLinearGradient(x, y, x, y + CARD_H)
  grad.addColorStop(0, '#fdf6e3')
  grad.addColorStop(1, '#f0e6d0')
  ctx.fillStyle = grad
  ctx.fill()
  ctx.strokeStyle = '#b8860b'
  ctx.lineWidth = 2
  ctx.stroke()

  // Inner decorative border
  const inset = 6
  drawRoundRect(ctx, x + inset, y + inset, CARD_W - inset * 2, CARD_H - inset * 2, RADIUS - 2)
  ctx.strokeStyle = '#d4a843'
  ctx.lineWidth = 0.8
  ctx.stroke()

  // Content area
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (card.arcana === 'major') {
    // Roman numeral-ish: show index in the id
    const idx = parseInt(card.id.split('_')[1]!, 10)
    const roman = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'][idx] ?? `${idx}`

    ctx.fillStyle = '#d4a843'
    ctx.font = '20px system-ui, sans-serif'
    ctx.fillText(roman, x + CARD_W / 2, y + 22)

    // Centre star motif
    ctx.fillStyle = '#b8860b'
    ctx.font = '36px system-ui, sans-serif'
    ctx.fillText('✦', x + CARD_W / 2, y + CARD_H / 2 - 10)

    // Name (wrapped-ish)
    ctx.fillStyle = '#3d2b1f'
    ctx.font = 'bold 11px system-ui, sans-serif'
    const name = card.name ?? ''
    if (name.length > 14) {
      const words = name.split(' ')
      const mid = Math.ceil(words.length / 2)
      ctx.fillText(words.slice(0, mid).join(' '), x + CARD_W / 2, y + CARD_H - 40)
      ctx.fillText(words.slice(mid).join(' '), x + CARD_W / 2, y + CARD_H - 26)
    } else {
      ctx.fillText(name, x + CARD_W / 2, y + CARD_H - 32)
    }
  } else {
    // Minor arcana: suit symbol + rank
    const sym = card.suit ? (TAROT_SUIT_SYMBOLS[card.suit] ?? '?') : '?'
    ctx.fillStyle = '#b8860b'
    ctx.font = '28px system-ui, sans-serif'
    ctx.fillText(sym, x + CARD_W / 2, y + CARD_H / 2 - 14)

    ctx.fillStyle = '#3d2b1f'
    ctx.font = 'bold 14px system-ui, sans-serif'
    ctx.fillText(card.rank ?? '', x + CARD_W / 2, y + CARD_H / 2 + 18)
  }

  // Bottom rank label
  ctx.fillStyle = '#8b7355'
  ctx.font = '10px system-ui, sans-serif'
  ctx.textBaseline = 'bottom'
  ctx.fillText(card.id, x + CARD_W / 2, y + CARD_H - 6)
}

// ── Public: draw a single card ───────────────────────────────────────
export function drawCard(
  ctx: CanvasRenderingContext2D,
  card: Card,
  x: number, y: number,
  faceUp: boolean,
) {
  if (!faceUp) {
    drawCardBack(ctx, x, y)
    return
  }
  if (card.kind === 'standard') {
    drawStandardCard(ctx, card, x, y)
  } else {
    drawTarotCard(ctx, card, x, y)
  }
}

// ── Shuffle animation: compute scattered position for each card ─────
function scatteredPosition(
  index: number,
  total: number,
  deckX: number,
  deckY: number,
  progress: number,   // 0→1, how far into scatter/reform
): Position {
  // Each card gets a deterministic but different scatter angle
  const angle = (index / total) * Math.PI * 2 + index * 0.7
  const maxRadius = 80 + total * 2  // bigger decks scatter further
  const radius = maxRadius * progress

  return {
    x: deckX + Math.cos(angle) * radius,
    y: deckY + Math.sin(angle) * radius,
  }
}

// ── Public: draw a placed deck (stacked cards) ───────────────────────
export function drawDeck(
  ctx: CanvasRenderingContext2D,
  deck: PlacedDeck,
  shuffleAnim: ShuffleAnimation | null,
) {
  const { position, faceUp, deck: deckObj } = deck
  const count = deckObj.cards.length

  // Check if this deck is being shuffled
  const isShuffling = shuffleAnim !== null && shuffleAnim.deckId === deck.id

  if (isShuffling) {
    // Compute animation progress
    const elapsed = Date.now() - shuffleAnim.startTime
    const rawT = Math.min(elapsed / shuffleAnim.duration, 1)
    // Triangle wave: 0→1 in first half, 1→0 in second half
    const scatterAmount = rawT < 0.5
      ? rawT * 2
      : 2 - rawT * 2
    // Apply easing
    const eased = scatterAmount < 0.5
      ? 2 * scatterAmount * scatterAmount
      : 1 - Math.pow(-2 * scatterAmount + 2, 2) / 2

    // Draw each card at its scattered position
    for (let i = 0; i < count; i++) {
      const pos = scatteredPosition(i, count, position.x, position.y, eased)
      // During scatter, cards are face-back
      drawCardBack(ctx, pos.x, pos.y)
    }

    // Draw count badge
    if (count > 1) {
      const badgeX = position.x + CARD_W + 4
      const badgeY = position.y + CARD_H - 20
      ctx.globalAlpha = 0.5
      ctx.fillStyle = '#21262d'
      ctx.strokeStyle = '#30363d'
      ctx.lineWidth = 1
      drawRoundRect(ctx, badgeX, badgeY, 28, 18, 4)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#c9d1d9'
      ctx.font = 'bold 10px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${count}`, badgeX + 14, badgeY + 9)
      ctx.globalAlpha = 1
    }
    return
  }

  // Normal stack drawing
  const maxVisible = Math.min(count, 12) // cap visible stack height
  const offsetStep = 3

  for (let i = maxVisible - 1; i >= 0; i--) {
    const sx = position.x + i * offsetStep
    const sy = position.y - i * offsetStep
    if (i === 0) {
      // Top card: honour faceUp flag
      drawCard(ctx, deckObj.cards[0]!, sx, sy, faceUp)
    } else {
      // Rest of stack: always face-back
      drawCardBack(ctx, sx, sy)
    }
  }

  // Stack count badge
  if (count > 1) {
    const badgeX = position.x + CARD_W + 4
    const badgeY = position.y + CARD_H - 20
    ctx.fillStyle = '#21262d'
    ctx.strokeStyle = '#30363d'
    ctx.lineWidth = 1
    drawRoundRect(ctx, badgeX, badgeY, 28, 18, 4)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#c9d1d9'
    ctx.font = 'bold 10px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${count}`, badgeX + 14, badgeY + 9)
  }
}

// ── Public: draw a loose card ───────────────────────────────────────
export function drawLooseCard(
  ctx: CanvasRenderingContext2D,
  lc: LooseCard,
) {
  drawCard(ctx, lc.card, lc.position.x, lc.position.y, lc.faceUp)
}
