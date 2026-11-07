import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

test('T16 red-team 1: playwright.config.ts configuration invariants', () => {
  const configPath = resolve(ROOT, 'playwright.config.ts');
  assert.ok(existsSync(configPath), 'playwright.config.ts must exist');
  const source = readFileSync(configPath, 'utf8');

  // Chromium project with SwiftShader flags
  assert.match(source, /name:\s*['"]chromium['"]/, 'config must specify chromium project');
  assert.match(source, /--use-angle=swiftshader/, 'launch options must include --use-angle=swiftshader');

  // WebServer runs preview on port 4173
  assert.match(source, /webServer:\s*\{/, 'config must have webServer');
  assert.match(source, /npm run build && npm run preview/, 'webServer must test production build');
  assert.match(source, /4173/, 'webServer must run on port 4173');

  // Retries in CI
  assert.match(source, /process\.env\.CI/, 'retries must check CI environment');
});

test('T16 red-team 2: e2e test files maintain strict selector hygiene (no CSS class locators)', () => {
  const smoke = readFileSync(resolve(ROOT, 'e2e/smoke.spec.ts'), 'utf8');
  const redteam = readFileSync(resolve(ROOT, 'e2e/redteam-T16.spec.ts'), 'utf8');
  const combined = smoke + '\n' + redteam;

  // No locator('...') with class selectors like locator('.home-btn')
  assert.equal(
    /locator\(['"]\.[a-zA-Z]/.test(combined),
    false,
    'E2E tests must never select elements by CSS class (.classname)',
  );

  // No CSS selector methods querying classes
  assert.equal(
    /\$\(['"]\.[a-zA-Z]/.test(combined),
    false,
    'E2E tests must never use page.$ with CSS class selector',
  );
});

test('T16 red-team 3: zero fixed sleeps / timeouts in e2e tests', () => {
  const smoke = readFileSync(resolve(ROOT, 'e2e/smoke.spec.ts'), 'utf8');
  const redteam = readFileSync(resolve(ROOT, 'e2e/redteam-T16.spec.ts'), 'utf8');
  const helpers = readFileSync(resolve(ROOT, 'e2e/helpers.ts'), 'utf8');
  const combined = smoke + '\n' + redteam + '\n' + helpers;

  assert.equal(
    /waitForTimeout/.test(combined),
    false,
    'E2E tests must never use fixed sleeps (waitForTimeout); use state assertions instead',
  );
  assert.equal(
    /setTimeout/.test(combined),
    false,
    'E2E tests must never use setTimeout; use state-based polling or locators',
  );
});

test('T16 red-team 4: CI workflow incorporates chromium installation, e2e run, and artifact upload on failure', () => {
  const ciPath = resolve(ROOT, '.github/workflows/ci.yml');
  assert.ok(existsSync(ciPath), 'ci.yml must exist');
  const ciContent = readFileSync(ciPath, 'utf8');

  assert.match(ciContent, /npx playwright install --with-deps chromium/, 'CI must install Playwright chromium');
  assert.match(ciContent, /npm run e2e/, 'CI must run npm run e2e');
  assert.match(ciContent, /playwright-report/, 'CI must upload playwright-report artifact');
  assert.match(ciContent, /if:\s*failure\(\)/, 'report upload must trigger on failure');
});

test('T16 red-team 5: package.json and .gitignore boundary invariants', () => {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts?.e2e, 'playwright test', 'package.json must contain "e2e": "playwright test" script');
  assert.ok(pkg.devDependencies?.['@playwright/test'], '@playwright/test must be in devDependencies');

  const gitignore = readFileSync(resolve(ROOT, '.gitignore'), 'utf8');
  assert.match(gitignore, /test-results/, '.gitignore must ignore test-results/');
  assert.match(gitignore, /playwright-report/, '.gitignore must ignore playwright-report/');
});

test('T16 red-team 6: production build bundle contains zero dev hooks or test leakage', () => {
  const distDir = resolve(ROOT, 'dist');
  if (existsSync(distDir)) {
    const assetsDir = resolve(distDir, 'assets');
    if (existsSync(assetsDir)) {
      const files = readFileSync(resolve(ROOT, 'dist/index.html'), 'utf8');
      assert.equal(/__mp/.test(files), false, 'index.html must not contain __mp hook');
    }
  }
});
