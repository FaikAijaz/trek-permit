import { Tabs } from 'expo-router';
import { colors } from '../../../src/theme';

export default function OfficerTabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary }}>
      <Tabs.Screen name="scan" options={{ title: 'Scan', headerShown: false }} />
      <Tabs.Screen name="sync" options={{ title: 'Sync' }} />
    </Tabs>
  );
}
