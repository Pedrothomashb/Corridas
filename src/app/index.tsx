import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GroupTimer } from '@/components/GroupTimer';
import { PilotPad } from '@/components/PilotPad';
import { CategoryDot, CategoryHeader, EmptyHint, LapRowView, StandingRowView } from '@/components/RaceLists';
import { RaceSetup } from '@/components/RaceSetup';
import { RoundButton } from '@/components/RoundButton';
import { Segmented } from '@/components/Segmented';
import { TimerText } from '@/components/TimerText';
import { BottomTabInset } from '@/constants/layout';
import { C, MONO_DIGITS } from '@/constants/theme';
import { catKey, categoryLabel } from '@/lib/categories';
import { choose, confirm } from '@/lib/dialog';
import { defaultRaceName, plural } from '@/lib/format';
import {
  groupCategories,
  highlightByCategory,
  lapRows,
  standingsByCategory,
  type CategoryStanding,
  type Standing,
} from '@/lib/race';
import { sanitizeSetup, useStore } from '@/lib/store';
import type { Race, RaceGroup } from '@/lib/types';

const KEEP_AWAKE_TAG = 'corrida';

function haptic(kind: 'lap' | 'action' | 'start') {
  if (Platform.OS === 'web') return;
  const p =
    kind === 'lap'
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      : kind === 'start'
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.selectionAsync();
  p.catch(() => {});
}

type TableItem =
  { type: 'header'; key: string; cat: CategoryStanding } | { type: 'row'; key: string; s: Standing };

