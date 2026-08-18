import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { colors } from '../../../src/theme';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  // Guards against onBarcodeScanned firing again for the same frame while
  // navigation to the result screen is still in flight.
  const [isNavigating, setIsNavigating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsNavigating(false);
    }, []),
  );

  function handleScan({ data }: { data: string }) {
    if (isNavigating) return;
    setIsNavigating(true);
    router.push({ pathname: '/(officer)/result', params: { qrPayload: data } });
  }

  if (!permission) {
    return <SafeAreaView style={styles.safeArea} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.permissionPrompt}>
          <Text style={styles.permissionText}>
            Camera access is needed to scan permit QR codes at the checkpoint.
          </Text>
          <PrimaryButton label="Grant camera access" onPress={requestPermission} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={isNavigating ? undefined : handleScan}
      />
      <View style={styles.hint}>
        <Text style={styles.hintText}>Point the camera at the permit QR code</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  permissionPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  permissionText: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  hint: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  hintText: { color: '#fff', fontSize: 13 },
});
