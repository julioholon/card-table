// src/store/tableStore.ts

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Card, Deck } from '../cards/types.js'

export const STORAGE_KEY = 'card-table-state'

export interface Position {
  readonly x: number
  readonly y: number
}

export interface PlacedDeck {
  readonly id: string
  readonly deck: Deck
  readonly position: Position
  readonly faceUp: boolean
}

export interface LooseCard {
  readonly id: string
  readonly card: Card
  readonly position: Position
  readonly faceUp: boolean
}

export interface DragState {
  readonly active: boolean
  readonly kind: 'deck' | 'card' | null
  readonly id: string | null
  readonly offset: Position
}

export interface ContextMenuState {
  readonly open: boolean
  readonly canvasPos: Position
  readonly deckId: string | null
}

export interface ShuffleAnimState {
  readonly deckId: string
  readonly cardCount: number
  readonly startTime: number
  readonly duration: number
}

interface PersistedState {
  decks: PlacedDeck[]
  looseCards: LooseCard[]
}

export interface TableState {
  readonly decks: readonly PlacedDeck[]
  readonly looseCards: readonly LooseCard[]
  readonly dragging: DragState
  readonly contextMenu: ContextMenuState
  readonly shuffleAnim: ShuffleAnimState | null

  // Deck actions
  addDeck: (deck: Deck, position?: Position) => void
  removeDeck: (deckId: string) => void
  moveDeck: (deckId: string, position: Position) => void
  flipDeck: (deckId: string) => void
  shuffleDeck: (deckId: string) => void
  cutDeck: (deckId: string) => void
  duplicateDeck: (deckId: string) => void

  // Loose card actions
  addLooseCard: (card: Card, position?: Position) => void
  moveCard: (cardId: string, position: Position) => void
  flipCard: (cardId: string) => void

  // Drag actions
  startDrag: (kind: 'deck' | 'card', id: string, offset: Position) => void
  updateDrag: (offset: Position) => void
  endDrag: () => void

  // Context menu actions
  openContextMenu: (canvasPos: Position, deckId: string | null) => void
  closeContextMenu: () => void
  collectAllCards: (deckId: string) => void

  // Shuffle animation
  startShuffleAnim: (deckId: string, cardCount: number) => void
  clearShuffleAnim: () => void
}

const CARD_W = 120
const CARD_H = 170

function deckOverlapsPoint(deck: PlacedDeck, px: number, py: number): boolean {
  const { position } = deck
  return px >= position.x && px <= position.x + CARD_W &&
         py >= position.y && py <= position.y + CARD_H
}

let nextId = 1
function uid(prefix: string): string {
  return `${prefix}_${nextId++}`
}

const DEFAULT_DRAG: DragState = {
  active: false,
  kind: null,
  id: null,
  offset: { x: 0, y: 0 },
}

const DEFAULT_CONTEXT_MENU: ContextMenuState = {
  open: false,
  canvasPos: { x: 0, y: 0 },
  deckId: null,
}

