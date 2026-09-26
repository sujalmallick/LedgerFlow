import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types/navigation';
import { AppSettings } from '../services/storage/AppSettings';
import { colors } from '../theme/colors';
import { radii } from '../theme/spacing';
import { rs, ms } from '../theme/responsive';
import { Icon } from '../components/common/Icon';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

interface SettingRowProps {
  icon: string;
  iconColor: string;
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}

const ToggleRow: React.FC<SettingRowProps> = ({ icon, iconColor, label, description, value, onToggle }) => (
  <View style={styles.settingRow}>
    <View style={[styles.settingIconBox, { backgroundColor: iconColor + '18' }]}>
      <Icon name={icon} size={rs(18)} color={iconColor} />
    </View>
    <View style={styles.settingTextCol}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingDesc}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: colors.border, true: colors.primary + '88' }}
      thumbColor={value ? colors.primary : '#f4f3f4'}
    />
  </View>
);

interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value }) => (
  <View style={styles.settingRow}>
    <View style={[styles.settingIconBox, { backgroundColor: colors.textMuted + '18' }]}>
      <Icon name={icon} size={rs(18)} color={colors.textSecondary} />
    </View>
    <View style={styles.settingTextCol}>
      <Text style={styles.settingLabel}>{label}</Text>
    </View>
    <Text style={styles.settingValueText}>{value}</Text>
  </View>
);

interface ActionRowProps {
  icon: string;
  iconColor: string;
  label: string;
  description?: string;
  onPress: () => void;
  destructive?: boolean;
}

