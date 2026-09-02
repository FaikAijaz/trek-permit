import { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

/** The centered muted text used for a list's empty/error state — same
 * style repeated identically across routes.tsx, applications.tsx, and
 * notifications.tsx (usually as `{error ?? '<empty message>'}`). */
export function EmptyMessage({ children }: { children: ReactNode }) {
  return <Text style={styles.text}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: { color: colors.muted, textAlign: 'center', marginTop: 40 },
});
