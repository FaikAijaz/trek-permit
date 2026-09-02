import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme';

interface ListCardProps {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** Merged after the base card style — e.g. notifications.tsx's
   * read/unread background tint. */
  style?: StyleProp<ViewStyle>;
}

/** The bordered row card duplicated identically across routes.tsx,
 * applications.tsx, and notifications.tsx. */
export function ListCard({ children, onPress, disabled, style }: ListCardProps) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.card, style]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
});
