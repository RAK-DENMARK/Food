import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ScheduleStep } from '../../types';
import { formatDay, formatTime } from '../../utils/format';
import { colors, radius, spacing, typography } from '../theme';

interface Props {
  steps: ScheduleStep[];
  /** Referencetidspunkt for "i dag" og "i morgen". */
  reference: Date;
}

/** Kronologisk tidsplan: tidspunkt, hvad der skal ske, og en kort instruktion. */
export function Timeline({ steps, reference }: Props) {
  return (
    <View style={styles.wrapper}>
      {steps.map((step, index) => {
        const previous = steps[index - 1];
        const showDay = !previous || formatDay(previous.time, reference) !== formatDay(step.time, reference);
        const last = index === steps.length - 1;

        return (
          <Fragment key={step.id}>
            {showDay ? (
              <Text style={styles.day} accessibilityRole="header">
                {formatDay(step.time, reference)}
              </Text>
            ) : null}
            <View
              style={styles.row}
              accessible
              accessibilityLabel={`${formatDay(step.time, reference)} klokken ${formatTime(step.time)}. ${
                step.title
              }. ${step.detail ?? ''}`}
            >
              <View style={styles.timeColumn}>
                <Text style={styles.time}>{formatTime(step.time)}</Text>
              </View>
              <View style={styles.markerColumn}>
                <View style={[styles.dot, last && styles.dotLast]} />
                {last ? null : <View style={styles.line} />}
              </View>
              <View style={styles.textColumn}>
                <Text style={styles.title}>{step.title}</Text>
                {step.detail ? <Text style={styles.detail}>{step.detail}</Text> : null}
              </View>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  day: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', gap: spacing.sm, minHeight: 64 },
  timeColumn: { width: 58, paddingTop: 2 },
  time: { ...typography.bodyStrong, color: colors.text },
  markerColumn: { width: 16, alignItems: 'center' },
  dot: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: 3,
    borderColor: colors.accent,
    marginTop: 4,
  },
  dotLast: { backgroundColor: colors.accent },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2, marginBottom: -spacing.xs },
  textColumn: { flex: 1, paddingBottom: spacing.md, gap: 2 },
  title: { ...typography.bodyStrong, color: colors.text },
  detail: { ...typography.small, color: colors.textMuted },
});
