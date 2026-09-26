import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radii, shadows, spacing } from '../../theme/spacing';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'primary';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: CardVariant;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  variant = 'default',
  style,
}) => {
  const isPrimary = variant === 'primary';
  const isElevated = variant === 'elevated';
  const isOutlined = variant === 'outlined';

  const containerStyles: ViewStyle[] = [styles.card];
  if (isElevated) containerStyles.push(styles.cardElevated);
  if (isOutlined) containerStyles.push(styles.cardOutlined);
  if (isPrimary) containerStyles.push(styles.cardPrimary);
  if (style) containerStyles.push(style);

  if (onPress) {
    return (
      <TouchableOpacity
        style={containerStyles}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardElevated: {
    ...shadows.floating,
    borderColor: 'transparent',
  },
  cardOutlined: {
    backgroundColor: colors.surface,
    borderColor: colors.borderDark,
    shadowOpacity: 0,
    elevation: 0,
  },
  cardPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    ...shadows.floating,
  },
});
