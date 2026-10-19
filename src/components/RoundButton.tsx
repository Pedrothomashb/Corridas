import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C } from '@/constants/theme';

type Variant = 'gray' | 'green' | 'red';

const PALETTE: Record<Variant, { bg: string; fg: string }> = {
  gray: { bg: C.grayBtn, fg: C.text },
  green: { bg: C.greenBg, fg: C.green },
  red: { bg: C.redBg, fg: C.red },
};

/** Botão redondo com anel interno — igual aos botões Iniciar/Parar/Volta do iPhone. */
export function RoundButton({
  label,
  variant,
  onPress,
  disabled,
  size = 84,
  testID,
}: {
  label: string;
  variant: Variant;
  onPress?: () => void;
  disabled?: boolean;
  size?: number;
  testID?: string;
}) {
  const colors = PALETTE[variant];
  const bg = disabled && variant === 'gray' ? C.grayBtnDisabled : colors.bg;
  const fg = disabled ? (variant === 'gray' ? C.textTertiary : colors.fg + '80') : colors.fg;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <View style={[styles.ring, { width: size - 6, height: size - 6, borderRadius: (size - 6) / 2 }]}>
        <Text
          style={[styles.label, { color: fg, fontSize: fontFor(label, size) }]}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

/** Ajusta a fonte para rótulos longos (Desfazer, Finalizar, Retomar) caberem no círculo. */
function fontFor(label: string, size: number) {
  const base = size >= 80 ? 17 : 16;
  if (label.length >= 9) return base - 2.5;
  if (label.length >= 7) return base - 1.5;
  return base;
}

const styles = StyleSheet.create({
  outer: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    borderWidth: 2,
    borderColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  label: { fontWeight: '400', letterSpacing: -0.3 },
});
