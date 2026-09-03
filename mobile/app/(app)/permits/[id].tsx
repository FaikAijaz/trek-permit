import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { fetchPermit } from '../../../src/api/permits';
import { ApiError } from '../../../src/api/client';
import { Permit } from '../../../src/api/types';
import { cachePermit, getCachedPermit } from '../../../src/offline/permitCache';
import { Screen } from '../../../src/components/Screen';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { colors } from '../../../src/theme';

export default function PermitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [permit, setPermit] = useState<Permit | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set when the on-screen permit came from the local cache rather than a
  // fetch that just succeeded — i.e. it might be out of date. Cleared the
  // moment a live fetch confirms it. Never trust a cached "active" as
  // silently current: the architecture's trust model is explicit that the
  // trekker's own device is never the sole authority on validity — this
  // banner is that principle applied to the one place the trekker's app
  // shows a status at all.
  const [staleSince, setStaleSince] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      // Instant, offline-safe: show whatever we last confirmed while the
      // live fetch below is still in flight or failing outright.
      const cached = getCachedPermit(id);
      if (cached) {
        setPermit(cached);
        setStaleSince(cached.cachedAt);
        setError(null);
      }

      (async () => {
        try {
          const fresh = await fetchPermit(id);
          setPermit(fresh);
          setStaleSince(null);
          setError(null);
          cachePermit(fresh);
        } catch (err) {
          if (!cached) {
            setError(err instanceof ApiError ? err.message : 'Could not load this permit');
          }
          // else: keep showing the cached copy set above; staleSince stays set.
        }
      })();
    }, [id]),
  );

  if (!permit && !error) {
    return <Screen scroll={false} loading />;
  }

  if (error || !permit) {
    return (
      <Screen>
        <Text style={{ color: colors.danger, marginTop: 40 }}>{error}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: 20 }}>
        {staleSince && (
          <View
            style={{
              backgroundColor: `${colors.warning}15`,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              alignSelf: 'stretch',
            }}
          >
            <Text style={{ color: colors.warning, fontWeight: '600' }}>
              Offline — showing the last confirmed status
            </Text>
            <Text style={{ color: colors.text, marginTop: 2 }}>
              As of {new Date(staleSince).toLocaleString()}. Reconnect to confirm this is still
              current.
            </Text>
          </View>
        )}

        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
          {permit.reference}
        </Text>
        <View style={{ marginTop: 8, marginBottom: 24 }}>
          <StatusBadge status={permit.status} />
        </View>

        {/* This is the exact string an offline checkpoint scanner reads and
            verifies against the department's public key — no network round
            trip involved, which is the whole point (see BUILD_SPEC.md
            Section 1's defining constraint). */}
        <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 12 }}>
          <QRCode value={permit.qrPayload} size={240} ecl="M" />
        </View>

        <Text style={{ color: colors.muted, marginTop: 24 }}>
          Valid {permit.validFrom.slice(0, 10)} → {permit.validUntil.slice(0, 10)}
        </Text>
      </View>
    </Screen>
  );
}
