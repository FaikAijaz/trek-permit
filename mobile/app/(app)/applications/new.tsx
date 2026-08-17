import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { fetchRoute } from '../../../src/api/routes';
import { createApplication } from '../../../src/api/applications';
import { ApiError } from '../../../src/api/client';
import { TrekRoute } from '../../../src/api/types';
import { Screen } from '../../../src/components/Screen';
import { FormField } from '../../../src/components/FormField';
import { DateField } from '../../../src/components/DateField';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { colors } from '../../../src/theme';

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function NewApplicationScreen() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const [route, setRoute] = useState<TrekRoute | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [address, setAddress] = useState('');
  const [mobile, setMobile] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactMobile, setEmergencyContactMobile] = useState('');
  const [medicalDeclaration, setMedicalDeclaration] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(addDays(new Date(), 1));

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await fetchRoute(routeId);
        setRoute(loaded);
        // A sensible default that's already valid against this route's own
        // lead-time rule, rather than leaving "today" selected and forcing
        // the trekker to discover the rule only when submit rejects it.
        const earliestStart = addDays(new Date(), loaded.minLeadTimeDays);
        setStartDate(earliestStart);
        setEndDate(addDays(earliestStart, 1));
      } catch (err) {
        setRouteError(err instanceof ApiError ? err.message : 'Could not load this trek');
      }
    })();
  }, [routeId]);

  const isValid =
    fullName.trim().length > 0 &&
    /^\d{12}$/.test(identityNumber) &&
    emergencyContactName.trim().length > 0 &&
    /^[0-9]{10,15}$/.test(emergencyContactMobile) &&
    medicalDeclaration &&
    endDate >= startDate;

  async function handleSubmit() {
    if (!isValid || !route) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const application = await createApplication({
        trekRouteId: route.id,
        startDate: toIsoDate(startDate),
        endDate: toIsoDate(endDate),
        leader: {
          fullName: fullName.trim(),
          identityNumber,
          address: address.trim() || undefined,
          mobile: mobile.trim() || undefined,
          emergencyContactName: emergencyContactName.trim(),
          emergencyContactMobile,
          medicalDeclaration,
        },
      });
      // Replace, not push — coming back from the detail screen should land
      // on the trek list, not re-show this now-submitted form.
      router.replace({ pathname: '/(app)/applications/[id]', params: { id: application.id } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!route && !routeError) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (routeError || !route) {
    return (
      <Screen>
        <Text style={{ color: colors.danger, marginTop: 40 }}>{routeError}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
        {route.name}
      </Text>
      <Text style={{ color: colors.muted, marginBottom: 20 }}>
        Requires: {route.requiredDocuments.join(', ')}
      </Text>

      <DateField label="Start date" value={startDate} onChange={setStartDate} minimumDate={new Date()} />
      <DateField label="End date" value={endDate} onChange={setEndDate} minimumDate={startDate} />

      <FormField label="Full name" value={fullName} onChangeText={setFullName} placeholder="As on your ID" />
      <FormField
        label="Aadhaar number"
        value={identityNumber}
        onChangeText={(text) => setIdentityNumber(text.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        maxLength={12}
        placeholder="12-digit Aadhaar number"
      />
      <FormField label="Address" value={address} onChangeText={setAddress} multiline placeholder="Optional" />
      <FormField
        label="Your mobile"
        value={mobile}
        onChangeText={(text) => setMobile(text.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        placeholder="Optional, if different from login"
      />
      <FormField
        label="Emergency contact name"
        value={emergencyContactName}
        onChangeText={setEmergencyContactName}
      />
      <FormField
        label="Emergency contact mobile"
        value={emergencyContactMobile}
        onChangeText={(text) => setEmergencyContactMobile(text.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
      />

      <Pressable
        onPress={() => setMedicalDeclaration((prev) => !prev)}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: colors.primary,
            backgroundColor: medicalDeclaration ? colors.primary : 'transparent',
            marginRight: 10,
          }}
        />
        <Text style={{ flex: 1, color: colors.text }}>
          I declare that I am medically fit for this trek
        </Text>
      </Pressable>

      {error && <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>}

      <PrimaryButton
        label="Create application"
        onPress={handleSubmit}
        disabled={!isValid}
        loading={isSubmitting}
      />
    </Screen>
  );
}
