import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Animated,
  Vibration,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import DocumentPicker, { types } from 'react-native-document-picker';
import { useCameraPermission } from '../hooks/useCameraPermission';
import { useMLKitOCR } from '../hooks/useMLKitOCR';
import { RootStackParamList } from '../types/navigation';
import { PermissionService } from '../services/permissions/PermissionService';
import { AppSettings, ScanMode } from '../services/storage/AppSettings';
import { colors } from '../theme/colors';
import { radii } from '../theme/spacing';
import { rs, ms, screen } from '../theme/responsive';
import { Icon } from '../components/common/Icon';

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>;

/**
 * CameraScreen — LedgerFlow Document Scanner
 * Uses react-native-image-picker for real camera capture + ML Kit OCR for extraction.
 */
export const CameraScreen: React.FC<Props> = ({ route, navigation }) => {
  const targetWorkbook = route.params?.targetWorkbook;
  const fileName = route.params?.fileName || 'Challans.xlsx';

  const { hasPermission, requestPermission } = useCameraPermission();
  const { scanImage, isProcessing } = useMLKitOCR();

  const [selectedMode, setSelectedMode] = useState<ScanMode>('DOCUMENT');
  const [isCapturing, setIsCapturing] = useState(false);
  const [alignedStatus, setAlignedStatus] = useState('Tap shutter to scan');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const shutterScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim, scanLineAnim]);

  useEffect(() => {
    AppSettings.load().then((s) => {
      if (s.defaultScanMode) {
        setSelectedMode(s.defaultScanMode);
      }
    });
  }, []);

  const executeScan = useCallback(async (uri: string) => {
    try {
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.75, duration: 60, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start();
      setIsCapturing(true);
      setAlignedStatus('Reading document...');
      const result = await scanImage(uri, selectedMode);
      setIsCapturing(false);
      setAlignedStatus('Tap shutter to scan');

      if (!result || Object.keys(result.fields).length === 0) {
        Alert.alert(
          'No Text Found',
          'Could not extract any data from this image. Try again with clearer lighting or a flatter document.',
          [{ text: 'Try Again' }]
        );
        return;
      }

      // Haptic confirmation when bill is detected
      AppSettings.get('vibrateOnScan').then((enabled) => {
        if (enabled ?? true) {
          try {
            Vibration.vibrate(80);
          } catch {
            // Ignore on platforms without vibrator
          }
        }
      });

      const fieldValues = Object.values(result.fields);
      if (fieldValues.length > 0 && fieldValues.every((f: any) => (f.confidence ?? 1) < 0.5)) {
        Alert.alert(
          'Low Quality Scan',
          'Scan quality is low. The image may be blurry or poorly lit. Would you like to try again?',
          [
            { text: 'Try Again' },
            { 
              text: 'Use Anyway', 
              onPress: () => {
                navigation.navigate('Review', {
                  extractionResult: result,
                  targetWorkbook,
                  fileName,
                });
              }
            }
          ]
        );
        return;
      }

      navigation.navigate('Review', {
        extractionResult: result,
        targetWorkbook,
        fileName,
      });
    } catch {
      setIsCapturing(false);
      setAlignedStatus('Tap shutter to scan');
      Alert.alert(
        'Scan Failed',
        'Could not read the document. Please try again with better lighting.',
        [{ text: 'Try Again' }]
      );
    }
  }, [scanImage, navigation, targetWorkbook, fileName, selectedMode]);

  const handlePickFromGallery = () => {
    Alert.alert(
      'Import Document Photo',
      'Choose how you want to select the document:',
      [
        {
          text: 'Browse Files & Downloads',
          onPress: async () => {
            try {
              let uriToScan: string | null = null;
              try {
                const res = await DocumentPicker.pickSingle({
                  type: [types.images],
                  copyTo: 'cachesDirectory',
                });
                uriToScan = res.fileCopyUri || res.uri;
              } catch (copyErr) {
                // Fallback without copyTo if copyTo fails on certain providers (e.g. Google Photos)
                const res = await DocumentPicker.pickSingle({
                  type: [types.images],
                });
                uriToScan = res.uri;
              }
              if (uriToScan) {
                await executeScan(uriToScan);
              }
            } catch (err: any) {
              if (!DocumentPicker.isCancel(err)) {
                Alert.alert(
                  'File Selection',
                  'Tip: Select the image directly from the "Downloads" or "Pictures" folder instead of Google Photos.'
                );
              }
            }
          },
        },
        {
          text: 'Photo Gallery',
          onPress: async () => {
            const hasStorage = await PermissionService.requestStoragePermission();
            if (!hasStorage) {
              PermissionService.showSettingsAlert('Photos');
              return;
            }

            try {
              launchImageLibrary({ mediaType: 'photo', quality: 0.9 }, async (response) => {
                if (response.didCancel) return;
                if (response.errorCode) {
                  Alert.alert('Gallery Error', response.errorMessage || 'Could not open gallery.');
                  return;
                }
                const uri = response.assets?.[0]?.uri;
                if (!uri) return;
                await executeScan(uri);
              });
            } catch {
              Alert.alert('Gallery Error', 'Could not open photo library.');
            }
          },
        },
        {
          text: 'Use Sample Challan (Demo)',
          onPress: async () => {
            await executeScan('sample_challan.jpg');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Request camera permission as soon as screen mounts
  useEffect(() => {
    (async () => {
      if (hasPermission === false) {
        Alert.alert(
          'Camera Permission Denied',
          'Camera permission was denied. You can still scan from your Gallery using the Import button.',
          [
            { text: 'Use Gallery', onPress: handlePickFromGallery },
            { text: 'Open Settings', onPress: () => PermissionService.showSettingsAlert('Camera') },
          ]
        );
      } else if (hasPermission === null) {
        const granted = await requestPermission();
        if (!granted) {
          Alert.alert(
            'Camera Permission Denied',
            'Camera permission was denied. You can still scan from your Gallery using the Import button.',
            [
              { text: 'Use Gallery', onPress: handlePickFromGallery },
              { text: 'Open Settings', onPress: () => PermissionService.showSettingsAlert('Camera') },
            ]
          );
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission]);

  useEffect(() => {
    AppSettings.get('keepScreenOn').then((keepOn) => {
      if (keepOn) {
        console.log('Keep screen on is enabled.');
      }
    }).catch(() => {});
  }, []);

  const handleShutterPress = async () => {
    if (isCapturing || isProcessing) return;

    // Ensure camera permission
    const permitted = hasPermission ?? (await requestPermission());
    if (!permitted) {
      PermissionService.showSettingsAlert('Camera');
      return;
    }

    try {
      launchCamera(
        {
          mediaType: 'photo',
          quality: 0.9,
          saveToPhotos: false,
          includeBase64: false,
          cameraType: 'back',
        },
        async (response) => {
          if (response.didCancel) {
            setAlignedStatus('Tap shutter to scan');
            return;
          }
          if (response.errorCode) {
            if (response.errorCode === 'camera_unavailable') {
              Alert.alert('Camera Error', 'Camera is not available on this device. Please use the Import button to pick a photo from your gallery.');
            } else {
              Alert.alert('Camera Error', response.errorMessage || 'Could not open camera.');
            }
            return;
          }
          const uri = response.assets?.[0]?.uri;
          if (!uri) return;
          await executeScan(uri);
        }
      );
    } catch (err) {
      Alert.alert('Camera Error', 'Could not open the camera. Please try the Import button instead.');
    }
  };


  // Responsive viewfinder reticle dimensions
  const RETICLE_WIDTH = Math.min(screen.width * 0.86, 340);
  const RETICLE_HEIGHT = RETICLE_WIDTH * 1.22;
  const BRACKET_SIZE = rs(26);
  const BRACKET_THICK = 3.5;
  const RETICLE_COLOR = colors.tertiaryFixed;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#191C1E" />
      <Animated.View style={[styles.flashOverlay, { opacity: flashAnim }]} pointerEvents="none" />

      {/* Top Header Controls */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="close" size={rs(22)} color="#EFF1F3" />
        </TouchableOpacity>

        {/* File Destination Chip */}
        <TouchableOpacity
          style={styles.destinationChip}
          onPress={() =>
            Alert.alert(
              'Saving to File',
              `Target file: ${fileName}\n\nAll scanned bills will be added to this spreadsheet.`
            )
          }
          activeOpacity={0.8}
        >
          <Icon name="table" size={rs(16)} color={colors.tertiaryFixed} />
          <Text style={styles.destinationText} numberOfLines={1}>
            {fileName}
          </Text>
        </TouchableOpacity>

        {/* Scanning Guidance */}
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() =>
            Alert.alert(
              'Scanning Guidance',
              '• Place your paper bill or challan on a flat, contrasting surface.\n• Ensure ample, even lighting.\n• Avoid heavy shadows and extreme glare.\n• Hold the phone steady and parallel to the paper for best OCR accuracy.'
            )
          }
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="info" size={rs(22)} color="#EFF1F3" />
        </TouchableOpacity>
      </View>

      {/* Viewfinder Area */}
      <View style={styles.viewfinder}>
        <View style={[styles.reticle, { width: RETICLE_WIDTH, height: RETICLE_HEIGHT }]}>
          {/* Corner brackets */}
          <View style={[styles.cornerBracket, { top: 0, left: 0, borderTopWidth: BRACKET_THICK, borderLeftWidth: BRACKET_THICK, borderColor: RETICLE_COLOR, width: BRACKET_SIZE, height: BRACKET_SIZE, borderTopLeftRadius: 6 }]} />
          <View style={[styles.cornerBracket, { top: 0, right: 0, borderTopWidth: BRACKET_THICK, borderRightWidth: BRACKET_THICK, borderColor: RETICLE_COLOR, width: BRACKET_SIZE, height: BRACKET_SIZE, borderTopRightRadius: 6 }]} />
          <View style={[styles.cornerBracket, { bottom: 0, left: 0, borderBottomWidth: BRACKET_THICK, borderLeftWidth: BRACKET_THICK, borderColor: RETICLE_COLOR, width: BRACKET_SIZE, height: BRACKET_SIZE, borderBottomLeftRadius: 6 }]} />
          <View style={[styles.cornerBracket, { bottom: 0, right: 0, borderBottomWidth: BRACKET_THICK, borderRightWidth: BRACKET_THICK, borderColor: RETICLE_COLOR, width: BRACKET_SIZE, height: BRACKET_SIZE, borderBottomRightRadius: 6 }]} />

          {/* Animated scanning laser beam */}
          <Animated.View
            style={[
              styles.scanLine,
              {
                transform: [
                  {
                    translateY: scanLineAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, RETICLE_HEIGHT - 20],
                    }),
                  },
                ],
                opacity: isCapturing ? 0.2 : 0.85,
              },
            ]}
          />

          {/* Status Pill */}
          <View style={styles.statusPill}>
            <Animated.View style={[styles.statusDot, { opacity: isCapturing ? 1 : pulseAnim }]} />
            <Text style={styles.statusPillText}>{isCapturing ? 'Reading document...' : alignedStatus}</Text>
          </View>
        </View>

        {/* Hint text */}
        {!isCapturing && (
          <Text style={styles.hintText}>
            Align document within frame and tap shutter to scan
          </Text>
        )}

        {/* Processing overlay */}
        {isCapturing && (
          <View style={styles.processingToast}>
            <ActivityIndicator size="small" color={colors.tertiaryFixed} />
            <Text style={styles.processingToastText}>Reading document...</Text>
          </View>
        )}
      </View>

      {/* Mode Selector */}
      <View style={styles.modeStrip}>
        {(['DOCUMENT', 'RECEIPT', 'BATCH'] as ScanMode[]).map((mode) => {
          const isSelected = selectedMode === mode;
          const modeLabel =
            mode === 'DOCUMENT'
              ? 'CHALLAN'
              : mode === 'RECEIPT'
              ? 'BILL / INVOICE'
              : 'BATCH MODE';

          return (
            <TouchableOpacity
              key={mode}
              style={[styles.modeTab, isSelected && styles.modeTabSelected]}
              onPress={() => {
                setSelectedMode(mode);
                if (mode === 'DOCUMENT') setAlignedStatus('Challan mode: Ready');
                else if (mode === 'RECEIPT') setAlignedStatus('Bill mode: Ready');
                else if (mode === 'BATCH') setAlignedStatus('Batch mode: Ready');
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeTabText, isSelected && styles.modeTabTextSelected]}>
                {modeLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControlsBar}>
        {/* Gallery Import */}
        <View style={styles.controlItem}>
          <TouchableOpacity
            style={styles.iconCircleBtn}
            onPress={handlePickFromGallery}
            activeOpacity={0.75}
            disabled={isCapturing}
          >
            <Icon name="gallery" size={rs(22)} color="#EFF1F3" />
          </TouchableOpacity>
          <Text style={styles.controlLabel}>Gallery</Text>
        </View>

        {/* Shutter Button with tactile spring feedback */}
        <Animated.View style={{ transform: [{ scale: shutterScaleAnim }] }}>
          <TouchableOpacity
            style={styles.shutterOuterRing}
            onPressIn={() => {
              Animated.spring(shutterScaleAnim, { toValue: 0.88, useNativeDriver: true }).start();
            }}
            onPressOut={() => {
              Animated.spring(shutterScaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
            }}
            onPress={handleShutterPress}
            activeOpacity={0.9}
            disabled={isCapturing}
          >
            <View style={styles.shutterInnerRing}>
              <View style={[styles.shutterCenterDisc, isCapturing && { backgroundColor: colors.tertiaryContainer }]} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Switch Mode Shortcut */}
        <View style={styles.controlItem}>
          <TouchableOpacity
            style={styles.iconCircleBtn}
            onPress={() => {
              const modes: ScanMode[] = ['DOCUMENT', 'RECEIPT', 'BATCH'];
              const nextIdx = (modes.indexOf(selectedMode) + 1) % modes.length;
              const nextMode = modes[nextIdx];
              setSelectedMode(nextMode);
              if (nextMode === 'DOCUMENT') setAlignedStatus('Challan mode: Ready');
              else if (nextMode === 'RECEIPT') setAlignedStatus('Bill mode: Ready');
              else if (nextMode === 'BATCH') setAlignedStatus('Batch mode: Ready');
            }}
            activeOpacity={0.75}
            disabled={isCapturing}
          >
            <Icon name="refresh" size={rs(20)} color="#EFF1F3" />
          </TouchableOpacity>
          <Text style={styles.controlLabel}>Mode</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#191C1E',
    justifyContent: 'space-between',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(16),
    backgroundColor: 'rgba(25, 28, 30, 0.92)',
    zIndex: 10,
  },
  headerBtn: {
    width: rs(44),
    height: rs(44),
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destinationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    maxWidth: rs(220),
    paddingHorizontal: rs(12),
    paddingVertical: rs(6),
    borderRadius: radii.full,
    backgroundColor: '#2D3133',
  },
  destinationText: {
    fontSize: ms(12),
    fontWeight: '600',
    color: '#EFF1F3',
  },
  viewfinder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#191C1E',
  },
  reticle: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cornerBracket: {
    position: 'absolute',
  },
  hintText: {
    position: 'absolute',
    bottom: rs(16),
    fontSize: ms(12),
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    paddingHorizontal: rs(24),
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    paddingHorizontal: rs(12),
    paddingVertical: rs(6),
    borderRadius: radii.full,
    backgroundColor: 'rgba(45, 49, 51, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusDot: {
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
    backgroundColor: colors.tertiaryFixed,
  },
  statusPillText: {
    fontSize: ms(12),
    fontWeight: '600',
    color: '#EFF1F3',
    letterSpacing: -0.1,
  },
  processingToast: {
    position: 'absolute',
    bottom: rs(48),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    paddingHorizontal: rs(16),
    paddingVertical: rs(10),
    borderRadius: radii.full,
    backgroundColor: '#2D3133',
    elevation: 6,
  },
  processingToastText: {
    fontSize: ms(13),
    fontWeight: '500',
    color: '#EFF1F3',
  },
  modeStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: rs(24),
    paddingVertical: rs(8),
    backgroundColor: '#191C1E',
  },
  modeTab: {
    paddingVertical: rs(4),
    paddingHorizontal: rs(6),
  },
  modeTabSelected: {
    borderBottomWidth: 2,
    borderBottomColor: colors.tertiaryFixed,
  },
  modeTabText: {
    fontSize: ms(12),
    fontWeight: '600',
    color: '#757684',
    letterSpacing: 0.4,
  },
  modeTabTextSelected: {
    color: colors.tertiaryFixed,
  },
  bottomControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: rs(24),
    paddingTop: rs(12),
    paddingBottom: rs(28),
    backgroundColor: '#191C1E',
  },
  controlItem: {
    alignItems: 'center',
    width: rs(60),
  },
  iconCircleBtn: {
    width: rs(48),
    height: rs(48),
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleBtnActive: {
    backgroundColor: 'rgba(133, 248, 196, 0.15)',
  },
  controlLabel: {
    fontSize: ms(11),
    color: '#EFF1F3',
    marginTop: rs(4),
  },
  shutterOuterRing: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(40),
    backgroundColor: '#FFFFFF',
    padding: rs(4),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  shutterInnerRing: {
    width: '100%',
    height: '100%',
    borderRadius: rs(36),
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#191C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterCenterDisc: {
    width: rs(54),
    height: rs(54),
    borderRadius: rs(27),
    backgroundColor: colors.primary,
  },
  scanLine: {
    position: 'absolute',
    left: rs(8),
    right: rs(8),
    height: 2.5,
    backgroundColor: '#85F8C4',
    shadowColor: '#85F8C4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 8,
    elevation: 6,
    borderRadius: 1,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 999,
  },
});
