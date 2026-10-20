import type { CardImage } from '../types.ts';

// Default image system. Task T2 fills all 52 cards. See tasks/T2-card-images.md.
// Rank gives the object (shape or sound), suit gives the flavour:
//   Spades = digging, tools, dark   Hearts = love, people, fire
//   Diamonds = money, gold, shine   Clubs = plants, nature, fighting
export const CARD_IMAGES: CardImage[] = [
  { card: '8D', image: 'A snowman made of gold coins', hook: '8 = snowman shape, Diamonds = money' },
  { card: '2H', image: 'Two swans kissing, necks making a heart', hook: '2 = swan shape, Hearts = love' },
];
