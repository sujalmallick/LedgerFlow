import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme/colors';
import { radii } from '../theme/spacing';
import { rs, ms } from '../theme/responsive';
import { Icon } from '../components/common/Icon';

type Props = NativeStackScreenProps<RootStackParamList, 'HowToUse'>;

interface Step {
  number: string;
  title: string;
  body: string;
  icon: string;
  iconColor: string;
}

const STEPS: Step[] = [
  {
    number: '1',
    title: 'Open or Create a Spreadsheet',
    body: 'On the home screen, tap "New Workbook" to start a fresh Excel sheet, or tap "Open Excel File" to load an existing .xlsx file from your phone storage.\n\nYou can also tap "Try Sample File" to see how the app works with demo data.',
    icon: 'document',
    iconColor: colors.primary,
  },
  {
    number: '2',
    title: 'Scan a Challan or Bill',
    body: 'Tap the big "Scan a Bill" button on the home screen, or tap "Scan Challan" inside a workbook.\n\nLay the paper flat under good light. The camera will open — point it at the challan and tap the round shutter button.\n\nYou can also tap "Import" to pick a photo from your gallery instead.',
    icon: 'camera',
    iconColor: '#E91E63',
  },
  {
    number: '3',
    title: 'Check the Extracted Details',
    body: 'After scanning, the app reads the text from the image automatically — no internet needed.\n\nYou will see a Review screen showing all the fields it found: challan number, vehicle number, date, amount, driver name, etc.\n\nEach field shows a confidence score. Fields in green are reliable. Fields in orange should be double-checked.\n\nTap any field to edit it if something was read incorrectly.',
    icon: 'check',
    iconColor: colors.success,
  },
  {
    number: '4',
    title: 'Add to Your Excel Sheet',
    body: 'Once the fields look correct, tap "Add to Excel Sheet".\n\nThe data is added as a new row in your spreadsheet, with each value going into the right column automatically.\n\nThe file is saved to your phone immediately — no extra steps needed.',
    icon: 'table',
    iconColor: colors.secondary,
  },
  {
    number: '5',
    title: 'View and Edit Your Sheet',
    body: 'Tap "View in Sheet" to jump directly to the new row in your spreadsheet.\n\nInside the workbook you can:\n• Tap any cell to edit it\n• Add or delete rows and columns\n• Rename or reorder columns\n• Sort by any column\n• Undo or redo changes',
    icon: 'edit',
    iconColor: '#9C27B0',
  },
  {
    number: '6',
    title: 'Export or Share Your File',
    body: 'When you are done, tap the share icon in the workbook to send your .xlsx file via WhatsApp, email, or any other app.\n\nYou can also export as CSV if needed.\n\nAll files stay on your phone — nothing goes to the internet.',
    icon: 'share',
    iconColor: '#FF9800',
  },
];

const TIPS = [
  { icon: 'info', tip: 'Use bright, even light — shadows make text hard to read.' },
  { icon: 'info', tip: 'Hold the phone steady and parallel to the paper, not at an angle.' },
  { icon: 'info', tip: 'Make sure all 4 corners of the challan are inside the frame.' },
  { icon: 'info', tip: 'If a field is wrong, just tap it on the Review screen to fix it.' },
  { icon: 'info', tip: 'Use "Batch" mode on the camera to scan multiple pages in a row.' },
];

export const HowToUseScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [expandedStep, setExpandedStep] = useState<string | null>('1');

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
        <Text style={styles.headerTitle}>How to Use</Text>
        <View style={{ width: rs(44) }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + rs(32) }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Intro card */}
        <View style={styles.introCard}>
          <Icon name="camera" size={rs(28)} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Scan any paper bill or challan</Text>
            <Text style={styles.introDesc}>
              LedgerFlow reads the text from your paper documents and puts the data straight into an Excel sheet — all offline, on your phone.
            </Text>
          </View>
        </View>

        {/* Steps */}
        <Text style={styles.sectionLabel}>STEP BY STEP</Text>

        {STEPS.map((step) => {
          const isOpen = expandedStep === step.number;
          return (
            <TouchableOpacity
              key={step.number}
              style={styles.stepCard}
              onPress={() => setExpandedStep(isOpen ? null : step.number)}
              activeOpacity={0.85}
            >
              <View style={styles.stepHeader}>
                <View style={[styles.stepIconBox, { backgroundColor: step.iconColor + '18' }]}>
                  <Icon name={step.icon} size={rs(20)} color={step.iconColor} />
                </View>
                <View style={styles.stepHeaderText}>
                  <Text style={styles.stepNumber}>Step {step.number}</Text>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                </View>
                <Icon
                  name={isOpen ? 'expand-less' : 'expand-more'}
                  size={rs(20)}
                  color={colors.textMuted}
                />
              </View>

              {isOpen && (
                <View style={styles.stepBody}>
                  <View style={styles.stepDivider} />
                  <Text style={styles.stepBodyText}>{step.body}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Tips */}
        <Text style={styles.sectionLabel}>TIPS FOR BEST RESULTS</Text>
        <View style={styles.tipsCard}>
          {TIPS.map((t, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{t.tip}</Text>
            </View>
          ))}
        </View>

        {/* Bottom CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.85}
        >
          <Icon name="camera" size={rs(18)} color="#FFFFFF" />
          <Text style={styles.ctaBtnText}>Got it — Start Scanning</Text>
        </TouchableOpacity>

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
  introCard: {
    flexDirection: 'row',
    gap: rs(14),
    backgroundColor: colors.primary + '10',
    borderRadius: radii.lg,
    padding: rs(16),
    marginBottom: rs(24),
    borderWidth: 1,
    borderColor: colors.primary + '30',
    alignItems: 'flex-start',
  },
  introTitle: {
    fontSize: ms(15),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  introDesc: {
    fontSize: ms(13),
    color: colors.textSecondary,
    lineHeight: ms(19),
  },
  sectionLabel: {
    fontSize: ms(11),
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: rs(10),
    paddingHorizontal: rs(4),
  },
  stepCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    marginBottom: rs(10),
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: rs(14),
    gap: rs(12),
  },
  stepIconBox: {
    width: rs(42),
    height: rs(42),
    borderRadius: rs(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepHeaderText: {
    flex: 1,
  },
  stepNumber: {
    fontSize: ms(11),
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 2,
  },
  stepTitle: {
    fontSize: ms(14),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stepBody: {
    paddingHorizontal: rs(14),
    paddingBottom: rs(14),
  },
  stepDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: rs(12),
  },
  stepBodyText: {
    fontSize: ms(13),
    color: colors.textSecondary,
    lineHeight: ms(21),
  },
  tipsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: rs(16),
    marginBottom: rs(24),
    borderWidth: 1,
    borderColor: colors.border,
    gap: rs(12),
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(10),
  },
  tipDot: {
    width: rs(7),
    height: rs(7),
    borderRadius: rs(4),
    backgroundColor: colors.primary,
    marginTop: rs(6),
  },
  tipText: {
    flex: 1,
    fontSize: ms(13),
    color: colors.textSecondary,
    lineHeight: ms(20),
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(10),
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: rs(16),
    marginBottom: rs(8),
  },
  ctaBtnText: {
    fontSize: ms(15),
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
