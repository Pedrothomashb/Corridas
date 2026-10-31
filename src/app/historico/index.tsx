import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyHint } from '@/components/RaceLists';
import { BottomTabInset } from '@/constants/layout';
import { C, MONO_DIGITS } from '@/constants/theme';
import { formatClock, formatDate, formatMs, plural } from '@/lib/format';
import { raceDuration, standingsByCategory } from '@/lib/race';
import { useStore } from '@/lib/store';

export default function HistoricoScreen() {
  const { races } = useStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const items = useMemo(
    () =>
      races.map((r) => {
        const winners = standingsByCategory(r)
          .map((c) => ({ cat: c, s: c.rows[0] }))
          .filter((w) => w.s && w.s.laps > 0)
          .map((w) => `${w.cat.name}: #${w.s.pilot.number} ${w.s.pilot.name.split(' ')[0]}`);
        return {
          race: r,
          duration: raceDuration(r),
          winners: winners.join(' · '),
        };
      }),
    [races],
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Histórico' }} />
      <FlatList
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + BottomTabInset + 16 }]}
        data={items}
        keyExtractor={(i) => i.race.id}
        renderItem={({ item, index }) => (
          <Pressable
            testID={`corrida-${index}`}
            onPress={() => router.push(`/historico/${item.race.id}`)}
            style={({ pressed }) => [
              styles.row,
              index === 0 && styles.first,
              index === items.length - 1 && styles.last,
              pressed && styles.pressed,
            ]}>
            <View style={[styles.rowBody, index < items.length - 1 && styles.rowSep]}>
              <View style={styles.flex}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.race.name}
                </Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {formatDate(item.race.startedAt)} {formatClock(item.race.startedAt)} ·{' '}
                  {plural(item.race.pilots.length, 'piloto', 'pilotos')} ·{' '}
                  {plural(item.race.laps.length, 'volta', 'voltas')}
                </Text>
                {!!item.winners && (
                  <Text style={styles.winner} numberOfLines={2}>
                    1º {item.winners}
                  </Text>
                )}
              </View>
              <Text style={styles.duration}>{formatMs(item.duration)}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyHint text={'Nenhuma corrida salva ainda.\nAs corridas finalizadas aparecem aqui.'} />
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  row: { backgroundColor: C.card, paddingLeft: 16 },
  first: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  last: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  pressed: { backgroundColor: C.card2 },
  rowBody: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingRight: 14, gap: 8 },
  rowSep: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator },
  flex: { flex: 1 },
  name: { color: C.text, fontSize: 17 },
  sub: { color: C.textSecondary, fontSize: 13, marginTop: 2 },
  winner: { color: C.orange, fontSize: 13, marginTop: 2 },
  duration: { color: C.text, fontSize: 15, ...MONO_DIGITS },
  chevron: { color: C.textTertiary, fontSize: 24 },
});
