import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { requestOtp, verifyOtp } from '../../src/api/auth';
import { ApiError } from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { Screen } from '../../src/components/Screen';
import { FormField } from '../../src/components/FormField';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { colors } from '../../src/theme';

export default function VerifyScreen() {
  const { mobile } = useLocalSearchParams<{ mobile: string }>();
  const { signIn } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const isValid = /^[0-9]{6}$/.test(code);

  async function handleVerify() {
    if (!isValid) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await verifyOtp(mobile, code);
      // No manual navigation here — the root layout's Stack.Protected guard
      // reacts to `user` changing and swaps in the (app) stack itself.
      await signIn(result.accessToken, result.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setIsResending(true);
    try {
      await requestOtp(mobile);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <Screen>
      <View style={{ marginTop: 60, marginBottom: 32 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.primary, marginBottom: 16 }}>← Back</Text>
        </Pressable>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>
          Enter the code
        </Text>
        <Text style={{ fontSize: 16, color: colors.muted, marginTop: 8 }}>
          Sent to {mobile}
        </Text>
      </View>

      <FormField
        label="6-digit code"
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
        error={error ?? undefined}
      />

      <PrimaryButton
        label="Verify"
        onPress={handleVerify}
        disabled={!isValid}
        loading={isSubmitting}
      />

      <Pressable onPress={handleResend} disabled={isResending} style={{ marginTop: 20 }}>
        <Text style={{ color: colors.primary, textAlign: 'center' }}>
          {isResending ? 'Resending…' : "Didn't get it? Resend code"}
        </Text>
      </Pressable>
    </Screen>
  );
}
