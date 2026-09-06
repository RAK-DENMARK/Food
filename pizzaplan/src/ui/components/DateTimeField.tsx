import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { colors, MIN_TOUCH_SIZE, radius, spacing, typography } from '../theme';
import { formatDay, formatTime } from '../../utils/format';

interface Props {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  help?: string;
}

/**
 * Dato og klokkeslæt.
 *
 * iOS og Android bruger systemets egne vælgere. På web (kun til hurtigt
 * udviklingskig) er der en simpel reserveløsning, så flowet stadig kan køres.
 * Alle tidspunkter er lokale – der regnes ingen steder i UTC.
 */
export function DateTimeField({ label, value, onChange, minimumDate, help }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'ios' ? (
        <IosPicker value={value} onChange={onChange} minimumDate={minimumDate} />
      ) : Platform.OS === 'android' ? (
        <AndroidPicker value={value} onChange={onChange} minimumDate={minimumDate} />
      ) : (
        <FallbackPicker value={value} onChange={onChange} />
      )}
      <Text style={styles.summary} accessibilityLabel={`Valgt: ${formatDay(value)} klokken ${formatTime(value)}`}>
        {`${formatDay(value)} kl. ${formatTime(value)}`}
      </Text>
      {help ? <Text style={styles.help}>{help}</Text> : null}
    </View>
  );
}

function combine(datePart: Date, timePart: Date): Date {
  return new Date(
    datePart.getFullYear(),
    datePart.getMonth(),
    datePart.getDate(),
    timePart.getHours(),
    timePart.getMinutes(),
    0,
    0,
  );
}

function IosPicker({ value, onChange, minimumDate }: Omit<Props, 'label' | 'help'>) {
  return (
    <View style={styles.row}>
      <DateTimePicker
        value={value}
        mode="date"
        display="compact"
        minimumDate={minimumDate}
        locale="da-DK"
        accessibilityLabel="Vælg dato"
        onChange={(_event, date) => date && onChange(combine(date, value))}
      />
      <DateTimePicker
        value={value}
        mode="time"
        display="compact"
        locale="da-DK"
        accessibilityLabel="Vælg klokkeslæt"
        onChange={(_event, date) => date && onChange(combine(value, date))}
      />
    </View>
  );
}

function AndroidPicker({ value, onChange, minimumDate }: Omit<Props, 'label' | 'help'>) {
  const openDate = () => {
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      minimumDate,
      onChange: (_event, date) => date && onChange(combine(date, value)),
    });
  };
  const openTime = () => {
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: true,
      onChange: (_event, date) => date && onChange(combine(value, date)),
    });
  };

  return (
    <View style={styles.row}>
      <FieldButton label={formatDay(value)} onPress={openDate} accessibilityLabel="Vælg dato" />
      <FieldButton label={formatTime(value)} onPress={openTime} accessibilityLabel="Vælg klokkeslæt" />
    </View>
  );
}

/** Reserveløsning uden systemvælger (bruges kun på web). */
function FallbackPicker({ value, onChange }: Omit<Props, 'label' | 'help' | 'minimumDate'>) {
  const [today] = useState(() => new Date());
  const shiftDays = (days: number) => {
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
    onChange(combine(base, value));
  };
  const shiftMinutes = (minutes: number) => {
    onChange(new Date(value.getTime() + minutes * 60 * 1000));
  };

  return (
    <View style={styles.fallback}>
      <View style={styles.row}>
        <FieldButton label="I dag" onPress={() => shiftDays(0)} accessibilityLabel="Vælg i dag" />
        <FieldButton label="I morgen" onPress={() => shiftDays(1)} accessibilityLabel="Vælg i morgen" />
        <FieldButton label="Om 2 dage" onPress={() => shiftDays(2)} accessibilityLabel="Vælg om to dage" />
      </View>
      <View style={styles.row}>
        <FieldButton label="− 1 time" onPress={() => shiftMinutes(-60)} accessibilityLabel="En time tidligere" />
        <FieldButton label="+ 1 time" onPress={() => shiftMinutes(60)} accessibilityLabel="En time senere" />
        <FieldButton label="+ 15 min." onPress={() => shiftMinutes(15)} accessibilityLabel="Femten minutter senere" />
      </View>
    </View>
  );
}

function FieldButton({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
    >
      <Text style={styles.fieldLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  label: { ...typography.label, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  fallback: { gap: spacing.sm },
  field: {
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
  },
  fieldPressed: { backgroundColor: colors.border },
  fieldLabel: { ...typography.bodyStrong, color: colors.accent },
  summary: { ...typography.title, color: colors.text },
  help: { ...typography.small, color: colors.textMuted },
});
