// src/hooks/useDragAndDrop.ts
//
// Canvas-based drag-and-drop for decks and loose cards.
// Hit-tests against card bounding boxes (decks use their top-card rect,
// loose cards use their own rect). On mousedown over a target, calls
// store.startDrag; on mousemove while dragging, moves the object; on
// mouseup, commits the final position via store.moveDeck / moveCard.
//
// Shift+drag on a deck draws a card from the top of the deck instead of
// moving the deck. On mouseup, calls store.drawFromDeck with the drop
// position.

import { useEffect, useRef } from 'react'
import { useTableStore } from '../store/tableStore.js'
import type { PlacedDeck, LooseCard } from '../store/tableStore.js'

// Must match render.ts card dimensions
const CARD_W = 120
const CARD_H = 170

// ── Hit-test result ──────────────────────────────────────────────────
export interface HitTarget {
  kind: 'deck' | 'card'
  id: string
}

// ── Hit-test helpers ─────────────────────────────────────────────────
function pointInRect(
  px: number, py: number,
  rx: number, ry: number, rw: number, rh: number,
): boolean {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh
}

function hitTestDecks(
  decks: readonly PlacedDeck[],
  px: number, py: number,
): HitTarget | null {
  // Iterate in reverse so topmost (last drawn) wins
  for (let i = decks.length - 1; i >= 0; i--) {
    const d = decks[i]
    if (pointInRect(px, py, d.position.x, d.position.y, CARD_W, CARD_H)) {
      return { kind: 'deck', id: d.id }
    }
  }
  return null
}

function hitTestLooseCards(
  cards: readonly LooseCard[],
  px: number, py: number,
): HitTarget | null {
  for (let i = cards.length - 1; i >= 0; i--) {
    const c = cards[i]
    if (pointInRect(px, py, c.position.x, c.position.y, CARD_W, CARD_H)) {
      return { kind: 'card', id: c.id }
    }
  }
  return null
}

/** Hit-test both decks and loose cards; decks take priority if overlapping. */
export function hitTest(
  decks: readonly PlacedDeck[],
  looseCards: readonly LooseCard[],
  px: number, py: number,
): HitTarget | null {
  // Decks first (they're typically underneath loose cards)
  const deckHit = hitTestDecks(decks, px, py)
  if (deckHit) return deckHit
  return hitTestLooseCards(looseCards, px, py)
}

// ── Hook ─────────────────────────────────────────────────────────────
export function useDragAndDrop(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const dragging = useTableStore((s) => s.dragging)
  const decks = useTableStore((s) => s.decks)
  const looseCards = useTableStore((s) => s.looseCards)
  const startDrag = useTableStore((s) => s.startDrag)
  const moveDeck = useTableStore((s) => s.moveDeck)
  const moveCard = useTableStore((s) => s.moveCard)
  const endDrag = useTableStore((s) => s.endDrag)
  const drawFromDeck = useTableStore((s) => s.drawFromDeck)

  // Track whether the current drag is a draw-from-deck operation
  const isDrawDragRef = useRef(false)
  const drawDeckIdRef = useRef<string | null>(null)

  // Track the last hit target for drop-zone highlighting
  const hoverTargetRef = useRef<HitTarget | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getPos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const onMouseDown = (e: MouseEvent) => {
      const { x, y } = getPos(e)
      const target = hitTest(decks, looseCards, x, y)
      if (!target) return

      // Shift+drag on a deck = draw a card from it
      if (target.kind === 'deck' && e.shiftKey) {
        const d = decks.find((d) => d.id === target.id)
        if (!d) return
        if (d.deck.cards.length === 0) return // cannot draw from empty deck
        isDrawDragRef.current = true
        drawDeckIdRef.current = target.id
        return
      }

      // Calculate offset from object origin to cursor
      let objX: number, objY: number
      if (target.kind === 'deck') {
        const d = decks.find((d) => d.id === target.id)
        if (!d) return
        objX = d.position.x
        objY = d.position.y
      } else {
        const c = looseCards.find((c) => c.id === target.id)
        if (!c) return
        objX = c.position.x
        objY = c.position.y
      }

      startDrag(target.kind, target.id, { x: objX - x, y: objY - y })
    }

    const onMouseMove = (e: MouseEvent) => {
      const { x, y } = getPos(e)

      if (isDrawDragRef.current) {
        // During a draw drag, no object moves — just track for hover highlight
        hoverTargetRef.current = hitTest(decks, looseCards, x, y)
        return
      }

      if (dragging.active && dragging.id) {
        // Move the dragged object
        const newX = x + dragging.offset.x
        const newY = y + dragging.offset.y
        if (dragging.kind === 'deck') {
          moveDeck(dragging.id, { x: newX, y: newY })
        } else {
          moveCard(dragging.id, { x: newX, y: newY })
        }
      }

      // Update hover target for drop-zone highlighting
      hoverTargetRef.current = hitTest(decks, looseCards, x, y)
    }

    const onMouseUp = (e: MouseEvent) => {
      if (isDrawDragRef.current && drawDeckIdRef.current) {
        // Draw a card from the deck at the drop position
        const { x, y } = getPos(e)
        drawFromDeck(drawDeckIdRef.current, { x, y })
        isDrawDragRef.current = false
        drawDeckIdRef.current = null
      } else if (dragging.active) {
        endDrag()
      }
      hoverTargetRef.current = null
    }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mouseleave', onMouseUp)

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseUp)
    }
  }, [canvasRef, dragging, decks, looseCards, startDrag, moveDeck, moveCard, endDrag, drawFromDeck])

  return hoverTargetRef
}
