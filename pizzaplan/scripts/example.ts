/**
 * Komplette eksempler fra input til færdig dejplan – uden UI.
 *
 * Viser den samme bestilling med tre dejtyper, så forskellen mellem metode
 * (direkte eller fordej) og forløb (stuetemperatur eller køl) er til at se.
 *
 * Kør: npm run example
 */

import { DEFAULT_HYDRATION, DEFAULT_SALT, YEAST_LABELS } from '../src/config/dough';
import { describePlan } from '../src/domain/explanation';
import { createDoughPlan } from '../src/domain/plan';
import type { DoughInput, DoughMethod, FermentationRoute } from '../src/types';
import { formatDayTime, formatGrams, formatPercent, formatSalt, formatYeast } from '../src/utils/format';

// Torsdag den 10. september 2026 kl. 20:00 lokal tid.
const now = new Date(2026, 8, 10, 20, 0);
// Servering lørdag den 12. september kl. 18:00.
const servingTime = new Date(2026, 8, 12, 18, 0);

function show(title: string, method: DoughMethod, route: FermentationRoute) {
  const input: DoughInput = {
    pizzaCount: 6,
    ballWeightG: 270,
    hydration: DEFAULT_HYDRATION,
    salt: DEFAULT_SALT,
    yeastType: 'IDY',
    roomTempC: 22,
    method,
    route,
    servingTime,
  };

  const result = createDoughPlan(input, now);

  console.log('');
  console.log(`=== ${title.toUpperCase()} ===`);

  if (!result.ok) {
    result.errors.forEach((error) => console.log(` Afvist: ${error.message}`));
    return;
  }

  const { plan } = result;
  const { ingredients: ing, fermentation: ferm } = plan;

  console.log(`${input.pizzaCount} pizzaer á ${input.ballWeightG} g – klar ${formatDayTime(servingTime, now).toLowerCase()}`);
  console.log(describePlan(plan));
  console.log(`${plan.classificationHeadline} – ${plan.classificationBody}`);
  console.log('');
  console.log('Du skal bruge');
  console.log(`  Samlet dejvægt   ${formatGrams(ing.totalDoughG)}`);
  console.log(`  Mel              ${formatGrams(ing.flourG)}`);
  console.log(`  Vand             ${formatGrams(ing.waterG)}`);
  console.log(`  Salt             ${formatSalt(ing.saltG)}`);
  console.log(`  ${YEAST_LABELS[ing.yeastType].padEnd(17)}${formatYeast(ing.yeastG)}  (${formatPercent(ing.yeastPercent)})`);

  if (ing.preferment) {
    console.log('');
    console.log(`Fordej (${ing.preferment.kind}), ${ing.preferment.hours} timer`);
    console.log(`  Mel              ${formatGrams(ing.preferment.flourG)}`);
    console.log(`  Vand             ${formatGrams(ing.preferment.waterG)}`);
    console.log(`  Gær              ${formatYeast(ing.preferment.yeastG)}`);
    console.log('Endelig dej');
    console.log(`  Mel              ${formatGrams(ing.finalDough.flourG)}`);
    console.log(`  Vand             ${formatGrams(ing.finalDough.waterG)}`);
    console.log(`  Salt             ${formatSalt(ing.finalDough.saltG)}`);
    console.log(`  Gær              ${formatYeast(ing.finalDough.yeastG)}`);
  }

  console.log('');
  console.log(`Fermentering: ${ferm.strategy}, ${ferm.totalHours} timer i alt`);
  ferm.phases.forEach((phase) => {
    console.log(`  ${phase.kind.padEnd(16)} ${String(phase.hours).padStart(5)} t ved ${phase.tempC} °C (hastighed ${phase.rate.toFixed(2)})`);
  });
  console.log(`  Hovedfermentering svarer til ${ferm.equivalentHoursAt20.toFixed(1)} timer ved 20 °C`);

  console.log('');
  console.log('Din tidsplan');
  plan.schedule.forEach((step) => {
    console.log(`  ${formatDayTime(step.time, now).padEnd(16)} ${step.title}`);
    if (step.detail) console.log(`  ${''.padEnd(16)} ${step.detail}`);
  });

  if (plan.warnings.length > 0) {
    console.log('');
    console.log('Bemærk');
    plan.warnings.forEach((warning) => console.log(`  ! ${warning.message}`));
  }
}

show('Direkte dej, appen vælger forløbet', 'direct', 'auto');
show('Direkte dej, 24 timer ved stuetemperatur', 'direct', 'room');
show('Poolish', 'poolish', 'auto');
show('Biga', 'biga', 'auto');
