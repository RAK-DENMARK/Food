import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { Stepper } from '../components/Stepper';
import { DateTimeField } from '../components/DateTimeField';
import { useDraft } from '../state/DraftContext';
import { LIMITS, STEP } from '../../config/dough';
import { colors, spacing, typography } from '../theme';
import type { ScreenProps } from '../navigation';

/** Skærm 2 – Pizzaerne: hvor mange, og hvornår skal de være klar. */
export function PizzasScreen({ navigation }: ScreenProps<'Pizzas'>) {
  const { draft, update } = useDraft();

  return (
    <Screen
      footer={
        <PrimaryButton
          label="Næste"
          onPress={() => navigation.navigate('Conditions')}
          accessibilityHint="Går videre til temperatur"
        />
      }
    >
      <Card>
        <Stepper
          label="Hvor mange pizzaer skal du lave?"
          displayValue={String(draft.pizzaCount)}
          value={draft.pizzaCount}
          min={LIMITS.pizzaCount.min}
          max={LIMITS.pizzaCount.max}
          step={STEP.pizzaCount}
          unitLabel="pizzaer"
          onChange={(pizzaCount) => update({ pizzaCount })}
        />
      </Card>

      <Card>
        <DateTimeField
          label="Hvornår skal de være klar?"
          value={draft.servingTime}
          minimumDate={new Date()}
          onChange={(servingTime) => update({ servingTime })}
        />
      </Card>

      <View style={styles.secondary}>
        <Text style={styles.secondaryText}>
          {`Dejbold: ${draft.ballWeightG} g – det kan du ændre på næste skærm.`}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  secondary: { paddingHorizontal: spacing.xs },
  secondaryText: { ...typography.small, color: colors.textMuted },
});
