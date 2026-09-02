import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../../src/api/notifications';
import { ApiError } from '../../../src/api/client';
import { AppNotification } from '../../../src/api/types';
import { Screen } from '../../../src/components/Screen';
import { useNotifications } from '../../../src/context/NotificationsContext';
import { colors } from '../../../src/theme';

export default function NotificationsScreen() {
  const { refresh } = useNotifications();
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function load() {
    try {
      setError(null);
      setNotifications(await fetchNotifications());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load notifications');
    }
  }

  // Loads the list AND refreshes the tab badge — this screen is the only
  // place isRead ever changes, so "focused this screen" is exactly when
  // the badge in the layout above needs to catch up.
  useFocusEffect(
    useCallback(() => {
      load();
      refresh();
    }, [refresh]),
  );

  async function onRefresh() {
    setIsRefreshing(true);
    await load();
    await refresh();
    setIsRefreshing(false);
  }

  async function handleMarkRead(id: string) {
    setNotifications(
      (prev) => prev?.map((n) => (n.id === id ? { ...n, isRead: true } : n)) ?? prev,
    );
    try {
      await markNotificationRead(id);
    } catch {
      load(); // fall back to the server's actual state if the PATCH failed
    } finally {
      refresh();
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev?.map((n) => ({ ...n, isRead: true })) ?? prev);
    } catch {
      // Ignore — the next focus reload shows the server's true state.
    } finally {
      refresh();
    }
  }

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  if (notifications === null && !error) {
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
        data={notifications ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          unreadCount > 0 ? (
            <Pressable
              onPress={handleMarkAllRead}
              style={{ alignSelf: 'flex-end', marginBottom: 12 }}
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Mark all as read</Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>
            {error ?? 'No notifications yet.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => !item.isRead && handleMarkRead(item.id)}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              backgroundColor: item.isRead ? colors.background : `${colors.primary}11`,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {!item.isRead && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.primary,
                  }}
                />
              )}
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                {item.title}
              </Text>
            </View>
            <Text style={{ color: colors.muted, marginTop: 6 }}>{item.body}</Text>
            <Text style={{ color: colors.muted, marginTop: 6, fontSize: 12 }}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
