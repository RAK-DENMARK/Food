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
    body: 'Der er god tid til en lang og kontrolleret hævning. Det er dér smagen kommer fra.',
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

/**
 * Uddybningen afhænger også af, hvor dejen hæver – ellers ville en plan ved
 * stuetemperatur blive beskrevet som kold.
 */
export function classificationBody(classification: PlanClassification, usesFridge = false): string {
  if (classification === 'optimal') {
    return usesFridge
      ? 'Dejen får en lang, kold hævning. Det giver den bedste smag og struktur.'
      : 'Dejen får en lang, rolig hævning ved stuetemperatur. Sådan laves den klassiske napolitanske.';
  }
  return TEXTS[classification].body;
}
