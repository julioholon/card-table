import { useRef, useEffect, useCallback } from 'react'
import { useTableStore } from './store/tableStore.js'
import { drawDeck, drawLooseCard } from './cards/render.js'
import { createStandardDeck } from './cards/decks.js'
import { startFlip, hasActive, pruneCompleted } from './cards/flipAnimation.js'
import { useDragAndDrop } from './hooks/useDragAndDrop.js'
import { ContextMenu } from './components/ContextMenu.js'
import type { PlacedDeck } from './store/tableStore.js'
import './App.css'

const CARD_W = 120
const CARD_H = 170

// Long-press duration for touch context menu (ms)
const LONG_PRESS_MS = 500
// Movement threshold to cancel long-press (px)
const LONG_PRESS_MOVE_THRESHOLD = 10

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // const { hoverTarget } = useDragAndDrop(canvasRef) // TODO: useDragAndDrop not yet wired
  const dragging = useTableStore((s) => s.dragging)
  const contextMenu = useTableStore((s) => s.contextMenu)
  const addDeck = useTableStore((s) => s.addDeck)
  const flipDeck = useTableStore((s) => s.flipDeck)
  const flipCard = useTableStore((s) => s.flipCard)
  const shuffleDeck = useTableStore((s) => s.shuffleDeck)
  const startShuffleAnim = useTableStore((s) => s.startShuffleAnim)
  const clearShuffleAnim = useTableStore((s) => s.clearShuffleAnim)
  const openContextMenu = useTableStore((s) => s.openContextMenu)

  // Long-press tracking
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const touchMovedRef = useRef(false)

  // Seed a standard deck on first render
  useEffect(() => {
    const store = useTableStore.getState()
    if (store.decks.length === 0 && store.looseCards.length === 0) {
      const standard = createStandardDeck()
      addDeck(standard, { x: 120, y: 100 })
    }
  }, [addDeck])

  // Hit-test: find deck at canvas position
  const findDeckAt = useCallback((cx: number, cy: number): PlacedDeck | null => {
    const decks = useTableStore.getState().decks
    for (let i = decks.length - 1; i >= 0; i--) {
      const d = decks[i]!
      if (cx >= d.position.x && cx <= d.position.x + CARD_W &&
          cy >= d.position.y && cy <= d.position.y + CARD_H) {
        return d
      }
    }
    return null
  }, [])

  // Hit-test: find loose card at canvas position
  const findCardAt = useCallback((cx: number, cy: number) => {
    const cards = useTableStore.getState().looseCards
    for (let i = cards.length - 1; i >= 0; i--) {
      const c = cards[i]!
      if (cx >= c.position.x && cx <= c.position.x + CARD_W &&
          cy >= c.position.y && cy <= c.position.y + CARD_H) {
        return c
      }
    }
    return null
  }, [])

  // Double-click handler: shuffle deck
  const handleDoubleClick = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const deck = findDeckAt(cx, cy)
    if (deck) {
      shuffleDeck(deck.id)
      startShuffleAnim(deck.id, deck.deck.cards.length)
    }
  }, [findDeckAt, shuffleDeck, startShuffleAnim])

  // Right-click context menu handler
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top

    // Hit-test loose cards first (they render on top)
    const card = findCardAt(cx, cy)
    if (card) {
      openContextMenu({ x: e.clientX, y: e.clientY }, null, card.id)
      return
    }

    // Then hit-test decks
    const deck = findDeckAt(cx, cy)
    if (deck) {
      openContextMenu({ x: e.clientX, y: e.clientY }, deck.id, null)
      return
    }

    // Clicked on empty space — no context menu
  }, [openContextMenu, findCardAt, findDeckAt])

  // Draw a drop-zone highlight
  const drawDropHighlight = useCallback((ctx: CanvasRenderingContext2D, target: { kind: string; id: string; x: number; y: number }) => {
    ctx.save()
    ctx.strokeStyle = '#58a6ff'
    ctx.lineWidth = 3
    ctx.setLineDash([6, 4])
    const pad = 4
    ctx.strokeRect(target.x - pad, target.y - pad, CARD_W + pad * 2, CARD_H + pad * 2)
    ctx.restore()
  }, [])

  // Main draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const state = useTableStore.getState()

    // Dark background
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Subtle grid
    ctx.strokeStyle = '#161b22'
    ctx.lineWidth = 1
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Draw all decks (stacked cards)
    for (const deck of state.decks) {
      drawDeck(ctx, deck)
    }

    // Draw all loose cards
    for (const lc of state.looseCards) {
      drawLooseCard(ctx, lc)
    }

    // Draw drop-zone highlight when dragging and hovering over a target
    if (dragging.active && hoverTarget) {
      drawDropHighlight(ctx, hoverTarget)
    }
  }, [dragging.active, hoverTarget, drawDropHighlight])

  // Animation loop
  const animFrameRef = useRef<number>(0)
  const animate = useCallback(() => {
    pruneCompleted()
    const state = useTableStore.getState()
    if (state.shuffleAnim) {
      const elapsed = Date.now() - state.shuffleAnim.startTime
      if (elapsed >= state.shuffleAnim.duration) {
        clearShuffleAnim()
      }
    }
    draw()
    if (hasActive() || useTableStore.getState().shuffleAnim) {
      animFrameRef.current = requestAnimationFrame(animate)
    }
  }, [draw, clearShuffleAnim])

  const ensureAnimating = useCallback(() => {
    if (!hasActive() && !useTableStore.getState().shuffleAnim) {
      animFrameRef.current = requestAnimationFrame(animate)
    }
  }, [animate])

  // Canvas resize + store subscription
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      draw()
    }

    const unsub = useTableStore.subscribe(() => {
      draw()
    })

    resize()
    draw()
    window.addEventListener('resize', resize)

    return () => {
      unsub()
      window.removeEventListener('resize', resize)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [draw])

  // Click handler with hit-testing (single click = flip)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e: MouseEvent) => {
      // Don't process clicks while dragging
      if (dragging.active) return

      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      const state = useTableStore.getState()

      // Hit-test loose cards (check in reverse draw order = topmost first)
      for (let i = state.looseCards.length - 1; i >= 0; i--) {
        const lc = state.looseCards[i]!
        if (mx >= lc.position.x && mx <= lc.position.x + CARD_W &&
            my >= lc.position.y && my <= lc.position.y + CARD_H) {
          startFlip(lc.id, !lc.faceUp)
          flipCard(lc.id)
          ensureAnimating()
          return
        }
      }

      // Hit-test decks (top card area, reverse order)
      for (let i = state.decks.length - 1; i >= 0; i--) {
        const deck = state.decks[i]!
        const pos = deck.position
        if (mx >= pos.x && mx <= pos.x + CARD_W &&
            my >= pos.y && my <= pos.y + CARD_H) {
          startFlip(deck.id, !deck.faceUp)
          flipDeck(deck.id)
          ensureAnimating()
          return
        }
      }
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [flipDeck, flipCard, ensureAnimating, dragging.active])

  // Double-click listener for shuffle
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('dblclick', handleDoubleClick)
    return () => canvas.removeEventListener('dblclick', handleDoubleClick)
  }, [handleDoubleClick])

  // Context menu listener (right-click)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('contextmenu', handleContextMenu)
    return () => canvas.removeEventListener('contextmenu', handleContextMenu)
  }, [handleContextMenu])

  // Long-press for touch context menu
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const clearLongPress = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
      touchStartPosRef.current = null
      touchMovedRef.current = false
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        clearLongPress()
        return
      }
      const touch = e.touches[0]
      const rect = canvas.getBoundingClientRect()
      const cx = touch.clientX - rect.left
      const cy = touch.clientY - rect.top

      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
      touchMovedRef.current = false

      longPressTimerRef.current = setTimeout(() => {
        if (touchMovedRef.current) return
        if (useTableStore.getState().dragging.active) return

        // Hit-test loose cards first
        const cards = useTableStore.getState().looseCards
        let cardId: string | null = null
        for (let i = cards.length - 1; i >= 0; i--) {
          const c = cards[i]!
          if (cx >= c.position.x && cx <= c.position.x + CARD_W &&
              cy >= c.position.y && cy <= c.position.y + CARD_H) {
            cardId = c.id
            break
          }
        }

        if (cardId) {
          openContextMenu({ x: touch.clientX, y: touch.clientY }, null, cardId)
          clearLongPress()
          return
        }

        // Then hit-test decks
        const decks = useTableStore.getState().decks
        let deckId: string | null = null
        for (let i = decks.length - 1; i >= 0; i--) {
          const d = decks[i]!
          if (cx >= d.position.x && cx <= d.position.x + CARD_W &&
              cy >= d.position.y && cy <= d.position.y + CARD_H) {
            deckId = d.id
            break
          }
        }

        if (deckId) {
          openContextMenu({ x: touch.clientX, y: touch.clientY }, deckId, null)
        }
        clearLongPress()
      }, LONG_PRESS_MS)
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartPosRef.current) return
      const touch = e.touches[0]
      const dx = touch.clientX - touchStartPosRef.current.x
      const dy = touch.clientY - touchStartPosRef.current.y
      if (Math.abs(dx) > LONG_PRESS_MOVE_THRESHOLD || Math.abs(dy) > LONG_PRESS_MOVE_THRESHOLD) {
        touchMovedRef.current = true
        clearLongPress()
      }
    }

    const onTouchEnd = () => {
      clearLongPress()
    }

    const onTouchCancel = () => {
      clearLongPress()
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchmove', onTouchMove, { passive: true })
    canvas.addEventListener('touchend', onTouchEnd)
    canvas.addEventListener('touchcancel', onTouchCancel)

    return () => {
      clearLongPress()
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('touchcancel', onTouchCancel)
    }
  }, [openContextMenu])

  return (
    <>
      <canvas ref={canvasRef} className="board-canvas" />
      {contextMenu.open && <ContextMenu />}
    </>
  )
}

export default App
