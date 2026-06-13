import { useRef, useEffect } from 'react'
import './App.css'

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

      // Placeholder rectangle
      const rectW = 320
      const rectH = 200
      const x = (canvas.width - rectW) / 2
      const y = (canvas.height - rectH) / 2

      ctx.fillStyle = '#161b22'
      ctx.strokeStyle = '#30363d'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(x, y, rectW, rectH, 12)
      ctx.fill()
      ctx.stroke()

      // Placeholder text
      ctx.fillStyle = '#8b949e'
      ctx.font = '16px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Card Table', canvas.width / 2, canvas.height / 2 - 10)
      ctx.font = '13px system-ui, sans-serif'
      ctx.fillText('Scaffold ready', canvas.width / 2, canvas.height / 2 + 16)
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return <canvas ref={canvasRef} className="board-canvas" />
}

export default App
