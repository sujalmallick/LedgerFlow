import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radii, shadows, spacing, typography } from '../../theme/spacing';
import { Icon } from './Icon';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  contentStyle,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheetContainer, contentStyle]}>
              {/* Drag Handle */}
              <View style={styles.dragHandleContainer}>
                <View style={styles.dragHandle} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>{title}</Text>
                  {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Icon name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <View style={styles.body}>{children}</View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    maxHeight: '85%',
    ...shadows.modal,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  titleContainer: {
    flex: 1,
    paddingRight: spacing.base,
  },
  title: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    paddingTop: spacing.base,
  },
});
