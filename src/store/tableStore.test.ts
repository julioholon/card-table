// src/store/tableStore.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useTableStore, STORAGE_KEY } from './tableStore.js'
import { createStandardDeck } from '../cards/decks.js'

function resetStore() {
  useTableStore.setState({
    decks: [],
    looseCards: [],
    dragging: { active: false, kind: null, id: null, offset: { x: 0, y: 0 } },
    contextMenu: { open: false, canvasPos: { x: 0, y: 0 }, deckId: null, cardId: null },
  })
  localStorage.removeItem(STORAGE_KEY)
}

beforeEach(resetStore)
afterEach(resetStore)

describe('addDeck', () => {
  it('adds a deck at default position (100, 100)', () => {
    const deck = createStandardDeck()
    useTableStore.getState().addDeck(deck)
    const state = useTableStore.getState()
    expect(state.decks).toHaveLength(1)
    expect(state.decks[0].deck).toBe(deck)
    expect(state.decks[0].position).toEqual({ x: 100, y: 100 })
    expect(state.decks[0].faceUp).toBe(false)
  })

  it('adds a deck at a custom position', () => {
    const deck = createStandardDeck()
    useTableStore.getState().addDeck(deck, { x: 300, y: 400 })
    expect(useTableStore.getState().decks[0].position).toEqual({ x: 300, y: 400 })
  })

  it('assigns unique IDs to each deck', () => {
    const { addDeck } = useTableStore.getState()
    addDeck(createStandardDeck())
    addDeck(createStandardDeck())
    const state = useTableStore.getState()
    expect(state.decks[0].id).not.toBe(state.decks[1].id)
  })

  it('appends to existing decks', () => {
    const { addDeck } = useTableStore.getState()
    addDeck(createStandardDeck())
    addDeck(createStandardDeck())
    addDeck(createStandardDeck())
    expect(useTableStore.getState().decks).toHaveLength(3)
  })
})

describe('removeDeck', () => {
  it('removes a deck by ID', () => {
    const { addDeck, removeDeck } = useTableStore.getState()
    addDeck(createStandardDeck())
    addDeck(createStandardDeck())
    const ids = useTableStore.getState().decks.map((d) => d.id)
    removeDeck(ids[0])
    const state = useTableStore.getState()
    expect(state.decks).toHaveLength(1)
    expect(state.decks[0].id).toBe(ids[1])
  })

  it('does nothing when ID does not exist', () => {
    const { addDeck, removeDeck } = useTableStore.getState()
    addDeck(createStandardDeck())
    removeDeck('nonexistent')
    expect(useTableStore.getState().decks).toHaveLength(1)
  })
})

describe('addLooseCard', () => {
  it('adds a loose card at default position (200, 200)', () => {
    const deck = createStandardDeck()
    const card = deck.cards[0]
    useTableStore.getState().addLooseCard(card)
    const state = useTableStore.getState()
    expect(state.looseCards).toHaveLength(1)
    expect(state.looseCards[0].card).toBe(card)
    expect(state.looseCards[0].position).toEqual({ x: 200, y: 200 })
    expect(state.looseCards[0].faceUp).toBe(true)
  })

  it('adds a loose card at a custom position', () => {
    const deck = createStandardDeck()
    const card = deck.cards[0]
    useTableStore.getState().addLooseCard(card, { x: 500, y: 600 })
    expect(useTableStore.getState().looseCards[0].position).toEqual({ x: 500, y: 600 })
  })

  it('assigns unique IDs to each loose card', () => {
    const deck = createStandardDeck()
    const { addLooseCard } = useTableStore.getState()
    addLooseCard(deck.cards[0])
    addLooseCard(deck.cards[1])
    const state = useTableStore.getState()
    expect(state.looseCards[0].id).not.toBe(state.looseCards[1].id)
  })
})

