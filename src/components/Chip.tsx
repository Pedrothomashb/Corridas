import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/theme';

/** Chip de categoria (toque para marcar/desmarcar). */
export function Chip({
  label,
  color,
  active,
  onPress,
  tag,
  testID,
}: {
  label: string;
  color: string;
  active: boolean;
  onPress?: () => void;
  /** Texto pequeno à direita (ex.: "P2" quando a categoria está em outro pelotão). */
  tag?: string;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        active ? { backgroundColor: color + '33', borderColor: color } : styles.inactive,
        pressed && { opacity: 0.7 },
      ]}>
      <View style={[styles.dot, { backgroundColor: color, opacity: active ? 1 : 0.5 }]} />
      <Text style={[styles.label, !active && styles.labelInactive]} numberOfLines={1}>
        {label}
      </Text>
      {!!tag && <Text style={styles.tag}>{tag}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    maxWidth: '100%',
  },
  inactive: { backgroundColor: 'transparent', borderColor: C.card2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { color: C.text, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  labelInactive: { color: C.textSecondary, fontWeight: '500' },
  tag: { color: C.textTertiary, fontSize: 11, fontWeight: '700' },
});
