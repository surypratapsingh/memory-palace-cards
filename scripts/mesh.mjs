#!/usr/bin/env node
// Mesh coordinator. Board = main:TASKS.md, task state = commit subjects on each task branch.
//   node scripts/mesh.mjs status
//   node scripts/mesh.mjs next AG|FB [--wait]
// Commit subjects it reads (exact): "T1: ..." builder done, "V-T1 round 2: PASS" or "...: CHANGES" verifier,
// "BLOCKED T1: ..." builder needs the Lead, "LEAD T1: ..." Lead answered and the builder acts next.
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const READY = ['verified', 'done'];

export function parseBoard(md) {
  const section = md.split('\n## Board')[1]?.split('\n## ')[0] ?? '';
  const who = (s) => s.match(/\b(AG|FB|Lead)\b/)?.[1] ?? '-';
  return section
    .split('\n')
    .filter((l) => /^\| [A-Z]/.test(l) && !l.startsWith('| ID '))
    .map((l) => {
      const c = l.split('|').slice(1, -1).map((s) => s.trim());
      return { id: c[0], build: who(c[2]), verify: who(c[3]), needs: c[6] === '-' ? [] : c[6].split(/,\s*/), branch: c[7], status: c[8] };
    });
}

/** `subjects` = commit subjects of the task branch, newest first. `main` = subjects on main. */
export function stateFrom(t, branchExists, subjects, main) {
  const built = new RegExp(`^${t.id}: `);
  const verdict = new RegExp(`^V-${t.id} round \\d+: (PASS|CHANGES)`);
  const lead = new RegExp(`^(BLOCKED|LEAD) ${t.id}: `);
  const pass = (s) => verdict.exec(s)?.[1] === 'PASS';
  if (t.status === 'done' || main.some(pass) || (t.verify === '-' && main.some((s) => built.test(s)))) return { state: 'done', round: 0 };
  if (!branchExists) return { state: 'todo', round: 0 };
  const mine = subjects.filter((s) => built.test(s) || verdict.test(s) || lead.test(s));
  const round = mine.filter((s) => verdict.test(s)).length;
  const last = mine[0] ?? '';
  if (!last) return { state: 'in-progress', round };
  if (last.startsWith('BLOCKED ')) return { state: 'blocked', round };
  if (last.startsWith('LEAD ')) return { state: 'fix', round };
  if (built.test(last)) return { state: t.verify === '-' ? 'verified' : 'review', round };
  if (pass(last)) return { state: 'verified', round };
  return { state: round >= 3 ? 'lead' : 'fix', round };
}

/** Priority: fix own work, continue own build, verify the other agent, start the next own build. */
export function pickJob(agent, tasks, st) {
  const missing = (t) => t.needs.filter((id) => !READY.includes(st.get(id)?.state));
  // Paired entries (U1-AG vs U1-FB): rate the rival's entry only after building your own, so nobody copies it.
  const ownEntryOpen = (t) => ['todo', 'in-progress'].includes(st.get(t.id.replace(/-(AG|FB)$/, `-${agent}`))?.state);
  const find = (state, role) =>
    tasks.find((t) => t[role] === agent && st.get(t.id).state === state && !missing(t).length && !(role === 'verify' && ownEntryOpen(t)));
  const now = find('fix', 'build') ? ['FIX', find('fix', 'build')]
    : find('in-progress', 'build') ? ['CONTINUE', find('in-progress', 'build')]
    : find('review', 'verify') ? ['VERIFY', find('review', 'verify')]
    : null;
  if (now) return { kind: now[0], t: now[1] };
  const why = [];
  for (const t of tasks) {
    if (t.build !== agent || !['todo', 'in-progress'].includes(st.get(t.id).state)) continue;
    if (!missing(t).length) return { kind: 'BUILD', t };
    why.push(`${t.id} needs ${missing(t).map((id) => `${id} (${st.get(id)?.state ?? 'not on board'})`).join(', ')}`);
  }
  const open = tasks.filter((t) => (t.build === agent || t.verify === agent) && !READY.includes(st.get(t.id).state));
  if (!open.length) return { kind: 'ALL DONE' };
  return { kind: 'WAIT', why: [...open.filter((t) => st.get(t.id).state !== 'todo').map((t) => `${t.id} is ${st.get(t.id).state}`), ...why] };
}

