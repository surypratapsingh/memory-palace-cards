import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const CI_PATH = path.resolve('.github/workflows/ci.yml');
const PAGES_PATH = path.resolve('.github/workflows/pages.yml');
const VITE_CONFIG_PATH = path.resolve('vite.config.ts');
const DIST_INDEX_PATH = path.resolve('dist/index.html');
const README_PATH = path.resolve('README.md');

test('redteam T10 1: ci.yml enforces Node 24 and runs tests before build', () => {
  assert.ok(existsSync(CI_PATH), 'ci.yml must exist');
  const content = readFileSync(CI_PATH, 'utf8');

  // Trigger check
  assert.match(content, /on:\s*\n\s*push:\s*\n\s*pull_request:/m, 'CI must trigger on push and pull_request');

  // Node 24 check
  assert.match(content, /node-version:\s*24/, 'CI must specify Node.js 24');

  // Permissions minimal
  assert.match(content, /permissions:\s*\n\s*contents:\s*read/m, 'CI permissions must be read-only');

  // Execution order: npm test must precede npm run build
  const testIndex = content.indexOf('npm test');
  const buildIndex = content.indexOf('npm run build');
  assert.ok(testIndex !== -1, 'ci.yml must contain "npm test"');
  assert.ok(buildIndex !== -1, 'ci.yml must contain "npm run build"');
  assert.ok(testIndex < buildIndex, 'npm test must run before npm run build in ci.yml');
});

test('redteam T10 2: pages.yml deploys exclusively from main and runs tests before artifact upload', () => {
  assert.ok(existsSync(PAGES_PATH), 'pages.yml must exist');
  const content = readFileSync(PAGES_PATH, 'utf8');

  // Must only trigger on push to main branch
  assert.match(content, /branches:\s*\n\s*-\s*main/m, 'pages.yml must only trigger on push to main');
  assert.doesNotMatch(content, /pull_request/, 'pages.yml must not trigger on pull_request');

  // Node 24 check
  assert.match(content, /node-version:\s*24/, 'pages.yml must use Node 24');

  // Step order: test -> build -> upload artifact
  const testIdx = content.indexOf('npm test');
  const buildIdx = content.indexOf('npm run build');
  const uploadIdx = content.indexOf('actions/upload-pages-artifact');
  assert.ok(testIdx !== -1, 'pages.yml must contain npm test');
  assert.ok(buildIdx !== -1, 'pages.yml must contain npm run build');
  assert.ok(uploadIdx !== -1, 'pages.yml must contain upload-pages-artifact');
  assert.ok(testIdx < buildIdx, 'npm test must run before npm run build');
  assert.ok(buildIdx < uploadIdx, 'npm run build must run before upload-pages-artifact');

  // Path must be dist/
  assert.match(content, /path:\s*dist\/?/, 'upload-pages-artifact must upload dist/');
});

test('redteam T10 3: pages.yml permissions are minimal and deploy job depends on build job', () => {
  const content = readFileSync(PAGES_PATH, 'utf8');

  // Top level permissions read only
  assert.match(content, /^permissions:\s*\n\s*contents:\s*read/m, 'Top level permissions must be contents: read');

  // Deploy job requires build job
  assert.match(content, /needs:\s*build/, 'deploy job must require build job');

  // Deploy job permissions
  assert.match(content, /pages:\s*write/, 'deploy job must have pages: write permission');
  assert.match(content, /id-token:\s*write/, 'deploy job must have id-token: write permission');

  // No secrets printed in steps
  assert.doesNotMatch(content, /echo.*secrets/i, 'No secrets should be echoed or exposed');
});

test('redteam T10 4: vite.config.ts configures relative base path', () => {
  assert.ok(existsSync(VITE_CONFIG_PATH), 'vite.config.ts must exist');
  const content = readFileSync(VITE_CONFIG_PATH, 'utf8');

  // Base must be './'
  assert.match(content, /base:\s*['"]\.\/['"]/, 'vite.config.ts must set base to "./" for relative subpath assets');
});

test('redteam T10 5: workflows use only official GitHub actions pinned to major tags', () => {
  const ciContent = readFileSync(CI_PATH, 'utf8');
  const pagesContent = readFileSync(PAGES_PATH, 'utf8');
  const combined = `${ciContent}\n${pagesContent}`;

  const actionMatches = [...combined.matchAll(/uses:\s*([^\s]+)/g)].map((m) => m[1]);
  assert.ok(actionMatches.length >= 5, 'Must contain expected actions');

  for (const action of actionMatches) {
    assert.match(action, /^actions\/[a-z-]+@v\d+$/, `Action ${action} must be an official actions/ repo pinned to a major tag @vN`);
  }
});

// Lead: CI runs `npm test` before `npm run build` on a clean checkout, so dist/ may not exist yet.
test('redteam T10 6: production dist/ build links assets relatively and README includes Play link', () => {
  if (existsSync(DIST_INDEX_PATH)) {
    const distHtml = readFileSync(DIST_INDEX_PATH, 'utf8');

    // Relative script and css references
    assert.match(distHtml, /src=["']\.\/assets\/[^"']+["']/, 'Script tags in dist/index.html must use relative paths (./assets/...)');
    assert.match(distHtml, /href=["']\.\/assets\/[^"']+["']/, 'Link tags in dist/index.html must use relative paths (./assets/...)');
    assert.doesNotMatch(distHtml, /src=["']\/assets\//, 'No absolute /assets/ paths allowed in production index.html');
  }

  // README Play section
  assert.ok(existsSync(README_PATH), 'README.md must exist');
  const readme = readFileSync(README_PATH, 'utf8');
  assert.match(readme, /## Play/, 'README.md must have a "Play" section');
  assert.match(readme, /https:\/\/[a-z0-9_-]+\.github\.io\/[a-z0-9_-]+/, 'README.md must include a GitHub Pages play link');
});
