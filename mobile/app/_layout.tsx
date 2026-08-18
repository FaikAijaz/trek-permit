import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme';

function RootNavigator() {
  const { user, isLoading } = useAuth();

  // Only true during the one-time SecureStore rehydrate on launch — after
  // that this never flashes back to loading (signIn/signOut update `user`
  // synchronously with the store write).
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Same binary, separate login (BUILD_SPEC.md Section 1) — the split
  // happens here, by role, once. Everything under (officer) assumes a
  // checkpoint officer; everything under (app) assumes a trekker.
  const isOfficer = user?.role === 'officer' || user?.role === 'admin';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user && !isOfficer}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!!user && isOfficer}>
        <Stack.Screen name="(officer)" />
      </Stack.Protected>

      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
