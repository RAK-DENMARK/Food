import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface Props {
  label: string;
  amount: string;
  /** Uddybning, fx en advarsel om præcisionsvægt. */
  note?: string;
}

/** Én ingrediens med stort, letlæseligt tal. */
export function IngredientRow({ label, amount, note }: Props) {
  return (
    <View style={styles.wrapper} accessible accessibilityLabel={`${label}: ${amount}`}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.amount} adjustsFontSizeToFit numberOfLines={1}>
          {amount}
        </Text>
      </View>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  label: { ...typography.body, color: colors.textMuted, flexShrink: 1 },
  amount: { ...typography.amount, color: colors.text },
  note: { ...typography.small, color: colors.caution },
});
