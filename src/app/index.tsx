import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PilotPad } from '@/components/PilotPad';
import { EmptyHint, LapRowView, StandingRowView } from '@/components/RaceLists';
import { RoundButton } from '@/components/RoundButton';
import { Segmented } from '@/components/Segmented';
import { TimerText } from '@/components/TimerText';
import { BottomTabInset } from '@/constants/layout';
import { C } from '@/constants/theme';
import { choose, confirm } from '@/lib/dialog';
import { defaultRaceName } from '@/lib/format';
import { bestWorstIds, lapRows, standings } from '@/lib/race';
import { useStore } from '@/lib/store';

const KEEP_AWAKE_TAG = 'corrida';

function haptic(kind: 'lap' | 'action') {
  if (Platform.OS === 'web') return;
  (kind === 'lap' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) : Haptics.selectionAsync()).catch(
    () => {},
  );
}

export default function CorridaScreen() {
  const store = useStore();
  const { current, pilots } = store;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [raceName, setRaceName] = useState('');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'voltas' | 'classificacao'>('voltas');

  const status = current?.status ?? 'idle';
  const active = status === 'running' || status === 'paused';

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (active) activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    else deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
  }, [active]);

  const participants = useMemo(() => pilots.filter((p) => !excluded.has(p.id)), [pilots, excluded]);
  const selectedIds = useMemo(() => new Set(participants.map((p) => p.id)), [participants]);

  const rows = useMemo(() => (current ? lapRows(current) : []), [current]);
  const recent = useMemo(() => [...rows].reverse(), [rows]);
  const { bestId, worstId } = bestWorstIds(rows);
  const table = useMemo(() => (current ? standings(current) : []), [current]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.pilot.id, (m.get(r.pilot.id) ?? 0) + 1);
    return m;
  }, [rows]);

  const timerSize = Math.min(96, width * 0.2, height * 0.1);
  const btnSize = Math.min(84, Math.max(70, width * 0.2));

  // ----- ações -----
  const start = () => {
    if (!participants.length) return;
    haptic('action');
    store.startRace(
      raceName.trim() || defaultRaceName(),
      participants.map((p) => p.id),
    );
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

  const toggleParticipant = (id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = excluded.size === 0 || pilots.every((p) => !excluded.has(p.id));

  // ----- botões estilo iPhone -----
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

  // ----- teclado de pilotos -----
  const padPilots = active ? current!.pilots : pilots;
  const padTitle =
    status === 'idle'
      ? `Participantes · ${participants.length} de ${pilots.length}`
      : status === 'running'
        ? 'Toque no número ao completar a volta'
        : 'Corrida pausada';

  const emptyText =
    status === 'idle'
      ? 'Selecione os participantes e toque em Iniciar.\nTodos os pilotos largam juntos.'
      : 'As voltas aparecem aqui.';
  const bottomPad = insets.bottom + BottomTabInset + 16;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        {status === 'idle' ? (
          <TextInput
            testID="input-nome-corrida"
            value={raceName}
            onChangeText={setRaceName}
            placeholder={defaultRaceName()}
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

      <View style={styles.padSection}>
        <View style={styles.padHeader}>
          <Text style={styles.padTitle}>{padTitle}</Text>
          {status === 'idle' && pilots.length > 0 && (
            <Pressable
              hitSlop={8}
              onPress={() => setExcluded(allSelected ? new Set(pilots.map((p) => p.id)) : new Set())}>
              <Text style={styles.link}>{allSelected ? 'Nenhum' : 'Todos'}</Text>
            </Pressable>
          )}
        </View>

        {padPilots.length > 0 ? (
          <PilotPad
            pilots={padPilots}
            mode={status === 'idle' ? 'select' : status === 'running' ? 'lap' : 'disabled'}
            selected={selectedIds}
            counts={counts}
            maxRows={status === 'idle' ? 3 : 2}
            onPress={(p, at) => {
              if (status === 'idle') {
                haptic('action');
                toggleParticipant(p.id);
              } else if (status === 'running') {
                haptic('lap');
                store.addLap(p.id, at);
              }
            }}
          />
        ) : (
          <View style={styles.noPilots}>
            <Text style={styles.noPilotsText}>Nenhum piloto cadastrado.</Text>
            <Pressable testID="btn-ir-pilotos" onPress={() => router.navigate('/pilotos')} style={styles.cta}>
              <Text style={styles.ctaText}>Cadastrar pilotos</Text>
            </Pressable>
          </View>
        )}
      </View>

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
          style={styles.list}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad }}
          data={recent}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LapRowView
              row={item}
              highlight={item.id === bestId ? 'best' : item.id === worstId ? 'worst' : null}
              onLongPress={
                active
                  ? async () => {
                      if (
                        await confirm(
                          'Excluir volta',
                          `Excluir a volta ${item.lapNumber} do piloto #${item.pilot.number}?`,
                          'Excluir',
                          true,
                        )
                      )
                        store.removeLap(item.id);
                    }
                  : undefined
              }
            />
          )}
          ListEmptyComponent={<EmptyHint text={emptyText} />}
        />
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad }}
          data={table}
          keyExtractor={(item) => item.pilot.id}
          renderItem={({ item }) => <StandingRowView s={item} />}
          ListEmptyComponent={<EmptyHint text={emptyText} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, alignItems: 'center', gap: 6, minHeight: 52 },
  nameInput: {
    color: C.text,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    minWidth: 240,
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
  padSection: { paddingHorizontal: 16, marginTop: 18, gap: 10 },
  padHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  padTitle: { color: C.textSecondary, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  link: { color: C.orange, fontSize: 15 },
  noPilots: { alignItems: 'center', paddingVertical: 16, gap: 12 },
  noPilotsText: { color: C.textSecondary, fontSize: 15 },
  cta: { backgroundColor: C.card, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  ctaText: { color: C.orange, fontSize: 15, fontWeight: '600' },
  segment: { paddingHorizontal: 16, marginTop: 16, marginBottom: 4 },
  list: { flex: 1 },
});
