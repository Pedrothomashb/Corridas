import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyHint } from '@/components/RaceLists';
import { BottomTabInset } from '@/constants/layout';
import { C, MONO_DIGITS } from '@/constants/theme';
import { formatClock, formatDate, formatMs, plural } from '@/lib/format';
import { raceDuration, standings } from '@/lib/race';
import { useStore } from '@/lib/store';

export default function HistoricoScreen() {
  const { races } = useStore();
  const router = useRouter();

  const items = useMemo(
    () =>
      races.map((r) => {
        const winner = standings(r)[0];
        return {
          race: r,
          duration: raceDuration(r),
          winner: winner && winner.laps > 0 ? winner : null,
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
        contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + 16 }]}
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
                {item.winner && (
                  <Text style={styles.winner} numberOfLines={1}>
                    1º #{item.winner.pilot.number} {item.winner.pilot.name}
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
