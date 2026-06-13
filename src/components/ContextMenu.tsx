import { useCallback, useEffect, useRef } from 'react'
import { useTableStore } from '../store/tableStore.js'

const CARD_W = 120
const CARD_H = 170

function deckOverlapsPoint(deckX: number, deckY: number, px: number, py: number): boolean {
  return px >= deckX && px <= deckX + CARD_W && py >= deckY && py <= deckY + CARD_H
}

export function ContextMenu() {
  const menuRef = useRef<HTMLDivElement>(null)
  const contextMenu = useTableStore((s) => s.contextMenu)
  const decks = useTableStore((s) => s.decks)
  const closeContextMenu = useTableStore((s) => s.closeContextMenu)
  const collectAllCards = useTableStore((s) => s.collectAllCards)
  const cutDeck = useTableStore((s) => s.cutDeck)
  const duplicateDeck = useTableStore((s) => s.duplicateDeck)

  useEffect(() => {
    if (!contextMenu.open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu()
      }
    }
    document.addEventListener('mousedown', handleClick, true)
    return () => document.removeEventListener('mousedown', handleClick, true)
  }, [contextMenu.open, closeContextMenu])

  useEffect(() => {
    if (!contextMenu.open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeContextMenu()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [contextMenu.open, closeContextMenu])

  const handleCollect = useCallback(() => {
    if (contextMenu.deckId) collectAllCards(contextMenu.deckId)
  }, [contextMenu.deckId, collectAllCards])

  const handleCut = useCallback(() => {
    if (contextMenu.deckId) cutDeck(contextMenu.deckId)
  }, [contextMenu.deckId, cutDeck])

  const handleDuplicate = useCallback(() => {
    if (contextMenu.deckId) duplicateDeck(contextMenu.deckId)
  }, [contextMenu.deckId, duplicateDeck])

  if (!contextMenu.open) return null

  const hasDeck = contextMenu.deckId !== null

  let hasOverlappingCards = false
  if (hasDeck) {
    const target = decks.find((d) => d.id === contextMenu.deckId)
    if (target) {
      const looseCards = useTableStore.getState().looseCards
      hasOverlappingCards = looseCards.some((lc) =>
        deckOverlapsPoint(target.position.x, target.position.y, lc.position.x, lc.position.y)
      )
    }
  }

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ position: 'fixed', left: contextMenu.canvasPos.x, top: contextMenu.canvasPos.y, zIndex: 1000 }}
    >
      {hasDeck && (
        <>
          <button className="context-menu-item" onClick={handleCollect} disabled={!hasOverlappingCards}>
            Collect All Cards
          </button>
          <button className="context-menu-item" onClick={handleCut}>Cut Deck</button>
          <button className="context-menu-item" onClick={handleDuplicate}>Duplicate Deck</button>
        </>
      )}
    </div>
  )
}
