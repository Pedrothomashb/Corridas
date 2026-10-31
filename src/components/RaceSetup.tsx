import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { PilotPad } from '@/components/PilotPad';
import { C } from '@/constants/theme';
import { catKey, categoryLabel, NO_CATEGORY_COLOR, NO_CATEGORY_NAME } from '@/lib/categories';
import { plural } from '@/lib/format';
import { uid } from '@/lib/id';
import { groupName } from '@/lib/race';
import type { Category, Pilot, RaceSetup as Setup } from '@/lib/types';

/** Montagem da largada: quais categorias largam em cada pelotão e quem participa. */
export function RaceSetup({
  categories,
  pilots,
  setup,
  onChange,
  onHaptic,
}: {
  categories: Category[];
  pilots: Pilot[];
  setup: Setup;
  onChange: (s: Setup) => void;
  onHaptic?: () => void;
}) {
  const excluded = new Set(setup.excludedPilotIds);
  const hasUncategorized = pilots.some((p) => p.categoryId == null);
  const options: { id: string | null; name: string; color: string }[] = [
    ...categories.map((c) => ({ id: c.id as string | null, name: c.name, color: c.color })),
    ...(hasUncategorized ? [{ id: null, name: NO_CATEGORY_NAME, color: NO_CATEGORY_COLOR }] : []),
  ];

  const groupOf = new Map<string, number>();
  setup.groups.forEach((g, i) => g.categoryIds.forEach((id) => groupOf.set(catKey(id), i)));

  const toggleCategory = (gi: number, id: string | null) => {
    onHaptic?.();
    const k = catKey(id);
    const inThis = groupOf.get(k) === gi;
    onChange({
      ...setup,
      groups: setup.groups.map((g, i) => {
        const without = g.categoryIds.filter((c) => catKey(c) !== k);
        return i === gi && !inThis ? { ...g, categoryIds: [...without, id] } : { ...g, categoryIds: without };
      }),
    });
  };

  const togglePilot = (id: string) => {
    onHaptic?.();
    const next = new Set(excluded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...setup, excludedPilotIds: [...next] });
  };

  const addGroup = () => onChange({ ...setup, groups: [...setup.groups, { id: uid(), categoryIds: [] }] });
  const removeGroup = (gi: number) => onChange({ ...setup, groups: setup.groups.filter((_, i) => i !== gi) });

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Pelotões</Text>
        <Pressable testID="btn-add-pelotao" hitSlop={8} onPress={addGroup}>
          <Text style={styles.link}>+ Pelotão</Text>
        </Pressable>
      </View>

      {setup.groups.map((g, gi) => {
        const keys = new Set(g.categoryIds.map(catKey));
        const members = pilots
          .filter((p) => keys.has(catKey(p.categoryId)))
          .sort(
            (a, b) =>
              g.categoryIds.findIndex((c) => c === a.categoryId) -
                g.categoryIds.findIndex((c) => c === b.categoryId) || a.number - b.number,
          );
        const active = members.filter((p) => !excluded.has(p.id)).length;
        return (
          <View key={g.id} style={styles.card} testID={`pelotao-${gi + 1}`}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>{groupName(gi)}</Text>
              <Text style={styles.cardCount}>{plural(active, 'piloto', 'pilotos')}</Text>
              {setup.groups.length > 1 && (
                <Pressable testID={`remover-pelotao-${gi + 1}`} hitSlop={10} onPress={() => removeGroup(gi)}>
                  <Text style={styles.remove}>✕</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.chips}>
              {options.map((o) => {
                const where = groupOf.get(catKey(o.id));
                return (
                  <Chip
                    key={catKey(o.id)}
                    testID={`setup-p${gi + 1}-${o.name}`}
                    label={o.name}
                    color={o.color}
                    active={where === gi}
                    tag={where != null && where !== gi ? `P${where + 1}` : undefined}
                    onPress={() => toggleCategory(gi, o.id)}
                  />
                );
              })}
              {options.length === 0 && <Text style={styles.hint}>Cadastre categorias na aba Pilotos.</Text>}
            </View>

            {members.length > 0 ? (
              <View style={styles.pad}>
                <PilotPad
                  pilots={members.map((p) => ({
                    id: p.id,
                    number: p.number,
                    name: p.name,
                    color: categoryLabel(categories, p.categoryId).color,
                  }))}
                  mode="select"
                  selected={new Set(members.filter((p) => !excluded.has(p.id)).map((p) => p.id))}
                  onPress={(p) => togglePilot(p.id)}
                />
              </View>
            ) : (
              <Text style={styles.hint}>Toque nas categorias que largam neste pelotão.</Text>
            )}
          </View>
        );
      })}
      <Text style={styles.footer}>Toque num número para tirar o piloto desta corrida.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: C.textSecondary, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  link: { color: C.orange, fontSize: 15, fontWeight: '600' },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 12, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  cardCount: { color: C.textSecondary, fontSize: 13, marginLeft: 'auto' },
  remove: { color: C.textTertiary, fontSize: 16, paddingLeft: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pad: { paddingTop: 4 },
  hint: { color: C.textTertiary, fontSize: 13 },
  footer: { color: C.textTertiary, fontSize: 12, textAlign: 'center' },
});
