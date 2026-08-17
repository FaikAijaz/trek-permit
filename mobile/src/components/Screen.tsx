import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface ScreenProps {
  children: ReactNode;
  /** Use a plain View instead of a ScrollView — for screens (like a form
   * with its own internal scrolling, or a full-bleed QR display) that
   * shouldn't be wrapped in an outer scroll container. */
  scroll?: boolean;
}

export function Screen({ children, scroll = true }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {scroll ? (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {children}
        </ScrollView>
      ) : (
        <View style={styles.container}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 20 },
  scrollContent: { paddingBottom: 40 },
});
