import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { requestOtp } from '../../src/api/auth';
import { ApiError } from '../../src/api/client';
import { Screen } from '../../src/components/Screen';
import { FormField } from '../../src/components/FormField';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { colors } from '../../src/theme';

const MOBILE_PATTERN = /^[0-9]{10}$/;

export default function LoginScreen() {
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = MOBILE_PATTERN.test(mobile);

  async function handleSubmit() {
    if (!isValid) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await requestOtp(mobile);
      router.push({ pathname: '/(auth)/verify', params: { mobile } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={{ marginTop: 60, marginBottom: 32 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>
          Trek Permit
        </Text>
        <Text style={{ fontSize: 16, color: colors.muted, marginTop: 8 }}>
          Enter your mobile number to continue
        </Text>
      </View>

      <FormField
        label="Mobile number"
        placeholder="10-digit mobile number"
        keyboardType="number-pad"
        maxLength={10}
        value={mobile}
        onChangeText={(text) => setMobile(text.replace(/[^0-9]/g, ''))}
        error={error ?? undefined}
      />

      <PrimaryButton
        label="Send code"
        onPress={handleSubmit}
        disabled={!isValid}
        loading={isSubmitting}
      />
    </Screen>
  );
}
