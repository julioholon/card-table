# Card Table

A 2D web-based card table where the player manipulates custom decks of cards. No game rules, no goals — just the tactile joy of handling cards. Built with React, Canvas rendering, React DnD, and Zustand state management.

## Language

**Card**:
A single playing card with a face and a back. Has a `type` (standard or tarot), optional `suit` and `rank`, `faceUp` state, and a position on the table. _Avoid_: tile, token, piece

**Deck**:
An ordered collection of Cards placed on the table. A Deck has a position, can be shuffled, cut, duplicated, merged with. Double-click to shuffle. Right-click for context menu. _Avoid_: stack, pile, hand

**Board**:
The 2D canvas surface where all Decks and loose Cards live. Rendered via HTML5 Canvas. _Avoid_: table, field, stage

**Loose Card**:
A Card that is not part of a Deck. Can be freely positioned on the Board, flipped by click, dragged, or dropped onto a Deck to merge it back. _Avoid_: floating card, free card

**Draw**:
The action of taking a Card from the top of a Deck and placing it on the Board as a Loose Card. Initiated by dragging from a Deck. _Avoid_: pick, pull, deal

**Merge**:
The action of adding a Loose Card back into a Deck by dropping it onto the Deck. Card is appended to the bottom. _Avoid_: combine, return, stack

**Cut**:
Splitting a Deck into two equal halves at a random point near the middle. Created by right-clicking a Deck and selecting "Cut". _Avoid_: split, divide

**Flip**:
Rotating a Card 180° around its vertical axis to show/hide the face. Animated via CSS/JS rotation. Triggered by clicking a Card. _Avoid_: turn, rotate

**Shuffle**:
Randomizing the order of Cards within a Deck. Triggered by double-clicking a Deck. Animated. _Avoid_: mix, stir

**Drag**:
Pointer-based movement of Decks and Loose Cards across the Board. Implemented via React DnD with a Canvas hit-testing layer for drop detection. _Avoid_: move, slide

**Canvas**:
The HTML5 Canvas element that renders the Board, Decks, and all Cards. Handles drawing, hit-testing, and animation frames. _Avoid_: renderer, viewport

**Store**:
The Zustand state container holding all application state: decks, loose cards, selections, drag state. Single source of truth. _Avoid_: state, database

**Preset Deck**:
A pre-defined deck configuration: Standard 52-card deck (4 suits × 13 ranks) or Tarot deck (78 cards: 22 Major Arcana + 56 Minor Arcana). Created at startup or from the deck builder. _Avoid_: template, default deck

**Hit-testing**:
Determining which Deck or Card is under the pointer during drag operations. Implemented on the Canvas layer by checking bounding boxes against pointer coordinates. _Avoid_: picking, picking test

**State**:

- `decks`: `Deck[]` — all decks on the board, each with `id`, `cards: Card[]`, `{x, y}`
- `looseCards`: `LooseCard[]` — all loose cards, each with `id`, `card: Card`, `{x, y}`, `flipped`
- `dragging`: `DragState | null` — current drag operation (source, card/deck id, offset, ghost position)
- `selectedDeck`: `string | null` — deck ID currently selected for right-click menu

## Rules

- CONTEXT.md is a glossary only — no implementation details, no code architecture. That belongs in code and ADRs.
- Cards are defined by their data model; rendering is always Canvas-based.
- Decks maintain their own card order. Position on the board is separate from card order.
- The store is the single source of truth; the Canvas reads from it each frame.
- Standard suits: ♠ Spades, ♥ Hearts, ♦ Diamonds, ♣ Clubs
- Standard ranks: A, 2-10, J, Q, K
- Tarot Major Arcana: 0-21 (Fool through World)
- Tarot Minor Arcana: 4 suits (Cups, Wands, Swords, Pentacles) × 14 cards (Ace-10, Page, Knight, Queen, King)
