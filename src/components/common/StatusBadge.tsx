import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { radii, spacing, typography } from '../../theme/spacing';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral' | 'info';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  showDot?: boolean;
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  showDot = false,
  style,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: colors.successSurface,
          border: colors.successBorder,
          text: colors.successText,
          dot: colors.success,
        };
      case 'warning':
        return {
          bg: colors.warningSurface,
          border: colors.warningBorder,
          text: colors.warningText,
          dot: colors.warning,
        };
      case 'error':
        return {
          bg: colors.errorSurface,
          border: colors.errorBorder,
          text: colors.errorText,
          dot: colors.error,
        };
      case 'info':
        return {
          bg: colors.primarySurface,
          border: colors.primaryBorder,
          text: colors.primary,
          dot: colors.primaryLight,
        };
      case 'neutral':
      default:
        return {
          bg: colors.surfaceMuted,
          border: colors.border,
          text: colors.textSecondary,
          dot: colors.textMuted,
        };
    }
  };

  const scheme = getColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: scheme.bg, borderColor: scheme.border },
        style,
      ]}
    >
      {showDot && (
        <View style={[styles.dot, { backgroundColor: scheme.dot }]} />
      )}
      <Text style={[styles.label, { color: scheme.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  label: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
});
