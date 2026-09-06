/**
 * Komplet eksempel fra input til færdig dejplan – uden UI.
 *
 * Kør: npm run example
 */

import { DEFAULT_HYDRATION, DEFAULT_SALT, YEAST_LABELS } from '../src/config/dough';
import { createDoughPlan } from '../src/domain/plan';
import type { DoughInput } from '../src/types';
import { formatDayTime, formatGrams, formatPercent, formatSalt, formatYeast } from '../src/utils/format';

// Torsdag den 11. september 2026 kl. 20:00 lokal tid.
const now = new Date(2026, 8, 10, 20, 0);
// Servering lørdag den 12. september kl. 18:00.
const servingTime = new Date(2026, 8, 12, 18, 0);

const input: DoughInput = {
  pizzaCount: 6,
  ballWeightG: 270,
  hydration: DEFAULT_HYDRATION,
  salt: DEFAULT_SALT,
  yeastType: 'IDY',
  roomTempC: 22,
  servingTime,
};

const result = createDoughPlan(input, now);

if (!result.ok) {
  console.log('Kunne ikke lave en plan:');
  result.errors.forEach((error) => console.log(` - ${error.message}`));
  throw new Error('Ugyldigt input i eksemplet');
}

const { plan } = result;
const { ingredients: ing, fermentation: ferm } = plan;

console.log('=== DIN DEJPLAN ===');
console.log(`${input.pizzaCount} pizzaer á ${input.ballWeightG} g`);
console.log(`Klar ${formatDayTime(servingTime, now).toLowerCase()}`);
console.log(`${plan.classificationHeadline} – ${plan.classificationBody}`);
console.log('');
console.log('--- Du skal bruge ---');
console.log(`Samlet dejvægt   ${formatGrams(ing.totalDoughG)}`);
console.log(`Mel              ${formatGrams(ing.flourG)}`);
console.log(`Vand             ${formatGrams(ing.waterG)}`);
console.log(`Salt             ${formatSalt(ing.saltG)}`);
console.log(`${YEAST_LABELS[ing.yeastType].padEnd(17)}${formatYeast(ing.yeastG)}  (${formatPercent(ing.yeastPercent)})`);
console.log('');
console.log('--- Fermentering ---');
console.log(`Strategi              ${ferm.strategy}`);
console.log(`Samlet varighed       ${ferm.totalHours} timer`);
console.log(`Ækvivalente timer     ${ferm.equivalentHoursAt20.toFixed(1)} ved 20 °C`);
console.log(`Køleskab              ${ferm.usesFridge ? 'ja' : 'nej'}`);
ferm.phases.forEach((phase) => {
  console.log(`  ${phase.kind.padEnd(16)} ${String(phase.hours).padStart(5)} t ved ${phase.tempC} °C (hastighed ${phase.rate.toFixed(2)})`);
});
console.log('');
console.log('--- Din tidsplan ---');
plan.schedule.forEach((step) => {
  console.log(`${formatDayTime(step.time, now).padEnd(14)} ${step.title}`);
  if (step.detail) console.log(`               ${step.detail}`);
});
if (plan.warnings.length > 0) {
  console.log('');
  console.log('--- Bemærk ---');
  plan.warnings.forEach((warning) => console.log(` ! ${warning.message}`));
}