const ActionRow: React.FC<ActionRowProps> = ({ icon, iconColor, label, description, onPress, destructive }) => (
  <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.settingIconBox, { backgroundColor: iconColor + '18' }]}>
      <Icon name={icon} size={rs(18)} color={destructive ? colors.error : iconColor} />
    </View>
    <View style={styles.settingTextCol}>
      <Text style={[styles.settingLabel, destructive && { color: colors.error }]}>{label}</Text>
      {description ? <Text style={styles.settingDesc}>{description}</Text> : null}
    </View>
    <Icon name="arrow-forward" size={rs(16)} color={colors.textMuted} />
  </TouchableOpacity>
);

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [vibrateOnScan, setVibrateOnScan] = useState(true);
  const [confirmBeforeAdd, setConfirmBeforeAdd] = useState(true);
  const [currency, setCurrency] = useState('₹ INR');
  const [defaultScanMode, setDefaultScanMode] = useState<string>('DOCUMENT');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AppSettings.load().then((s) => {
      setVibrateOnScan(s.vibrateOnScan ?? true);
      setConfirmBeforeAdd(s.confirmBeforeAdd ?? true);
      setCurrency(s.currency || '₹ INR');
      setDefaultScanMode(s.defaultScanMode || 'DOCUMENT');
      setLoading(false);
    });
  }, []);

  const handleSelectCurrency = () => {
    Alert.alert(
      'Select Default Currency',
      'Choose the currency symbol for amount fields in newly created sheets.',
      [
        { text: '₹ INR (Rupees)', onPress: async () => { setCurrency('₹ INR'); await AppSettings.save({ currency: '₹ INR' }); } },
        { text: '$ USD (Dollars)', onPress: async () => { setCurrency('$ USD'); await AppSettings.save({ currency: '$ USD' }); } },
        { text: '€ EUR (Euros)', onPress: async () => { setCurrency('€ EUR'); await AppSettings.save({ currency: '€ EUR' }); } },
        { text: '£ GBP (Pounds)', onPress: async () => { setCurrency('£ GBP'); await AppSettings.save({ currency: '£ GBP' }); } },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSelectScanMode = () => {
    Alert.alert(
      'Default Scan Mode',
      'Select the default mode opened when scanning a document.',
      [
        { text: 'Challan & Delivery', onPress: async () => { setDefaultScanMode('DOCUMENT'); await AppSettings.save({ defaultScanMode: 'DOCUMENT' }); } },
        { text: 'Bill & Invoice', onPress: async () => { setDefaultScanMode('RECEIPT'); await AppSettings.save({ defaultScanMode: 'RECEIPT' }); } },
        { text: 'Quick Batch Mode', onPress: async () => { setDefaultScanMode('BATCH'); await AppSettings.save({ defaultScanMode: 'BATCH' }); } },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Restore all settings to their defaults? Your files and data will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await AppSettings.reset();
            const defaults = await AppSettings.load();
            setVibrateOnScan(defaults.vibrateOnScan);
            setConfirmBeforeAdd(defaults.confirmBeforeAdd);
            setCurrency(defaults.currency);
            setDefaultScanMode(defaults.defaultScanMode);
            Alert.alert('Done', 'Settings have been reset to defaults.');
          },
        },
      ]
    );
  };

  if (loading) return <View style={styles.container} />;

  const scanModeDisplay =
    defaultScanMode === 'RECEIPT'
      ? 'Bill & Invoice'
      : defaultScanMode === 'BATCH'
      ? 'Quick Batch'
      : 'Challan & Delivery';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-back" size={rs(22)} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: rs(44) }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + rs(32) }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── SCANNING & CAPTURE ── */}
        <Text style={styles.sectionLabel}>SCANNING & CAPTURE</Text>
        <View style={styles.card}>
          <ToggleRow
            icon="vibration"
            iconColor={colors.secondary}
            label="Vibrate on Scan"
            description="Vibrate briefly when document is detected and read"
            value={vibrateOnScan}
            onToggle={async (v) => {
              setVibrateOnScan(v);
              await AppSettings.save({ vibrateOnScan: v });
            }}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="check"
            iconColor={colors.success}
            label="Confirm before adding to sheet"
            description="Show the Review screen to verify fields before saving to Excel"
            value={confirmBeforeAdd}
            onToggle={async (v) => {
              setConfirmBeforeAdd(v);
              await AppSettings.save({ confirmBeforeAdd: v });
            }}
          />
        </View>

        {/* ── DEFAULTS ── */}
        <Text style={styles.sectionLabel}>DEFAULTS</Text>
        <View style={styles.card}>
          <ActionRow
            icon="currency-rupee"
            iconColor={colors.primary}
            label="Default Currency"
            description={currency}
            onPress={handleSelectCurrency}
          />
          <View style={styles.divider} />
          <ActionRow
            icon="camera"
            iconColor={colors.secondary}
            label="Default Scan Mode"
            description={scanModeDisplay}
            onPress={handleSelectScanMode}
          />
          <View style={styles.divider} />
          <InfoRow icon="info" label="App Version" value="1.0.0" />
        </View>

        {/* ── PRIVACY & DATA ── */}
        <Text style={styles.sectionLabel}>PRIVACY & DATA</Text>
        <View style={styles.card}>
          <View style={styles.offlineBanner}>
            <Icon name="lock" size={rs(18)} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.offlineBannerTitle}>100% Offline</Text>
              <Text style={styles.offlineBannerDesc}>
                LedgerFlow never connects to the internet. All OCR, data extraction,
                and file storage happens entirely on your device. No accounts, no cloud.
              </Text>
            </View>
          </View>
        </View>

        {/* ── SUPPORT ── */}
        <Text style={styles.sectionLabel}>SUPPORT</Text>
        <View style={styles.card}>
          <ActionRow
            icon="info"
            iconColor={colors.primary}
            label="How to Use"
            description="Step-by-step guide to scanning challans"
            onPress={() => navigation.navigate('HowToUse')}
          />
          <View style={styles.divider} />
          <ActionRow
            icon="settings"
            iconColor={colors.textSecondary}
            label="App Permissions"
            description="Manage camera and storage access"
            onPress={() => Linking.openSettings()}
          />
        </View>

        {/* ── DANGER ZONE ── */}
        <Text style={styles.sectionLabel}>RESET</Text>
        <View style={styles.card}>
          <ActionRow
            icon="refresh"
            iconColor={colors.error}
            label="Reset All Settings"
            description="Restore defaults — your files won't be deleted"
            onPress={handleResetSettings}
            destructive
          />
        </View>

        <View style={{ height: rs(32) }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(8),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: rs(44),
    height: rs(44),
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: ms(17),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scroll: {
    paddingHorizontal: rs(16),
    paddingTop: rs(20),
  },
  sectionLabel: {
    fontSize: ms(11),
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: rs(8),
    marginTop: rs(4),
    paddingHorizontal: rs(4),
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    marginBottom: rs(20),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(16),
    paddingVertical: rs(13),
    gap: rs(12),
  },
  settingIconBox: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTextCol: {
    flex: 1,
  },
  settingLabel: {
    fontSize: ms(14),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  settingDesc: {
    fontSize: ms(12),
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: ms(17),
  },
  settingValueText: {
    fontSize: ms(13),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: rs(64),
  },
  offlineBanner: {
    flexDirection: 'row',
    gap: rs(12),
    padding: rs(16),
    alignItems: 'flex-start',
  },
  offlineBannerTitle: {
    fontSize: ms(14),
    fontWeight: '700',
    color: colors.success,
    marginBottom: 4,
  },
  offlineBannerDesc: {
    fontSize: ms(13),
    color: colors.textSecondary,
    lineHeight: ms(19),
  },
});
