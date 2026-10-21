import { DECK } from '../deck.ts';
import { CARD_IMAGES } from '../data/cardImages.ts';
import { imageFor, save } from '../store.ts';
import { isDue, newSrs, review, Rating, strength, type Grade } from '../srs.ts';
import type { CardId, SaveData } from '../types.ts';
import { cardFace } from './cardFace.ts';

type QueueItem = { card: CardId; kind: 'learn' | 'review' };
type Screen = 'learn' | 'recall' | 'reveal' | 'overview' | 'reforge' | 'end';

/** Due reviews come first, oldest due first, followed by at most eight unseen cards. */
export function buildQueue(data: SaveData, now: Date): CardId[] {
  const due: CardId[] = [];
  const fresh: CardId[] = [];
  for (const card of DECK) {
    const state = data.srs?.[card];
    if (state) {
      if (isDue(state, now)) due.push(card);
    } else {
      fresh.push(card);
    }
  }
  due.sort((a, b) => new Date(data.srs[a]!.due).getTime() - new Date(data.srs[b]!.due).getTime());
  return [...due, ...fresh.slice(0, 8)];
}

export function mountTrainer(root: HTMLElement, data: SaveData, onExit: (data: SaveData) => void): () => void {
  const shell = document.createElement('main');
  shell.className = 'trainer';
  shell.setAttribute('aria-label', 'Card image trainer');
  root.append(shell);

  const now = new Date();
  const queue: QueueItem[] = buildQueue(data, now).map((card) => ({
    card,
    kind: data.srs[card] ? 'review' : 'learn',
  }));
  let current: QueueItem | null = null;
  let screen: Screen = queue.length ? (queue[0].kind === 'learn' ? 'learn' : 'recall') : 'end';
  let reviewed = 0;
  let againCount = 0;
  let learned = 0;
  let reforgeCard: CardId | null = null;
  let overviewCard: CardId | null = null;
  let returnScreen: Screen = screen;
  let closed = false;

  const persist = () => save(data);
  const next = () => {
    current = queue.shift() ?? null;
    screen = current ? current.kind === 'learn' ? 'learn' : 'recall' : 'end';
    render();
  };
  const updateImage = (card: CardId, value: string) => {
    data.images[card] = value;
    persist();
  };

  function renderOverview(): HTMLElement {
    const overview = document.createElement('nav');
    overview.className = 'trainer-overview';
    overview.setAttribute('aria-label', 'Card progress overview');
    for (const card of DECK) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'trainer-tile';
      const label = `${card} — ${imageFor(data, card)}`;
      tile.textContent = card;
      tile.setAttribute('aria-label', `Show ${label} image`);
      tile.title = label;
      const state = data.srs?.[card];
      tile.dataset.strength = state ? strength(state, new Date()) : 'new';
      tile.style.backgroundColor = 'var(--s)';
      tile.addEventListener('click', () => showOverviewCard(card));
      overview.append(tile);
    }
    return overview;
  }

  function addImageDisplay(card: CardId, includeHook: boolean): void {
    const image = document.createElement('p');
    image.className = 'trainer-image';
    image.textContent = imageFor(data, card);
    shell.append(image);
    if (includeHook) {
      const definition = CARD_IMAGES.find((entry) => entry.card === card);
      if (definition) {
        const hook = document.createElement('p');
        hook.className = 'trainer-hook';
        hook.textContent = definition.hook;
        shell.append(hook);
      }
    }
  }

  function showOverviewCard(card: CardId): void {
    if (screen !== 'overview') returnScreen = screen;
    overviewCard = card;
    screen = 'overview';
    render();
  }

  function completeLearn(): void {
    if (!current || current.kind !== 'learn') return;
    data.srs[current.card] = newSrs();
    learned++;
    persist();
    queue.push({ card: current.card, kind: 'review' });
    next();
  }

  function saveReforge(): void {
    if (!reforgeCard) return;
    const card = reforgeCard;
    const input = shell.querySelector<HTMLInputElement>('.trainer-reforge-input');
    if (input) updateImage(card, input.value);
    reforgeCard = null;
    queue.push({ card, kind: 'review' });
    next();
  }

  function rate(rating: Grade): void {
    if (!current || current.kind !== 'review' || screen !== 'reveal') return;
    const card = current.card;
    const state = data.srs[card];
    if (!state) return;
    const updated = review(state, rating, new Date());
    data.srs[card] = updated;
    reviewed++;
    if (rating === Rating.Again) againCount++;
    persist();
    if (rating === Rating.Again && updated.lapses >= 4) {
      reforgeCard = card;
      screen = 'reforge';
      render();
      shell.querySelector<HTMLInputElement>('.trainer-reforge-input')?.focus();
      return;
    }
    if (rating === Rating.Again) queue.push({ card, kind: 'review' });
    next();
  }

  function addRateButtons(): void {
    const ratings: { value: Grade; label: string; key: string }[] = [
      { value: Rating.Again as Grade, label: 'Again', key: '1' },
      { value: Rating.Hard as Grade, label: 'Hard', key: '2' },
      { value: Rating.Good as Grade, label: 'Good', key: '3' },
      { value: Rating.Easy as Grade, label: 'Easy', key: '4' },
    ];
    const buttons = document.createElement('div');
    buttons.className = 'trainer-ratings';
    for (const rating of ratings) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${rating.label} (${rating.key})`;
      button.setAttribute('aria-keyshortcuts', rating.key);
      button.addEventListener('click', () => rate(rating.value));
      buttons.append(button);
    }
    shell.append(buttons);
  }

  function render(): void {
    shell.replaceChildren();
    shell.append(renderOverview());
    const progress = document.createElement('p');
    progress.className = 'trainer-progress';
    progress.setAttribute('aria-live', 'polite');
    progress.textContent = `${queue.length + (current ? 1 : 0)} left`;
    shell.append(progress);

    if (screen === 'end') {
      const title = document.createElement('h1');
      title.textContent = 'Session complete';
      const summary = document.createElement('p');
      summary.textContent = `Reviewed ${reviewed} · Again ${againCount} · New learned ${learned}`;
      const back = document.createElement('button');
      back.type = 'button';
      back.textContent = 'Back';
      back.addEventListener('click', exit);
      shell.append(title, summary, back);
      return;
    }

    if (screen === 'overview') {
      if (overviewCard) {
        shell.append(cardFace(overviewCard));
        const title = document.createElement('h2');
        title.textContent = 'Card image';
        shell.append(title);
        addImageDisplay(overviewCard, true);
      }
      const back = document.createElement('button');
      back.type = 'button';
      back.textContent = 'Continue';
      back.addEventListener('click', () => {
        overviewCard = null;
        screen = returnScreen;
        render();
      });
      shell.append(back);
      return;
    }

    if (!current) return;
    shell.append(cardFace(current.card));

    if (screen === 'learn') {
      const heading = document.createElement('h1');
      heading.textContent = 'Learn this image';
      shell.append(heading);
      addImageDisplay(current.card, true);
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'trainer-image-input';
      input.setAttribute('aria-label', 'Make it yours');
      input.placeholder = 'Make it yours';
      input.value = imageFor(data, current.card);
      input.addEventListener('input', () => updateImage(current!.card, input.value));
      shell.append(input);
      const gotIt = document.createElement('button');
      gotIt.type = 'button';
      gotIt.textContent = 'Got it';
      gotIt.addEventListener('click', completeLearn);
      shell.append(gotIt);
      return;
    }

    if (screen === 'recall') {
      const hint = document.createElement('p');
      hint.textContent = 'Recall the image, then press Space to reveal.';
      shell.append(hint);
      return;
    }

    if (screen === 'reveal') {
      addImageDisplay(current.card, true);
      addRateButtons();
      return;
    }

    if (screen === 'reforge') {
      const prompt = document.createElement('label');
      prompt.textContent = "This image isn't sticking. Make it stranger:";
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'trainer-reforge-input';
      input.setAttribute('aria-label', 'Make the image stranger');
      input.value = imageFor(data, current.card);
      input.addEventListener('input', () => updateImage(current!.card, input.value));
      prompt.append(input);
      shell.append(prompt);
      const saveButton = document.createElement('button');
      saveButton.type = 'button';
      saveButton.textContent = 'Save image';
      saveButton.addEventListener('click', saveReforge);
      shell.append(saveButton);
    }
  }

  function exit(): void {
    if (closed) return;
    persist();
    unmount();
    onExit(data);
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      exit();
      return;
    }
    const target = event.target;
    const editing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable);
    if (screen === 'learn' && editing) {
      if (event.key === 'Enter') {
        event.preventDefault();
        completeLearn();
      }
      return;
    }
    if (!current) return;
    if (screen === 'learn' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      completeLearn();
    } else if (screen === 'recall' && event.key === ' ') {
      event.preventDefault();
      screen = 'reveal';
      render();
    } else if (screen === 'reveal' && ['1', '2', '3', '4'].includes(event.key)) {
      event.preventDefault();
      rate(Number(event.key) as Grade);
    } else if (screen === 'reforge' && event.key === 'Enter') {
      event.preventDefault();
      saveReforge();
    }
  };
  document.addEventListener('keydown', onKeyDown);
  next();

  function unmount(): void {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeyDown);
    shell.remove();
  }

  return unmount;
}
