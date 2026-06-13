// src/store/tableStore.test.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { useTableStore } from './tableStore.js'
import { createStandardDeck } from '../cards/decks.js'

// Reset store between tests
function resetStore() {
  useTableStore.setState({
    decks: [],
    looseCards: [],
    dragging: { active: false, kind: null, id: null, offset: { x: 0, y: 0 } },
  })
}

beforeEach(() => resetStore())

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

    const state = useTableStore.getState()
    expect(state.decks[0].position).toEqual({ x: 300, y: 400 })
  })

  it('assigns unique IDs to each deck', () => {
    const deck1 = createStandardDeck()
    const deck2 = createStandardDeck()
    const { addDeck } = useTableStore.getState()
    addDeck(deck1)
    addDeck(deck2)

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
