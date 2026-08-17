import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { fetchPermit } from '../../../src/api/permits';
import { ApiError } from '../../../src/api/client';
import { Permit } from '../../../src/api/types';
import { Screen } from '../../../src/components/Screen';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { colors } from '../../../src/theme';

export default function PermitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [permit, setPermit] = useState<Permit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          setError(null);
          setPermit(await fetchPermit(id));
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'Could not load this permit');
        }
      })();
    }, [id]),
  );

  if (!permit && !error) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
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
