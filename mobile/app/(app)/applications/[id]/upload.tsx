import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { uploadDocument, PickedFile } from '../../../../src/api/documents';
import { ApiError } from '../../../../src/api/client';
import { DocumentType } from '../../../../src/api/types';
import { Screen } from '../../../../src/components/Screen';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { colors } from '../../../../src/theme';

function extensionFor(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/png') return 'png';
  return 'jpg';
}

export default function UploadDocumentScreen() {
  const { id, participantId, documentType } = useLocalSearchParams<{
    id: string;
    participantId: string;
    documentType: DocumentType;
  }>();

  const [selected, setSelected] = useState<PickedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function pickFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    applyImagePickerResult(result);
  }

  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
    applyImagePickerResult(result);
  }

  function applyImagePickerResult(result: ImagePicker.ImagePickerResult) {
    if (result.canceled) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    setError(null);
    setSelected({
      uri: asset.uri,
      name: asset.fileName ?? `${documentType}.${extensionFor(mimeType)}`,
      mimeType,
    });
  }

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setError(null);
    setSelected({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/pdf',
    });
  }

  async function handleUpload() {
    if (!selected) return;
    setError(null);
    setIsUploading(true);
    try {
      await uploadDocument(id, participantId, documentType, selected);
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Screen>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
        {documentType.replace(/_/g, ' ')}
      </Text>
      <Text style={{ color: colors.muted, marginBottom: 24 }}>
        Accepted: PDF, JPEG, or PNG, up to 10 MB.
      </Text>

      <View style={{ gap: 12, marginBottom: 24 }}>
        <PrimaryButton label="Take a photo" onPress={pickFromCamera} />
        <PrimaryButton label="Choose from gallery" onPress={pickFromGallery} />
        <PrimaryButton label="Choose a PDF" onPress={pickPdf} />
      </View>

      {selected && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <Text style={{ color: colors.text }}>Selected: {selected.name}</Text>
        </View>
      )}

      {error && <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>}

      <PrimaryButton
        label="Upload"
        onPress={handleUpload}
        disabled={!selected}
        loading={isUploading}
      />
    </Screen>
  );
}
