import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base design reference (standard Android phone width: 375px)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Responsive scaling based on screen width.
 * Scales any px value proportionally relative to 375px base.
 */
export const rs = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Vertical responsive scaling based on screen height.
 */
export const vs = (size: number): number => {
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Moderately responsive scaling — less aggressive than rs().
 * Useful for font sizes where you don't want extreme scaling.
 * Formula: 50% device-based + 50% static.
 */
export const ms = (size: number, factor = 0.5): number => {
  return Math.round(size + (rs(size) - size) * factor);
};

/**
 * Returns a width value as a percentage of the screen width.
 */
export const wp = (percent: number): number => {
  return (SCREEN_WIDTH * percent) / 100;
};

/**
 * Returns a height value as a percentage of the screen height.
 */
export const hp = (percent: number): number => {
  return (SCREEN_HEIGHT * percent) / 100;
};

/**
 * Screen size category — for conditional layout decisions.
 */
export type ScreenSize = 'small' | 'medium' | 'large' | 'xlarge';

export const getScreenSize = (): ScreenSize => {
  if (SCREEN_WIDTH < 360) return 'small';    // Galaxy A series, older Moto phones
  if (SCREEN_WIDTH < 414) return 'medium';   // Pixel 4, Samsung S20
  if (SCREEN_WIDTH < 480) return 'large';    // iPhone Pro Max, Samsung S23 Ultra
  return 'xlarge';                           // Tablets, large-screen foldables
};

export const screenSize = getScreenSize();

export const isSmallPhone = SCREEN_WIDTH < 360;
export const isTablet = SCREEN_WIDTH >= 600;

/**
 * Screen dimensions (refreshed once on module load).
 * Use Dimensions.addEventListener for live updates if orientation changes are needed.
 */
export const screen = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
};

/**
 * Responsive padding for the horizontal page gutter.
 * Scales smoothly from small phones to large phones.
 */
export const gutter = (): number => {
  if (SCREEN_WIDTH < 360) return 12;
  if (SCREEN_WIDTH < 414) return 16;
  return 20;
};

/**
 * Responsive vertical spacing — slightly compressed on small screens.
 */
export const vgutter = (): number => {
  if (SCREEN_HEIGHT < 680) return 12;
  if (SCREEN_HEIGHT < 812) return 16;
  return 20;
};