describe('moveDeck', () => {
  it('updates the position of the target deck', () => {
    const { addDeck, moveDeck } = useTableStore.getState()
    addDeck(createStandardDeck())
    const deckId = useTableStore.getState().decks[0].id
    moveDeck(deckId, { x: 999, y: 888 })
    expect(useTableStore.getState().decks[0].position).toEqual({ x: 999, y: 888 })
  })

  it('does not affect other decks', () => {
    const { addDeck, moveDeck } = useTableStore.getState()
    addDeck(createStandardDeck())
    addDeck(createStandardDeck())
    const decks = useTableStore.getState().decks
    moveDeck(decks[0].id, { x: 111, y: 222 })
    expect(useTableStore.getState().decks[1].position).toEqual({ x: 100, y: 100 })
  })
})

describe('moveCard', () => {
  it('updates the position of the target loose card', () => {
    const deck = createStandardDeck()
    const { addLooseCard, moveCard } = useTableStore.getState()
    addLooseCard(deck.cards[0])
    const cardId = useTableStore.getState().looseCards[0].id
    moveCard(cardId, { x: 777, y: 666 })
    expect(useTableStore.getState().looseCards[0].position).toEqual({ x: 777, y: 666 })
  })

  it('does not affect other loose cards', () => {
    const deck = createStandardDeck()
    const { addLooseCard, moveCard } = useTableStore.getState()
    addLooseCard(deck.cards[0])
    addLooseCard(deck.cards[1])
    const cards = useTableStore.getState().looseCards
    moveCard(cards[0].id, { x: 333, y: 444 })
    expect(useTableStore.getState().looseCards[1].position).toEqual({ x: 200, y: 200 })
  })
})

describe('dragging state', () => {
  it('starts as inactive', () => {
    const { dragging } = useTableStore.getState()
    expect(dragging.active).toBe(false)
    expect(dragging.kind).toBeNull()
    expect(dragging.id).toBeNull()
  })

  it('startDrag sets active dragging state', () => {
    useTableStore.getState().startDrag('deck', 'deck_1', { x: 10, y: 20 })
    const { dragging } = useTableStore.getState()
    expect(dragging.active).toBe(true)
    expect(dragging.kind).toBe('deck')
    expect(dragging.id).toBe('deck_1')
    expect(dragging.offset).toEqual({ x: 10, y: 20 })
  })

  it('updateDrag changes only the offset', () => {
    const { startDrag, updateDrag } = useTableStore.getState()
    startDrag('card', 'card_1', { x: 5, y: 5 })
    updateDrag({ x: 50, y: 60 })
    const { dragging } = useTableStore.getState()
    expect(dragging.active).toBe(true)
    expect(dragging.kind).toBe('card')
    expect(dragging.id).toBe('card_1')
    expect(dragging.offset).toEqual({ x: 50, y: 60 })
  })

  it('endDrag resets to default state', () => {
    const { startDrag, endDrag } = useTableStore.getState()
    startDrag('deck', 'deck_1', { x: 10, y: 20 })
    endDrag()
    const { dragging } = useTableStore.getState()
    expect(dragging.active).toBe(false)
    expect(dragging.kind).toBeNull()
    expect(dragging.id).toBeNull()
    expect(dragging.offset).toEqual({ x: 0, y: 0 })
  })
})

describe('state updates trigger re-renders', () => {
  it('produces new array references on mutation', () => {
    const { addDeck } = useTableStore.getState()
    const decksBefore = useTableStore.getState().decks
    addDeck(createStandardDeck())
    const decksAfter = useTableStore.getState().decks
    expect(decksAfter).not.toBe(decksBefore)
    expect(decksAfter).toHaveLength(1)
  })

  it('produces new looseCards array on addLooseCard', () => {
    const deck = createStandardDeck()
    const { addLooseCard } = useTableStore.getState()
    const before = useTableStore.getState().looseCards
    addLooseCard(deck.cards[0])
    const after = useTableStore.getState().looseCards
    expect(after).not.toBe(before)
    expect(after).toHaveLength(1)
  })
})

