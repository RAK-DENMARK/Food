import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, MIN_TOUCH_SIZE, radius, spacing, typography } from '../theme';

export interface Option<T extends string> {
  value: T;
  label: string;
  /** Én kort linje, der forklarer valget. */
  description?: string;
}

interface Props<T extends string> {
  label: string;
  options: ReadonlyArray<Option<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Kort forklaring under gruppen. */
  help?: string;
}

/**
 * Liste af valgmuligheder, hvor præcis én er valgt.
 *
 * Det valgte kort markeres både med farve, med en ring og med
 * accessibilityState, så farven aldrig står alene som signal.
 */
export function OptionGroup<T extends string>({ label, options, value, onChange, help }: Props<T>) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label} accessibilityRole="header">
        {label}
      </Text>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              accessibilityLabel={
                option.description ? `${option.label}. ${option.description}` : option.label
              }
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
            >
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
                {option.description ? (
                  <Text style={styles.optionDescription}>{option.description}</Text>
                ) : null}
              </View>
              <View style={[styles.marker, selected && styles.markerSelected]}>
                {selected ? <View style={styles.markerDot} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      {help ? <Text style={styles.help}>{help}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  label: { ...typography.label, color: colors.textMuted },
  options: { gap: spacing.sm },
  option: {
    minHeight: MIN_TOUCH_SIZE + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  optionPressed: { backgroundColor: colors.surfaceMuted },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { ...typography.bodyStrong, color: colors.text },
  optionLabelSelected: { color: colors.accentPressed },
  optionDescription: { ...typography.small, color: colors.textMuted },
  marker: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerSelected: { borderColor: colors.accent },
  markerDot: { width: 12, height: 12, borderRadius: radius.pill, backgroundColor: colors.accent },
  help: { ...typography.small, color: colors.textMuted },
});
