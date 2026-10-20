import { load, save } from '../store.ts';
import type { SaveData } from '../types.ts';
import { mountTrainer } from './trainer.ts';
import '../style.css';
import './trainer.css';

const onExit = (data: SaveData) => {
  save(data);
  document.body.replaceChildren();
  const message = document.createElement('p');
  message.textContent = 'Trainer closed. You can reload to start again.';
  document.body.append(message);
};

mountTrainer(document.body, load(), onExit);