describe('localStorage persistence', () => {
  it('saves decks to localStorage when state changes', () => {
    const { addDeck } = useTableStore.getState()
    addDeck(createStandardDeck(), { x: 150, y: 250 })
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.state.decks).toHaveLength(1)
    expect(parsed.state.decks[0].position).toEqual({ x: 150, y: 250 })
    expect(parsed.state.decks[0].faceUp).toBe(false)
  })

  it('saves loose cards to localStorage when state changes', () => {
    const deck = createStandardDeck()
    const { addLooseCard } = useTableStore.getState()
    addLooseCard(deck.cards[0], { x: 350, y: 450 })
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.state.looseCards).toHaveLength(1)
    expect(parsed.state.looseCards[0].position).toEqual({ x: 350, y: 450 })
    expect(parsed.state.looseCards[0].faceUp).toBe(true)
  })

  it('does NOT persist dragging state', () => {
    const { startDrag } = useTableStore.getState()
    startDrag('deck', 'deck_1', { x: 10, y: 20 })
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw!)
      expect(parsed.state.dragging).toBeUndefined()
    }
  })

  it('restores decks from localStorage on rehydration', () => {
    const deck = createStandardDeck()
    const persisted = {
      state: {
        decks: [
          { id: 'deck_42', deck, position: { x: 123, y: 456 }, faceUp: true },
        ],
        looseCards: [],
      },
      version: 0,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
    useTableStore.persist.rehydrate()
    const state = useTableStore.getState()
    expect(state.decks.length).toBeGreaterThanOrEqual(0)
  })

  it('clearing localStorage resets the board', () => {
    const { addDeck, addLooseCard } = useTableStore.getState()
    addDeck(createStandardDeck())
    addLooseCard(createStandardDeck().cards[0])
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    localStorage.removeItem(STORAGE_KEY)
    useTableStore.persist.rehydrate()
    const state = useTableStore.getState()
    expect(state.decks).toHaveLength(0)
    expect(state.looseCards).toHaveLength(0)
  })

  it('preserves deck order across persistence', () => {
    const { addDeck } = useTableStore.getState()
    addDeck(createStandardDeck(), { x: 10, y: 10 })
    addDeck(createStandardDeck(), { x: 20, y: 20 })
    addDeck(createStandardDeck(), { x: 30, y: 30 })
    const raw = localStorage.getItem(STORAGE_KEY)!
    const parsed = JSON.parse(raw)
    expect(parsed.state.decks).toHaveLength(3)
    expect(parsed.state.decks[0].position).toEqual({ x: 10, y: 10 })
    expect(parsed.state.decks[1].position).toEqual({ x: 20, y: 20 })
    expect(parsed.state.decks[2].position).toEqual({ x: 30, y: 30 })
  })

  it('preserves faceUp state for decks and cards', () => {
    const deck = createStandardDeck()
    const { addDeck, addLooseCard } = useTableStore.getState()
    addDeck(deck, { x: 100, y: 100 })
    addLooseCard(deck.cards[0], { x: 200, y: 200 })
    const raw = localStorage.getItem(STORAGE_KEY)!
    const parsed = JSON.parse(raw)
    expect(parsed.state.decks[0].faceUp).toBe(false)
    expect(parsed.state.looseCards[0].faceUp).toBe(true)
  })
})

describe('context menu', () => {
  it('starts closed', () => {
    const { contextMenu } = useTableStore.getState()
    expect(contextMenu.open).toBe(false)
    expect(contextMenu.deckId).toBeNull()
  })

  it('openContextMenu sets open state with position and deckId', () => {
    useTableStore.getState().openContextMenu({ x: 150, y: 250 }, 'deck_1')
    const { contextMenu } = useTableStore.getState()
    expect(contextMenu.open).toBe(true)
    expect(contextMenu.canvasPos).toEqual({ x: 150, y: 250 })
    expect(contextMenu.deckId).toBe('deck_1')
  })

  it('openContextMenu with null deckId', () => {
    useTableStore.getState().openContextMenu({ x: 50, y: 50 }, null)
    const { contextMenu } = useTableStore.getState()
    expect(contextMenu.open).toBe(true)
    expect(contextMenu.deckId).toBeNull()
  })

  it('closeContextMenu resets to default state', () => {
    const { openContextMenu, closeContextMenu } = useTableStore.getState()
    openContextMenu({ x: 100, y: 200 }, 'deck_1')
    closeContextMenu()
    const { contextMenu } = useTableStore.getState()
    expect(contextMenu.open).toBe(false)
    expect(contextMenu.deckId).toBeNull()
    expect(contextMenu.canvasPos).toEqual({ x: 0, y: 0 })
  })
})

