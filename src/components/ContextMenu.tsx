import { useCallback, useEffect, useRef, useState } from 'react'
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
  const looseCards = useTableStore((s) => s.looseCards)
  const closeContextMenu = useTableStore((s) => s.closeContextMenu)
  const collectAllCards = useTableStore((s) => s.collectAllCards)
  const cutDeck = useTableStore((s) => s.cutDeck)
  const duplicateDeck = useTableStore((s) => s.duplicateDeck)
  const flipCard = useTableStore((s) => s.flipCard)
  const deleteCard = useTableStore((s) => s.deleteCard)
  const addCardToDeck = useTableStore((s) => s.addCardToDeck)
  const [deckSubmenuOpen, setDeckSubmenuOpen] = useState(false)

  useEffect(() => {
    setDeckSubmenuOpen(false)
  }, [contextMenu.open])

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

  const handleFlipCard = useCallback(() => {
    if (contextMenu.cardId) {
      flipCard(contextMenu.cardId)
      closeContextMenu()
    }
  }, [contextMenu.cardId, flipCard, closeContextMenu])

  const handleDeleteCard = useCallback(() => {
    if (contextMenu.cardId) {
      deleteCard(contextMenu.cardId)
    }
  }, [contextMenu.cardId, deleteCard])

  const handleAddToDeck = useCallback((deckId: string) => {
    if (contextMenu.cardId) {
      addCardToDeck(contextMenu.cardId, deckId)
    }
  }, [contextMenu.cardId, addCardToDeck])

  if (!contextMenu.open) return null

  const hasDeck = contextMenu.deckId !== null
  const hasCard = contextMenu.cardId !== null

  let hasOverlappingCards = false
  if (hasDeck) {
    const target = decks.find((d) => d.id === contextMenu.deckId)
    if (target) {
      hasOverlappingCards = looseCards.some((lc) =>
        deckOverlapsPoint(target.position.x, target.position.y, lc.position.x, lc.position.y)
      )
    }
  }

  // Find the card being acted on (for showing current face state)
  const targetCard = hasCard ? looseCards.find((c) => c.id === contextMenu.cardId) : null

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
      {hasCard && (
        <>
          <button className="context-menu-item" onClick={handleFlipCard}>
            {targetCard?.faceUp ? 'Flip Face Down' : 'Flip Face Up'}
          </button>
          <div
            className="context-menu-item context-menu-parent"
            onMouseEnter={() => setDeckSubmenuOpen(true)}
            onMouseLeave={() => setDeckSubmenuOpen(false)}
            style={{ position: 'relative' }}
          >
            Add to Deck
            {deckSubmenuOpen && (
              <div
                className="context-menu context-submenu"
                style={{ position: 'absolute', left: '100%', top: 0, marginLeft: 2 }}
              >
                {decks.length === 0 && (
                  <div className="context-menu-item" style={{ color: '#484f58', cursor: 'default' }}>
                    No decks
                  </div>
                )}
                {decks.map((d) => (
                  <button
                    key={d.id}
                    className="context-menu-item"
                    onClick={() => handleAddToDeck(d.id)}
                  >
                    {d.deck.name} ({d.deck.cards.length})
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="context-menu-item context-menu-danger" onClick={handleDeleteCard}>
            Delete
          </button>
        </>
      )}
    </div>
  )
}
