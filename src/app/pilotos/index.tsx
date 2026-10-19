import { Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PilotFormModal } from '@/components/PilotFormModal';
import { EmptyHint, NumberBadge } from '@/components/RaceLists';
import { BottomTabInset } from '@/constants/layout';
import { C } from '@/constants/theme';
import { APP_RELEASE } from '@/constants/version';
import { plural } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { Pilot } from '@/lib/types';

export default function PilotosScreen() {
  const { pilots, addPilot, updatePilot, removePilot } = useStore();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState<Pilot | null>(null);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);

  const nextNumber = pilots.length ? Math.max(...pilots.map((p) => p.number)) + 1 : 1;

  const openForm = (pilot: Pilot | null) => {
    setEditing(pilot);
    setSession((n) => n + 1);
    setOpen(true);
  };
  const openNew = () => openForm(null);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Pilotos',
          headerRight: () => (
            <Pressable
              testID="btn-novo-piloto"
              hitSlop={12}
              onPress={openNew}
              accessibilityLabel="Adicionar piloto">
              <Text style={styles.plus}>+</Text>
            </Pressable>
          ),
        }}
      />

      <FlatList
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + BottomTabInset + 16 }]}
        data={pilots}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={
          pilots.length ? (
            <Text style={styles.sectionHeader}>
              {plural(pilots.length, 'piloto cadastrado', 'pilotos cadastrados')}
            </Text>
          ) : undefined
        }
        renderItem={({ item, index }) => (
          <Pressable
            testID={`piloto-${item.number}`}
            onPress={() => openForm(item)}
            style={({ pressed }) => [
              styles.row,
              index === 0 && styles.first,
              index === pilots.length - 1 && styles.last,
              pressed && styles.pressed,
            ]}>
            <NumberBadge number={item.number} size="lg" />
            <View style={[styles.rowBody, index < pilots.length - 1 && styles.rowSep]}>
              <View style={styles.flex}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                {!!item.team && (
                  <Text style={styles.team} numberOfLines={1}>
                    {item.team}
                  </Text>
                )}
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>
        )}
        ListFooterComponent={<Text style={styles.version}>Corridas {APP_RELEASE}</Text>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <EmptyHint text={'Nenhum piloto cadastrado.\nCadastre os pilotos com número e nome.'} />
            <Pressable testID="btn-cadastrar-primeiro" onPress={openNew} style={styles.cta}>
              <Text style={styles.ctaText}>Cadastrar piloto</Text>
            </Pressable>
          </View>
        }
      />

      <PilotFormModal
        visible={open}
        session={session}
        pilot={editing}
        suggestedNumber={nextNumber}
        onClose={() => setOpen(false)}
        onSave={(input) => (editing ? updatePilot(editing.id, input) : addPilot(input))}
        onDelete={removePilot}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  sectionHeader: {
    color: C.textSecondary,
    fontSize: 13,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 16,
  },
  plus: { color: C.orange, fontSize: 30, fontWeight: '300', lineHeight: 32, paddingHorizontal: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    paddingLeft: 14,
    gap: 14,
  },
  first: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  last: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  pressed: { backgroundColor: C.card2 },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingRight: 14 },
  rowSep: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator },
  flex: { flex: 1 },
  name: { color: C.text, fontSize: 17 },
  team: { color: C.textSecondary, fontSize: 14, marginTop: 2 },
  chevron: { color: C.textTertiary, fontSize: 24, marginLeft: 8 },
  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  cta: { backgroundColor: C.card, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  version: { color: C.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 24 },
  ctaText: { color: C.orange, fontSize: 15, fontWeight: '600' },
});
