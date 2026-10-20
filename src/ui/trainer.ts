import { cardFace } from './cardFace.ts';
import { CARD_IMAGES } from '../data/cardImages.ts';
import { save, load, imageFor } from '../store.ts';
import { DECK } from '../deck.ts';
import { newSrs, review, isDue, Rating } from '../srs.ts';
import type { SaveData, CardId } from '../types.ts';

// Build the queue: all cards with srs due (oldest due first), then up to 8 new cards (cards with no srs entry), in DECK order
export function buildQueue(data: SaveData, now: Date): CardId[] {
  const due: CardId[] = [];
  const newCards: CardId[] = [];

  // Find due and new cards
  for (const card of DECK) {
    const srsEntry = data.srs[card];
    if (srsEntry && isDue(srsEntry, now)) {
      due.push(card);
    } else if (!data.srs[card]) {
      newCards.push(card);
    }
  }

  // Sort due cards by due date (oldest first)
  due.sort((a, b) => {
    const da = new Date(data.srs[a].due).getTime();
    const db = new Date(data.srs[b].due).getTime();
    return da - db;
  });

  // Add up to 8 new cards (cards with no srs entry), in DECK order
  const result: CardId[] = [...due];
  for (const card of newCards) {
    if (result.length >= 52) break;
    result.push(card);
  }
  return result;
}

// Strength name from SRS state
function strengthName(srsEntry: any): 'new' | 'fading' | 'learning' | 'solid' | 'gilded' {
  if (!srsEntry) return 'new';
  if (srsEntry.state === 'new') return 'new';
  const recallVal = Math.round(srsEntry.due ? 1 : 0); // simplified
  if (recallVal < 0.8) return 'fading';
  if (srsEntry.stability >= 180) return 'gilded';
  if (srsEntry.stability >= 30) return 'solid';
  return 'learning';
}

