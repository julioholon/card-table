// src/cards/decks.test.ts
import type { TarotCard } from './types.js'

import { describe, it, expect } from 'vitest';
import { createStandardDeck, createTarotDeck } from './decks.js';

describe('createStandardDeck', () => {
  it('returns a deck with 52 cards', () => {
    const deck = createStandardDeck();
    expect(deck.cards).toHaveLength(52);
  });

  it('returns a deck named "Standard 52-Card Deck"', () => {
    const deck = createStandardDeck();
    expect(deck.name).toBe('Standard 52-Card Deck');
  });

  it('all cards have kind "standard"', () => {
    const deck = createStandardDeck();
    for (const card of deck.cards) {
      expect(card.kind).toBe('standard');
    }
  });

  it('contains all 4 suits', () => {
    const deck = createStandardDeck();
    const suits = new Set(deck.cards.map(c => (c as any).suit));
    expect(suits).toEqual(new Set(['hearts', 'diamonds', 'clubs', 'spades']));
  });

  it('contains all 13 ranks', () => {
    const deck = createStandardDeck();
    const ranks = new Set(deck.cards.map(c => (c as any).rank));
    expect(ranks).toEqual(new Set(['A','2','3','4','5','6','7','8','9','10','J','Q','K']));
  });

  it('each suit has exactly 13 cards', () => {
    const deck = createStandardDeck();
    for (const suit of ['hearts', 'diamonds', 'clubs', 'spades']) {
      const count = deck.cards.filter(c => (c as any).suit === suit).length;
      expect(count).toBe(13);
    }
  });

  it('all card IDs are unique', () => {
    const deck = createStandardDeck();
    const ids = deck.cards.map(c => c.id);
    expect(new Set(ids).size).toBe(52);
  });

  it('card IDs follow the pattern "{rank}_{suit}"', () => {
    const deck = createStandardDeck();
    for (const card of deck.cards) {
      expect(card.id).toMatch(/^[A2-9JQK]|10_(hearts|diamonds|clubs|spades)$/);
    }
  });
});

describe('createTarotDeck', () => {
  it('returns a deck with 78 cards', () => {
    const deck = createTarotDeck();
    expect(deck.cards).toHaveLength(78);
  });

  it('returns a deck named "Tarot 78-Card Deck"', () => {
    const deck = createTarotDeck();
    expect(deck.name).toBe('Tarot 78-Card Deck');
  });

  it('all cards have kind "tarot"', () => {
    const deck = createTarotDeck();
    for (const card of deck.cards) {
      expect(card.kind).toBe('tarot');
    }
  });

  it('contains exactly 22 major arcana cards', () => {
    const deck = createTarotDeck();
    const majors = deck.cards.filter((c): c is TarotCard => c.kind === 'tarot' && c.arcana === 'major');
    expect(majors).toHaveLength(22);
  });

  it('contains exactly 56 minor arcana cards', () => {
    const deck = createTarotDeck();
    const minors = deck.cards.filter((c): c is TarotCard => c.kind === 'tarot' && c.arcana === 'minor');
    expect(minors).toHaveLength(56);
  });

  it('major arcana cards have name and no suit/rank', () => {
    const deck = createTarotDeck();
    const majors = deck.cards.filter((c): c is TarotCard => c.kind === 'tarot' && c.arcana === 'major');
    for (const card of majors) {
      expect(card.name).toBeTruthy();
      expect(card.suit).toBeNull();
      expect(card.rank).toBeNull();
    }
  });

  it('minor arcana cards have suit and rank and no name', () => {
    const deck = createTarotDeck();
    const minors = deck.cards.filter((c): c is TarotCard => c.kind === 'tarot' && c.arcana === 'minor');
    for (const card of minors) {
      expect(card.name).toBeNull();
      expect(card.suit).toBeTruthy();
      expect(card.rank).toBeTruthy();
    }
  });

  it('minor arcana contains all 4 tarot suits', () => {
    const deck = createTarotDeck();
    const minors = deck.cards.filter((c): c is TarotCard => c.kind === 'tarot' && c.arcana === 'minor');
    const suits = new Set(minors.map(c => c.suit));
    expect(suits).toEqual(new Set(['wands', 'cups', 'swords', 'pentacles']));
  });

  it('each tarot suit has exactly 14 minor cards', () => {
    const deck = createTarotDeck();
    const minors = deck.cards.filter((c): c is TarotCard => c.kind === 'tarot' && c.arcana === 'minor');
    for (const suit of ['wands', 'cups', 'swords', 'pentacles']) {
      const count = minors.filter(c => c.suit === suit).length;
      expect(count).toBe(14);
    }
  });

  it('all card IDs are unique', () => {
    const deck = createTarotDeck();
    const ids = deck.cards.map(c => c.id);
    expect(new Set(ids).size).toBe(78);
  });

  it('contains "The Fool" as first major arcana', () => {
    const deck = createTarotDeck();
    const majors = deck.cards.filter((c): c is TarotCard => c.kind === 'tarot' && c.arcana === 'major');
    expect(majors[0].name).toBe('The Fool');
  });

  it('contains "The World" as last major arcana', () => {
    const deck = createTarotDeck();
    const majors = deck.cards.filter((c): c is TarotCard => c.kind === 'tarot' && c.arcana === 'major');
    expect(majors[majors.length - 1].name).toBe('The World');
  });
});
