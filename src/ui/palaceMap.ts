import { DOORS, LOCI, ROOMS } from '../data/palace.ts';

export interface PalaceMapOptions {
  /** 0..1 per locus index, for example a shrunk miss rate. Missing = neutral. */
  heat?: ReadonlyMap<number, number>;
  /** Loci drawn larger with a ring, for example "you are here". */
  highlight?: readonly number[];
  /** Show the locus number next to each dot. Default true. */
  numbers?: boolean;
  /** Makes dots keyboard-focusable buttons and calls back with the locus index. */
  onPick?: (index: number) => void;
}

export interface PalaceMapInstance {
  element: SVGSVGElement;
  update(opts: PalaceMapOptions): void;
  destroy(): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

type HeatLevel = 'neutral' | 'cool' | 'warm' | 'hot';

function getHeatLevel(rate: number | undefined): HeatLevel {
  if (rate === undefined || !Number.isFinite(rate)) return 'neutral';
  const clamped = Math.max(0, Math.min(1, rate));
  if (clamped <= 0.15) return 'cool';
  if (clamped <= 0.35) return 'warm';
  return 'hot';
}

function getMarkerSymbol(level: HeatLevel): string {
  switch (level) {
    case 'cool':
      return '✓';
    case 'warm':
      return '★';
    case 'hot':
      return '!';
    default:
      return '';
  }
}

interface LocusElements {
  group: SVGGElement;
  dot: SVGCircleElement;
  ring: SVGCircleElement;
  numText: SVGTextElement;
  markerText: SVGTextElement;
  clickHandler?: (e: MouseEvent) => void;
  keydownHandler?: (e: KeyboardEvent) => void;
}

export function palaceMap(initialOpts: PalaceMapOptions = {}): PalaceMapInstance {
  let destroyed = false;
  let currentOpts = { ...initialOpts };

  // Calculate SVG viewBox from rooms with 1.5 unit margin
  // Room bounds: x in [0, 57.5], z in [0, 14]
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;

  for (const r of ROOMS) {
    if (r.rect.x0 < minX) minX = r.rect.x0;
    if (r.rect.z0 < minZ) minZ = r.rect.z0;
    if (r.rect.x1 > maxX) maxX = r.rect.x1;
    if (r.rect.z1 > maxZ) maxZ = r.rect.z1;
  }

  const margin = 1.2;
  const vbX = minX - margin;
  const vbZ = minZ - margin;
  const vbW = maxX - minX + margin * 2;
  const vbH = maxZ - minZ + margin * 2;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'palace-map-svg');
  svg.setAttribute('viewBox', `${vbX} ${vbZ} ${vbW} ${vbH}`);
  svg.setAttribute('role', 'region');
  svg.setAttribute('aria-label', 'Palace floor map');

  // Rooms group
  const roomsGroup = document.createElementNS(SVG_NS, 'g');
  roomsGroup.setAttribute('class', 'map-rooms-layer');
  for (const r of ROOMS) {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('class', 'map-room');
    rect.setAttribute('x', String(r.rect.x0));
    rect.setAttribute('y', String(r.rect.z0));
    rect.setAttribute('width', String(r.rect.x1 - r.rect.x0));
    rect.setAttribute('height', String(r.rect.z1 - r.rect.z0));
    rect.setAttribute('rx', '0.4');
    rect.setAttribute('ry', '0.4');
    roomsGroup.appendChild(rect);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('class', 'map-room-label');
    label.setAttribute('x', String((r.rect.x0 + r.rect.x1) / 2));
    label.setAttribute('y', String((r.rect.z0 + r.rect.z1) / 2));
    label.textContent = r.name;
    roomsGroup.appendChild(label);
  }
  svg.appendChild(roomsGroup);

  // Doors group
  const doorsGroup = document.createElementNS(SVG_NS, 'g');
  doorsGroup.setAttribute('class', 'map-doors-layer');
  for (const d of DOORS) {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('class', 'map-door');
    rect.setAttribute('x', String(d.x0));
    rect.setAttribute('y', String(d.z0));
    rect.setAttribute('width', String(d.x1 - d.x0));
    rect.setAttribute('height', String(d.z1 - d.z0));
    doorsGroup.appendChild(rect);
  }
  svg.appendChild(doorsGroup);

  // Route path connecting 52 loci in route order
  const routePath = document.createElementNS(SVG_NS, 'path');
  routePath.setAttribute('class', 'map-route');
  let dAttr = '';
  for (let i = 0; i < LOCI.length; i++) {
    const pt = LOCI[i].pos;
    dAttr += `${i === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]} `;
  }
  routePath.setAttribute('d', dAttr.trim());
  svg.appendChild(routePath);

  // Loci layer
  const lociGroup = document.createElementNS(SVG_NS, 'g');
  lociGroup.setAttribute('class', 'map-loci-layer');

