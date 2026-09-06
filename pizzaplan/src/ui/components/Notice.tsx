import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

interface Props {
  tone: 'positive' | 'caution';
  /** Kort overskrift. */
  title: string;
  /** Uddybning i én sætning. */
  body?: string;
}

/**
 * Besked med farve OG tekst. Farven er aldrig eneste informationsbærer,
 * og overskriften siger selv, hvad status er.
 */
export function Notice({ tone, title, body }: Props) {
  const positive = tone === 'positive';
  return (
    <View
      style={[styles.wrapper, positive ? styles.positive : styles.caution]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={body ? `${title}. ${body}` : title}
    >
      <Text style={[styles.title, positive ? styles.positiveText : styles.cautionText]}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  positive: { backgroundColor: colors.positiveSoft },
  caution: { backgroundColor: colors.cautionSoft },
  title: { ...typography.bodyStrong },
  positiveText: { color: colors.positive },
  cautionText: { color: colors.caution },
  body: { ...typography.small, color: colors.text },
});
