// src/cards/types.ts

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type Rank =
  | 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K';

export type TarotSuit = 'wands' | 'cups' | 'swords' | 'pentacles';

export type MajorArcana =
  | 'The Fool' | 'The Magician' | 'The High Priestess' | 'The Empress'
  | 'The Emperor' | 'The Hierophant' | 'The Lovers' | 'The Chariot'
  | 'Strength' | 'The Hermit' | 'Wheel of Fortune' | 'Justice'
  | 'The Hanged Man' | 'Death' | 'Temperance' | 'The Devil'
  | 'The Tower' | 'The Star' | 'The Moon' | 'The Sun'
  | 'Judgement' | 'The World';

export type MinorRank =
  | 'Ace' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'Page' | 'Knight' | 'Queen' | 'King';

export interface StandardCard {
  readonly kind: 'standard';
  readonly suit: Suit;
  readonly rank: Rank;
  readonly id: string;
}

export interface TarotCard {
  readonly kind: 'tarot';
  readonly arcana: 'major' | 'minor';
  readonly name: MajorArcana | null;       // only for major arcana
  readonly suit: TarotSuit | null;         // only for minor arcana
  readonly rank: MinorRank | null;         // only for minor arcana
  readonly id: string;
}

export type Card = StandardCard | TarotCard;

export interface Deck {
  readonly name: string;
  readonly cards: readonly Card[];
}
