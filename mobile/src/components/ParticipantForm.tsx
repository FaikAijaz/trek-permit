import { Pressable, Text, View } from 'react-native';
import { ParticipantInput } from '../api/applications';
import { FormField } from './FormField';
import { colors } from '../theme';

/** The fields shared by the trek leader and a group member — one form for
 * both, since backend/src/applications/dto/participant.dto.ts is one DTO
 * for both (BUILD_SPEC.md Section 4). `showGuide` is the one thing that
 * varies by caller: offered when adding a group member, not for a solo
 * leader (a leader who's also the trek's guide is a real but rare case
 * this form doesn't bother with — add it there directly if it comes up). */
export function ParticipantForm({
  value,
  onChange,
  showGuide = false,
}: {
  value: ParticipantInput;
  onChange: (patch: Partial<ParticipantInput>) => void;
  showGuide?: boolean;
}) {
  return (
    <View>
      <FormField
        label="Full name"
        value={value.fullName}
        onChangeText={(text) => onChange({ fullName: text })}
        placeholder="As on their ID"
      />
      <FormField
        label="Aadhaar number"
        value={value.identityNumber}
        onChangeText={(text) => onChange({ identityNumber: text.replace(/[^0-9]/g, '') })}
        keyboardType="number-pad"
        maxLength={12}
        placeholder="12-digit Aadhaar number"
      />
      <FormField
        label="Address"
        value={value.address ?? ''}
        onChangeText={(text) => onChange({ address: text })}
        multiline
        placeholder="Optional"
      />
      <FormField
        label="Mobile"
        value={value.mobile ?? ''}
        onChangeText={(text) => onChange({ mobile: text.replace(/[^0-9]/g, '') })}
        keyboardType="number-pad"
        placeholder="Optional"
      />
      <FormField
        label="Emergency contact name"
        value={value.emergencyContactName ?? ''}
        onChangeText={(text) => onChange({ emergencyContactName: text })}
      />
      <FormField
        label="Emergency contact mobile"
        value={value.emergencyContactMobile ?? ''}
        onChangeText={(text) =>
          onChange({ emergencyContactMobile: text.replace(/[^0-9]/g, '') })
        }
        keyboardType="number-pad"
      />

      <Checkbox
        checked={!!value.medicalDeclaration}
        onToggle={() => onChange({ medicalDeclaration: !value.medicalDeclaration })}
        label="I declare that they are medically fit for this trek"
      />

      {showGuide && (
        <>
          <Checkbox
            checked={!!value.isGuide}
            onToggle={() =>
              onChange({
                isGuide: !value.isGuide,
                guideRegistrationNo: value.isGuide ? undefined : value.guideRegistrationNo,
              })
            }
            label="This person is the trek's registered guide"
          />
          {value.isGuide && (
            <FormField
              label="Guide registration number"
              value={value.guideRegistrationNo ?? ''}
              onChangeText={(text) => onChange({ guideRegistrationNo: text })}
            />
          )}
        </>
      )}
    </View>
  );
}

function Checkbox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: colors.primary,
          backgroundColor: checked ? colors.primary : 'transparent',
          marginRight: 10,
        }}
      />
      <Text style={{ flex: 1, color: colors.text }}>{label}</Text>
    </Pressable>
  );
}
