import { Platform } from 'react-native';

import { C } from './theme';

export const stackScreenOptions = {
  headerLargeTitle: Platform.OS === 'ios',
  headerTintColor: C.orange,
  headerStyle: { backgroundColor: C.bg },
  headerLargeStyle: { backgroundColor: C.bg },
  headerTitleStyle: { color: C.text },
  headerLargeTitleStyle: { color: C.text },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: C.bg },
} as const;
