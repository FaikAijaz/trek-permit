import { useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { addMember, ParticipantInput } from '../../../../src/api/applications';
import { ApiError } from '../../../../src/api/client';
import { Screen } from '../../../../src/components/Screen';
import { ParticipantForm } from '../../../../src/components/ParticipantForm';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { colors } from '../../../../src/theme';

const EMPTY_MEMBER: ParticipantInput = {
  fullName: '',
  identityNumber: '',
  address: '',
  mobile: '',
  emergencyContactName: '',
  emergencyContactMobile: '',
  medicalDeclaration: false,
};

export default function AddMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [member, setMember] = useState<ParticipantInput>(EMPTY_MEMBER);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deliberately looser than the leader's own gate on the create-application
  // screen — a member only needs a name and an Aadhaar number to exist on
  // the application; the officer decides the rest at review time.
  const isValid = member.fullName.trim().length > 0 && /^\d{12}$/.test(member.identityNumber);

  async function handleSubmit() {
    if (!isValid) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await addMember(id, member);
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 20 }}>
        Add a group member
      </Text>

      <ParticipantForm
        value={member}
        onChange={(patch) => setMember((prev) => ({ ...prev, ...patch }))}
        showGuide
      />

      {error && <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>}

      <PrimaryButton label="Add member" onPress={handleSubmit} disabled={!isValid} loading={isSubmitting} />
    </Screen>
  );
}
