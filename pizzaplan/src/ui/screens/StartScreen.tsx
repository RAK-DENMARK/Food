import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, spacing, typography } from '../theme';
import type { ScreenProps } from '../navigation';

/** Skærm 1 – Start. Én besked og én knap. */
export function StartScreen({ navigation }: ScreenProps<'Start'>) {
  return (
    <Screen
      footer={
        <PrimaryButton
          label="Lav en ny dej"
          onPress={() => navigation.navigate('Pizzas')}
          accessibilityHint="Starter en ny dejplan"
        />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
          🍕
        </Text>
        <Text style={styles.title} accessibilityRole="header">
          PizzaPlan
        </Text>
        <Text style={styles.subtitle}>Din pizzadej, planlagt for dig.</Text>
      </View>
      <View style={styles.points}>
        <Point text="Sig hvornår I skal spise" />
        <Point text="Få mel, vand, salt og gær målt op" />
        <Point text="Få en tidsplan du bare skal følge" />
      </View>
    </Screen>
  );
}

function Point({ text }: { text: string }) {
  return (
    <View style={styles.point}>
      <View style={styles.dot} />
      <Text style={styles.pointText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: spacing.xxl, gap: spacing.sm },
  emoji: { fontSize: 56, lineHeight: 64 },
  title: { ...typography.display, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, fontSize: 19, lineHeight: 26 },
  points: { gap: spacing.md, paddingTop: spacing.md },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  pointText: { ...typography.body, color: colors.text, flex: 1 },
});
