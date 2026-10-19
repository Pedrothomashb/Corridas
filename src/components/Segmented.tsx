import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/theme';

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.item, active && styles.active]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}>
            <Text style={[styles.text, active && styles.textActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 9,
    padding: 2,
  },
  item: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 7 },
  active: { backgroundColor: '#636366' },
  text: { color: C.textSecondary, fontSize: 13, fontWeight: '500' },
  textActive: { color: C.text, fontWeight: '600' },
});
