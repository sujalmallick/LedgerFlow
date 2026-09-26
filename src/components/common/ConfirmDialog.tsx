import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radii, shadows, spacing, typography } from '../../theme/spacing';
import { Button } from './Button';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.dialog}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <View style={styles.actionRow}>
                <Button
                  label={cancelLabel}
                  variant="ghost"
                  onPress={onCancel}
                  style={styles.actionButton}
                />
                <Button
                  label={confirmLabel}
                  variant={isDestructive ? 'danger' : 'primary'}
                  onPress={onConfirm}
                  style={styles.actionButton}
                />
              </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.xl,
    ...shadows.modal,
  },
  title: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  actionButton: {
    minHeight: 44,
    paddingHorizontal: spacing.base,
  },
});
