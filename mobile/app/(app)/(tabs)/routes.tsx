import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { fetchOpenRoutes } from '../../../src/api/routes';
import { ApiError } from '../../../src/api/client';
import { TrekRoute } from '../../../src/api/types';
import { Screen } from '../../../src/components/Screen';
import { ListCard } from '../../../src/components/ListCard';
import { EmptyMessage } from '../../../src/components/EmptyMessage';
import { colors } from '../../../src/theme';

export default function RoutesScreen() {
  const [routes, setRoutes] = useState<TrekRoute[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function load() {
    try {
      setError(null);
      setRoutes(await fetchOpenRoutes());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load treks');
    }
  }

  // Reload every time this tab gains focus — a route can open/close on the
  // department side between visits, and this is cheap enough to just refetch.
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
    <Screen scroll={false} loading={routes === null && !error}>
      <FlatList
        contentContainerStyle={{ padding: 20 }}
        data={routes ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyMessage>{error ?? 'No treks are currently open for applications.'}</EmptyMessage>
        }
        renderItem={({ item }) => (
          <ListCard
            onPress={() =>
              router.push({ pathname: '/(app)/applications/new', params: { routeId: item.id } })
            }
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
              {item.name}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 2 }}>{item.region}</Text>
            {item.difficulty && (
              <Text style={{ color: colors.muted, marginTop: 6, textTransform: 'capitalize' }}>
                Difficulty: {item.difficulty}
              </Text>
            )}
            <Text style={{ color: colors.muted, marginTop: 2 }}>
              Minimum {item.minLeadTimeDays} days' notice
            </Text>
          </ListCard>
        )}
      />
    </Screen>
  );
}
