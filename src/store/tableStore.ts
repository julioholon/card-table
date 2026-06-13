// src/store/tableStore.ts

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Card, Deck } from '../cards/types.js'

// ── Position on the 2-D card table ────────────────────────────────
export interface Position {
  readonly x: number
  readonly y: number
}

// ── A deck placed on the table ─────────────────────────────────────
export interface PlacedDeck {
  readonly id: string
  readonly deck: Deck
  readonly position: Position
  readonly faceUp: boolean
}

// ── A loose (un-decked) card on the table ──────────────────────────
export interface LooseCard {
  readonly id: string
  readonly card: Card
  readonly position: Position
  readonly faceUp: boolean
}

// ── Dragging state ─────────────────────────────────────────────────
export interface DragState {
  readonly active: boolean
  readonly kind: 'deck' | 'card' | null
  readonly id: string | null          // PlacedDeck.id or LooseCard.id
  readonly offset: Position           // cursor offset from object origin
}

// ── Store shape ────────────────────────────────────────────────────
export interface TableState {
  readonly decks: readonly PlacedDeck[]
  readonly looseCards: readonly LooseCard[]
  readonly dragging: DragState

  // Actions
  addDeck: (deck: Deck, position?: Position) => void
  removeDeck: (deckId: string) => void
  addLooseCard: (card: Card, position?: Position) => void
  moveDeck: (deckId: string, position: Position) => void
  moveCard: (cardId: string, position: Position) => void
  startDrag: (kind: 'deck' | 'card', id: string, offset: Position) => void
  updateDrag: (offset: Position) => void
  endDrag: () => void
}

// ── Helpers ────────────────────────────────────────────────────────
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

// ── Store ──────────────────────────────────────────────────────────
export const useTableStore = create<TableState>()(
  devtools(
    (set) => ({
      decks: [],
      looseCards: [],
      dragging: DEFAULT_DRAG,

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
        set({
          dragging: { active: true, kind, id, offset },
        }),

      updateDrag: (offset) =>
        set((state) => ({
          dragging: { ...state.dragging, offset },
        })),

      endDrag: () =>
        set({ dragging: DEFAULT_DRAG }),
    }),
    { name: 'CardTable' },
  ),
)
