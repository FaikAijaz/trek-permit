import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ApiError } from '../../../src/api/client';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { Screen } from '../../../src/components/Screen';
import { useAuth } from '../../../src/context/AuthContext';
import { getStatus, syncNow, SyncStatus } from '../../../src/offline/store';
import { colors } from '../../../src/theme';

export default function SyncScreen() {
  const { user, signOut } = useAuth();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read the cache (not the network) on every focus, so returning from Scan
  // reflects whatever the last sync actually wrote.
  useFocusEffect(
    useCallback(() => {
      setStatus(getStatus());
    }, []),
  );

  async function handleSync() {
    setIsSyncing(true);
    setError(null);
    try {
      setStatus(await syncNow());
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not sync — check your connection and try again.',
      );
    } finally {
      setIsSyncing(false);
    }
  }

  const isReady = !!status?.publicKeyHex;

  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 4 }}>
        Offline verification
      </Text>
      <Text style={{ color: colors.muted, marginTop: 4, marginBottom: 24 }}>
        Signed in as {user?.fullName ?? user?.mobile}
      </Text>

      <View
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <StatusRow
          label="Verification key"
          value={isReady ? 'Synced' : 'Not synced yet'}
          ok={isReady}
        />
        <StatusRow
          label="Revoked permits cached"
          value={status ? String(status.revocationCount) : '—'}
          ok={isReady}
        />
        <StatusRow
          label="Last synced"
          value={status?.lastSyncedAt ? formatTimestamp(status.lastSyncedAt) : 'Never'}
          ok={isReady}
        />
      </View>

      {!isReady && (
        <Text style={{ color: colors.warning, marginBottom: 16 }}>
          Sync at least once, while you still have signal, before heading to a checkpoint —
          scanning won&apos;t verify anything until then.
        </Text>
      )}

      {error && <Text style={{ color: colors.danger, marginBottom: 16 }}>{error}</Text>}

      <PrimaryButton label="Sync now" onPress={handleSync} loading={isSyncing} />

      <Pressable onPress={signOut} style={{ alignSelf: 'center', marginTop: 24 }}>
        <Text style={{ color: colors.muted }}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ color: colors.muted }}>{label}</Text>
      <Text style={{ color: ok ? colors.text : colors.warning, fontWeight: '600' }}>
        {value}
      </Text>
    </View>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}
