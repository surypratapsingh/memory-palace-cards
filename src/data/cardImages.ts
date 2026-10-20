import type { CardImage } from '../types.ts';

// Default image system. Task T2 fills all 52 cards.
// Rank gives the object (shape or sound), suit gives the flavour:
//   Spades = digging, tools, darkness, graveyards
//   Hearts = love, people, fire, romance
//   Diamonds = money, gold, jewels, luxury
//   Clubs = plants, jungle, fighting, cavemen

export const CARD_IMAGES: CardImage[] = [
  { card: 'AS', image: 'A rocket drilling down into a graveyard', hook: 'A = rocket, Spades = digging' },
  { card: '2S', image: 'A swan swimming in a dark lake', hook: '2 = swan, Spades = digging' },
  { card: '3S', image: 'A trident piercing through dark water', hook: '3 = trident, Spades = tools' },
  { card: '4S', image: 'A sailboat sailing into a stormy night', hook: '4 = sailboat, Spades = darkness' },
  { card: '5S', image: 'A giant hand emerging from a grave', hook: '5 = giant hand, Spades = digging' },
  { card: '6S', image: 'A snail leaving a trail in dark mud', hook: '6 = snail, Spades = spiral' },
  { card: '7S', image: 'A boomerang returning to a cave entrance', hook: '7 = boomerang, Spades = darkness' },
  { card: '8S', image: 'A snowman made of dark coal chunks', hook: '8 = snowman, Spades = digging' },
  { card: '9S', image: 'A balloon floating into a stormy sky', hook: '9 = balloon, Spades = darkness' },
  { card: 'TS', image: 'A bat and ball game in a graveyard at dusk', hook: 'T = bat and ball, Spades = digging' },
  { card: 'JS', image: 'A jester performing magic with a dark cloak', hook: 'J = jester, Spades = tools' },
  { card: 'QS', image: 'A queen holding a torch in a graveyard', hook: 'Q = queen, Spades = digging' },
  { card: 'KS', image: 'A king placing a flower on a grave', hook: 'K = king, Spades = digging' },

  { card: 'AH', image: 'A love letter being carried away by the wind', hook: 'A = letter, Hearts = love' },
  { card: '2H', image: 'Two swans kissing, necks making a heart shape', hook: '2 = swan, Hearts = love' },
  { card: '3H', image: 'Three flowers blooming around a heart-shaped bush', hook: '3 = flower, Hearts = love' },
  { card: '4H', image: 'A heart-shaped lantern floating over a campfire', hook: '4 = lantern, Hearts = fire' },
  { card: '5H', image: 'Five people holding hands in a circle', hook: '5 = people, Hearts = love' },
  { card: '6H', image: 'Six doves releasing into a sunset', hook: '6 = doves, Hearts = romance' },
  { card: '7H', image: 'Seven fireflies dancing above a romantic picnic', hook: '7 = fireflies, Hearts = romance' },
  { card: '8H', image: 'Eight musicians playing under string lights', hook: '8 = musicians, Hearts = people' },
  { card: '9H', image: 'Nine petals falling around a painted heart', hook: '9 = petals, Hearts = love' },
  { card: 'TH', image: 'Ten dancers in a valentines day parade', hook: 'T = dancers, Hearts = romance' },
  { card: 'JH', image: 'A jester juggling heart-shaped pins', hook: 'J = jester, Hearts = people' },
  { card: 'QH', image: 'A queen sending a smoke signal heart', hook: 'Q = queen, Hearts = love' },
  { card: 'KH', image: 'A king giving a rose to a knight', hook: 'K = king, Hearts = romance' },

  { card: 'AD', image: 'A gold nugget being mined from a hillside', hook: 'A = gold nugget, Diamonds = money' },
  { card: '2D', image: 'Two swans swimming in a golden lake', hook: '2 = swan, Diamonds = money' },
  { card: '3D', image: 'Three golden trumpets standing upright', hook: '3 = trumpets, Diamonds = gold' },
  { card: '4D', image: 'A sailboat with sails made of gold fabric', hook: '4 = sailboat, Diamonds = gold' },
  { card: '5D', image: 'A giant hand counting gold coins', hook: '5 = giant hand, Diamonds = money' },
  { card: '6D', image: 'A snail carrying a small gold ring', hook: '6 = snail, Diamonds = jewels' },
  { card: '7D', image: 'A boomerang throwing a glittering light', hook: '7 = boomerang, Diamonds = shine' },
  { card: '8D', image: 'A snowman made of gold coins', hook: '8 = snowman, Diamonds = money' },
  { card: '9D', image: 'Nine balloons floating above a gold castle', hook: '9 = balloons, Diamonds = gold' },
  { card: 'TD', image: 'A treasure chest opening to reveal diamonds', hook: 'T = treasure, Diamonds = gold' },
  { card: 'JD', image: 'A jester performing with gold props', hook: 'J = jester, Diamonds = gold' },
  { card: 'QD', image: 'A queen wearing a golden crown', hook: 'Q = queen, Diamonds = jewels' },
  { card: 'KD', image: 'A king holding a golden scepter', hook: 'K = king, Diamonds = money' },

  { card: 'AC', image: 'A caveman discovering a rare plant in a jungle', hook: 'A = caveman, Clubs = plants' },
  { card: '2C', image: 'Two jungle tigers playing with vines', hook: '2 = tigers, Clubs = jungle' },
  { card: '3C', image: 'Three monkeys swinging from tree branches', hook: '3 = monkeys, Clubs = jungle' },
  { card: '4C', image: 'Four cavemen building a shelter together', hook: '4 = cavemen, Clubs = fighting' },
  { card: '5C', image: 'Five plants growing in a spiral pattern', hook: '5 = plants, Clubs = plants' },
  { card: '6C', image: 'Six flowers blooming around a club-shaped bush', hook: '6 = flowers, Clubs = plants' },
  { card: '7C', image: 'Seven warriors practicing with wooden clubs', hook: '7 = warriors, Clubs = fighting' },
  { card: '8C', image: 'A snowman made of pine branches and twigs', hook: '8 = snowman, Clubs = plants' },
  { card: '9C', image: 'Nine mushrooms growing in a circular pattern', hook: '9 = mushrooms, Clubs = plants' },
  { card: 'TC', image: 'Ten arrows stuck in a tree target', hook: 'T = arrows, Clubs = fighting' },
  { card: 'JC', image: 'A jester throwing flower petals', hook: 'J = jester, Clubs = plants' },
  { card: 'QC', image: 'A queen wielding a leafy staff', hook: 'Q = queen, Clubs = plants' },
  { card: 'KC', image: 'A king leading a jungle expedition', hook: 'K = king, Clubs = jungle' },
];