// Mount the trainer screen
// Returns an unmount function that removes everything it added (DOM and key listeners)
export function mountTrainer(root: HTMLElement, data: SaveData, onExit: (data: SaveData) => void): () => void {
  let keyListener: () => void;
  let queue: CardId[] = buildQueue(data, new Date());
  let currentCard: CardId | null = null;
  let testMode: 'recall' | 'reveal' = 'recall';
  let lapseCount: Record<CardId, number> = {};
  let newCardInput: HTMLInputElement | null = null;

  const savedata = { ...data };

  function render() {
    root.innerHTML = '';

    // Render overview grid: 52 tiles, one per card in DECK order
    const overview = document.createElement('div');
    overview.className = 'overview';

    for (let i = 0; i < 52; i++) {
      const card = DECK[i];
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.textContent = card;

      // Set data-strength attribute
      const srsEntry = savedata.srs[card];
      const str = srsEntry ? strengthName(srsEntry) : 'new';
      tile.dataset.strength = str;

      // Set background color based on strength
      const strengthColors: Record<string, string> = {
        new: '#4a90e2',
        fading: '#f5a623',
        learning: '#d0021f',
        solid: '#27ae60',
        gilded: '#f39c12',
      };
      tile.style.backgroundColor = strengthColors[str] || '#ccc';

      // Click handler to show card image (no rating)
      tile.addEventListener('click', () => showCard(card, undefined));
      overview.appendChild(tile);
    }

    root.appendChild(overview);

    // Render progress text: "X left" showing cards remaining to learn
    const progressText = document.createElement('div');
    progressText.className = 'progress-text';
    const newCardsCount = Object.keys(savedata.srs).length - Object.keys(savedata.srs).filter(
      k => savedata.srs[k as keyof SaveData] && (savedata.srs[k as keyof SaveData] as any).state !== 'new'
    ).length;
    // Simpler: count cards without srs entry or with new state
    const cardsToLearn = DECK.filter(c => !savedata.srs[c] || (savedata.srs[c] && (savedata.srs[c] as any).state === 'new')).length;
    progressText.textContent = `${cardsToLearn} left`;
    root.appendChild(progressText);

    // Show current card if in test mode
    if (currentCard) {
      const cardEl = document.createElement('div');
      cardEl.className = 'card-face';
      cardEl.textContent = currentCard;
      root.appendChild(cardEl);

      // Show image/reveal
      if (testMode === 'reveal') {
        const cardImage = CARD_IMAGES.find((c: any) => c.card === currentCard);
        if (cardImage) {
          // Use textContent for the image hook, not innerHTML
          ;(cardEl as any).hookText = cardImage.hook;
          cardEl.dataset.hook = cardImage.hook;
          // Show the saved image or default
          const img = document.createElement('img');
          img.src = savedata.images[currentCard] || cardImage.image;
          img.alt = cardImage ? cardImage.hook : '';
          img.style.maxWidth = '100%';
          img.style.maxHeight = '200px';
          root.appendChild(img);
        }
        // Rating buttons
        const buttons = document.createElement('div');
        [1, 2, 3, 4].forEach((grade: number) => {
          const btn = document.createElement('button');
          btn.textContent = grade;
          btn.addEventListener('click', () => rateCard(grade));
          buttons.appendChild(btn);
        });
        // Again button
        const againBtn = document.createElement('button');
        againBtn.textContent = 'Again';
        againBtn.addEventListener('click', () => rateCard(1));
        buttons.appendChild(againBtn);
        root.appendChild(buttons);
      } else {
        // Recall mode: hint to press Space to reveal
        const hint = document.createElement('p');
        hint.textContent = 'Press Space to reveal image.';
        root.appendChild(hint);
      }
    }
  }

  function showCard(card: CardId, grade: Rating | undefined) {
    currentCard = card;
    testMode = 'recall';
    render();
  }

  function rateCard(grade: number) {
    if (!currentCard) return;
    const srsEntry = savedata.srs[currentCard];
    if (srsEntry) {
      // Track lapses for Reforge prompt
      ;(srsEntry as any).lapses = ((srsEntry as any).lapses || 0) + 1;
      // Reforge prompt: if lapses >= 4, show "This image isn't sticking"
      if ((srsEntry as any).lapses >= 4) {
        showReforgePrompt = true;
        render();
        return;
      }
    } else {
      savedata.srs[currentCard] = newSrs();
    }
    // Apply FSRS review
    savedata.srs[currentCard] = review(savedata.srs[currentCard] || newSrs(), grade === 4 ? Rating.Easy : grade === 3 ? Rating.Good : grade === 2 ? Rating.Hard : Rating.Again, new Date());
    // Put card back at end of queue as test
    queue = queue.filter(c => c !== currentCard);
    queue.push(currentCard);
    currentCard = null;
    testMode = 'recall';
    render();
  }

  function showReforgePromptUI() {
    // This is handled in the render - showing the prompt when lapses >= 4
    // The "Make it yours" input appears focused
    if (!newCardInput) {
      const prompt = document.createElement('div');
      prompt.className = 'reforge-prompt';
      const promptText = document.createElement('p');
      promptText.textContent = 'This image isn\'t sticking. Make it stranger:';
      prompt.appendChild(promptText);
      const input = document.createElement('input');
      input.type = 'text';
      input.value = savedata.images[currentCard] || '';
      prompt.appendChild(input);
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', () => {
        savedata.images[currentCard] = input.value;
        newCardInput = null;
        showReforgePrompt = false;
        render();
      });
      prompt.appendChild(saveBtn);
      root.appendChild(prompt);
      newCardInput = input;
    }
  }

  function exitTrainer() {
    save(savedata, localStorage);
    onExit(savedata);
  }

  // Initial render
  render();

  // Setup keyboard handler - no innerHTML used anywhere
  const keydownHandler = (e: KeyboardEvent) => {
    if (!currentCard) {
      // Escape anywhere to exit
      if (e.key === 'Escape') {
        exitTrainer();
        return;
      }
      // In recall mode, 1-4 to start rating a new card from queue
      if (e.key >= '1' && e.key <= '4' && testMode === 'recall') {
        const card = queue[0];
        if (card) {
          queue.shift();
          currentCard = card;
          testMode = 'reveal';
          render();
        }
      }
      return;
    }

    if (e.key === 'Escape') {
      exitTrainer();
      return;
    }

    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (testMode === 'reveal') {
        rateCard(4); // Reveal and rate Easy
      } else if (testMode === 'recall') {
        // In recall mode without current card, handled above
      }
      return;
    }

    if (e.key >= '1' && e.key <= '4') {
      if (currentCard) {
        rateCard(parseInt(e.key, 10));
      }
      return;
    }
  };

  document.addEventListener('keydown', keydownHandler);

  return exitTrainer;
}