// src/cards/decks.ts

import type { Card, Deck, Suit, Rank, TarotSuit, MinorRank, MajorArcana } from './types.js';

const SUITS: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const RANKS: readonly Rank[] = [
  'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'
] as const;

const TAROT_MAJOR: readonly MajorArcana[] = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress',
  'The Emperor', 'The Hierophant', 'The Lovers', 'The Chariot',
  'Strength', 'The Hermit', 'Wheel of Fortune', 'Justice',
  'The Hanged Man', 'Death', 'Temperance', 'The Devil',
  'The Tower', 'The Star', 'The Moon', 'The Sun',
  'Judgement', 'The World'
] as const;

const TAROT_SUITS: readonly TarotSuit[] = ['wands', 'cups', 'swords', 'pentacles'] as const;
const MINOR_RANKS: readonly MinorRank[] = [
  'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  'Page', 'Knight', 'Queen', 'King'
] as const;

export function createStandardDeck(): Deck {
  const cards: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        kind: 'standard',
        suit,
        rank,
        id: `${rank}_${suit}`,
      });
    }
  }

  return {
    name: 'Standard 52-Card Deck',
    cards,
  };
}

export function createTarotDeck(): Deck {
  const cards: Card[] = [];

  // 22 Major Arcana
  for (let i = 0; i < TAROT_MAJOR.length; i++) {
    cards.push({
      kind: 'tarot',
      arcana: 'major',
      name: TAROT_MAJOR[i],
      suit: null,
      rank: null,
      id: `major_${i.toString().padStart(2, '0')}_${TAROT_MAJOR[i].toLowerCase().replace(/\s+/g, '_')}`,
    });
  }

  // 56 Minor Arcana (4 suits x 14 ranks)
  for (const suit of TAROT_SUITS) {
    for (const rank of MINOR_RANKS) {
      cards.push({
        kind: 'tarot',
        arcana: 'minor',
        name: null,
        suit,
        rank,
        id: `${rank.toLowerCase()}_${suit}`,
      });
    }
  }

  return {
    name: 'Tarot 78-Card Deck',
    cards,
  };
}
