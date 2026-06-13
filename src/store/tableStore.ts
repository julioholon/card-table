// src/store/tableStore.ts

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Card, Deck } from '../cards/types.js'

// ── Persistence key ────────────────────────────────────────────────
export const STORAGE_KEY = 'card-table-state'

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

// ── Context menu state ─────────────────────────────────────────────
export interface ContextMenuState {
  readonly open: boolean
  readonly canvasPos: Position        // raw canvas click coords
  readonly deckId: string | null      // which deck was right-clicked
}

// ── Persisted slice (everything except transient state + actions) ──
interface PersistedState {
  decks: PlacedDeck[]
  looseCards: LooseCard[]
}

// ── Store shape ────────────────────────────────────────────────────
export interface TableState {
  readonly decks: readonly PlacedDeck[]
  readonly looseCards: readonly LooseCard[]
  readonly dragging: DragState
  readonly contextMenu: ContextMenuState

  // Actions
  addDeck: (deck: Deck, position?: Position) => void
  removeDeck: (deckId: string) => void
  addLooseCard: (card: Card, position?: Position) => void
  moveDeck: (deckId: string, position: Position) => void
  moveCard: (cardId: string, position: Position) => void
  startDrag: (kind: 'deck' | 'card', id: string, offset: Position) => void
  updateDrag: (offset: Position) => void
  endDrag: () => void

  // Context menu actions
  openContextMenu: (canvasPos: Position, deckId: string | null) => void
  closeContextMenu: () => void
  collectAllCards: (deckId: string) => void
  cutDeck: (deckId: string) => void
  duplicateDeck: (deckId: string) => void
}

// ── Card dimensions (must match render.ts) ─────────────────────────
const CARD_W = 120
const CARD_H = 170

// ── Hit-test helpers ────────────────────────────────────────────────
function deckOverlapsPoint(deck: PlacedDeck, px: number, py: number): boolean {
  const { position } = deck
  return px >= position.x && px <= position.x + CARD_W &&
         py >= position.y && py <= position.y + CARD_H
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

const DEFAULT_CONTEXT_MENU: ContextMenuState = {
  open: false,
  canvasPos: { x: 0, y: 0 },
  deckId: null,
}

// ── Store ──────────────────────────────────────────────────────────
export const useTableStore = create<TableState>()(
  devtools(
    persist(
      (set) => ({
        decks: [],
        looseCards: [],
        dragging: DEFAULT_DRAG,
        contextMenu: DEFAULT_CONTEXT_MENU,

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

        openContextMenu: (canvasPos, deckId) =>
          set({
            contextMenu: { open: true, canvasPos, deckId },
          }),

        closeContextMenu: () =>
          set({ contextMenu: DEFAULT_CONTEXT_MENU }),

        collectAllCards: (deckId) =>
          set((state) => {
            const target = state.decks.find((d) => d.id === deckId)
            if (!target) return state

            // Gather all loose cards whose canvas position falls within
            // the target deck's bounding box, and return them to the deck.
            const collectedIds = new Set<string>()
            for (const lc of state.looseCards) {
              if (deckOverlapsPoint(target, lc.position.x, lc.position.y)) {
                collectedIds.add(lc.id)
              }
            }
            if (collectedIds.size === 0) return state

            // Build a new deck that includes the collected cards.
            // We place them at the end of the deck's card list.
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

            const cards = target.deck.cards
            if (cards.length < 2) return state

            const mid = Math.ceil(cards.length / 2)
            const topHalf = cards.slice(0, mid)
            const bottomHalf = cards.slice(mid)

            // Offset the new deck slightly so it doesn't overlap perfectly.
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

            // Deep-clone cards so the duplicate owns its own card objects.
            const clonedCards = target.deck.cards.map((c) => ({ ...c }))
            const offset = 40
            const newDeck: PlacedDeck = {
              id: uid('deck'),
              deck: { name: target.deck.name, cards: clonedCards },
              position: { x: target.position.x + offset, y: target.position.y + offset },
              faceUp: false, // duplicate is face-down
            }

            return {
              decks: [...state.decks, newDeck],
              contextMenu: DEFAULT_CONTEXT_MENU,
            }
          }),
      }),
      {
        name: STORAGE_KEY,
        partialize: (state): PersistedState => ({
          decks: [...state.decks],
          looseCards: [...state.looseCards],
        }),
      },
    ),
    { name: 'CardTable' },
  ),
)
