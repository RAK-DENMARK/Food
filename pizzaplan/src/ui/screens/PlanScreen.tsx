import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { Notice } from '../components/Notice';
import { Accordion } from '../components/Accordion';
import { Timeline } from '../components/Timeline';
import { IngredientRow } from '../components/IngredientRow';
import { useDraft } from '../state/DraftContext';
import { describePlan, explainPlan } from '../../domain/explanation';
import { PRECISION_SCALE_YEAST_G, YEAST_LABELS } from '../../config/dough';
import {
  formatDayTime,
  formatGrams,
  formatSalt,
  formatYeast,
} from '../../utils/format';
import { colors, spacing, typography } from '../theme';
import type { ScreenProps } from '../navigation';

/** Skærm 4 – Din dejplan. Produktets vigtigste skærm. */
export function PlanScreen({ navigation }: ScreenProps<'Plan'>) {
  const { result, generatedAt, draft, reset } = useDraft();

  const startAgain = () => {
    reset();
    navigation.popTo('Start');
  };

  if (!result || !result.ok) {
    return (
      <Screen footer={<PrimaryButton label="Prøv igen" onPress={() => navigation.popTo('Pizzas')} />}>
        <Notice
          tone="caution"
          title="Planen kunne ikke laves"
          body={result?.ok === false ? result.errors[0]?.message : 'Prøv at vælge et andet tidspunkt.'}
        />
      </Screen>
    );
  }

  const { plan } = result;
  const { ingredients } = plan;
  const positive = plan.classification === 'optimal' || plan.classification === 'god';

  return (
    <Screen
      footer={
        <PrimaryButton
          label="Lav en ny plan"
          variant="secondary"
          onPress={startAgain}
          accessibilityHint="Starter forfra med en ny dejplan"
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.summary} accessibilityRole="header">
          {`${draft.pizzaCount} pizzaer á ${draft.ballWeightG} g`}
        </Text>
        <Text style={styles.serving}>
          {`Klar ${formatDayTime(draft.servingTime, generatedAt).toLowerCase()}`}
        </Text>
        <Text style={styles.method}>{describePlan(plan)}</Text>
      </View>

      <Notice
        tone={positive ? 'positive' : 'caution'}
        title={plan.classificationHeadline}
        body={plan.classificationBody}
      />

      {plan.warnings.map((warning) => (
        <Notice key={warning.code} tone="caution" title="Bemærk" body={warning.message} />
      ))}

      <Card>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Du skal bruge
        </Text>
        <IngredientRow label="Mel" amount={formatGrams(ingredients.flourG)} />
        <IngredientRow label="Vand" amount={formatGrams(ingredients.waterG)} />
        <IngredientRow label="Salt" amount={formatSalt(ingredients.saltG)} />
        <IngredientRow
          label={YEAST_LABELS[ingredients.yeastType]}
          amount={formatYeast(ingredients.yeastG)}
          note={
            ingredients.yeastG < PRECISION_SCALE_YEAST_G
              ? 'Så lille en mængde kræver en præcisionsvægt.'
              : undefined
          }
        />
        {ingredients.preferment ? (
          <Text style={styles.totalNote}>
            {`Heraf går ${formatGrams(ingredients.preferment.flourG)} mel og ${formatGrams(
              ingredients.preferment.waterG,
            )} vand i ${ingredients.preferment.kind === 'poolish' ? 'poolishen' : 'bigaen'}. Tidsplanen fortæller hvornår.`}
          </Text>
        ) : null}
        <Text style={styles.totalNote}>
          {`Giver ${formatGrams(ingredients.totalDoughG)} dej i alt.`}
        </Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Din tidsplan
        </Text>
        <Timeline steps={plan.schedule} reference={generatedAt} />
      </Card>

      <Accordion title="Hvorfor ser planen sådan ud?">
        {explainPlan(plan).map((line) => (
          <Text key={line} style={styles.explanation}>
            {line}
          </Text>
        ))}
      </Accordion>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  summary: { ...typography.title, color: colors.text },
  serving: { ...typography.body, color: colors.textMuted, fontSize: 19 },
  method: { ...typography.small, color: colors.accentPressed, fontWeight: '600' },
  sectionTitle: { ...typography.heading, color: colors.text },
  totalNote: { ...typography.small, color: colors.textMuted },
  explanation: { ...typography.small, color: colors.text },
});
