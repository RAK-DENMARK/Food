import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { Stepper } from '../components/Stepper';
import { Accordion } from '../components/Accordion';
import { OptionGroup, type Option } from '../components/OptionGroup';
import { Notice } from '../components/Notice';
import { useDraft } from '../state/DraftContext';
import {
  LIMITS,
  METHOD_DESCRIPTIONS,
  METHOD_LABELS,
  ROUTE_DESCRIPTIONS,
  ROUTE_LABELS,
  STEP,
  YEAST_LABELS,
} from '../../config/dough';
import { formatTemp } from '../../utils/format';
import { colors, spacing, typography } from '../theme';
import type { DoughMethod, FermentationRoute, Issue } from '../../types';
import type { ScreenProps } from '../navigation';

/** Kort beskrivelse af køkkentemperaturen, så tallet betyder noget. */
function temperatureHint(tempC: number): string {
  if (tempC < 16) return 'Køligt køkken. Dejen hæver langsomt.';
  if (tempC < 20) return 'Lidt køligt. Dejen hæver roligt.';
  if (tempC <= 24) return 'Almindelig stuetemperatur.';
  if (tempC <= 28) return 'Varmt køkken. Dejen hæver hurtigt.';
  return 'Meget varmt. Hold godt øje med dejen.';
}

/**
 * Metode og forløb er to forskellige valg.
 *
 * Metoden er dejtypen: direkte dej eller indirekte med fordej. Forløbet er
 * hvor dejen hæver. "24 timer" er derfor ikke en dejtype, men et forløb.
 */
const METHOD_OPTIONS: ReadonlyArray<Option<DoughMethod>> = [
  { value: 'direct', label: `${METHOD_LABELS.direct} (klassisk)`, description: METHOD_DESCRIPTIONS.direct },
  { value: 'poolish', label: METHOD_LABELS.poolish, description: METHOD_DESCRIPTIONS.poolish },
  { value: 'biga', label: METHOD_LABELS.biga, description: METHOD_DESCRIPTIONS.biga },
];

const ROUTE_OPTIONS: ReadonlyArray<Option<FermentationRoute>> = [
  { value: 'auto', label: ROUTE_LABELS.auto, description: ROUTE_DESCRIPTIONS.auto },
  { value: 'room', label: ROUTE_LABELS.room, description: ROUTE_DESCRIPTIONS.room },
  { value: 'cold', label: ROUTE_LABELS.cold, description: ROUTE_DESCRIPTIONS.cold },
];

/** Skærm 3 – Forholdene: temperatur, dejtype og hævning. */
export function ConditionsScreen({ navigation }: ScreenProps<'Conditions'>) {
  const { draft, update, generatePlan } = useDraft();
  const [errors, setErrors] = useState<Issue[]>([]);

  const onSubmit = () => {
    const result = generatePlan();
    if (result.ok) {
      setErrors([]);
      navigation.navigate('Plan');
    } else {
      setErrors(result.errors);
    }
  };

  return (
    <Screen
      footer={
        <PrimaryButton
          label="Lav min dejplan"
          onPress={onSubmit}
          accessibilityHint="Beregner ingredienser og tidsplan"
        />
      }
    >
      <Card>
        <Stepper
          label="Hvor varmt er der cirka hjemme hos dig?"
          displayValue={formatTemp(draft.roomTempC)}
          value={draft.roomTempC}
          min={LIMITS.roomTempC.min}
          max={LIMITS.roomTempC.max}
          step={STEP.roomTempC}
          unitLabel="grader"
          help={temperatureHint(draft.roomTempC)}
          onChange={(roomTempC) => update({ roomTempC })}
        />
        <Text style={styles.explainer}>
          Temperaturen hjælper PizzaPlan med at vurdere, hvor hurtigt dejen hæver.
        </Text>
      </Card>

      <Card>
        <OptionGroup
          label="Hvilken slags dej?"
          options={METHOD_OPTIONS}
          value={draft.method}
          onChange={(method) => update({ method })}
          help="Fordeje skal modne, før dejen laves, så de kræver længere tid."
        />
      </Card>

      <Card>
        <OptionGroup
          label="Hvordan skal den hæve?"
          options={ROUTE_OPTIONS}
          value={draft.route}
          onChange={(route) => update({ route })}
          help="Hvor mange timer dejen hæver, regner PizzaPlan selv ud fra dit spisetidspunkt."
        />
      </Card>

      {errors.length > 0 ? (
        <View style={styles.errors}>
          {errors.map((error) => (
            <Notice key={error.code} tone="caution" title="Det kan ikke lade sig gøre" body={error.message} />
          ))}
        </View>
      ) : null}

      <Accordion title="Avancerede indstillinger">
        <Stepper
          label="Vægt pr. dejbold"
          displayValue={`${draft.ballWeightG} g`}
          value={draft.ballWeightG}
          min={LIMITS.ballWeightG.min}
          max={LIMITS.ballWeightG.max}
          step={STEP.ballWeightG}
          unitLabel="gram"
          help="270 g giver en pizza på cirka 30 cm."
          onChange={(ballWeightG) => update({ ballWeightG })}
        />
        <Stepper
          label="Vand i forhold til mel"
          displayValue={`${Math.round(draft.hydration * 100)} %`}
          value={Math.round(draft.hydration * 100)}
          min={Math.round(LIMITS.hydration.min * 100)}
          max={Math.round(LIMITS.hydration.max * 100)}
          step={STEP.hydrationPercent}
          unitLabel="procent"
          help="Mere vand giver en luftigere, men også blødere dej."
          onChange={(percent) => update({ hydration: percent / 100 })}
        />
        <Stepper
          label="Salt i forhold til mel"
          displayValue={`${(draft.salt * 100).toFixed(1).replace('.', ',')} %`}
          value={Number((draft.salt * 100).toFixed(1))}
          min={LIMITS.salt.min * 100}
          max={LIMITS.salt.max * 100}
          step={STEP.saltPercent}
          unitLabel="procent"
          onChange={(percent) => update({ salt: percent / 100 })}
        />
        <View style={styles.yeastRow}>
          <Text style={styles.yeastLabel}>Gærtype</Text>
          <Text style={styles.yeastValue}>{YEAST_LABELS[draft.yeastType]}</Text>
          <Text style={styles.yeastHelp}>
            PizzaPlan regner med instant tørgær. Aktiv tørgær og frisk gær opfører sig anderledes og
            kommer i en senere version.
          </Text>
        </View>
      </Accordion>
    </Screen>
  );
}

const styles = StyleSheet.create({
  explainer: { ...typography.small, color: colors.textMuted },
  errors: { gap: spacing.sm },
  yeastRow: { gap: spacing.xs },
  yeastLabel: { ...typography.label, color: colors.textMuted },
  yeastValue: { ...typography.heading, color: colors.text },
  yeastHelp: { ...typography.small, color: colors.textMuted },
});
