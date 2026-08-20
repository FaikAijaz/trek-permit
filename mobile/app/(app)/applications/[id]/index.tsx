import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  fetchApplication,
  removeMember,
  submitApplication,
} from '../../../../src/api/applications';
import { fetchRoute } from '../../../../src/api/routes';
import { ApiError } from '../../../../src/api/client';
import { Application, DocumentType, Participant, TrekRoute } from '../../../../src/api/types';
import { Screen } from '../../../../src/components/Screen';
import { StatusBadge } from '../../../../src/components/StatusBadge';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { colors } from '../../../../src/theme';

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [route, setRoute] = useState<TrekRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitReasons, setSubmitReasons] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    try {
      setError(null);
      const app = await fetchApplication(id);
      setApplication(app);
      // The application response doesn't carry its route's required-documents
      // list (see backend/src/applications/applications.service.ts
      // findOneForUser) — fetched separately to build the upload checklist.
      setRoute(await fetchRoute(app.trekRouteId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this application');
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [id]),
  );

  async function handleSubmit() {
    setSubmitReasons([]);
    setError(null);
    setIsSubmitting(true);
    try {
      await submitApplication(id);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.reasons) {
        setSubmitReasons(err.reasons);
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function confirmRemove(member: Participant) {
    Alert.alert(
      'Remove member?',
      `${member.fullName} will be removed from this application.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setError(null);
            try {
              await removeMember(id, member.id);
              await load();
            } catch (err) {
              setError(err instanceof ApiError ? err.message : 'Could not remove this member');
            }
          },
        },
      ],
    );
  }

  if (!application || !route) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : <ActivityIndicator color={colors.primary} />}
        </View>
      </Screen>
    );
  }

  const isGroup = application.type === 'group';
  const permit = application.permits?.[0];
  // Same rule the backend enforces (getApplicationForDocumentUpload): a
  // draft can always be edited; once submitted, only a participant the
  // officer flagged CORRECTION_REQUESTED can still receive a new document.
  const canManage = application.status === 'draft';

  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
        {application.reference}
      </Text>
      <View style={{ marginTop: 8, marginBottom: 4 }}>
        <StatusBadge status={application.status} />
      </View>
      <Text style={{ color: colors.muted, marginTop: 8 }}>
        {application.startDate.slice(0, 10)} → {application.endDate.slice(0, 10)}
        {isGroup ? ` · ${application.groupType} group` : ''}
      </Text>
      {application.operatorName && (
        <Text style={{ color: colors.muted, marginTop: 2 }}>
          Operator: {application.operatorName} ({application.operatorRegistrationNo})
        </Text>
      )}

      {application.rejectionReason && (
        <View style={{ backgroundColor: `${colors.danger}15`, borderRadius: 8, padding: 12, marginTop: 16 }}>
          <Text style={{ color: colors.danger, fontWeight: '600' }}>Rejected</Text>
          <Text style={{ color: colors.text, marginTop: 4 }}>{application.rejectionReason}</Text>
        </View>
      )}

      {permit && (
        <View style={{ marginTop: 20 }}>
          <PrimaryButton
            label="View permit"
            onPress={() => router.push({ pathname: '/(app)/permits/[id]', params: { id: permit.id } })}
          />
        </View>
      )}

      <View style={{ marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
          {isGroup ? `Participants (${application.participants.length})` : 'Your details'}
        </Text>
        {isGroup && canManage && (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/(app)/applications/[id]/add-member', params: { id: application.id } })
            }
          >
            <Text style={{ color: colors.primary, fontWeight: '600' }}>+ Add member</Text>
          </Pressable>
        )}
      </View>

      {application.participants.map((participant) => (
        <ParticipantSection
          key={participant.id}
          applicationId={application.id}
          participant={participant}
          requiredDocuments={route.requiredDocuments}
          canManage={canManage}
          onRemove={() => confirmRemove(participant)}
        />
      ))}

      {submitReasons.length > 0 && (
        <View style={{ backgroundColor: `${colors.warning}15`, borderRadius: 8, padding: 12, marginTop: 16 }}>
          <Text style={{ color: colors.warning, fontWeight: '600', marginBottom: 4 }}>
            Not ready to submit yet
          </Text>
          {submitReasons.map((reason) => (
            <Text key={reason} style={{ color: colors.text }}>
              • {reason}
            </Text>
          ))}
        </View>
      )}
      {error && <Text style={{ color: colors.danger, marginTop: 12 }}>{error}</Text>}

      {application.status === 'draft' && (
        <View style={{ marginTop: 20 }}>
          <PrimaryButton label="Submit application" onPress={handleSubmit} loading={isSubmitting} />
        </View>
      )}
    </Screen>
  );
}

function ParticipantSection({
  applicationId,
  participant,
  requiredDocuments,
  canManage,
  onRemove,
}: {
  applicationId: string;
  participant: Participant;
  requiredDocuments: DocumentType[];
  canManage: boolean;
  onRemove: () => void;
}) {
  const currentDocTypes = new Set(
    participant.documents.filter((d) => d.isCurrent).map((d) => d.documentType),
  );
  // Only submission is leader-gated (BUILD_SPEC.md Section 2, #5 — members
  // can stay incomplete past submission); document upload follows the same
  // draft-or-correction rule for every participant alike.
  const canUploadDocuments = canManage || participant.status === 'CORRECTION_REQUESTED';

  return (
    <View
      style={{
        marginTop: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            {participant.fullName}
          </Text>
          {participant.isLeader && (
            <View
              style={{
                marginLeft: 8,
                backgroundColor: colors.surface,
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted }}>LEADER</Text>
            </View>
          )}
        </View>
        <StatusBadge status={participant.status} />
      </View>

      {participant.officerRemark && (
        <Text style={{ color: colors.text, marginTop: 6, fontSize: 13 }}>
          Officer's note: {participant.officerRemark}
        </Text>
      )}

      <View style={{ marginTop: 10 }}>
        {requiredDocuments.map((docType) => (
          <DocumentRow
            key={docType}
            documentType={docType}
            isUploaded={currentDocTypes.has(docType)}
            canUpload={canUploadDocuments}
            onPress={() =>
              router.push({
                pathname: '/(app)/applications/[id]/upload',
                params: { id: applicationId, participantId: participant.id, documentType: docType },
              })
            }
          />
        ))}
      </View>

      {canManage && !participant.isLeader && (
        <Pressable onPress={onRemove} style={{ marginTop: 10, alignSelf: 'flex-start' }}>
          <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '600' }}>
            Remove from group
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function DocumentRow({
  documentType,
  isUploaded,
  canUpload,
  onPress,
}: {
  documentType: DocumentType;
  isUploaded: boolean;
  canUpload: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!canUpload}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        opacity: canUpload ? 1 : 0.6,
      }}
    >
      <Text style={{ color: colors.text, textTransform: 'capitalize' }}>
        {documentType.replace(/_/g, ' ')}
      </Text>
      <Text style={{ color: isUploaded ? colors.primary : colors.muted, fontWeight: '600' }}>
        {isUploaded ? '✓ Uploaded' : canUpload ? 'Upload' : 'Not editable'}
      </Text>
    </Pressable>
  );
}
