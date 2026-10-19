import { Platform } from 'react-native';

/** Espaço da barra de abas nativa (o conteúdo passa por baixo dela). */
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