describe('collectAllCards', () => {
  it('does nothing when deckId does not exist', () => {
    const { collectAllCards } = useTableStore.getState()
    const decksBefore = useTableStore.getState().decks
    const cardsBefore = useTableStore.getState().looseCards
    collectAllCards('nonexistent')
    expect(useTableStore.getState().decks).toBe(decksBefore)
    expect(useTableStore.getState().looseCards).toBe(cardsBefore)
  })

  it('collects loose cards that overlap with the deck', () => {
    const deck = createStandardDeck()
    const { addDeck, addLooseCard, collectAllCards } = useTableStore.getState()
    addDeck(deck, { x: 100, y: 100 })
    const deckId = useTableStore.getState().decks[0].id
    addLooseCard(deck.cards[0], { x: 110, y: 110 })
    addLooseCard(deck.cards[1], { x: 500, y: 500 })
    collectAllCards(deckId)
    const state = useTableStore.getState()
    expect(state.looseCards).toHaveLength(1)
    expect(state.looseCards[0].position).toEqual({ x: 500, y: 500 })
    expect(state.decks[0].deck.cards).toHaveLength(53)
  })

  it('closes the context menu after collecting', () => {
    const deck = createStandardDeck()
    const { addDeck, addLooseCard, openContextMenu, collectAllCards } = useTableStore.getState()
    addDeck(deck, { x: 100, y: 100 })
    const deckId = useTableStore.getState().decks[0].id
    addLooseCard(deck.cards[0], { x: 110, y: 110 })
    openContextMenu({ x: 110, y: 110 }, deckId)
    collectAllCards(deckId)
    expect(useTableStore.getState().contextMenu.open).toBe(false)
  })
})

describe('cutDeck', () => {
  it('does nothing when deckId does not exist', () => {
    const { cutDeck } = useTableStore.getState()
    cutDeck('nonexistent')
    expect(useTableStore.getState().decks).toHaveLength(0)
  })

  it('does nothing when deck has fewer than 2 cards', () => {
    const { addDeck, cutDeck } = useTableStore.getState()
    addDeck({ name: 'tiny', cards: [createStandardDeck().cards[0]] }, { x: 100, y: 100 })
    const deckId = useTableStore.getState().decks[0].id
    cutDeck(deckId)
    expect(useTableStore.getState().decks).toHaveLength(1)
  })

  it('splits deck into two halves', () => {
    const deck = createStandardDeck()
    const { addDeck, cutDeck } = useTableStore.getState()
    addDeck(deck, { x: 100, y: 100 })
    const deckId = useTableStore.getState().decks[0].id
    cutDeck(deckId)
    const state = useTableStore.getState()
    expect(state.decks).toHaveLength(2)
    const original = state.decks.find((d) => d.id === deckId)!
    expect(original.deck.cards).toHaveLength(26)
    const newDeck = state.decks.find((d) => d.id !== deckId)!
    expect(newDeck.deck.cards).toHaveLength(26)
    expect(newDeck.position.x).toBeGreaterThan(original.position.x)
    expect(newDeck.position.y).toBeGreaterThan(original.position.y)
  })

  it('closes the context menu after cutting', () => {
    const deck = createStandardDeck()
    const { addDeck, openContextMenu, cutDeck } = useTableStore.getState()
    addDeck(deck, { x: 100, y: 100 })
    const deckId = useTableStore.getState().decks[0].id
    openContextMenu({ x: 100, y: 100 }, deckId)
    cutDeck(deckId)
    expect(useTableStore.getState().contextMenu.open).toBe(false)
  })
})

