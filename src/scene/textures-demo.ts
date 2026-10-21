// Lead: Gemini's reply had no demo script; this one shows each colour map tiled 2 x 2 (to spot seams) and its bump map.
import { generate, TEXTURE_KINDS } from './textures.ts';

const grid = document.getElementById('grid')!;
for (const kind of TEXTURE_KINDS) {
  const { size, color, bump } = generate(kind, 256);
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:12px;align-items:center;margin:12px 0';
  const tiled = canvas(size * 2);
  for (const [x, y] of [[0, 0], [size, 0], [0, size], [size, size]]) tiled.ctx.putImageData(new ImageData(new Uint8ClampedArray(color), size), x, y);
  const b = canvas(size);
  b.ctx.putImageData(new ImageData(new Uint8ClampedArray(bump), size), 0, 0);
  const mean = [0, 1, 2].map((c) => Math.round(color.filter((_, i) => i % 4 === c).reduce((s, v) => s + v, 0) / (size * size)));
  const label = document.createElement('div');
  label.textContent = `${kind}  mean rgb(${mean.join(', ')})`;
  row.append(tiled.el, b.el, label);
  grid.append(row);
}

function canvas(px: number) {
  const el = document.createElement('canvas');
  el.width = el.height = px;
  return { el, ctx: el.getContext('2d')! };
}
