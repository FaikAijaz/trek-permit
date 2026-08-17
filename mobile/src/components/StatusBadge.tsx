import { StyleSheet, Text, View } from 'react-native';
import { statusColors, statusLabel } from '../theme';

export function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] ?? '#888';
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{statusLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  text: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
