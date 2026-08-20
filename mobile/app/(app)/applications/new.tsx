import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { fetchRoute } from '../../../src/api/routes';
import { createApplication, ParticipantInput } from '../../../src/api/applications';
import { ApiError } from '../../../src/api/client';
import { GroupType, TrekRoute } from '../../../src/api/types';
import { Screen } from '../../../src/components/Screen';
import { FormField } from '../../../src/components/FormField';
import { DateField } from '../../../src/components/DateField';
import { ParticipantForm } from '../../../src/components/ParticipantForm';
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

const EMPTY_LEADER: ParticipantInput = {
  fullName: '',
  identityNumber: '',
  address: '',
  mobile: '',
  emergencyContactName: '',
  emergencyContactMobile: '',
  medicalDeclaration: false,
};

export default function NewApplicationScreen() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const [route, setRoute] = useState<TrekRoute | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Individual is the default — the common case, and what this screen
  // originally only supported. Choosing Group reveals the rest.
  const [applicationType, setApplicationType] = useState<'individual' | 'group'>('individual');
  const [groupType, setGroupType] = useState<GroupType>('private');
  const [operatorName, setOperatorName] = useState('');
  const [operatorRegistrationNo, setOperatorRegistrationNo] = useState('');
  const [operatorRegValidUntil, setOperatorRegValidUntil] = useState(addDays(new Date(), 365));

  const [leader, setLeader] = useState<ParticipantInput>(EMPTY_LEADER);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(addDays(new Date(), 1));

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await fetchRoute(routeId);
        setRoute(loaded);
        const earliestStart = addDays(new Date(), loaded.minLeadTimeDays);
        setStartDate(earliestStart);
        setEndDate(addDays(earliestStart, 1));
      } catch (err) {
        setRouteError(err instanceof ApiError ? err.message : 'Could not load this trek');
      }
    })();
  }, [routeId]);

  const isCommercial = applicationType === 'group' && groupType === 'commercial';

  const isValid =
    leader.fullName.trim().length > 0 &&
    /^\d{12}$/.test(leader.identityNumber) &&
    !!leader.emergencyContactName?.trim() &&
    /^[0-9]{10,15}$/.test(leader.emergencyContactMobile ?? '') &&
    !!leader.medicalDeclaration &&
    endDate >= startDate &&
    (!isCommercial || (operatorName.trim().length > 0 && operatorRegistrationNo.trim().length > 0));

  async function handleSubmit() {
    if (!isValid || !route) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const application = await createApplication(
        applicationType === 'individual'
          ? {
              type: 'individual',
              trekRouteId: route.id,
              startDate: toIsoDate(startDate),
              endDate: toIsoDate(endDate),
              leader,
            }
          : {
              type: 'group',
              groupType,
              trekRouteId: route.id,
              startDate: toIsoDate(startDate),
              endDate: toIsoDate(endDate),
              leader,
              ...(isCommercial
                ? {
                    operatorName: operatorName.trim(),
                    operatorRegistrationNo: operatorRegistrationNo.trim(),
                    operatorRegValidUntil: toIsoDate(operatorRegValidUntil),
                  }
                : {}),
            },
      );
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

      <ToggleRow
        label="Application type"
        options={[
          { value: 'individual', label: 'Individual' },
          { value: 'group', label: 'Group' },
        ]}
        value={applicationType}
        onChange={(v) => setApplicationType(v as 'individual' | 'group')}
      />

      {applicationType === 'group' && (
        <ToggleRow
          label="Group type"
          options={[
            { value: 'private', label: 'Private' },
            { value: 'commercial', label: 'Commercial' },
          ]}
          value={groupType}
          onChange={(v) => setGroupType(v as GroupType)}
        />
      )}

      {isCommercial && (
        <View style={{ marginBottom: 8 }}>
          <FormField
            label="Operator name"
            value={operatorName}
            onChangeText={setOperatorName}
            placeholder="Registered trek operator"
          />
          <FormField
            label="Operator registration number"
            value={operatorRegistrationNo}
            onChangeText={setOperatorRegistrationNo}
          />
          <DateField
            label="Operator registration valid until"
            value={operatorRegValidUntil}
            onChange={setOperatorRegValidUntil}
            minimumDate={new Date()}
          />
        </View>
      )}

      <DateField label="Start date" value={startDate} onChange={setStartDate} minimumDate={new Date()} />
      <DateField label="End date" value={endDate} onChange={setEndDate} minimumDate={startDate} />

      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 4, marginBottom: 12 }}>
        {applicationType === 'group' ? 'Trek leader' : 'Your details'}
      </Text>
      <ParticipantForm value={leader} onChange={(patch) => setLeader((prev) => ({ ...prev, ...patch }))} />

      {applicationType === 'group' && (
        <Text style={{ color: colors.muted, marginTop: -8, marginBottom: 20, fontSize: 13 }}>
          Add the rest of the group after creating the application.
        </Text>
      )}

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

function ToggleRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primary : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '600' }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