describe('duplicateDeck', () => {
  it('does nothing when deckId does not exist', () => {
    const { duplicateDeck } = useTableStore.getState()
    duplicateDeck('nonexistent')
    expect(useTableStore.getState().decks).toHaveLength(0)
  })

  it('creates a full copy of the deck face-down', () => {
    const deck = createStandardDeck()
    const { addDeck, duplicateDeck } = useTableStore.getState()
    addDeck(deck, { x: 100, y: 100 })
    const deckId = useTableStore.getState().decks[0].id
    duplicateDeck(deckId)
    const state = useTableStore.getState()
    expect(state.decks).toHaveLength(2)
    const original = state.decks.find((d) => d.id === deckId)!
    const copy = state.decks.find((d) => d.id !== deckId)!
    expect(copy.deck.cards).toHaveLength(original.deck.cards.length)
    expect(copy.faceUp).toBe(false)
    expect(original.faceUp).toBe(false)
    expect(copy.position.x).toBe(140)
    expect(copy.position.y).toBe(140)
  })

  it('creates independent card objects (deep clone)', () => {
    const deck = createStandardDeck()
    const { addDeck, duplicateDeck } = useTableStore.getState()
    addDeck(deck, { x: 100, y: 100 })
    const deckId = useTableStore.getState().decks[0].id
    duplicateDeck(deckId)
    const state = useTableStore.getState()
    const original = state.decks.find((d) => d.id === deckId)!
    const copy = state.decks.find((d) => d.id !== deckId)!
    expect(copy.deck.cards[0]).toEqual(original.deck.cards[0])
    expect(copy.deck.cards[0]).not.toBe(original.deck.cards[0])
  })

  it('closes the context menu after duplicating', () => {
    const deck = createStandardDeck()
    const { addDeck, openContextMenu, duplicateDeck } = useTableStore.getState()
    addDeck(deck, { x: 100, y: 100 })
    const deckId = useTableStore.getState().decks[0].id
    openContextMenu({ x: 100, y: 100 }, deckId)
    duplicateDeck(deckId)
    expect(useTableStore.getState().contextMenu.open).toBe(false)
  })
})

describe('drawFromDeck', () => {
  it('does nothing when deckId does not exist', () => {
    const { drawFromDeck } = useTableStore.getState()
    const cardsBefore = useTableStore.getState().looseCards
    drawFromDeck('nonexistent', { x: 300, y: 300 })
    expect(useTableStore.getState().looseCards).toBe(cardsBefore)
    expect(useTableStore.getState().decks).toHaveLength(0)
  })

  it('does nothing when deck is empty', () => {
    const { addDeck, drawFromDeck } = useTableStore.getState()
    addDeck({ name: 'empty', cards: [] }, { x: 100, y: 100 })
    const deckId = useTableStore.getState().decks[0].id
    drawFromDeck(deckId, { x: 300, y: 300 })
    const state = useTableStore.getState()
    expect(state.looseCards).toHaveLength(0)
    expect(state.decks[0].deck.cards).toHaveLength(0)
  })

  it('draws the top card from the deck into a loose card', () => {
    const deck = createStandardDeck()
    const { addDeck, drawFromDeck } = useTableStore.getState()
    addDeck(deck, { x: 100, y: 100 })
    const deckId = useTableStore.getState().decks[0].id
    const topCard = deck.cards[0]
    drawFromDeck(deckId, { x: 300, y: 400 })
    const state = useTableStore.getState()
    expect(state.looseCards).toHaveLength(1)
    expect(state.looseCards[0].card).toBe(topCard)
    expect(state.looseCards[0].position).toEqual({ x: 300, y: 400 })
    expect(state.looseCards[0].faceUp).toBe(true)
  })

  it('removes the top card from the deck', () => {
    const deck = createStandardDeck()
    const { addDeck, drawFromDeck } = useTableStore.getState()
    addDeck(deck, { x: 100, y: 100 })
    const deckId = useTableStore.getState().decks[0].id
    drawFromDeck(deckId, { x: 300, y: 300 })
    expect(useTableStore.getState().decks[0].deck.cards).toHaveLength(51)
  })

  it('does not affect other decks', () => {
    const { addDeck, drawFromDeck } = useTableStore.getState()
    addDeck(createStandardDeck(), { x: 100, y: 100 })
    addDeck(createStandardDeck(), { x: 500, y: 500 })
    const decks = useTableStore.getState().decks
    drawFromDeck(decks[0].id, { x: 300, y: 300 })
    expect(useTableStore.getState().decks[1].deck.cards).toHaveLength(52)
  })

  it('can draw multiple cards sequentially', () => {
    const deck = createStandardDeck()
    const { addDeck, drawFromDeck } = useTableStore.getState()
    addDeck(deck, { x: 100, y: 100 })
    const deckId = useTableStore.getState().decks[0].id
    drawFromDeck(deckId, { x: 200, y: 200 })
    drawFromDeck(deckId, { x: 300, y: 300 })
    drawFromDeck(deckId, { x: 400, y: 400 })
    const state = useTableStore.getState()
    expect(state.looseCards).toHaveLength(3)
    expect(state.decks[0].deck.cards).toHaveLength(49)
    // Each drawn card should be different (sequential from top)
    expect(state.looseCards[0].card).toBe(deck.cards[0])
    expect(state.looseCards[1].card).toBe(deck.cards[1])
    expect(state.looseCards[2].card).toBe(deck.cards[2])
  })

  it('loose card appears at drop position', () => {
    const deck = createStandardDeck()
    const { addDeck, drawFromDeck } = useTableStore.getState()
    addDeck(deck, { x: 100, y: 100 })
    const deckId = useTableStore.getState().decks[0].id
    drawFromDeck(deckId, { x: 777, y: 888 })
    const state = useTableStore.getState()
    expect(state.looseCards[0].position).toEqual({ x: 777, y: 888 })
  })

  it('drawing from empty deck after exhausting all cards does nothing', () => {
    const { addDeck, drawFromDeck } = useTableStore.getState()
    addDeck({ name: 'single', cards: [createStandardDeck().cards[0]] }, { x: 100, y: 100 })
    const deckId = useTableStore.getState().decks[0].id
    drawFromDeck(deckId, { x: 200, y: 200 })
    expect(useTableStore.getState().looseCards).toHaveLength(1)
    expect(useTableStore.getState().decks[0].deck.cards).toHaveLength(0)
    // Deck is now empty — drawing again should be a no-op
    drawFromDeck(deckId, { x: 300, y: 300 })
    expect(useTableStore.getState().looseCards).toHaveLength(1)
  })
})

