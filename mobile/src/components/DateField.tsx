import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors } from '../theme';

interface DateFieldProps {
  label: string;
  value: Date;
  minimumDate?: Date;
  onChange: (date: Date) => void;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function DateField({ label, value, minimumDate, onChange }: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    // Closes on any interaction (Android's dialog and iOS's default picker
    // both fire this) — simplest cross-platform show/hide that doesn't
    // require branching on Platform.OS.
    setIsOpen(false);
    if (event.type === 'set' && selectedDate) {
      onChange(selectedDate);
    }
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={() => setIsOpen(true)} style={styles.input}>
        <Text style={styles.value}>{toIsoDate(value)}</Text>
      </Pressable>
      {isOpen && (
        <DateTimePicker
          value={value}
          mode="date"
          minimumDate={minimumDate}
          display="default"
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12 },
  value: { fontSize: 16, color: colors.text },
});
