import './motion.css';
import { cardFace } from './cardFace.ts';
import {
  enter,
  swap,
  stagger,
  reveal,
  feedback,
  countUp,
  setProgress,
} from './motion.ts';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      node.setAttribute(k, v);
    }
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function section(title: string): HTMLElement {
  const sec = el('section', {
    style:
      'background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 12px;',
  });
  const h2 = el(
    'h2',
    { style: 'margin: 0; font-size: 1rem; color: var(--text);' },
    title,
  );
  sec.appendChild(h2);
  return sec;
}

function row(): HTMLDivElement {
  return el('div', {
    style: 'display: flex; flex-wrap: wrap; align-items: center; gap: 10px;',
  });
}

export function mountMotionDemo(root: HTMLElement): void {
  root.innerHTML = '';
  const container = el('main', {
    style:
      'max-width: 760px; margin: 24px auto; padding: 0 16px; display: grid; gap: 16px; color: var(--text);',
  });

  // 8. Reduce motion toggle (placed at top for quick testing across all sections)
  const secReduce = section('8. Reduced Motion Toggle');
  const reduceLabel = el('label', {
    style: 'display: inline-flex; align-items: center; gap: 8px; cursor: pointer;',
  });
  const reduceCheckbox = el('input', { type: 'checkbox' });
  reduceCheckbox.checked = document.documentElement.classList.contains('reduce-motion');
  reduceCheckbox.addEventListener('change', () => {
    document.documentElement.classList.toggle('reduce-motion', reduceCheckbox.checked);
  });
  reduceLabel.append(reduceCheckbox, document.createTextNode('Reduce motion (html.reduce-motion)'));
  secReduce.appendChild(reduceLabel);

  // 1. Buttons: normal, .press div, disabled
  const secButtons = section('1. Pressable Controls');
  const btnRow = row();
  const normalBtn = el('button', { type: 'button' }, 'Normal button');
  const pressDiv = el(
    'div',
    {
      class: 'press',
      role: 'button',
      tabindex: '0',
      style:
        'background: var(--panel); border: 1px solid var(--border); border-radius: 6px; padding: 8px 14px; cursor: pointer; user-select: none;',
    },
    '.press div',
  );
  const disabledBtn = el('button', { type: 'button', disabled: 'true' }, 'Disabled button');
  btnRow.append(normalBtn, pressDiv, disabledBtn);
  secButtons.appendChild(btnRow);

  // 2. Card feedback: cardFace('QH') with Correct / Wrong / Clear
  const secFeedback = section('2. Card Feedback (QH)');
  const fbRow = row();
  const qhCard = cardFace('QH');
  const btnCorrect = el('button', { type: 'button' }, 'Correct');
  const btnWrong = el('button', { type: 'button' }, 'Wrong');
  const btnClear = el('button', { type: 'button' }, 'Clear');
  btnCorrect.addEventListener('click', () => {
    feedback(qhCard, 'correct');
  });
  btnWrong.addEventListener('click', () => {
    feedback(qhCard, 'wrong');
  });
  btnClear.addEventListener('click', () => {
    feedback(qhCard, null);
  });
  fbRow.append(qhCard, btnCorrect, btnWrong, btnClear);
  secFeedback.appendChild(fbRow);

  // 3. Reveal: switches a second card between '?' and cardFace('AS') with reveal()
  const secReveal = section('3. Trainer Reveal (AS)');
  const revRow = row();
  const revSlot = el('div', { style: 'display: inline-flex; align-items: center;' });
  const hiddenCard = el(
    'div',
    {
      class: 'card-face',
      style:
        'display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.25rem; background: var(--panel); color: var(--muted); border: 1px solid var(--border); border-radius: 6px;',
    },
    '?',
  );
  const asCard = cardFace('AS');
  let isRevealed = false;
  revSlot.appendChild(hiddenCard);

  const btnReveal = el('button', { type: 'button' }, 'Reveal');
  btnReveal.addEventListener('click', () => {
    isRevealed = !isRevealed;
    const nextCard = isRevealed ? asCard : hiddenCard;
    revSlot.replaceChildren(nextCard);
    reveal(nextCard);
  });
  revRow.append(revSlot, btnReveal);
  secReveal.appendChild(revRow);

  // 4. Two panels A and B and a "Swap screen" button that uses swap()
  const secSwap = section('4. Screen Swap (Panels A & B)');
  const swapControls = row();
  const btnSwap = el('button', { type: 'button' }, 'Swap screen');
  const swapStage = el('div', { style: 'min-height: 56px;' });
  const panelA = el(
    'div',
    {
      style:
        'padding: 12px 16px; border: 1px solid var(--accent); border-radius: 6px; background: var(--bg);',
    },
    'Panel A — Library Loci (1–13)',
  );
  const panelB = el(
    'div',
    {
      style:
        'padding: 12px 16px; border: 1px solid var(--gold); border-radius: 6px; background: var(--bg);',
    },
    'Panel B — Observatory Loci (40–52)',
  );
  let activePanel: HTMLElement = panelA;
  swapStage.appendChild(panelA);

  btnSwap.addEventListener('click', () => {
    const prev = activePanel;
    const next = prev === panelA ? panelB : panelA;
    activePanel = next;
    void swap(prev, next, (node) => {
      swapStage.appendChild(node);
    });
  });
  swapControls.appendChild(btnSwap);
  secSwap.append(swapControls, swapStage);

  // 5. List of 6 rows with "Replay stagger"
  const secStagger = section('5. Staggered List (6 Rows, capped at 240ms)');
  const btnStagger = el('button', { type: 'button', style: 'align-self: flex-start;' }, 'Replay stagger');
  const listWrap = el('div', { style: 'display: grid; gap: 6px;' });
  const rows: HTMLElement[] = [];
  for (let i = 1; i <= 6; i++) {
    const item = el(
      'div',
      {
        style:
          'padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg);',
      },
      `Locus #${i} — Memory anchor row`,
    );
    rows.push(item);
    listWrap.appendChild(item);
  }
  btnStagger.addEventListener('click', () => {
    stagger(rows);
  });
  secStagger.append(btnStagger, listWrap);

  // 6. Score number with "Count to 48" button (countUp from 0, class tabular)
  const secScore = section('6. Drill Score Count-Up');
  const scoreRow = row();
  const scoreValue = el(
    'span',
    {
      class: 'tabular',
      style: 'font-size: 1.75rem; font-weight: 700; min-width: 3ch;',
    },
    '0',
  );
  const btnCount = el('button', { type: 'button' }, 'Count to 48');
  btnCount.addEventListener('click', () => {
    countUp(scoreValue, 48, { from: 0 });
  });
  scoreRow.append(scoreValue, btnCount);
  secScore.appendChild(scoreRow);

  // 7. Progress bar with - and + buttons that step by 1/13
  const secProgress = section('7. Progress Bar (Step 1/13)');
  const progRow = row();
  const btnMinus = el('button', { type: 'button' }, '-');
  const btnPlus = el('button', { type: 'button' }, '+');
  const progLabel = el('span', { class: 'tabular', style: 'color: var(--muted);' }, '0 / 13');
  const progTrack = el('div', {
    class: 'progress',
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    'aria-valuenow': '0',
    style: 'flex: 1; min-width: 180px;',
  });
  const progFill = el('span');
  progTrack.appendChild(progFill);

  let stepIndex = 0;
  const updateStep = (nextStep: number): void => {
    stepIndex = Math.max(0, Math.min(13, nextStep));
    progLabel.textContent = `${stepIndex} / 13`;
    setProgress(progFill, stepIndex / 13);
  };
  btnMinus.addEventListener('click', () => updateStep(stepIndex - 1));
  btnPlus.addEventListener('click', () => updateStep(stepIndex + 1));
  updateStep(0);

  progRow.append(btnMinus, btnPlus, progTrack, progLabel);
  secProgress.appendChild(progRow);

  container.append(
    secButtons,
    secFeedback,
    secReveal,
    secSwap,
    secStagger,
    secScore,
    secProgress,
    secReduce,
  );
  root.appendChild(container);
  enter(container);
}

if (typeof document !== 'undefined') {
  const app = document.getElementById('app');
  if (app) {
    mountMotionDemo(app);
  }
}