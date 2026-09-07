/**
 * Korte forklaringer på dansk af, hvorfor planen ser ud som den gør.
 *
 * Teksterne hører til produktets faglige ærlighed og ligger derfor i
 * domænelaget, hvor de kan testes – ikke inde i en komponent.
 */

import { FERMENTATION, METHOD_ITALIAN, METHOD_LABELS, MODEL_TEMP_RANGE_C } from '../config/dough';
import type { DoughMethod, DoughPlan } from '../types';
import { formatDurationHours, formatPercent, formatTemp } from '../utils/format';

const METHOD_TEXTS: Record<DoughMethod, string> = {
  direct:
    'Det er en direkte dej: mel, vand, salt og gær bliver til den endelige dej med det samme. Det er metoden bag den klassiske pizza napoletana.',
  poolish:
    'Det er en indirekte dej. Først laver du en poolish – en våd fordej af lige dele mel og vand – og den modner, før resten af dejen røres i. Det giver en mild, let sødlig smag og en luftig kant.',
  biga:
    'Det er en indirekte dej. Først laver du en biga – en tør, klumpet fordej – og den modner, før resten af dejen røres i. Det giver kraftigere smag og mere tyggemodstand.',
};

/**
 * Kort etiket til resultatskærmen, fx "Direkte dej · 24 timer ved stuetemperatur".
 * Metoden står først, fordi det er den, der afgør dejtypen.
 */
export function describePlan(plan: DoughPlan): string {
  const method = METHOD_LABELS[plan.fermentation.method];
  const total = plan.fermentation.totalHours;
  // Lange planer rundes til hele timer i etiketten. Kvarterne står i tidsplanen.
  const hours = total >= 10 ? formatDurationHours(Math.round(total)) : formatDurationHours(total);
  const place = plan.fermentation.usesFridge ? 'med hævning på køl' : 'ved stuetemperatur';
  return `${method} · ${hours} ${place}`;
}

/** Punktvis forklaring til "Hvorfor?" på resultatskærmen. */
export function explainPlan(plan: DoughPlan): string[] {
  const { fermentation, ingredients, input } = plan;
  const lines: string[] = [];

  lines.push(
    `Du har ${formatDurationHours(fermentation.totalHours)} fra du går i gang, til pizzaerne skal spises.`,
  );

  lines.push(`${METHOD_TEXTS[fermentation.method]} På italiensk: ${METHOD_ITALIAN[fermentation.method]}.`);

  if (fermentation.preferment) {
    lines.push(
      `Fordejen modner i ${formatDurationHours(
        fermentation.preferment.hours,
      )} ved ${formatTemp(fermentation.preferment.tempC)}, før du laver den endelige dej.`,
    );
  }

  if (fermentation.usesFridge) {
    lines.push(
      `Hævningen foregår mest på køl. Køleskabet regnes som ${formatTemp(
        FERMENTATION.fridgeTempC,
      )}, hvor dejen hæver cirka ${Math.round(
        1 / FERMENTATION.fridgeRate,
      )} gange langsommere end ved 20 °C. Den langsomme hævning er dér, smagen kommer fra.`,
    );
  } else {
    lines.push(
      'Hele hævningen foregår ved stuetemperatur. Det er sådan den klassiske napolitanske dej laves – typisk dagen før, med meget lidt gær.',
    );
  }

  lines.push(
    'Dejen hæver i to omgange: først samlet efter æltningen (puntata), derefter som færdige dejbolde frem til bagningen (appretto). At dele dejen op imellem de to hedder staglio.',
  );

  lines.push(
    `Gærmængden (${formatPercent(
      ingredients.yeastPercent,
    )} af melet i alt) er valgt ud fra hævetiden ved ${formatTemp(
      input.roomTempC,
    )}. Kortere tid kræver mere gær, længere tid kræver mindre.`,
  );

  if (fermentation.preferment) {
    lines.push(
      'En moden fordej indeholder allerede en stor, aktiv gærbestand. Derfor er gæren i den endelige dej sat ned – ellers ville dejen hæve for hurtigt.',
    );
  }

  lines.push(
    'PizzaPlan bruger rumtemperaturen som pejlemærke for dejens temperatur. De to er ikke helt det samme, så betragt tidsplanen som et godt udgangspunkt – ikke en facitliste. Kig altid på dejen.',
  );

  if (input.roomTempC < MODEL_TEMP_RANGE_C.min || input.roomTempC > MODEL_TEMP_RANGE_C.max) {
    lines.push(
      `Din temperatur ligger uden for det interval (${MODEL_TEMP_RANGE_C.min}–${MODEL_TEMP_RANGE_C.max} °C), som beregningen er lavet til. Derfor er planen mere usikker end normalt.`,
    );
  }

  return lines;
}
