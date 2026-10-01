/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const WattPrintTokens = {
  colors: {
    primary: '#164437', // MSU Green
    onPrimary: '#FFFFFF',
    primaryContainer: '#EFF4E6', // Unit switch chip & suggestion surface
    onPrimaryContainer: '#2C5145',
    secondary: '#4A6B60', // Slate green (metadata, units, axis ticks)
    tertiary: '#B5E930', // Green Lizard (dominant figure, key action)
    onTertiary: '#164437',
    tertiaryContainer: '#DEEEBD',
    onTertiaryContainer: '#1E5A08',
    accentDeep: '#2F7A0C', // Accessible accent for small text on white
    neutral: '#FFFFFF',
    neutralGround: '#F2F4ED', // Tinted container ground
    neutralLine: '#E7EBE1', // Subtle rails/dividers
    inkBody: '#3D5F54',
    inkInverseMuted: '#BBD2C9',
    inkInverseBody: '#DCEBD3',
  },
  dataRamp: [
    { bg: '#B5E930', fg: '#164437' }, // Step 1: Green Lizard
    { bg: '#8CD41C', fg: '#164437' }, // Step 2: Leaf Green
    { bg: '#2F7A0C', fg: '#FFFFFF' }, // Step 3: Deep Forest
    { bg: '#164437', fg: '#FFFFFF' }, // Step 4: MSU Green
    { bg: '#4A6B60', fg: '#FFFFFF' }, // Step 5: Slate Green
  ],
  radii: {
    xs: 4,
    sm: 10,
    md: 14,
    lg: 16,
    xl: 20,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22,
    gutter: 24,
    section: 12,
  },
} as const;

export const Colors = {
  light: {
    text: '#164437',
    textSecondary: '#4A6B60',
    background: '#FFFFFF',
    backgroundElement: '#F2F4ED',
    backgroundSelected: '#EFF4E6',
    primary: '#164437',
    onPrimary: '#FFFFFF',
    primaryContainer: '#EFF4E6',
    secondary: '#4A6B60',
    tertiary: '#B5E930',
    accentDeep: '#2F7A0C',
    neutralGround: '#F2F4ED',
    neutralLine: '#E7EBE1',
    inkBody: '#3D5F54',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#BBD2C9',
    background: '#0B231C',
    backgroundElement: '#164437',
    backgroundSelected: '#2C5145',
    primary: '#B5E930',
    onPrimary: '#164437',
    primaryContainer: '#164437',
    secondary: '#BBD2C9',
    tertiary: '#B5E930',
    accentDeep: '#8CD41C',
    neutralGround: '#164437',
    neutralLine: '#2C5145',
    inkBody: '#DCEBD3',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  sans: Platform.select({
    web: "Google Sans Flex, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    default: 'GoogleSansFlex-Regular',
  }),
  sansMedium: Platform.select({
    web: "Google Sans Flex, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    default: 'GoogleSansFlex-Medium',
  }),
  sansSemiBold: Platform.select({
    web: "Google Sans Flex, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    default: 'GoogleSansFlex-SemiBold',
  }),
  mono: Platform.select({
    web: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    default: 'GeistMono-Regular',
  }),
  monoMedium: Platform.select({
    web: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    default: 'GeistMono-Medium',
  }),
  monoSemiBold: Platform.select({
    web: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    default: 'GeistMono-SemiBold',
  }),
  serif: 'serif',
  rounded: 'normal',
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  ...WattPrintTokens.spacing,
} as const;

export const Radii = WattPrintTokens.radii;
export const DataRamp = WattPrintTokens.dataRamp;

export const TypeScale = {
  display: 36, // hero figures
  h1: 28, // screen title
  h2: 24, // section title
  h3: 19, // card title
  bodyLarge: 17, // emphasized / lead text
  body: 16, // default UI text
  bodySmall: 14, // supporting text
  label: 14, // button / tab / label
  caption: 13, // metadata
  overline: 12, // smallest UI text — chart axis, overline-adjacent labels
} as const;

export type TypeScaleKey = keyof typeof TypeScale;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

