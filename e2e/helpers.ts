import { expect, type Page } from '@playwright/test';
import { DECK } from '../src/deck.ts';
import { emptySave, imageFor } from '../src/store.ts';

export const SAVE_KEY = 'memory-palace/v1';

// Caption shown under a card while memorizing -> card id. Built from the same function the game uses.
const CAPTIONS = DECK.map((card) => ({ card, caption: imageFor(emptySave(), card) }));

export async function readSave(page: Page): Promise<any> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), SAVE_KEY);
}

async function bodyText(page: Page): Promise<string> {
  return page.locator('body').innerText();
}

/** Waits until the screen shows `marker`, then reads which card's caption is on screen. */
export async function readCard(page: Page, marker: string): Promise<string> {
  await expect.poll(() => bodyText(page), { timeout: 15_000 }).toContain(marker);
  const text = await bodyText(page);
  const hits = CAPTIONS.filter(({ caption }) => caption && text.includes(caption));
  expect(hits.length, `no card caption on screen at "${marker}"`).toBeGreaterThan(0);
  hits.sort((a, b) => b.caption.length - a.caption.length);
  return hits[0].card;
}

/** Recall = rank key then suit key, as in the keyboard input of the drill. */
export async function typeCard(page: Page, card: string): Promise<void> {
  await page.keyboard.press(card[0]);
  await page.keyboard.press(card[1]);
}

/** From a fresh save: onboarding, 3 cards watched, recall typed, result Continue. Returns elapsed ms. */
export async function completeOnboarding(page: Page): Promise<number> {
  const started = Date.now();
  await page.goto('/');
  await page.getByRole('button', { name: 'Watch three cards' }).click();
  const seen: string[] = [];
  for (let i = 1; i <= 3; i++) {
    seen.push(await readCard(page, `Locus ${i} of 3:`));
    await page.getByRole('button', { name: /^(Next|Test Recall)/ }).click();
  }
  for (let i = 1; i <= 3; i++) {
    await expect.poll(() => bodyText(page), { timeout: 15_000 }).toContain(`Recall Locus ${i} of 3`);
    await typeCard(page, seen[i - 1]);
  }
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('button', { name: /Settings/ })).toBeVisible();
  return Date.now() - started;
}

/** Home (after skipping onboarding) -> first drill (3 cards) -> memorize -> recall all right -> home. */
export async function playPerfectFirstDrill(page: Page): Promise<string[]> {
  await page.goto('/');
  await page.getByRole('button', { name: 'I know the method' }).click();
  await page.getByRole('button', { name: 'Start First Drill' }).click();
  await page.getByRole('button', { name: 'Start Memorizing' }).click();
  const cards = await memorizeAll(page, 3);
  for (let i = 1; i <= 3; i++) {
    await expect.poll(() => bodyText(page), { timeout: 15_000 }).toContain(`Recall`);
    await typeCard(page, cards[i - 1]);
  }
  await expect(page.getByText('Perfect Drill!')).toBeVisible();
  await page.getByRole('button', { name: /Back to Palace/ }).click();
  await expect(page.getByRole('button', { name: /Settings/ })).toBeVisible();
  return cards;
}

/** During memorize: reads the card at each locus, then presses Enter on the last one. */
export async function memorizeAll(page: Page, n: number): Promise<string[]> {
  const cards: string[] = [];
  for (let i = 1; i <= n; i++) {
    cards.push(await readCard(page, `Locus ${i} / ${n}:`));
    if (i < n) await page.keyboard.press('Space');
  }
  await page.keyboard.press('Enter');
  return cards;
}
