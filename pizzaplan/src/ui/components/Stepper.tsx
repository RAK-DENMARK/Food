import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, MIN_TOUCH_SIZE, radius, spacing, typography } from '../theme';

interface Props {
  label: string;
  /** Værdien som den skal læses, fx "6" eller "22 °C". */
  displayValue: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Kort forklaring under kontrollen. */
  help?: string;
  /** Enhed til skærmlæseren, fx "grader". */
  unitLabel?: string;
}

/**
 * Plus/minus-vælger med store trykflader og et stort tal.
 * Bruges til antal pizzaer, temperatur og dejboldvægt.
 */
export function Stepper({
  label,
  displayValue,
  value,
  min,
  max,
  step,
  onChange,
  help,
  unitLabel,
}: Props) {
  const decrease = () => onChange(Math.max(min, roundStep(value - step, step)));
  const increase = () => onChange(Math.min(max, roundStep(value + step, step)));
  const spoken = unitLabel ? `${displayValue} ${unitLabel}` : displayValue;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <StepperButton
          symbol="−"
          label={`Færre ${label.toLowerCase()}`}
          onPress={decrease}
          disabled={value <= min}
        />
        <Text
          style={styles.value}
          accessibilityRole="text"
          accessibilityLabel={`${label}: ${spoken}`}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {displayValue}
        </Text>
        <StepperButton
          symbol="+"
          label={`Flere ${label.toLowerCase()}`}
          onPress={increase}
          disabled={value >= max}
        />
      </View>
      {help ? <Text style={styles.help}>{help}</Text> : null}
    </View>
  );
}

function roundStep(value: number, step: number): number {
  const decimals = step < 1 ? 2 : 0;
  return Number(value.toFixed(decimals));
}

function StepperButton({
  symbol,
  label,
  onPress,
  disabled,
}: {
  symbol: string;
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={[styles.symbol, disabled && styles.symbolDisabled]}>{symbol}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  label: { ...typography.label, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  value: {
    ...typography.display,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  button: {
    width: MIN_TOUCH_SIZE + 8,
    height: MIN_TOUCH_SIZE + 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { backgroundColor: colors.border },
  buttonDisabled: { backgroundColor: colors.surfaceMuted },
  help: { ...typography.small, color: colors.textMuted },
  symbol: { fontSize: 30, lineHeight: 34, fontWeight: '700', color: colors.accent },
  symbolDisabled: { color: colors.textMuted },
});
