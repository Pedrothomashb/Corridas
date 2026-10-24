import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyHint, NumberBadge, StandingRowView } from '@/components/RaceLists';
import { BottomTabInset } from '@/constants/layout';
import { C, MONO_DIGITS, THIN } from '@/constants/theme';
import { choose, confirm, notify } from '@/lib/dialog';
import { exportRaceToExcel, saveRaceToDevice } from '@/lib/excel';
import { formatClock, formatDate, formatMs, plural } from '@/lib/format';
import { fastestLap, raceDuration, standings } from '@/lib/race';
import { useStore } from '@/lib/store';

export default function CorridaDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { races, removeRace } = useStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [exporting, setExporting] = useState(false);

  const race = races.find((r) => r.id === id) ?? null;
  const table = useMemo(() => (race ? standings(race) : []), [race]);
  const best = useMemo(() => (race ? fastestLap(race) : null), [race]);

  if (!race) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Corrida' }} />
        <EmptyHint text="Corrida não encontrada." />
      </View>
    );
  }

  const exportar = async () => {
    const mode =
      Platform.OS === 'android'
        ? await choose('Exportar Excel', 'Onde deseja colocar a planilha?', [
            { text: 'Cancelar', value: null, style: 'cancel' },
            { text: 'Compartilhar', value: 'share' as const },
            { text: 'Salvar no celular', value: 'save' as const },
          ])
        : ('share' as const);
    if (!mode) return;
    try {
      setExporting(true);
      if (mode === 'save') {
        const saved = await saveRaceToDevice(race);
        if (saved) notify('Planilha salva', saved);
      } else {
        await exportRaceToExcel(race);
      }
    } catch (e) {
      notify('Erro ao exportar', e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

  const excluir = async () => {
    if (await confirm('Excluir corrida', `Excluir "${race.name}" do histórico?`, 'Excluir', true)) {
      removeRace(race.id);
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: race.name, headerLargeTitle: false }} />
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + BottomTabInset + 24 }]}>
        <Text style={styles.date}>
          {formatDate(race.startedAt)} · largada {formatClock(race.startedAt)}
          {race.finishedAt ? ` · fim ${formatClock(race.finishedAt)}` : ''}
        </Text>
        <Text style={styles.bigTime} adjustsFontSizeToFit numberOfLines={1}>
          {formatMs(raceDuration(race))}
        </Text>

        <View style={styles.stats}>
          <Stat label="Pilotos" value={String(race.pilots.length)} />
          <Stat label="Voltas" value={String(race.laps.length)} />
          <Stat
            label="Melhor volta"
            value={best ? formatMs(best.lapMs) : '—'}
            sub={best ? `#${best.pilot.number} · V${best.lapNumber}` : undefined}
          />
        </View>

        <Pressable
          testID="btn-exportar"
          onPress={exportar}
          disabled={exporting}
          style={({ pressed }) => [styles.export, pressed && { opacity: 0.8 }]}>
          {exporting ? (
            <ActivityIndicator color={C.bg} />
          ) : (
            <Text style={styles.exportText}>Exportar Excel</Text>
          )}
        </Pressable>

        <Text style={styles.section}>Classificação</Text>
        <View style={styles.card}>
          {table.map((s) => (
            <StandingRowView key={s.pilot.id} s={s} />
          ))}
        </View>

        <Text style={styles.section}>Voltas por piloto</Text>
        {table.map((s) => {
          const fastest = s.lapTimes.length > 1 ? Math.min(...s.lapTimes) : null;
          const slowest = s.lapTimes.length > 1 ? Math.max(...s.lapTimes) : null;
          return (
            <View key={s.pilot.id} style={[styles.card, styles.pilotCard]}>
              <View style={styles.pilotHead}>
                <NumberBadge number={s.pilot.number} />
                <View style={styles.flex}>
                  <Text style={styles.pilotName}>{s.pilot.name}</Text>
                  <Text style={styles.pilotSub}>
                    {plural(s.laps, 'volta', 'voltas')}
                    {s.avgMs != null ? ` · média ${formatMs(s.avgMs)}` : ''}
                    {s.totalMs != null ? ` · total ${formatMs(s.totalMs)}` : ''}
                  </Text>
                </View>
              </View>
              {s.lapTimes.length === 0 ? (
                <Text style={styles.noLaps}>Sem voltas registradas</Text>
              ) : (
                s.lapTimes.map((ms, i) => {
                  const color = ms === fastest ? C.green : ms === slowest ? C.red : C.text;
                  return (
                    <View key={i} style={styles.lapRow}>
                      <Text style={[styles.lapLabel, { color }]}>Volta {i + 1}</Text>
                      <Text style={[styles.lapTime, { color }]}>{formatMs(ms)}</Text>
                    </View>
                  );
                })
              )}
            </View>
          );
        })}

        <Pressable onPress={excluir} style={[styles.card, styles.delete]}>
          <Text style={styles.deleteText}>Excluir corrida</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 12 },
  flex: { flex: 1 },
  date: { color: C.textSecondary, fontSize: 14, textAlign: 'center' },
  bigTime: { color: C.text, fontSize: 64, textAlign: 'center', ...THIN, ...MONO_DIGITS },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12 },
  statLabel: { color: C.textSecondary, fontSize: 12, textTransform: 'uppercase' },
  statValue: { color: C.text, fontSize: 20, marginTop: 4, ...MONO_DIGITS },
  statSub: { color: C.green, fontSize: 12, marginTop: 2 },
  export: {
    backgroundColor: C.green,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  exportText: { color: C.bg, fontSize: 17, fontWeight: '700' },
  section: { color: C.textSecondary, fontSize: 13, textTransform: 'uppercase', marginTop: 12, marginLeft: 4 },
  card: { backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 14 },
  pilotCard: { paddingVertical: 10 },
  pilotHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 8 },
  pilotName: { color: C.text, fontSize: 17, fontWeight: '600' },
  pilotSub: { color: C.textSecondary, fontSize: 13, marginTop: 2, ...MONO_DIGITS },
  noLaps: { color: C.textTertiary, fontSize: 14, paddingVertical: 6 },
  lapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.separator,
  },
  lapLabel: { fontSize: 16 },
  lapTime: { fontSize: 16, ...MONO_DIGITS },
  delete: { alignItems: 'center', paddingVertical: 14, marginTop: 12 },
  deleteText: { color: C.red, fontSize: 17 },
});
