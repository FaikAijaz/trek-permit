import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Screen } from '../../src/components/Screen';
import { verifyPermit, VerificationOutcome } from '../../src/offline/verifyPermit';
import { colors } from '../../src/theme';

const OUTCOME_COPY: Record<VerificationOutcome, { label: string; color: string }> = {
  valid: { label: 'VALID', color: colors.primary },
  revoked: { label: 'REVOKED', color: colors.danger },
  expired: { label: 'EXPIRED', color: colors.danger },
  not_yet_valid: { label: 'NOT YET VALID', color: colors.warning },
  bad_signature: { label: 'INVALID — SIGNATURE FAILED', color: colors.danger },
  malformed: { label: 'NOT A TREK PERMIT QR', color: colors.danger },
  no_public_key: { label: 'NOT SYNCED', color: colors.warning },
};

export default function ResultScreen() {
  const { qrPayload } = useLocalSearchParams<{ qrPayload: string }>();
  // Recomputed rather than passed in from the Scan screen — verifyPermit()
  // is synchronous and cache-only, so there's nothing to gain from doing it
  // earlier, and this keeps the result screen the single source of truth
  // for what a given QR string means.
  const result = useMemo(() => verifyPermit(qrPayload ?? ''), [qrPayload]);
  const copy = OUTCOME_COPY[result.outcome];

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: 12 }}>
        <View
          style={{
            backgroundColor: `${copy.color}22`,
            borderColor: copy.color,
            borderWidth: 2,
            borderRadius: 16,
            paddingVertical: 20,
            paddingHorizontal: 24,
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '800', color: copy.color, textAlign: 'center' }}>
            {copy.label}
          </Text>
          {result.payload && (
            <Text style={{ color: colors.muted, marginTop: 4 }}>{result.payload.pid}</Text>
          )}
        </View>

        {result.outcome === 'no_public_key' && (
          <Text style={{ color: colors.muted, marginTop: 16, textAlign: 'center' }}>
            Sync from the Sync tab while you have signal before scanning permits.
          </Text>
        )}

        {result.payload && (
          <View style={{ width: '100%', marginTop: 24 }}>
            <DetailRow label="Leader" value={result.payload.ldr} />
            <DetailRow label="Route" value={result.payload.rt} />
            <DetailRow label="Valid" value={`${result.payload.f} → ${result.payload.t}`} />
            {result.payload.typ === 'group' && (
              <>
                <DetailRow label="Group" value={result.payload.gid ?? '—'} />
                <DetailRow label="Members" value={String(result.payload.n ?? 0)} />
                {result.payload.op && (
                  <DetailRow
                    label="Operator"
                    value={`${result.payload.op.n} (${result.payload.op.r})`}
                  />
                )}
              </>
            )}
          </View>
        )}

        {result.payload?.m && result.payload.m.length > 0 && (
          <View style={{ width: '100%', marginTop: 16 }}>
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>
              Members
            </Text>
            {result.payload.m.map((member, i) => (
              <Text key={i} style={{ color: colors.muted, marginBottom: 4 }}>
                {member.n} — ID …{member.i}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={{ marginTop: 32 }}>
        <PrimaryButton label="Scan next permit" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ color: colors.muted }}>{label}</Text>
      <Text
        style={{ color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}
      >
        {value}
      </Text>
    </View>
  );
}