export const useTableStore = create<TableState>()(
  devtools(
    persist(
      (set) => ({
        decks: [],
        looseCards: [],
        dragging: DEFAULT_DRAG,
        contextMenu: DEFAULT_CONTEXT_MENU,
        shuffleAnim: null,

        addDeck: (deck, position = { x: 100, y: 100 }) =>
          set((state) => ({
            decks: [
              ...state.decks,
              { id: uid('deck'), deck, position, faceUp: false },
            ],
          })),

        removeDeck: (deckId) =>
          set((state) => ({
            decks: state.decks.filter((d) => d.id !== deckId),
          })),

        addLooseCard: (card, position = { x: 200, y: 200 }) =>
          set((state) => ({
            looseCards: [
              ...state.looseCards,
              { id: uid('card'), card, position, faceUp: true },
            ],
          })),

        moveDeck: (deckId, position) =>
          set((state) => ({
            decks: state.decks.map((d) =>
              d.id === deckId ? { ...d, position } : d,
            ),
          })),

        moveCard: (cardId, position) =>
          set((state) => ({
            looseCards: state.looseCards.map((c) =>
              c.id === cardId ? { ...c, position } : c,
            ),
          })),

        startDrag: (kind, id, offset) =>
          set({ dragging: { active: true, kind, id, offset } }),

        updateDrag: (offset) =>
          set((state) => ({
            dragging: { ...state.dragging, offset },
          })),

        endDrag: () =>
          set({ dragging: DEFAULT_DRAG }),

        openContextMenu: (canvasPos, deckId) =>
          set({ contextMenu: { open: true, canvasPos, deckId } }),

        closeContextMenu: () =>
          set({ contextMenu: DEFAULT_CONTEXT_MENU }),

        collectAllCards: (deckId) =>
          set((state) => {
            const target = state.decks.find((d) => d.id === deckId)
            if (!target) return state

            const collectedIds = new Set<string>()
            for (const lc of state.looseCards) {
              if (deckOverlapsPoint(target, lc.position.x, lc.position.y)) {
                collectedIds.add(lc.id)
              }
            }
            if (collectedIds.size === 0) return state

            const collectedCards = state.looseCards
              .filter((lc) => collectedIds.has(lc.id))
              .map((lc) => lc.card)

            return {
              looseCards: state.looseCards.filter((lc) => !collectedIds.has(lc.id)),
              decks: state.decks.map((d) =>
                d.id === deckId
                  ? { ...d, deck: { ...d.deck, cards: [...d.deck.cards, ...collectedCards] } }
                  : d,
              ),
              contextMenu: DEFAULT_CONTEXT_MENU,
            }
          }),

        cutDeck: (deckId) =>
          set((state) => {
            const target = state.decks.find((d) => d.id === deckId)
            if (!target) return state

            const cards = [...target.deck.cards]
            if (cards.length < 2) return state

            const mid = Math.ceil(cards.length / 2)
            const topHalf = cards.slice(0, mid)
            const bottomHalf = cards.slice(mid)

            const offset = 30
            const newDeck: PlacedDeck = {
              id: uid('deck'),
              deck: { name: target.deck.name, cards: bottomHalf },
              position: { x: target.position.x + offset, y: target.position.y + offset },
              faceUp: target.faceUp,
            }

            return {
              decks: state.decks
                .map((d) =>
                  d.id === deckId
                    ? { ...d, deck: { ...d.deck, cards: topHalf } }
                    : d,
                )
                .concat(newDeck),
              contextMenu: DEFAULT_CONTEXT_MENU,
            }
          }),

        duplicateDeck: (deckId) =>
          set((state) => {
            const target = state.decks.find((d) => d.id === deckId)
            if (!target) return state

            const clonedCards = target.deck.cards.map((c) => ({ ...c }))
            const offset = 40
            const newDeck: PlacedDeck = {
              id: uid('deck'),
              deck: { name: target.deck.name, cards: clonedCards },
              position: { x: target.position.x + offset, y: target.position.y + offset },
              faceUp: false,
            }

            return {
              decks: [...state.decks, newDeck],
              contextMenu: DEFAULT_CONTEXT_MENU,
            }
          })),

        flipDeck: (deckId) =>
          set((state) => ({
            decks: state.decks.map((d) =>
              d.id === deckId ? { ...d, faceUp: !d.faceUp } : d,
            ),
          })),

        flipCard: (cardId) =>
          set((state) => ({
            looseCards: state.looseCards.map((c) =>
              c.id === cardId ? { ...c, faceUp: !c.faceUp } : c,
            ),
          })),

        shuffleDeck: (deckId) =>
          set((state) => {
            const deck = state.decks.find((d) => d.id === deckId)
            if (!deck) return state
            const cards = [...deck.deck.cards]
            // Fisher-Yates shuffle
            for (let i = cards.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              const tmp = cards[i]!
              cards[i] = cards[j]!
              cards[j] = tmp
            }
            return {
              decks: state.decks.map((d) =>
                d.id === deckId
                  ? { ...d, deck: { ...d.deck, cards } }
                  : d,
              ),
            }
          }),

        startShuffleAnim: (deckId, cardCount) =>
          set({
            shuffleAnim: {
              deckId,
              cardCount,
              startTime: Date.now(),
              duration: 600,
            },
          }),

        clearShuffleAnim: () => set({ shuffleAnim: null }),
      }),
      {
        name: STORAGE_KEY,
        partialize: (state): PersistedState => ({
          decks: [...state.decks],
          looseCards: [...state.looseCards],
        }),
        merge: (persisted: unknown, current: TableState): TableState => {
          // If storage was cleared (null), reset to empty state
          if (!persisted || typeof persisted !== 'object') {
            return {
              ...current,
              decks: [],
              looseCards: [],
            }
          }
          const p = persisted as PersistedState
          return {
            ...current,
            decks: p.decks ?? [],
            looseCards: p.looseCards ?? [],
          }
        },
      },
    ),
    { name: 'CardTable' },
  ),
)
