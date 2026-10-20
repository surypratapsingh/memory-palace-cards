import { mountTrainer, buildQueue } from './trainer.ts';
import { load } from '../store.ts';
import type { SaveData } from '../types.ts';

const body = document.body;
const saveData = load();
const onExit = (data: SaveData) => {
  console.log('Trainer exited', data);
};

const unmount = mountTrainer(body, saveData, onExit);

// Demo: learn 8 new cards
const queue = buildQueue(saveData, new Date());
console.log('Initial queue size:', queue.length);

// Simulate learning 8 cards with keyboard
// Enter to start, Space to reveal, 1-4 to rate
let cardIndex = 0;

function nextCard() {
  if (cardIndex < queue.length) {
    const card = queue[cardIndex];
    console.log('Showing card:', card);
    cardIndex++;
    setTimeout(nextCard, 1000);
  }
}

setTimeout(nextCard, 500);