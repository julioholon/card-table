// src/hooks/useDragAndDrop.ts
//
// Canvas-based drag-and-drop for decks and loose cards.
// Works with both mouse and touch input.
// Hit-tests against card bounding boxes (decks use their top-card rect,
// loose cards use their own rect). On pointer down over a target, calls
// store.startDrag; on pointer move while dragging, moves the object; on
// pointer up, commits the final position via store.moveDeck / moveCard.
//
// Shift+drag on a deck draws a card from the top of the deck instead of
// moving the deck. On mouseup, calls store.drawFromDeck with the drop
// position.

import { useEffect, useRef, useCallback } from 'react'
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
  const deckHit = hitTestDecks(decks, px, py)
  if (deckHit) return deckHit
  return hitTestLooseCards(looseCards, px, py)
}

// ── Extract position from mouse or touch event ───────────────────────
function getEventPos(
  canvas: HTMLCanvasElement,
  e: MouseEvent | Touch,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
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

  const isDrawDragRef = useRef(false)
  const drawDeckIdRef = useRef<string | null>(null)
  const hoverTargetRef = useRef<HitTarget | null>(null)
  const touchDraggingRef = useRef(false)

  const draggingRef = useRef(dragging)
  draggingRef.current = dragging
  const decksRef = useRef(decks)
  decksRef.current = decks
  const looseCardsRef = useRef(looseCards)
  looseCardsRef.current = looseCards

  const beginDrag = useCallback((x: number, y: number, isShift: boolean) => {
    const target = hitTest(decksRef.current, looseCardsRef.current, x, y)
    if (!target) return false

    if (target.kind === 'deck' && isShift) {
      const d = decksRef.current.find((d) => d.id === target.id)
      if (!d) return false
      if (d.deck.cards.length === 0) return false
      isDrawDragRef.current = true
      drawDeckIdRef.current = target.id
      return true
    }

    let objX: number, objY: number
    if (target.kind === 'deck') {
      const d = decksRef.current.find((d) => d.id === target.id)
      if (!d) return false
      objX = d.position.x
      objY = d.position.y
    } else {
      const c = looseCardsRef.current.find((c) => c.id === target.id)
      if (!c) return false
      objX = c.position.x
      objY = c.position.y
    }

    startDrag(target.kind, target.id, { x: objX - x, y: objY - y })
    return true
  }, [startDrag])

  const moveDrag = useCallback((x: number, y: number) => {
    if (isDrawDragRef.current) {
      hoverTargetRef.current = hitTest(decksRef.current, looseCardsRef.current, x, y)
      return
    }
    const drag = draggingRef.current
    if (drag.active && drag.id) {
      const newX = x + drag.offset.x
      const newY = y + drag.offset.y
      if (drag.kind === 'deck') {
        moveDeck(drag.id, { x: newX, y: newY })
      } else {
        moveCard(drag.id, { x: newX, y: newY })
      }
    }
    hoverTargetRef.current = hitTest(decksRef.current, looseCardsRef.current, x, y)
  }, [moveDeck, moveCard])

  const finishDrag = useCallback((x?: number, y?: number) => {
    if (isDrawDragRef.current && drawDeckIdRef.current) {
      if (x !== undefined && y !== undefined) {
        drawFromDeck(drawDeckIdRef.current, { x, y })
      }
      isDrawDragRef.current = false
      drawDeckIdRef.current = null
    } else if (draggingRef.current.active) {
      endDrag()
    }
    hoverTargetRef.current = null
  }, [endDrag, drawFromDeck])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onMouseDown = (e: MouseEvent) => {
      const { x, y } = getEventPos(canvas, e)
      beginDrag(x, y, e.shiftKey)
    }

    const onMouseMove = (e: MouseEvent) => {
      const { x, y } = getEventPos(canvas, e)
      moveDrag(x, y)
    }

    const onMouseUp = (e: MouseEvent) => {
      const { x, y } = getEventPos(canvas, e)
      finishDrag(x, y)
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const touch = e.touches[0]
      const { x, y } = getEventPos(canvas, touch)
      touchDraggingRef.current = beginDrag(x, y, false)
      if (touchDraggingRef.current) {
        e.preventDefault()
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      if (!touchDraggingRef.current) return
      e.preventDefault()
      const touch = e.touches[0]
      const { x, y } = getEventPos(canvas, touch)
      moveDrag(x, y)
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (touchDraggingRef.current) {
        const touch = e.changedTouches[0]
        const { x, y } = getEventPos(canvas, touch)
        finishDrag(x, y)
        touchDraggingRef.current = false
      }
    }

    const onTouchCancel = () => {
      if (touchDraggingRef.current) {
        finishDrag()
        touchDraggingRef.current = false
      }
    }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mouseleave', onMouseUp)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)
    canvas.addEventListener('touchcancel', onTouchCancel)

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('touchcancel', onTouchCancel)
    }
  }, [canvasRef, beginDrag, moveDrag, finishDrag])

  return hoverTargetRef
}
