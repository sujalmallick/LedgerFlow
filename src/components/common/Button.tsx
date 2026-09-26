import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radii, touchTarget, typography } from '../../theme/spacing';
import { Icon, IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'danger' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'normal' | 'large' | 'small';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
  size = 'normal',
  fullWidth = false,
}) => {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isTonal = variant === 'tonal';
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';

  const getContainerStyle = (): ViewStyle[] => {
    const list: ViewStyle[] = [styles.base];

    if (fullWidth) list.push(styles.fullWidthContainer);
    if (size === 'large') list.push(styles.sizeLarge);
    if (size === 'small') list.push(styles.sizeSmall);

    if (isPrimary) list.push(styles.primaryContainer);
    if (isSecondary) list.push(styles.secondaryContainer);
    if (isTonal) list.push(styles.tonalContainer);
    if (isDanger) list.push(styles.dangerContainer);
    if (isGhost) list.push(styles.ghostContainer);

    if (disabled || loading) list.push(styles.disabledContainer);
    if (style) list.push(style);

    return list;
  };

  const getTextColor = (): string => {
    if (disabled) return colors.textMuted;
    if (isPrimary) return colors.textInverse;
    if (isDanger) return colors.textInverse;
    if (isSecondary) return colors.primary;
    if (isTonal) return colors.primary;
    if (isGhost) return colors.textSecondary;
    return colors.textPrimary;
  };

  const textColor = getTextColor();

  return (
    <TouchableOpacity
      style={getContainerStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary || isDanger ? colors.textInverse : colors.primary}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <Icon name={icon} size={18} color={textColor} style={styles.iconLeft} />
          )}
          <Text style={[styles.label, { color: textColor }, textStyle]}>
            {label}
          </Text>
          {icon && iconPosition === 'right' && (
            <Icon name={icon} size={18} color={textColor} style={styles.iconRight} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.button,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  sizeLarge: {
    minHeight: 52,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  sizeSmall: {
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  label: {
    ...typography.labelLarge,
    textAlign: 'center',
  },
  primaryContainer: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  secondaryContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderDark,
  },
  tonalContainer: {
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  dangerContainer: {
    backgroundColor: colors.error,
    borderWidth: 1,
    borderColor: colors.errorText,
  },
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  disabledContainer: {
    opacity: 0.5,
  },
  fullWidthContainer: {
    alignSelf: 'stretch',
  },
});
