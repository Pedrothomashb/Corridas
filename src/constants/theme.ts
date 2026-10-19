import { Platform } from 'react-native';

/** Paleta inspirada no app Relógio/Cronômetro do iPhone (modo escuro). */
export const C = {
  bg: '#000000',
  card: '#1C1C1E',
  card2: '#2C2C2E',
  separator: '#38383A',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',

  green: '#30D158',
  greenBg: '#0A2A12',
  red: '#FF453A',
  redBg: '#330E0C',
  grayBtn: '#333333',
  grayBtnDisabled: '#1C1C1C',
  orange: '#FF9F0A',
  blue: '#0A84FF',
} as const;

export const MONO_DIGITS = {
  fontVariant: ['tabular-nums'] as 'tabular-nums'[],
};

export const THIN = Platform.select({
  ios: { fontWeight: '200' as const },
  android: { fontFamily: 'sans-serif-thin' },
  default: { fontWeight: '200' as const },
});
