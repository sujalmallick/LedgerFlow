import { ViewStyle, TextStyle } from 'react-native';
import { ms } from './responsive';

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
};

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  button: 12,
  card: 16,
  sheet: 24,
  full: 9999,
};

export const touchTarget = {
  minHeight: 48,
  minWidth: 48,
};

export const shadows = {
  xs: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  } as ViewStyle,
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  } as ViewStyle,
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 8,
  } as ViewStyle,
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  } as ViewStyle,
  floating: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  } as ViewStyle,
  modal: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  } as ViewStyle,
};

/**
 * Responsive typography scale.
 * ms() applies moderate scaling so text adapts naturally to all screen sizes
 * without becoming excessively large on tablets or unreadably small on small phones.
 */
export const typography = {
  titleLarge: {
    fontSize: ms(22),
    fontWeight: '700',
    lineHeight: ms(28),
    letterSpacing: -0.3,
  } as TextStyle,
  titleMedium: {
    fontSize: ms(18),
    fontWeight: '700',
    lineHeight: ms(24),
    letterSpacing: -0.2,
  } as TextStyle,
  titleSmall: {
    fontSize: ms(15),
    fontWeight: '600',
    lineHeight: ms(20),
  } as TextStyle,
  bodyLarge: {
    fontSize: ms(15),
    fontWeight: '400',
    lineHeight: ms(22),
  } as TextStyle,
  bodyMedium: {
    fontSize: ms(13),
    fontWeight: '400',
    lineHeight: ms(18),
  } as TextStyle,
  bodySmall: {
    fontSize: ms(12),
    fontWeight: '400',
    lineHeight: ms(16),
  } as TextStyle,
  labelLarge: {
    fontSize: ms(14),
    fontWeight: '600',
    lineHeight: ms(18),
  } as TextStyle,
  labelMedium: {
    fontSize: ms(12),
    fontWeight: '600',
    lineHeight: ms(16),
  } as TextStyle,
  labelSmall: {
    fontSize: ms(11),
    fontWeight: '600',
    lineHeight: ms(14),
  } as TextStyle,
};
