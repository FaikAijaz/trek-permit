import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { fetchApplications } from '../../../src/api/applications';
import { ApiError } from '../../../src/api/client';
import { Application } from '../../../src/api/types';
import { Screen } from '../../../src/components/Screen';
import { ListCard } from '../../../src/components/ListCard';
import { EmptyMessage } from '../../../src/components/EmptyMessage';
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

  return (
    <Screen scroll={false} loading={applications === null && !error}>
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
          <EmptyMessage>
            {error ?? "You haven't applied for a permit yet. Check the Treks tab to start one."}
          </EmptyMessage>
        }
        renderItem={({ item }) => (
          <ListCard
            onPress={() =>
              router.push({ pathname: '/(app)/applications/[id]', params: { id: item.id } })
            }
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
              {item.reference}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 2, marginBottom: 10 }}>
              {item.startDate.slice(0, 10)} → {item.endDate.slice(0, 10)}
              {item.type === 'group' ? ` · ${item.groupType} group` : ''}
            </Text>
            <StatusBadge status={item.status} />
          </ListCard>
        )}
      />
    </Screen>
  );
}
