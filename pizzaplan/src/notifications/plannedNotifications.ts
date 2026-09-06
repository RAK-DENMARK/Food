/**
 * Lokale påmindelser.
 *
 * MVP'en sender ingen notifikationer – appen skal fungere helt uden.
 * Men tidsplanen markerer selv, hvilke trin der egner sig til en påmindelse,
 * og denne rene funktion oversætter en plan til påmindelser. Så mangler der
 * kun at koble expo-notifications på, den dag det bliver aktuelt.
 */

import type { DoughPlan, ScheduleStep } from '../types';

export interface PlannedNotification {
  id: string;
  /** Hvornår påmindelsen skal komme. */
  time: Date;
  title: string;
  body: string;
}

const TITLES: Partial<Record<ScheduleStep['id'], string>> = {
  mix: 'Tid til at lave pizzadejen',
  ball: 'Tid til at lave dejbollerne',
  'fridge-in': 'Sæt dejbollerne på køl',
  'fridge-out': 'Tag dejen ud af køleskabet',
  bake: 'Dejen er klar – tænd ovnen',
};

/** Laver påmindelser for de trin i planen, der er markeret som notifiable. */
export function plannedNotifications(plan: DoughPlan, now: Date = new Date()): PlannedNotification[] {
  return plan.schedule
    .filter((step) => step.notifiable && step.time.getTime() > now.getTime())
    .map((step) => ({
      id: `pizzaplan-${step.id}-${step.time.getTime()}`,
      time: step.time,
      title: TITLES[step.id] ?? step.title,
      body: step.detail ?? step.title,
    }));
}
