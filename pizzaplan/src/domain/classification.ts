/**
 * Klassificering af dejplanen.
 *
 * Formålet er ærlighed: brugeren skal med det samme kunne se, om der er god
 * tid, eller om planen er et kompromis. Grænserne står i config.
 */

import { CLASSIFICATION_HOURS } from '../config/dough';
import type { PlanClassification } from '../types';

export function classifySchedule(totalHours: number): PlanClassification {
  if (totalHours >= CLASSIFICATION_HOURS.optimal) return 'optimal';
  if (totalHours >= CLASSIFICATION_HOURS.good) return 'god';
  if (totalHours >= CLASSIFICATION_HOURS.quick) return 'hurtig';
  return 'meget-kort';
}

const TEXTS: Record<PlanClassification, { headline: string; body: string }> = {
  optimal: {
    headline: 'Du har god tid 👍',
    body: 'Dejen får en lang, kold hævning. Det giver den bedste smag og struktur.',
  },
  god: {
    headline: 'Det kan sagtens lade sig gøre',
    body: 'Tiden er kortere, så vi justerer planen lidt. Du får stadig en rigtig god dej.',
  },
  hurtig: {
    headline: 'Det bliver en hurtig dej',
    body: 'Det kan lade sig gøre, men dejen får mindre tid til at udvikle smag og struktur.',
  },
  'meget-kort': {
    headline: 'Der er meget kort tid',
    body: 'Du får en plan, der kan lade sig gøre, men resultatet svarer ikke til en langtidshævet dej.',
  },
};

export function classificationHeadline(classification: PlanClassification): string {
  return TEXTS[classification].headline;
}

export function classificationBody(classification: PlanClassification): string {
  return TEXTS[classification].body;
}