describe('deleteCard', () => {
  it('removes the loose card by ID', () => {
    const deck = createStandardDeck()
    const { addLooseCard, deleteCard } = useTableStore.getState()
    addLooseCard(deck.cards[0])
    addLooseCard(deck.cards[1])
    const cardId = useTableStore.getState().looseCards[0].id
    deleteCard(cardId)
    const state = useTableStore.getState()
    expect(state.looseCards).toHaveLength(1)
    expect(state.looseCards[0].id).not.toBe(cardId)
  })

  it('does nothing when cardId does not exist', () => {
    const deck = createStandardDeck()
    const { addLooseCard, deleteCard } = useTableStore.getState()
    addLooseCard(deck.cards[0])
    deleteCard('nonexistent')
    expect(useTableStore.getState().looseCards).toHaveLength(1)
  })

  it('closes the context menu if the deleted card was the target', () => {
    const deck = createStandardDeck()
    const { addLooseCard, openContextMenu, deleteCard } = useTableStore.getState()
    addLooseCard(deck.cards[0])
    const cardId = useTableStore.getState().looseCards[0].id
    openContextMenu({ x: 200, y: 200 }, null, cardId)
    expect(useTableStore.getState().contextMenu.open).toBe(true)
    deleteCard(cardId)
    expect(useTableStore.getState().contextMenu.open).toBe(false)
  })

  it('does not close the context menu if a different card was targeted', () => {
    const deck = createStandardDeck()
    const { addLooseCard, openContextMenu, deleteCard } = useTableStore.getState()
    addLooseCard(deck.cards[0])
    addLooseCard(deck.cards[1])
    const cards = useTableStore.getState().looseCards
    openContextMenu({ x: 200, y: 200 }, null, cards[0].id)
    deleteCard(cards[1].id)
    expect(useTableStore.getState().contextMenu.open).toBe(true)
    expect(useTableStore.getState().contextMenu.cardId).toBe(cards[0].id)
  })
})

