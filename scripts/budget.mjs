// Bundle budget: gzip size of the entry chunk and of all JS, raw size of every asset, read from dist/.
// Run after `npm run build`. Exit code 1 with a table when a limit is exceeded.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const KB = 1024;
export const LIMITS = { entryGzip: 60 * KB, jsGzip: 200 * KB, assetBytes: 1024 * KB };

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** Reads dist/: the single module script in index.html, then every file with its raw and gzip size. */
export function measure(distDir) {
  const indexPath = join(distDir, 'index.html');
  if (!existsSync(indexPath)) throw new Error(`no ${indexPath}: run npm run build first`);
  const html = readFileSync(indexPath, 'utf8');
  const moduleSrcs = [...html.matchAll(/<script\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => /\btype=["']module["']/.test(tag))
    .map((tag) => tag.match(/\bsrc=["']([^"']+)["']/)?.[1])
    .filter(Boolean);
  if (moduleSrcs.length !== 1) throw new Error(`expected 1 module script in index.html, found ${moduleSrcs.length}`);

  const entryPath = resolve(distDir, moduleSrcs[0].replace(/^\.?\/+/, ''));
  const files = walk(distDir).map((path) => {
    const name = relative(distDir, path).split(sep).join('/');
    const isJs = /\.m?js$/.test(name);
    return {
      name,
      bytes: statSync(path).size,
      js: isJs,
      gzip: isJs ? gzipSync(readFileSync(path)).length : null,
      isEntry: resolve(path) === entryPath,
    };
  });
  const entry = files.find((file) => file.isEntry);
  if (!entry) throw new Error(`entry ${moduleSrcs[0]} is not in dist/`);
  return { entry, files };
}

/** Returns one readable line per exceeded limit. A value exactly at a limit passes. */
export function judge(report, limits = LIMITS) {
  const violations = [];
  if (report.entry.gzip > limits.entryGzip) {
    violations.push(`entry ${report.entry.name} is ${report.entry.gzip} B gzip, limit ${limits.entryGzip} B`);
  }
  const jsGzip = report.files.reduce((sum, file) => sum + (file.js ? file.gzip : 0), 0);
  if (jsGzip > limits.jsGzip) violations.push(`all JS is ${jsGzip} B gzip, limit ${limits.jsGzip} B`);
  for (const file of report.files) {
    if (file.bytes > limits.assetBytes) {
      violations.push(`${file.name} is ${file.bytes} B, limit ${limits.assetBytes} B`);
    }
  }
  return violations;
}

export function table(report) {
  const kb = (bytes) => `${(bytes / KB).toFixed(1)} kB`;
  const rows = report.files.map((file) => {
    const gzip = file.js ? kb(file.gzip) : '-';
    return `${file.name.padEnd(40)} ${kb(file.bytes).padStart(10)} ${gzip.padStart(10)}${file.isEntry ? '  (entry)' : ''}`;
  });
  return ['asset'.padEnd(40) + ' ' + 'raw'.padStart(10) + ' ' + 'gzip'.padStart(10), ...rows].join('\n');
}

export function main(distDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')) {
  let report;
  try {
    report = measure(distDir);
  } catch (error) {
    console.error(`budget: ${error.message}`);
    return 1;
  }
  console.log(table(report));
  const violations = judge(report);
  if (violations.length > 0) {
    console.error(`budget FAILED:\n  ${violations.join('\n  ')}`);
    return 1;
  }
  console.log('budget OK');
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = main(process.argv[2] ? resolve(process.argv[2]) : undefined);
}
