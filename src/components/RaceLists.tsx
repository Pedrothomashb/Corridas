import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, MONO_DIGITS } from '@/constants/theme';
import { formatMs, plural } from '@/lib/format';
import type { LapRow, Standing } from '@/lib/race';

export function NumberBadge({
  number,
  size = 'sm',
  color,
}: {
  number: number;
  size?: 'sm' | 'lg';
  color?: string;
}) {
  const lg = size === 'lg';
  return (
    <View
      style={[
        styles.badge,
        lg && styles.badgeLg,
        color ? { borderColor: color, borderWidth: lg ? 2 : 1.5 } : null,
      ]}>
      <Text style={[styles.badgeText, lg && styles.badgeTextLg]}>{number}</Text>
    </View>
  );
}

export function CategoryDot({ color, size = 8 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

export function CategoryHeader({ name, color, right }: { name: string; color: string; right?: string }) {
  return (
    <View style={styles.catHeader}>
      <View style={[styles.catBar, { backgroundColor: color }]} />
      <Text style={styles.catName} numberOfLines={1}>
        {name}
      </Text>
      {!!right && <Text style={styles.catRight}>{right}</Text>}
    </View>
  );
}

export function LapRowView({
  row,
  highlight,
  onLongPress,
}: {
  row: LapRow;
  highlight?: 'best' | 'worst' | null;
  onLongPress?: () => void;
}) {
  const color = highlight === 'best' ? C.green : highlight === 'worst' ? C.red : C.text;
  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={450}
      style={({ pressed }) => [styles.row, pressed && onLongPress && styles.pressed]}>
      <NumberBadge number={row.pilot.number} color={row.pilot.categoryColor} />
      <View style={styles.flex}>
        <Text style={[styles.title, { color }]} numberOfLines={1}>
          {row.pilot.name}
        </Text>
        <View style={styles.subRow}>
          <Text style={styles.sub}>Volta {row.lapNumber}</Text>
          <CategoryDot color={row.pilot.categoryColor} size={6} />
          <Text style={styles.sub} numberOfLines={1}>
            {row.pilot.categoryName}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.time, { color }]}>{formatMs(row.lapMs)}</Text>
        <Text style={[styles.sub, MONO_DIGITS]}>{formatMs(row.totalMs)}</Text>
      </View>
    </Pressable>
  );
}

export function StandingRowView({ s }: { s: Standing }) {
  const leader = s.position === 1 && s.laps > 0;
  return (
    <View style={styles.row}>
      <Text style={[styles.pos, leader && { color: C.orange }]}>{s.position}</Text>
      <NumberBadge number={s.pilot.number} color={s.pilot.categoryColor} />
      <View style={styles.flex}>
        <Text style={styles.title} numberOfLines={1}>
          {s.pilot.name}
        </Text>
        <Text style={[styles.sub, MONO_DIGITS]} numberOfLines={1}>
          {s.bestMs != null ? `Melhor ${formatMs(s.bestMs)}` : 'Sem voltas'}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.time}>{plural(s.laps, 'volta', 'voltas')}</Text>
        <Text style={[styles.sub, MONO_DIGITS, leader && { color: C.orange }]}>{s.gap}</Text>
      </View>
    </View>
  );
}

export function EmptyHint({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.separator,
  },
  pressed: { opacity: 0.6 },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end' },
  title: { color: C.text, fontSize: 17 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  sub: { color: C.textSecondary, fontSize: 13, marginTop: 2 },
  time: { color: C.text, fontSize: 17, ...MONO_DIGITS },
  pos: { color: C.text, fontSize: 20, fontWeight: '300', width: 24, textAlign: 'center', ...MONO_DIGITS },
  badge: {
    minWidth: 34,
    height: 26,
    borderRadius: 7,
    paddingHorizontal: 6,
    backgroundColor: C.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLg: { minWidth: 44, height: 44, borderRadius: 22 },
  badgeText: { color: C.text, fontSize: 14, fontWeight: '600', ...MONO_DIGITS },
  badgeTextLg: { fontSize: 18 },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, paddingBottom: 4 },
  catBar: { width: 4, height: 16, borderRadius: 2 },
  catName: { color: C.text, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  catRight: { color: C.textSecondary, fontSize: 12, marginLeft: 'auto' },
  empty: { paddingVertical: 28, alignItems: 'center' },
  emptyText: { color: C.textTertiary, fontSize: 15, textAlign: 'center' },
});
