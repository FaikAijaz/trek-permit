import { Stack } from 'expo-router';

// Same shape as (app)/_layout.tsx: the tab navigator is one screen in an
// outer Stack so the verification result can push on top of it with a back
// button, instead of being a tab itself.
export default function OfficerLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="result"
        options={{ title: 'Verification Result', presentation: 'modal' }}
      />
    </Stack>
  );
}
