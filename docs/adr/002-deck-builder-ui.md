# ADR-002: Deck Builder UI Pattern

## Status

Proposed

## Context

The card table needs a way for users to create custom decks from the full pool of 130 cards (52 standard + 78 tarot). The deck builder must let users browse all cards, select/deselect them, name the deck, and place it on the board.

The app uses:
- **React 19** with TypeScript
- **HTML5 Canvas** for rendering the board and cards
- **Zustand** for state management (being implemented in parallel)
- **Dark theme** (#0d1117 bg, #161b22 surfaces, #30363d borders)

Key constraint: the deck builder is a **UI overlay** on top of the canvas board. It is not a separate page or route.

## Options Considered

### Option A: Side Panel (Drawer)
A fixed-width panel sliding in from the right edge of the screen.
- Canvas remains visible and interactive behind/alongside the panel
- Always accessible via a toolbar button
- Good for frequent deck management
- **Downside**: Reduces canvas real estate; at 130 cards the panel needs significant vertical space, causing scroll fatigue

### Option B: Centered Modal Overlay
A modal dialog centered on screen with a backdrop dimming the canvas.
- Takes full focus — user must finish or dismiss before returning to the board
- Can use the full viewport for card browsing
- Clear mental model: "I'm building a deck" mode
- **Downside**: Blocks the canvas entirely; can't reference existing board state while building

### Option C: Floating Panel (Resizable, Draggable)
A draggable, resizable floating window over the canvas.
- User can position it anywhere, resize it, minimize it
- Canvas remains partially visible
- Most flexible but most complex to implement
- **Downside**: Over-engineered for the use case; adds drag-resize complexity to an already drag-heavy canvas app

## Decision

**Option B: Centered Modal Overlay** with the following structure:

```
+--------------------------------------------------+
|  [X] Build a Deck                                 |
|                                                  |
|  Deck name: [________________________]            |
|                                                  |
|  Filter: [All] [Standard] [Tarot] [Major] [Minor]|
|                                                  |
|  +------+ +------+ +------+ +------+ +------+   |
|  | Card | | Card | | Card | | Card | | Card |   |
|  |  A   | |  2   | |  3   | |  4   | |  5   |   |
|  | hearts| |hearts| |hearts| |hearts| |hearts|   |
|  +------+ +------+ +------+ +------+ +------+   |
|  ... (scrollable grid of 130 card thumbnails)    |
|                                                  |
|  Selected: 24 / 130                              |
|                                                  |
|  [Cancel]                    [Create & Place]    |
+--------------------------------------------------+
```

### Rationale

1. **Focus**: Deck building is a discrete task. The user enters, builds, exits. A modal matches this mental model perfectly.
2. **Space**: 130 cards need room. A modal can use 80-90% of the viewport, showing a 5-6 column grid without scrolling being the primary interaction.
3. **Simplicity**: No edge-case positioning logic (unlike floating panel), no persistent layout management (unlike side panel). Standard React component, no special canvas integration.
4. **Parallel work**: The Zustand store (t_368131c0) will expose `addDeck`. The modal just calls it on completion. Clean separation.

### Card Grid Details

- Each card rendered as a small thumbnail (~80x110px) showing suit/rank or tarot name
- Selected cards have a visible border/glow (accent color: #58a6ff)
- Click to toggle selection (no drag-and-drop within the modal)
- Filter tabs at the top: All | Standard | Tarot → Major / Minor sub-filter
- Search-free: 130 cards across 5 filters is browseable without search
- Scrollable area with CSS Grid, sticky header with name input and filters

### Interaction Flow

1. User clicks "New Deck" button on the board (added in a future toolbar task)
2. Modal opens, canvas dims behind it
3. User types deck name, browses cards, clicks to select/deselect
4. "Create & Place" → calls `addDeck(name, selectedCards)` on the store
5. New deck appears on the board at a default position (center, offset slightly from existing decks)
6. Modal closes

### Placement on Board

- New deck placed at `(boardCenter.x + randomOffset, boardCenter.y + randomOffset)`
- Offset range: ±50px to avoid exact overlap with existing decks
- If no decks exist, place at canvas center

## Consequences

- The canvas needs a dimming overlay layer (semi-transparent black, pointer-events: none when modal is open)
- The "New Deck" button is NOT part of this task — it's a prerequisite from the toolbar/controls task
- This task focuses purely on the modal component and its integration with the store
- Card thumbnails in the modal are DOM-based (not canvas-rendered) — the modal is HTML over the canvas

## Open Questions

- Should there be a "Select All" / "Deselect All" convenience? → Yes, small link buttons next to the filter row
- Should preset decks (Standard 52, Tarot 78) be one-click shortcuts? → Yes, "Load Preset" dropdown with those two options
- Max deck name length? → 40 characters