export default function CorridaScreen() {
  const store = useStore();
  const { current, pilots, categories } = store;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [raceName, setRaceName] = useState('');
  const [view, setView] = useState<'voltas' | 'classificacao'>('voltas');

  const status = current?.status ?? 'idle';
  const active = status === 'running' || status === 'paused';

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (active) activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    else deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
  }, [active]);

  // ----- montagem (antes de largar)
  const setup = useMemo(
    () => sanitizeSetup(store.setup, categories, pilots),
    [store.setup, categories, pilots],
  );
  const participants = useMemo(() => {
    const keys = new Set(setup.groups.flatMap((g) => g.categoryIds.map(catKey)));
    const excluded = new Set(setup.excludedPilotIds);
    return pilots.filter((p) => keys.has(catKey(p.categoryId)) && !excluded.has(p.id));
  }, [setup, pilots]);
  const setupLabel = useMemo(
    () =>
      setup.groups
        .flatMap((g) => g.categoryIds)
        .filter((id) => participants.some((p) => p.categoryId === id))
        .map((id) => categoryLabel(categories, id).name)
        .join(' · '),
    [setup, participants, categories],
  );

  // ----- corrida em andamento
  const rows = useMemo(() => (current ? lapRows(current) : []), [current]);
  const recent = useMemo(() => [...rows].reverse(), [rows]);
  const highlight = useMemo(() => highlightByCategory(rows), [rows]);
  const tableItems = useMemo<TableItem[]>(() => {
    if (!current) return [];
    return standingsByCategory(current).flatMap((cat) => [
      { type: 'header' as const, key: `h-${cat.key}`, cat },
      ...cat.rows.map((s) => ({ type: 'row' as const, key: `r-${s.pilot.id}`, s })),
    ]);
  }, [current]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.pilot.id, (m.get(r.pilot.id) ?? 0) + 1);
    return m;
  }, [rows]);

  const timerSize = Math.min(96, width * 0.2, height * 0.1);
  const btnSize = Math.min(84, Math.max(70, width * 0.2));

  // ----- ações
  const start = () => {
    if (!participants.length) return;
    haptic('start');
    store.startRace(raceName.trim() || defaultRaceName(undefined, setupLabel));
    setRaceName('');
    setView('voltas');
  };

  const finish = async () => {
    const r = await choose('Finalizar corrida', 'Deseja salvar esta corrida no histórico?', [
      { text: 'Cancelar', value: 'cancel', style: 'cancel' },
      { text: 'Descartar', value: 'discard', style: 'destructive' },
      { text: 'Salvar', value: 'save' },
    ]);
    if (r === 'save') {
      const done = store.finishRace();
      if (done) router.push(`/historico/${done.id}`, { withAnchor: true });
    } else if (r === 'discard') {
      if (
        await confirm('Descartar corrida', 'Todas as voltas desta corrida serão perdidas.', 'Descartar', true)
      ) {
        store.discardRace();
      }
    }
  };

  const cancelStart = async (race: Race, g: RaceGroup) => {
    const ids = new Set(race.pilots.filter((p) => p.groupId === g.id).map((p) => p.id));
    if (race.laps.some((l) => ids.has(l.pilotId))) return;
    if (await confirm('Cancelar largada', `Cancelar a largada do ${g.name}?`, 'Cancelar largada', true)) {
      store.cancelGroupStart(g.id);
    }
  };

  // ----- botões estilo iPhone
  const left =
    status === 'idle' ? (
      <RoundButton label="Desfazer" variant="gray" disabled size={btnSize} />
    ) : status === 'running' ? (
      <RoundButton
        testID="btn-desfazer"
        label="Desfazer"
        variant="gray"
        disabled={!current?.laps.length}
        size={btnSize}
        onPress={() => {
          haptic('action');
          store.undoLap();
        }}
      />
    ) : (
      <RoundButton testID="btn-finalizar" label="Finalizar" variant="gray" size={btnSize} onPress={finish} />
    );

  const right =
    status === 'idle' ? (
      <RoundButton
        testID="btn-iniciar"
        label="Iniciar"
        variant="green"
        disabled={!participants.length}
        size={btnSize}
        onPress={start}
      />
    ) : status === 'running' ? (
      <RoundButton
        testID="btn-parar"
        label="Parar"
        variant="red"
        size={btnSize}
        onPress={() => {
          haptic('action');
          store.pauseRace();
        }}
      />
    ) : (
      <RoundButton
        testID="btn-retomar"
        label="Retomar"
        variant="green"
        size={btnSize}
        onPress={() => {
          haptic('action');
          store.resumeRace();
        }}
      />
    );

  const bottomPad = BottomTabInset + 16;
  const emptyText = 'As voltas aparecem aqui.';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        {status === 'idle' ? (
          <TextInput
            testID="input-nome-corrida"
            value={raceName}
            onChangeText={setRaceName}
            placeholder={defaultRaceName(undefined, setupLabel)}
            placeholderTextColor={C.textTertiary}
            style={styles.nameInput}
            returnKeyType="done"
          />
        ) : (
          <Text style={styles.nameText} numberOfLines={1}>
            {current!.name}
          </Text>
        )}
        {active && (
          <View style={styles.statusPill}>
            <View style={[styles.dot, { backgroundColor: status === 'running' ? C.green : C.orange }]} />
            <Text style={[styles.statusText, { color: status === 'running' ? C.green : C.orange }]}>
              {status === 'running' ? 'EM ANDAMENTO' : 'PAUSADA'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.timerBox}>
        <TimerText race={current} fontSize={timerSize} />
      </View>

      <View style={styles.buttons}>
        {left}
        {right}
      </View>

      {!current ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.setupContent, { paddingBottom: bottomPad }]}
          keyboardShouldPersistTaps="handled">
          {pilots.length === 0 ? (
            <View style={styles.noPilots}>
              <Text style={styles.noPilotsText}>Nenhum piloto cadastrado.</Text>
              <Pressable
                testID="btn-ir-pilotos"
                onPress={() => router.navigate('/pilotos')}
                style={styles.cta}>
                <Text style={styles.ctaText}>Cadastrar pilotos</Text>
              </Pressable>
            </View>
          ) : (
            <RaceSetup
              categories={categories}
              pilots={pilots}
              setup={setup}
              onChange={store.setSetup}
              onHaptic={() => haptic('action')}
            />
          )}
        </ScrollView>
      ) : (
        <>
          <ScrollView
            style={[styles.padScroll, { maxHeight: height * 0.42 }]}
            contentContainerStyle={styles.padContent}>
            {current.groups.map((g, gi) => {
              const started = g.startOffsetMs != null;
              const cats = groupCategories(current, g);
              const members = current.pilots.filter((p) => p.groupId === g.id);
              return (
                <View key={g.id} style={styles.group} testID={`grupo-${gi + 1}`}>
                  <Pressable
                    style={styles.groupHead}
                    onLongPress={started ? () => cancelStart(current, g) : undefined}
                    delayLongPress={600}>
                    <View style={styles.flex}>
                      <Text style={styles.groupName}>{g.name.toUpperCase()}</Text>
                      <View style={styles.groupCats}>
                        {cats.map((c) => (
                          <View key={catKey(c.id)} style={styles.groupCat}>
                            <CategoryDot color={c.color} />
                            <Text style={styles.groupCatText} numberOfLines={1}>
                              {c.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    {started ? (
                      <GroupTimer race={current} group={g} style={styles.groupTimer} />
                    ) : (
                      <Pressable
                        testID={`btn-largar-${gi + 1}`}
                        disabled={status !== 'running'}
                        onPress={() => {
                          haptic('start');
                          store.startGroup(g.id);
                        }}
                        style={({ pressed }) => [
                          styles.largar,
                          status !== 'running' && styles.largarDisabled,
                          pressed && { opacity: 0.7 },
                        ]}>
                        <Text style={styles.largarText}>LARGAR</Text>
                      </Pressable>
                    )}
                  </Pressable>
                  <PilotPad
                    pilots={members.map((p) => ({
                      id: p.id,
                      number: p.number,
                      name: p.name,
                      color: p.categoryColor,
                    }))}
                    mode={started && status === 'running' ? 'lap' : 'disabled'}
                    counts={counts}
                    onPress={(p, at) => {
                      haptic('lap');
                      store.addLap(p.id, at);
                    }}
                  />
                  {!started && (
                    <Text style={styles.waiting}>
                      Aguardando largada · {plural(members.length, 'piloto', 'pilotos')}
                    </Text>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.segment}>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'voltas', label: `Voltas${rows.length ? ` (${rows.length})` : ''}` },
                { value: 'classificacao', label: 'Classificação' },
              ]}
            />
          </View>

          {view === 'voltas' ? (
            <FlatList
              style={styles.flex}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad }}
              data={recent}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <LapRowView
                  row={item}
                  highlight={highlight.get(item.id) ?? null}
                  onLongPress={async () => {
                    if (
                      await confirm(
                        'Excluir volta',
                        `Excluir a volta ${item.lapNumber} do piloto #${item.pilot.number} (${item.pilot.categoryName})?`,
                        'Excluir',
                        true,
                      )
                    )
                      store.removeLap(item.id);
                  }}
                />
              )}
              ListEmptyComponent={<EmptyHint text={emptyText} />}
            />
          ) : (
            <FlatList
              style={styles.flex}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad }}
              data={tableItems}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) =>
                item.type === 'header' ? (
                  <CategoryHeader name={item.cat.name} color={item.cat.color} right={item.cat.group.name} />
                ) : (
                  <StandingRowView s={item.s} />
                )
              }
              ListEmptyComponent={<EmptyHint text={emptyText} />}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, alignItems: 'center', gap: 6, minHeight: 52 },
  nameInput: {
    color: C.text,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'stretch',
    backgroundColor: C.card,
    borderRadius: 10,
    outlineWidth: 0,
  },
  nameText: { color: C.text, fontSize: 17, fontWeight: '600', paddingVertical: 4 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  timerBox: { paddingHorizontal: 12, paddingVertical: 8 },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  setupContent: { paddingHorizontal: 16, paddingTop: 16 },
  padScroll: { marginTop: 14, flexGrow: 0 },
  padContent: { paddingHorizontal: 16, gap: 14 },
  group: { gap: 8 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupName: { color: C.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  groupCats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2 },
  groupCat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  groupCatText: { color: C.text, fontSize: 13, fontWeight: '600' },
  groupTimer: { color: C.green, fontSize: 18, ...MONO_DIGITS },
  largar: { backgroundColor: C.green, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18 },
  largarDisabled: { opacity: 0.35 },
  largarText: { color: C.bg, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  waiting: { color: C.textTertiary, fontSize: 12 },
  noPilots: { alignItems: 'center', paddingVertical: 16, gap: 12 },
  noPilotsText: { color: C.textSecondary, fontSize: 15 },
  cta: { backgroundColor: C.card, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  ctaText: { color: C.orange, fontSize: 15, fontWeight: '600' },
  segment: { paddingHorizontal: 16, marginTop: 12, marginBottom: 4 },
});