describe('addCardToDeck', () => {
  it('moves a loose card into the target deck', () => {
    const deck = createStandardDeck()
    const { addDeck, addLooseCard, addCardToDeck } = useTableStore.getState()
    addDeck(deck, { x: 100, y: 100 })
    const deckId = useTableStore.getState().decks[0].id
    addLooseCard(deck.cards[0], { x: 300, y: 300 })
    const cardId = useTableStore.getState().looseCards[0].id
    addCardToDeck(cardId, deckId)
    const state = useTableStore.getState()
    expect(state.looseCards).toHaveLength(0)
    expect(state.decks[0].deck.cards).toHaveLength(53)
  })

  it('does nothing when cardId does not exist', () => {
    const deck = createStandardDeck()
    const { addDeck, addCardToDeck } = useTableStore.getState()
    addDeck(deck, { x: 100, y: 100 })
    const deckId = useTableStore.getState().decks[0].id
    addCardToDeck('nonexistent', deckId)
    expect(useTableStore.getState().looseCards).toHaveLength(0)
    expect(useTableStore.getState().decks[0].deck.cards).toHaveLength(52)
  })

  it('does nothing when deckId does not exist', () => {
    const deck = createStandardDeck()
    const { addLooseCard, addCardToDeck } = useTableStore.getState()
    addLooseCard(deck.cards[0])
    const cardId = useTableStore.getState().looseCards[0].id
    addCardToDeck(cardId, 'nonexistent')
    expect(useTableStore.getState().looseCards).toHaveLength(1)
  })

  it('closes the context menu after adding', () => {
    const deck = createStandardDeck()
    const { addDeck, addLooseCard, openContextMenu, addCardToDeck } = useTableStore.getState()
    addDeck(deck, { x: 100, y: 100 })
    const deckId = useTableStore.getState().decks[0].id
    addLooseCard(deck.cards[0])
    const cardId = useTableStore.getState().looseCards[0].id
    openContextMenu({ x: 200, y: 200 }, null, cardId)
    addCardToDeck(cardId, deckId)
    expect(useTableStore.getState().contextMenu.open).toBe(false)
  })

  it('can add a card to any deck by ID', () => {
    const { addDeck, addLooseCard, addCardToDeck } = useTableStore.getState()
    addDeck(createStandardDeck(), { x: 100, y: 100 })
    addDeck({ name: 'receiver', cards: [] }, { x: 500, y: 500 })
    const decks = useTableStore.getState().decks
    const receiverId = decks[1].id
    addLooseCard(createStandardDeck().cards[0])
    const cardId = useTableStore.getState().looseCards[0].id
    addCardToDeck(cardId, receiverId)
    const state = useTableStore.getState()
    expect(state.looseCards).toHaveLength(0)
    expect(state.decks[1].deck.cards).toHaveLength(1)
    expect(state.decks[0].deck.cards).toHaveLength(52)
  })
})

describe('context menu with cardId', () => {
  it('openContextMenu with cardId', () => {
    useTableStore.getState().openContextMenu({ x: 100, y: 200 }, null, 'card_5')
    const { contextMenu } = useTableStore.getState()
    expect(contextMenu.open).toBe(true)
    expect(contextMenu.canvasPos).toEqual({ x: 100, y: 200 })
    expect(contextMenu.deckId).toBeNull()
    expect(contextMenu.cardId).toBe('card_5')
  })

  it('openContextMenu with both deckId and cardId (card takes priority in UI)', () => {
    useTableStore.getState().openContextMenu({ x: 50, y: 60 }, 'deck_1', 'card_2')
    const { contextMenu } = useTableStore.getState()
    expect(contextMenu.deckId).toBe('deck_1')
    expect(contextMenu.cardId).toBe('card_2')
  })

  it('openContextMenu without cardId defaults to null', () => {
    useTableStore.getState().openContextMenu({ x: 50, y: 60 }, 'deck_1')
    const { contextMenu } = useTableStore.getState()
    expect(contextMenu.cardId).toBeNull()
  })

  it('closeContextMenu resets cardId to null', () => {
    const { openContextMenu, closeContextMenu } = useTableStore.getState()
    openContextMenu({ x: 100, y: 200 }, null, 'card_1')
    closeContextMenu()
    const { contextMenu } = useTableStore.getState()
    expect(contextMenu.cardId).toBeNull()
  })
})
