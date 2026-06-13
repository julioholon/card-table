import { useRef, useEffect, useCallback } from 'react'
import { useTableStore } from './store/tableStore.js'
import { drawDeck, drawLooseCard } from './cards/render.js'
import { createStandardDeck } from './cards/decks.js'
import { startFlip, hasActive, pruneCompleted } from './cards/flipAnimation.js'
import { ContextMenu } from './components/ContextMenu.js'
import type { PlacedDeck } from './store/tableStore.js'
import './App.css'

const CARD_W = 120
const CARD_H = 170

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const decks = useTableStore((s) => s.decks)
  const looseCards = useTableStore((s) => s.looseCards)
  const shuffleAnim = useTableStore((s) => s.shuffleAnim)
  const addDeck = useTableStore((s) => s.addDeck)
  const flipDeck = useTableStore((s) => s.flipDeck)
  const flipCard = useTableStore((s) => s.flipCard)
  const shuffleDeck = useTableStore((s) => s.shuffleDeck)
  const startShuffleAnim = useTableStore((s) => s.startShuffleAnim)
  const clearShuffleAnim = useTableStore((s) => s.clearShuffleAnim)
  const openContextMenu = useTableStore((s) => s.openContextMenu)

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
    for (let i = decks.length - 1; i >= 0; i--) {
      const d = decks[i]!
      if (cx >= d.position.x && cx <= d.position.x + CARD_W &&
          cy >= d.position.y && cy <= d.position.y + CARD_H) {
        return d
      }
    }
    return null
  }, [decks])

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
  }, [])

  // Animation loop: keep redrawing while flips or shuffles are in progress
  const animFrameRef = useRef<number>(0)
  const animate = useCallback(() => {
    pruneCompleted()
    // Check if shuffle animation is complete
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

  // Start animation loop helpers
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

    // Re-render whenever store state changes
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
  }, [draw, decks, looseCards])

  // Click handler with hit-testing (single click = flip)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e: MouseEvent) => {
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
  }, [flipDeck, flipCard, ensureAnimating, decks, looseCards])

  // Double-click listener for shuffle
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('dblclick', handleDoubleClick)
    return () => canvas.removeEventListener('dblclick', handleDoubleClick)
  }, [handleDoubleClick])

  // Right-click context menu handler
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const deck = findDeckAt(cx, cy)
      openContextMenu(
        { x: e.clientX, y: e.clientY },
        deck ? deck.id : null,
      )
    }

    canvas.addEventListener('contextmenu', handleContextMenu)
    return () => canvas.removeEventListener('contextmenu', handleContextMenu)
  }, [findDeckAt, openContextMenu])

  return (
    <>
      <canvas ref={canvasRef} className="board-canvas" />
      <ContextMenu />
    </>
  )
}

export default App
