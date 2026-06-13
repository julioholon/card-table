// src/cards/render.ts
//
// Canvas card renderer.
//   • Face-up: suit symbol + rank in corner + centred label
//   • Face-back: geometric diamond pattern
//   • Decks: stacked offset cards (top card face-up or all face-back)

import type { Card, StandardCard, TarotCard } from './types.js'
import type { PlacedDeck, LooseCard } from '../store/tableStore.js'
import { getProgress } from './flipAnimation.js'

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
  clubs:    '#1a1a1a',
  spades:   '#1a1a1a',
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
  // Card body — rich dark gradient with slight warm shift toward center
  drawRoundRect(ctx, x, y, CARD_W, CARD_H, RADIUS)
  const bgGrad = ctx.createRadialGradient(
    x + CARD_W / 2, y + CARD_H / 2, 10,
    x + CARD_W / 2, y + CARD_H / 2, CARD_W * 0.7,
  )
  bgGrad.addColorStop(0, '#1c1c34')
  bgGrad.addColorStop(0.6, '#1a1a2e')
  bgGrad.addColorStop(1, '#15152a')
  ctx.fillStyle = bgGrad
  ctx.fill()

  // Outer border — subtle metallic sheen
  ctx.strokeStyle = '#3e3e62'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Inner border — double-line frame
  const inset = 7
  const innerW = CARD_W - inset * 2
  const innerH = CARD_H - inset * 2
  drawRoundRect(ctx, x + inset, y + inset, innerW, innerH, RADIUS - 2)
  ctx.strokeStyle = '#4e4e72'
  ctx.lineWidth = 1
  ctx.stroke()

  // Second inner line for double-border effect
  const inset2 = 11
  drawRoundRect(ctx, x + inset2, y + inset2, CARD_W - inset2 * 2, CARD_H - inset2 * 2, RADIUS - 4)
  ctx.strokeStyle = '#3a3a5e'
  ctx.lineWidth = 0.6
  ctx.stroke()

  // Corner accents — small diagonal ticks at each corner inside the frame
  const cornerInset = inset2 + 3
  const cornerLen = 6
  ctx.strokeStyle = '#4a4a6e'
  ctx.lineWidth = 1
  // Top-left
  ctx.beginPath()
  ctx.moveTo(x + cornerInset, y + cornerInset + cornerLen)
  ctx.lineTo(x + cornerInset, y + cornerInset)
  ctx.lineTo(x + cornerInset + cornerLen, y + cornerInset)
  ctx.stroke()
  // Top-right
  ctx.beginPath()
  ctx.moveTo(x + CARD_W - cornerInset - cornerLen, y + cornerInset)
  ctx.lineTo(x + CARD_W - cornerInset, y + cornerInset)
  ctx.lineTo(x + CARD_W - cornerInset, y + cornerInset + cornerLen)
  ctx.stroke()
  // Bottom-left
  ctx.beginPath()
  ctx.moveTo(x + cornerInset, y + CARD_H - cornerInset - cornerLen)
  ctx.lineTo(x + cornerInset, y + CARD_H - cornerInset)
  ctx.lineTo(x + cornerInset + cornerLen, y + CARD_H - cornerInset)
  ctx.stroke()
  // Bottom-right
  ctx.beginPath()
  ctx.moveTo(x + CARD_W - cornerInset - cornerLen, y + CARD_H - cornerInset)
  ctx.lineTo(x + CARD_W - cornerInset, y + CARD_H - cornerInset)
  ctx.lineTo(x + CARD_W - cornerInset, y + CARD_H - cornerInset - cornerLen)
  ctx.stroke()

  // Diamond grid pattern — refined: filled + stroked for richer texture
  const stepX = 14
  const stepY = 14
  const patternInset = inset2 + 6
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
      const half = 4

      const isLight = (row + col) % 2 === 0

      // Filled diamond for subtle texture
      ctx.fillStyle = isLight ? 'rgba(50, 50, 90, 0.15)' : 'rgba(36, 36, 72, 0.12)'
      ctx.beginPath()
      ctx.moveTo(cx, cy - half)
      ctx.lineTo(cx + half, cy)
      ctx.lineTo(cx, cy + half)
      ctx.lineTo(cx - half, cy)
      ctx.closePath()
      ctx.fill()

      // Stroked diamond for definition
      ctx.strokeStyle = isLight ? '#2e2e55' : '#28284a'
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.moveTo(cx, cy - half)
      ctx.lineTo(cx + half, cy)
      ctx.lineTo(cx, cy + half)
      ctx.lineTo(cx - half, cy)
      ctx.closePath()
      ctx.stroke()
    }
  }

  // Central ornament — concentric diamonds with fine detail
  const cx = x + CARD_W / 2
  const cy = y + CARD_H / 2

  // Outer diamond
  ctx.strokeStyle = '#3e3e68'
  ctx.lineWidth = 0.9
  const outerR = 16
  ctx.beginPath()
  ctx.moveTo(cx, cy - outerR)
  ctx.lineTo(cx + outerR, cy)
  ctx.lineTo(cx, cy + outerR)
  ctx.lineTo(cx - outerR, cy)
  ctx.closePath()
  ctx.stroke()

  // Middle diamond
  ctx.strokeStyle = '#4a4a72'
  ctx.lineWidth = 0.7
  const midR = 10
  ctx.beginPath()
  ctx.moveTo(cx, cy - midR)
  ctx.lineTo(cx + midR, cy)
  ctx.lineTo(cx, cy + midR)
  ctx.lineTo(cx - midR, cy)
  ctx.closePath()
  ctx.stroke()

  // Inner diamond
  ctx.strokeStyle = '#555580'
  ctx.lineWidth = 0.6
  const innerR = 5
  ctx.beginPath()
  ctx.moveTo(cx, cy - innerR)
  ctx.lineTo(cx + innerR, cy)
  ctx.lineTo(cx, cy + innerR)
  ctx.lineTo(cx - innerR, cy)
  ctx.closePath()
  ctx.stroke()

  // Center dot with glow
  ctx.fillStyle = '#6a6a90'
  ctx.beginPath()
  ctx.arc(cx, cy, 1.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(106, 106, 144, 0.25)'
  ctx.beginPath()
  ctx.arc(cx, cy, 4, 0, Math.PI * 2)
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

// ── Public: draw a single card with flip animation ────────────────────
export function drawCardWithFlip(
  ctx: CanvasRenderingContext2D,
  card: Card,
  x: number, y: number,
  faceUp: boolean,
  flipProgress: number | null,
) {
  if (flipProgress !== null) {
    // Animate: scaleX goes from 1 → 0 → 1, face flips at midpoint
    const progressAngle = flipProgress * Math.PI
    const scaleX = Math.abs(Math.cos(progressAngle))
    const showingFace = flipProgress < 0.5 ? faceUp : !faceUp

    ctx.save()
    ctx.translate(x + CARD_W / 2, y + CARD_H / 2)
    ctx.scale(scaleX, 1)
    ctx.translate(-(x + CARD_W / 2), -(y + CARD_H / 2))

    // Draw the appropriate face
    if (showingFace) {
      if (card.kind === 'standard') {
        drawStandardCard(ctx, card, x, y)
      } else {
        drawTarotCard(ctx, card, x, y)
      }
    } else {
      drawCardBack(ctx, x, y)
    }

    ctx.restore()
  } else {
    drawCard(ctx, card, x, y, faceUp)
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
  const maxVisible = Math.min(count, 12)
  const offsetStep = 3

  // Ambient shadow under the entire stack — soft and wide
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetX = 3
  ctx.shadowOffsetY = 8
  drawRoundRect(ctx, position.x, position.y, CARD_W, CARD_H, RADIUS)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.01)'
  ctx.fill()
  ctx.restore()

  // Draw stacked cards from bottom to top
  for (let i = maxVisible - 1; i >= 0; i--) {
    const sx = position.x + i * offsetStep
    const sy = position.y - i * offsetStep

    if (i === 0) {
      // Top card: honour faceUp flag, with subtle lift shadow
      ctx.save()
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
      ctx.shadowBlur = 6
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 2
      drawCard(ctx, deckObj.cards[0]!, sx, sy, faceUp)
      ctx.restore()
    } else {
      // Rest of stack: always face-back
      drawCardBack(ctx, sx, sy)

      // Right edge face — simulated card thickness with gradient
      const edgeX = sx + CARD_W
      const edgeTop = sy + RADIUS
      const edgeBot = sy + CARD_H - RADIUS
      const edgeGrad = ctx.createLinearGradient(edgeX - 2, 0, edgeX + 1, 0)
      edgeGrad.addColorStop(0, 'rgba(60, 60, 100, 0)')
      edgeGrad.addColorStop(0.4, 'rgba(70, 70, 110, 0.3)')
      edgeGrad.addColorStop(1, 'rgba(50, 50, 85, 0.15)')
      ctx.strokeStyle = edgeGrad
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(edgeX - 0.5, edgeTop)
      ctx.lineTo(edgeX - 0.5, edgeBot)
      ctx.stroke()

      // Bottom edge face
      const bottomY = sy + CARD_H
      const bottomGrad = ctx.createLinearGradient(0, bottomY - 2, 0, bottomY + 1)
      bottomGrad.addColorStop(0, 'rgba(50, 50, 85, 0)')
      bottomGrad.addColorStop(0.4, 'rgba(60, 60, 100, 0.25)')
      bottomGrad.addColorStop(1, 'rgba(40, 40, 75, 0.12)')
      ctx.strokeStyle = bottomGrad
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(sx + RADIUS, bottomY - 0.5)
      ctx.lineTo(sx + CARD_W - RADIUS, bottomY - 0.5)
      ctx.stroke()

      // Subtle separator line between stacked cards
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(sx + 2, sy)
      ctx.lineTo(sx + CARD_W - 2, sy)
      ctx.stroke()
    }
  }

  // Stack count badge — pill shape with refined shadow
  if (count > 1) {
    const badgeX = position.x + CARD_W + 8
    const badgeY = position.y + CARD_H - 24
    const badgeW = Math.max(28, 12 + `${count}`.length * 7)
    const badgeH = 22
    const badgeR = badgeH / 2

    // Badge shadow
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 2
    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeR)
    ctx.fillStyle = '#1c2128'
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
    ctx.fillText(`${count}`, badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.5)
  }
}

// ── Public: draw a loose card ───────────────────────────────────────
export function drawLooseCard(
  ctx: CanvasRenderingContext2D,
  lc: LooseCard,
) {
  const flipProgress = getProgress(lc.id)
  drawCardWithFlip(ctx, lc.card, lc.position.x, lc.position.y, lc.faceUp, flipProgress)
}
