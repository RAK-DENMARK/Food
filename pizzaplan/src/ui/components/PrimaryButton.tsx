import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, MIN_TOUCH_SIZE, radius, spacing, typography } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  accessibilityHint?: string;
}

export function PrimaryButton({ label, onPress, variant = 'primary', accessibilityHint }: Props) {
  const secondary = variant === 'secondary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.secondary : styles.primary,
        pressed && (secondary ? styles.secondaryPressed : styles.primaryPressed),
      ]}
    >
      <Text style={[styles.label, secondary && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH_SIZE + 8,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primary: { backgroundColor: colors.accent },
  primaryPressed: { backgroundColor: colors.accentPressed },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.border,
  },
  secondaryPressed: { backgroundColor: colors.surfaceMuted },
  label: {
    color: colors.onAccent,
    fontSize: typography.bodyStrong.fontSize,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryLabel: { color: colors.text },
});
