import { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface ScreenProps {
  // Optional — a loading screen has nothing else to render.
  children?: ReactNode;
  /** Use a plain View instead of a ScrollView — for screens (like a form
   * with its own internal scrolling, or a full-bleed QR display) that
   * shouldn't be wrapped in an outer scroll container. */
  scroll?: boolean;
  /** Renders a centered spinner instead of `children` — folds in the same
   * "flex:1, centered ActivityIndicator" block that routes.tsx,
   * applications.tsx, and notifications.tsx each used to duplicate for
   * their initial (data === null) load. */
  loading?: boolean;
}

export function Screen({ children, scroll = true, loading = false }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : scroll ? (
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
