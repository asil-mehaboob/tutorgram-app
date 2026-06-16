import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1C1D1F',
    textSecondary: '#6A6F73',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceEl: '#F7F9FA',
    border: '#D1D7DC',
    primary: '#2849EA',
    primaryDark: '#1E3BD4',
    primaryLight: '#EEF1FD',
    primaryForeground: '#FFFFFF',
    error: '#D32F2F',
    star: '#E59819',
    success: '#1E6B1E',
    bestseller: '#EC7211',
    bestsellerLight: '#FFF3E0',
  },
  dark: {
    text: '#F7F9FA',
    textSecondary: '#9E9E9E',
    background: '#1C1D1F',
    surface: '#2D2F31',
    surfaceEl: '#3E4143',
    border: '#3E4143',
    primary: '#5470F0',
    primaryDark: '#2849EA',
    primaryLight: '#1A2660',
    primaryForeground: '#FFFFFF',
    error: '#EF5350',
    star: '#F5AE00',
    success: '#4ADE80',
    bestseller: '#EC7211',
    bestsellerLight: '#3D1F00',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semiBold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  extraBold: 'PlusJakartaSans-ExtraBold',
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }) ?? 'monospace',
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export const Shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.09,
      shadowRadius: 10,
    },
    android: { elevation: 3 },
    default: {},
  }) ?? {},
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    android: { elevation: 1 },
    default: {},
  }) ?? {},
} as const;
