import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { fetchApplications } from '../../../src/api/applications';
import { ApiError } from '../../../src/api/client';
import { Application } from '../../../src/api/types';
import { Screen } from '../../../src/components/Screen';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { useAuth } from '../../../src/context/AuthContext';
import { colors } from '../../../src/theme';

export default function ApplicationsScreen() {
  const { signOut } = useAuth();
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function load() {
    try {
      setError(null);
      setApplications(await fetchApplications());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load applications');
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  async function onRefresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  if (applications === null && !error) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <FlatList
        contentContainerStyle={{ padding: 20 }}
        data={applications ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <Pressable onPress={signOut} style={{ alignSelf: 'flex-end', marginBottom: 12 }}>
            <Text style={{ color: colors.muted }}>Sign out</Text>
          </Pressable>
        }
        ListEmptyComponent={
          <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>
            {error ?? "You haven't applied for a permit yet. Check the Treks tab to start one."}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/(app)/applications/[id]', params: { id: item.id } })
            }
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
              {item.reference}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 2, marginBottom: 10 }}>
              {item.startDate.slice(0, 10)} → {item.endDate.slice(0, 10)}
              {item.type === 'group' ? ` · ${item.groupType} group` : ''}
            </Text>
            <StatusBadge status={item.status} />
          </Pressable>
        )}
      />
    </Screen>
  );
}
