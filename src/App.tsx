import { useRef, useEffect } from 'react'
import { useTableStore } from './store/tableStore.js'
import { drawDeck, drawLooseCard } from './cards/render.js'
import { createStandardDeck } from './cards/decks.js'
import './App.css'

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const decks = useTableStore((s) => s.decks)
  const looseCards = useTableStore((s) => s.looseCards)
  const addDeck = useTableStore((s) => s.addDeck)

  // Seed a standard deck on first render
  useEffect(() => {
    const store = useTableStore.getState()
    if (store.decks.length === 0 && store.looseCards.length === 0) {
      const standard = createStandardDeck()
      addDeck(standard, { x: 120, y: 100 })
    }
  }, [addDeck])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      draw()
    }

    const draw = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

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
      for (const deck of decks) {
        drawDeck(ctx, deck)
      }

      // Draw all loose cards
      for (const lc of looseCards) {
        drawLooseCard(ctx, lc)
      }
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
    }
  }, [decks, looseCards])

  return <canvas ref={canvasRef} className="board-canvas" />
}

export default App