  const locusElements: LocusElements[] = [];

  for (let i = 0; i < LOCI.length; i++) {
    const locus = LOCI[i];
    const [lx, lz] = locus.pos;
    const [fx, fz] = locus.face;

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'map-locus');
    g.setAttribute('data-index', String(i));
    g.setAttribute('data-heat', 'neutral');

    // Ring for highlight ("you are here")
    const ring = document.createElementNS(SVG_NS, 'circle');
    ring.setAttribute('class', 'map-highlight-ring');
    ring.setAttribute('cx', String(lx));
    ring.setAttribute('cy', String(lz));
    ring.setAttribute('r', '0.72');
    ring.style.display = 'none';
    g.appendChild(ring);

    // Main locus dot
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('class', 'map-dot');
    dot.setAttribute('cx', String(lx));
    dot.setAttribute('cy', String(lz));
    dot.setAttribute('r', '0.36');
    g.appendChild(dot);

    // Color-safe shape marker in the center of the dot
    const marker = document.createElementNS(SVG_NS, 'text');
    marker.setAttribute('class', 'map-marker');
    marker.setAttribute('x', String(lx));
    marker.setAttribute('y', String(lz));
    marker.textContent = '';
    g.appendChild(marker);

    // Number text (offset inward, opposite face direction)
    const num = document.createElementNS(SVG_NS, 'text');
    num.setAttribute('class', 'map-locus-num');
    // Offset slightly opposite face vector (inward from wall)
    const numOffset = 0.62;
    const nx = lx - fx * numOffset;
    const nz = lz - fz * numOffset;
    num.setAttribute('x', String(nx));
    num.setAttribute('y', String(nz));
    num.textContent = String(i + 1);
    g.appendChild(num);

    lociGroup.appendChild(g);

    locusElements.push({
      group: g,
      dot,
      ring,
      numText: num,
      markerText: marker,
    });
  }
  svg.appendChild(lociGroup);

  function focusLocus(targetIndex: number): void {
    if (targetIndex >= 0 && targetIndex < locusElements.length) {
      locusElements[targetIndex].group.focus();
    }
  }

  function detachListeners(item: LocusElements): void {
    if (item.clickHandler) {
      item.group.removeEventListener('click', item.clickHandler);
      item.clickHandler = undefined;
    }
    if (item.keydownHandler) {
      item.group.removeEventListener('keydown', item.keydownHandler);
      item.keydownHandler = undefined;
    }
  }

  function applyOptions(opts: PalaceMapOptions): void {
    currentOpts = { ...opts };

    const heatMap = opts.heat;
    const highlightSet = new Set(opts.highlight ?? []);
    const showNumbers = opts.numbers !== false;
    const onPick = opts.onPick;

    for (let i = 0; i < locusElements.length; i++) {
      const item = locusElements[i];
      const locus = LOCI[i];

      // Heat
      const heatVal = heatMap?.get(i);
      const level = getHeatLevel(heatVal);
      item.group.setAttribute('data-heat', level);
      item.markerText.textContent = getMarkerSymbol(level);

      // Highlight
      const isHighlighted = highlightSet.has(i);
      item.ring.style.display = isHighlighted ? '' : 'none';
      item.dot.setAttribute('r', isHighlighted ? '0.48' : '0.36');

      // Numbers
      item.numText.style.display = showNumbers ? '' : 'none';

      // Pickable / Accessibility
      detachListeners(item);

      if (onPick) {
        item.group.setAttribute('role', 'button');
        item.group.setAttribute('tabindex', '0');
        item.group.setAttribute(
          'aria-label',
          `Stop ${i + 1}: ${locus.name}, ${locus.room}`,
        );

        item.clickHandler = () => {
          if (!destroyed && currentOpts.onPick) {
            currentOpts.onPick(i);
          }
        };
        item.group.addEventListener('click', item.clickHandler);

        item.keydownHandler = (e: KeyboardEvent) => {
          if (destroyed) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (currentOpts.onPick) currentOpts.onPick(i);
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            focusLocus((i + 1) % LOCI.length);
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            focusLocus((i - 1 + LOCI.length) % LOCI.length);
          } else if (e.key === 'Home') {
            e.preventDefault();
            focusLocus(0);
          } else if (e.key === 'End') {
            e.preventDefault();
            focusLocus(LOCI.length - 1);
          }
        };
        item.group.addEventListener('keydown', item.keydownHandler);
      } else {
        item.group.removeAttribute('role');
        item.group.removeAttribute('tabindex');
        item.group.removeAttribute('aria-label');
      }
    }
  }

  applyOptions(initialOpts);

  return {
    element: svg,
    update(newOpts: PalaceMapOptions): void {
      if (destroyed) return;
      applyOptions(newOpts);
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      for (const item of locusElements) {
        detachListeners(item);
      }
    },
  };
}
