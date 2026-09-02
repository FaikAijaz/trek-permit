import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { colors } from '../../../src/theme';
import { useNotifications } from '../../../src/context/NotificationsContext';

export default function TabsLayout() {
  const { unreadCount, refresh } = useNotifications();

  // Just the initial load — the notifications screen itself refreshes on
  // every focus (useFocusEffect), which is what actually keeps this badge
  // current as the trekker moves between tabs.
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary }}>
      <Tabs.Screen name="routes" options={{ title: 'Treks' }} />
      <Tabs.Screen name="applications" options={{ title: 'My Applications' }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
    </Tabs>
  );
}
