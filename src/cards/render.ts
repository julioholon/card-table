// src/cards/render.ts
//
// Canvas card renderer.
//   • Face-up: suit symbol + rank in corner + centred label
//   • Face-back: geometric diamond pattern
//   • Decks: stacked offset cards (top card face-up or all face-back)

import type { Card, StandardCard, TarotCard } from './types.js'
import type { PlacedDeck, LooseCard, Position } from '../store/tableStore.js'

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

// ── Face-back (geometric pattern) ────────────────────────────────────
function drawCardBack(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
) {
  // Card body — deep navy with subtle gradient
  drawRoundRect(ctx, x, y, CARD_W, CARD_H, RADIUS)
  const bgGrad = ctx.createLinearGradient(x, y, x + CARD_W, y + CARD_H)
  bgGrad.addColorStop(0, '#16162a')
  bgGrad.addColorStop(0.5, '#1a1a2e')
  bgGrad.addColorStop(1, '#1e1e36')
  ctx.fillStyle = bgGrad
  ctx.fill()

  // Outer border — subtle metallic
  ctx.strokeStyle = '#3a3a5c'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Inner border — double-line frame
  const inset = 7
  const innerW = CARD_W - inset * 2
  const innerH = CARD_H - inset * 2
  drawRoundRect(ctx, x + inset, y + inset, innerW, innerH, RADIUS - 2)
  ctx.strokeStyle = '#4a4a6a'
  ctx.lineWidth = 1
  ctx.stroke()

  // Second inner line for double-border effect
  const inset2 = 11
  drawRoundRect(ctx, x + inset2, y + inset2, CARD_W - inset2 * 2, CARD_H - inset2 * 2, RADIUS - 4)
  ctx.strokeStyle = '#38385a'
  ctx.lineWidth = 0.6
  ctx.stroke()

  // Diamond grid pattern — two-tone for depth
  const stepX = 16
  const stepY = 16
  const patternInset = inset2 + 4
  const patternW = CARD_W - patternInset * 2
  const patternH = CARD_H - patternInset * 2
  const cols = Math.floor(patternW / stepX)
  const rows = Math.floor(patternH / stepY)
  const startX = x + patternInset + (patternW - cols * stepX) / 2
  const startY = y + patternInset + (patternH - rows * stepY) / 2

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = startX + col * stepX + stepX / 2
      const cy = startY + row * stepY + stepY / 2
      const half = 4.5

      // Alternate between two shades for subtle checkerboard depth
      const isLight = (row + col) % 2 === 0
      ctx.strokeStyle = isLight ? '#2e2e52' : '#262648'
      ctx.lineWidth = 0.7

      ctx.beginPath()
      ctx.moveTo(cx, cy - half)
      ctx.lineTo(cx + half, cy)
      ctx.lineTo(cx, cy + half)
      ctx.lineTo(cx - half, cy)
      ctx.closePath()
      ctx.stroke()
    }
  }

  // Central ornament — subtle diamond wreath
  const cx = x + CARD_W / 2
  const cy = y + CARD_H / 2
  ctx.strokeStyle = '#3a3a62'
  ctx.lineWidth = 0.8
  const ornamentR = 14
  ctx.beginPath()
  ctx.moveTo(cx, cy - ornamentR)
  ctx.lineTo(cx + ornamentR, cy)
  ctx.lineTo(cx, cy + ornamentR)
  ctx.lineTo(cx - ornamentR, cy)
  ctx.closePath()
  ctx.stroke()

  // Inner dot
  ctx.fillStyle = '#4a4a6a'
  ctx.beginPath()
  ctx.arc(cx, cy, 2, 0, Math.PI * 2)
  ctx.fill()
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

// ── Public: draw a placed deck (stacked cards) ───────────────────────
export function drawDeck(
  ctx: CanvasRenderingContext2D,
  deck: PlacedDeck,
) {
  const { position, faceUp, deck: deckObj } = deck
  const count = deckObj.cards.length

  // Draw stack effect: offset cards from bottom to top
  const maxVisible = Math.min(count, 12) // cap visible stack height
  const offsetStep = 3

  // Drop shadow under the entire stack
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetX = 4
  ctx.shadowOffsetY = 6
  drawRoundRect(ctx, position.x, position.y, CARD_W, CARD_H, RADIUS)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.01)'
  ctx.fill()
  ctx.restore()

  for (let i = maxVisible - 1; i >= 0; i--) {
    const sx = position.x + i * offsetStep
    const sy = position.y - i * offsetStep
    if (i === 0) {
      // Top card: honour faceUp flag
      drawCard(ctx, deckObj.cards[0]!, sx, sy, faceUp)
    } else {
      // Rest of stack: always face-back
      drawCardBack(ctx, sx, sy)

      // Edge highlight on the right side to show card thickness
      const edgeX = sx + CARD_W - 1
      const edgeTop = sy + RADIUS
      const edgeBot = sy + CARD_H - RADIUS
      ctx.strokeStyle = 'rgba(80, 80, 120, 0.25)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(edgeX, edgeTop)
      ctx.lineTo(edgeX, edgeBot)
      ctx.stroke()

      // Bottom edge
      const bottomY = sy + CARD_H - 1
      ctx.strokeStyle = 'rgba(60, 60, 100, 0.2)'
      ctx.beginPath()
      ctx.moveTo(sx + RADIUS, bottomY)
      ctx.lineTo(sx + CARD_W - RADIUS, bottomY)
      ctx.stroke()
    }
  }

  // Stack count badge — pill shape with subtle shadow
  if (count > 1) {
    const badgeX = position.x + CARD_W + 6
    const badgeY = position.y + CARD_H - 22
    const badgeW = Math.max(28, 10 + `${count}`.length * 7)
    const badgeH = 20
    const badgeR = badgeH / 2

    // Badge shadow
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
    ctx.shadowBlur = 4
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 2
    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeR)
    ctx.fillStyle = '#21262d'
    ctx.fill()
    ctx.restore()

    // Badge border
    ctx.strokeStyle = '#30363d'
    ctx.lineWidth = 1
    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeR)
    ctx.stroke()

    // Badge text
    ctx.fillStyle = '#c9d1d9'
    ctx.font = 'bold 11px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${count}`, badgeX + badgeW / 2, badgeY + badgeH / 2)
  }
}

// ── Public: draw a loose card ───────────────────────────────────────
export function drawLooseCard(
  ctx: CanvasRenderingContext2D,
  lc: LooseCard,
) {
  drawCard(ctx, lc.card, lc.position.x, lc.position.y, lc.faceUp)
}