const git = (...a) => {
  try {
    return execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};
const list = (s) => (s ? s.split(/\r?\n/) : []);
const mainDir = () => list(git('worktree', 'list', '--porcelain'))[0].replace(/^worktree /, '');
// Agents work only in wt/<ID>. Uncommitted files in the main folder mean someone worked in the wrong place.
const dirtyMain = () => list(git('-C', mainDir(), 'status', '--porcelain'));
const worktreeOf = (branch) => {
  const lines = list(git('worktree', 'list', '--porcelain'));
  const i = lines.indexOf(`branch refs/heads/${branch}`);
  return i < 0 ? null : (lines.slice(0, i).reverse().find((l) => l.startsWith('worktree '))?.slice(9) ?? null);
};
const same = (a, b) => resolve(a).toLowerCase() === resolve(b).toLowerCase();

function snapshot() {
  const tasks = parseBoard(git('show', 'main:TASKS.md'));
  const main = list(git('log', 'main', '--format=%s'));
  const st = new Map(
    tasks.map((t) => {
      const exists = !!git('rev-parse', '--verify', '--quiet', `refs/heads/${t.branch}`);
      return [t.id, stateFrom(t, exists, exists ? list(git('log', t.branch, '--format=%s')) : [], main)];
    }),
  );
  return { tasks, st };
}

function show(job, agent, tasks, st) {
  if (job.kind === 'ALL DONE') return `ALL DONE: ${agent} has no open tasks. Stop.`;
  if (job.kind === 'WAIT') return `WAIT: nothing for ${agent} to do yet.\n  ${job.why.join('\n  ')}`;
  const { t } = job;
  const root = mainDir();
  // Inside the project folder (hidden from git by .git/info/exclude): Freebuff can only edit files there.
  const dir = join(root, 'wt', t.id);
  const old = worktreeOf(t.branch);
  const packet = `wt/${t.id}/` + list(git('ls-tree', '--name-only', 'main', 'tasks/')).find((f) => f.startsWith(`tasks/${t.id.split('-')[0]}-`));
  const round = st.get(t.id).round;
  const out = [`JOB: ${job.kind} ${t.id} as ${agent} | packet ${packet} | branch ${t.branch} | folder ${dir}`, 'Run:'];
  // Verified dependencies not in main yet; merging one twice is a no-op.
  const merges = ['BUILD', 'CONTINUE'].includes(job.kind) ? t.needs.filter((id) => st.get(id).state !== 'done') : [];
  const mergeLines = merges.map((id) => `  git merge --no-edit ${tasks.find((d) => d.id === id).branch}    (verified dependency, not in main yet)`);
  if (job.kind === 'BUILD') {
    out.push(`  git -C "${root}" worktree add "${dir}" -b ${t.branch} main`, `  cd "${dir}"`, ...mergeLines);
    out.push('  npm install', `Then build ${t.id} exactly as ${packet} says.`, `When done: git add -A && git commit -m "${t.id}: <one-line summary>"`);
  } else {
    if (!old) out.push(`  git -C "${root}" worktree add "${dir}" ${t.branch}`);
    else if (!same(old, dir)) out.push(`  git -C "${root}" worktree move "${old}" "${dir}"`);
    out.push(`  cd "${dir}"`, ...mergeLines, '  npm install');
    if (job.kind === 'CONTINUE') out.push(`Your branch exists but has no "${t.id}: " commit yet. Finish the build as ${packet} says.`, `When done: git add -A && git commit -m "${t.id}: <one-line summary>"`);
    if (job.kind === 'FIX') out.push(`Read the newest "Verification" section or Lead note in ${packet}. Reply under every finding (FIXED / DEFER Q1 / DISPUTE), fix the code, make every red-team test pass.`, `When done: git add -A && git commit -m "${t.id}: fix round ${round}"`);
    if (job.kind === 'VERIFY') out.push(`Verify round ${round + 1}: do the "Verify" section of ${packet} and "The mesh" in TASKS.md. Try to break it. Do not change the builder's code.`, `When done: git add src/redteam tasks docs && git commit -m "V-${t.id} round ${round + 1}: PASS"   (or ": CHANGES")`);
  }
  out.push(`Edit and test files only inside ${dir} (from the project folder: wt/${t.id}/...). Edits anywhere else never reach your branch.`);
  out.push(`If you are blocked: write it under "Questions" in ${packet}, then git add -A && git commit -m "BLOCKED ${t.id}: <reason>" and stop.`);
  return out.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [cmd, agent] = process.argv.slice(2);
  if (cmd === 'status') {
    const { tasks, st } = snapshot();
    for (const t of tasks) {
      const { state, round } = st.get(t.id);
      console.log(`${t.id.padEnd(6)} ${t.build.padEnd(4)} -> ${t.verify.padEnd(4)} ${state}${round ? ` (round ${round})` : ''}`);
    }
    const dirty = dirtyMain();
    if (dirty.length) console.log(`\nMain folder has uncommitted changes; BUILD jobs wait until the Lead cleans it:\n  ${dirty.join('\n  ')}`);
  } else if (cmd === 'next' && (agent === 'AG' || agent === 'FB')) {
    const wait = process.argv.includes('--wait');
    for (let i = 0; ; i++) {
      const { tasks, st } = snapshot();
      let job = pickJob(agent, tasks, st);
      const dirty = dirtyMain();
      if (job.kind === 'BUILD' && dirty.length) {
        job = { kind: 'WAIT', why: [`${job.t.id} is next, but the main folder has uncommitted changes (${dirty.slice(0, 3).join(', ')}). The Lead must move them first.`] };
      }
      if (job.kind !== 'WAIT' || !wait || i >= 8) {
        console.log(show(job, agent, tasks, st));
        break;
      }
      await new Promise((r) => setTimeout(r, 30_000)); // poll every 30 s, give up after ~4 min
    }
  } else {
    console.log('usage: node scripts/mesh.mjs status | next AG|FB [--wait]');
  }
}
