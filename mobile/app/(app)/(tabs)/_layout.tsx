import { Tabs } from 'expo-router';
import { colors } from '../../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary }}>
      <Tabs.Screen name="routes" options={{ title: 'Treks' }} />
      <Tabs.Screen name="applications" options={{ title: 'My Applications' }} />
    </Tabs>
  );
}
