import { LOCI } from '../data/palace.ts';
import { palaceMap } from './palaceMap.ts';

const container = document.getElementById('map-container');
const statusLog = document.getElementById('status-log');

let colorSafe = false;
let showNumbers = true;
let currentHighlight = 0;

// Sample simulated heat map
const heatData = new Map<number, number>();
for (let i = 0; i < LOCI.length; i++) {
  if (i % 5 === 0) heatData.set(i, 0.65); // hot
  else if (i % 3 === 0) heatData.set(i, 0.25); // warm
  else if (i % 2 === 0) heatData.set(i, 0.08); // cool
  // others neutral
}

function updateLog(idx: number): void {
  if (statusLog && LOCI[idx]) {
    statusLog.textContent = `Selected locus: ${idx + 1} (${LOCI[idx].name}, ${LOCI[idx].room})`;
  }
}

function mapPickHandler(idx: number): void {
  currentHighlight = idx;
  updateLog(idx);
  map.update({
    heat: heatData,
    highlight: [currentHighlight],
    numbers: showNumbers,
    onPick: mapPickHandler,
  });
}

const map = palaceMap({
  heat: heatData,
  highlight: [currentHighlight],
  numbers: showNumbers,
  onPick: mapPickHandler,
});

if (container) {
  container.appendChild(map.element);
}

document.getElementById('btn-toggle-color-safe')?.addEventListener('click', () => {
  colorSafe = !colorSafe;
  document.documentElement.classList.toggle('color-safe', colorSafe);
});

document.getElementById('btn-toggle-numbers')?.addEventListener('click', () => {
  showNumbers = !showNumbers;
  map.update({
    heat: heatData,
    highlight: [currentHighlight],
    numbers: showNumbers,
    onPick: mapPickHandler,
  });
});

document.getElementById('btn-random-heat')?.addEventListener('click', () => {
  heatData.clear();
  for (let i = 0; i < LOCI.length; i++) {
    heatData.set(i, Math.random());
  }
  map.update({
    heat: heatData,
    highlight: [currentHighlight],
    numbers: showNumbers,
    onPick: mapPickHandler,
  });
});

document.getElementById('btn-cycle-highlight')?.addEventListener('click', () => {
  currentHighlight = (currentHighlight + 1) % LOCI.length;
  updateLog(currentHighlight);
  map.update({
    heat: heatData,
    highlight: [currentHighlight],
    numbers: showNumbers,
    onPick: mapPickHandler,
  });
});

document.getElementById('btn-set-320')?.addEventListener('click', () => {
  if (container) container.style.maxWidth = '320px';
});

document.getElementById('btn-set-900')?.addEventListener('click', () => {
  if (container) container.style.maxWidth = '900px';
});

document.getElementById('btn-set-full')?.addEventListener('click', () => {
  if (container) container.style.maxWidth = '100%';
});
