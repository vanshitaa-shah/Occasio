import {
  createDefaultDesign,
  DEMO_RECIPIENT,
  type CreateCardDto,
  type ShapeKind,
  type ThemeId,
} from '@occasio/shared';
import { api } from './api';

const THEME_IDS: ThemeId[] = ['sunset', 'ocean', 'forest', 'candy'];
const SHAPE_KINDS: ShapeKind[] = ['star', 'heart', 'circle', 'rect'];
const FILLS = ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
const GREETINGS = [
  ['Happy Birthday!', 'Wishing you a wonderful day'],
  ['Congratulations!', 'You did it'],
  ['Thank You', 'It meant a lot'],
  ['Happy Anniversary', 'Here is to many more'],
  ['Get Well Soon', 'Thinking of you'],
];
const SEND_DELAY_MS = 60 * 1000;

export function buildDemoCards(count = 10): CreateCardDto[] {
  const sendAt = new Date(Date.now() + SEND_DELAY_MS).toISOString();
  return Array.from({ length: count }, (_, i) => {
    const design = createDefaultDesign();
    const [title, subtitle] = GREETINGS[i % GREETINGS.length];
    design.theme = THEME_IDS[i % THEME_IDS.length];
    design.texts[0].text = `${title} #${i + 1}`;
    design.texts[1].text = subtitle;
    design.shapes.push({
      id: crypto.randomUUID(),
      kind: SHAPE_KINDS[i % SHAPE_KINDS.length],
      x: design.width / 2,
      y: 440,
      width: 120,
      height: 120,
      fill: FILLS[i % FILLS.length],
      rotation: 0,
    });
    return {
      recipient: DEMO_RECIPIENT,
      sendAt,
      design,
    };
  });
}

export async function createDemoCards(): Promise<void> {
  await Promise.all(buildDemoCards().map((card) => api.createCard(card)));
}
