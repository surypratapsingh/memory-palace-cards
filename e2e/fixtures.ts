import { test as base, expect } from '@playwright/test';

// Every test gets a fresh context (empty localStorage) and fails on any console error or uncaught page error.
export const test = base.extend({
  page: async ({ page }, use) => {
    const problems: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') problems.push(`console.error: ${msg.text()}`);
    });
    page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
    await use(page);
    expect(problems, 'console errors or page errors').toEqual([]);
  },
});

export { expect };
