import { Stack } from 'expo-router';
import { NotificationsProvider } from '../../src/context/NotificationsContext';

// The tab navigator is itself one screen in this outer Stack — that's what
// lets "New Application" / application detail / document upload / permit
// screens push on top of the tabs (with a back button, a header) instead of
// needing to be tabs themselves.
export default function AppLayout() {
  return (
    <NotificationsProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="applications/new" options={{ title: 'New Application' }} />
        <Stack.Screen name="applications/[id]/index" options={{ title: 'Application' }} />
        <Stack.Screen
          name="applications/[id]/add-member"
          options={{ title: 'Add Member', presentation: 'modal' }}
        />
        <Stack.Screen
          name="applications/[id]/upload"
          options={{ title: 'Upload Document', presentation: 'modal' }}
        />
        <Stack.Screen name="permits/[id]" options={{ title: 'Permit' }} />
      </Stack>
    </NotificationsProvider>
  );
}
