import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { C, MONO_DIGITS } from '@/constants/theme';

type PadPilot = { id: string; number: number; name: string };

const GAP = 12;

/**
 * Teclado de pilotos (estilo teclado do telefone do iPhone).
 * - mode "select": escolhe quem participa da próxima corrida
 * - mode "lap": cada toque marca uma volta para o piloto
 */
export function PilotPad({
  pilots,
  mode,
  selected,
  counts,
  onPress,
  maxRows = 3,
}: {
  pilots: PadPilot[];
  mode: 'select' | 'lap' | 'disabled';
  selected?: Set<string>;
  counts?: Map<string, number>;
  onPress?: (pilot: PadPilot, at: number) => void;
  maxRows?: number;
}) {
  const [width, setWidth] = useState(0);
  const pressAt = useRef(0);

  const cols = width ? Math.max(4, Math.min(6, Math.floor((width + GAP) / (74 + GAP)))) : 4;
  const size = width ? Math.min(84, Math.floor((width - GAP * (cols - 1)) / cols)) : 0;
  const rows = Math.ceil(pilots.length / cols);
  const maxHeight = size
    ? Math.min(rows, maxRows) * size +
      (Math.min(rows, maxRows) - 1) * GAP +
      (rows > maxRows ? size * 0.35 : 0)
    : 0;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {size > 0 && (
        <ScrollView
          style={{ maxHeight }}
          contentContainerStyle={[styles.grid, { gap: GAP }]}
          showsVerticalScrollIndicator={rows > maxRows}>
          {pilots.map((p) => {
            const isSelected = mode === 'select' ? !!selected?.has(p.id) : true;
            const dim = mode === 'disabled' || !isSelected;
            const count = counts?.get(p.id) ?? 0;
            return (
              <Pressable
                key={p.id}
                testID={`pad-${p.number}`}
                accessibilityRole="button"
                accessibilityLabel={`Piloto ${p.number} ${p.name}`}
                disabled={mode === 'disabled'}
                onPressIn={() => (pressAt.current = Date.now())}
                onPress={() => onPress?.(p, pressAt.current || Date.now())}
                style={({ pressed }) => [
                  styles.btn,
                  { width: size, height: size, borderRadius: size / 2 },
                  mode === 'select' && isSelected && styles.btnSelected,
                  dim && styles.btnDim,
                  pressed && mode === 'lap' && styles.btnPressed,
                ]}>
                {({ pressed }) => (
                  <>
                    <Text
                      style={[
                        styles.number,
                        { fontSize: size * 0.36 },
                        mode === 'select' && isSelected && { color: C.green },
                        dim && { color: C.textTertiary },
                        pressed && mode === 'lap' && { color: C.bg },
                      ]}>
                      {p.number}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.name,
                        { maxWidth: size * 0.78 },
                        dim && { color: C.textTertiary },
                        pressed && mode === 'lap' && { color: C.bg },
                      ]}>
                      {p.name.split(' ')[0]}
                    </Text>
                    {mode !== 'select' && count > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{count}</Text>
                      </View>
                    )}
                  </>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  btn: {
    backgroundColor: C.grayBtn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSelected: { backgroundColor: C.greenBg, borderWidth: 1.5, borderColor: C.green },
  btnDim: { backgroundColor: C.grayBtnDisabled },
  btnPressed: { backgroundColor: C.green },
  number: { color: C.text, fontWeight: '300', ...MONO_DIGITS },
  name: { color: C.textSecondary, fontSize: 10, marginTop: -2 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: C.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.bg,
  },
  badgeText: { color: C.bg, fontSize: 11, fontWeight: '700', ...MONO_DIGITS },
});
