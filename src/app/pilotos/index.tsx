import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { CategoryFormModal } from '@/components/CategoryFormModal';
import { PilotFormModal } from '@/components/PilotFormModal';
import { CategoryDot, CategoryHeader, EmptyHint, NumberBadge } from '@/components/RaceLists';
import { Segmented } from '@/components/Segmented';
import { BottomTabInset } from '@/constants/layout';
import { C } from '@/constants/theme';
import { APP_RELEASE } from '@/constants/version';
import { catKey, NO_CATEGORY_COLOR, NO_CATEGORY_NAME } from '@/lib/categories';
import { plural } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { Category, Pilot } from '@/lib/types';

type Tab = 'pilotos' | 'categorias';

export default function PilotosScreen() {
  const store = useStore();
  const { pilots, categories } = store;
  const [tab, setTab] = useState<Tab>('pilotos');

  const [editingPilot, setEditingPilot] = useState<Pilot | null>(null);
  const [pilotOpen, setPilotOpen] = useState(false);
  const [lastCategoryId, setLastCategoryId] = useState<string | null | undefined>(undefined);

  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [session, setSession] = useState(0);

  const countByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of pilots) m.set(catKey(p.categoryId), (m.get(catKey(p.categoryId)) ?? 0) + 1);
    return m;
  }, [pilots]);

  const sections = useMemo(() => {
    const list = categories.map((c) => ({
      key: c.id,
      title: c.name,
      color: c.color,
      data: pilots.filter((p) => p.categoryId === c.id),
    }));
    const none = pilots.filter((p) => p.categoryId == null || !categories.some((c) => c.id === p.categoryId));
    if (none.length)
      list.push({ key: '__none__', title: NO_CATEGORY_NAME, color: NO_CATEGORY_COLOR, data: none });
    return list.filter((s) => s.data.length > 0);
  }, [pilots, categories]);

  const defaultCat = lastCategoryId !== undefined ? lastCategoryId : (categories[0]?.id ?? null);
  const nextNumber = (() => {
    const same = pilots.filter((p) => p.categoryId === defaultCat);
    return same.length ? Math.max(...same.map((p) => p.number)) + 1 : 1;
  })();

  const openPilot = (p: Pilot | null) => {
    setEditingPilot(p);
    setSession((n) => n + 1);
    setPilotOpen(true);
  };
  const openCategory = (c: Category | null) => {
    setEditingCat(c);
    setSession((n) => n + 1);
    setCatOpen(true);
  };

  const bottom = BottomTabInset + 16;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Pilotos',
          headerRight: () => (
            <Pressable
              testID={tab === 'pilotos' ? 'btn-novo-piloto' : 'btn-nova-categoria'}
              hitSlop={12}
              onPress={() => (tab === 'pilotos' ? openPilot(null) : openCategory(null))}
              accessibilityLabel={tab === 'pilotos' ? 'Adicionar piloto' : 'Adicionar categoria'}>
              <Text style={styles.plus}>+</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.screen}>
        <View style={styles.segment}>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'pilotos', label: `Pilotos (${pilots.length})` },
              { value: 'categorias', label: `Categorias (${categories.length})` },
            ]}
          />
        </View>

        {tab === 'pilotos' ? (
          <SectionList
            style={styles.list}
            contentContainerStyle={[styles.content, { paddingBottom: bottom }]}
            sections={sections}
            keyExtractor={(p) => p.id}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <CategoryHeader
                name={section.title}
                color={section.color}
                right={plural(section.data.length, 'piloto', 'pilotos')}
              />
            )}
            renderItem={({ item, index, section }) => (
              <Pressable
                testID={`piloto-${item.number}`}
                onPress={() => openPilot(item)}
                style={({ pressed }) => [
                  styles.row,
                  index === 0 && styles.first,
                  index === section.data.length - 1 && styles.last,
                  pressed && styles.pressed,
                ]}>
                <NumberBadge number={item.number} size="lg" color={section.color} />
                <View style={[styles.rowBody, index < section.data.length - 1 && styles.rowSep]}>
                  <Text style={[styles.name, styles.flex]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </Pressable>
            )}
            ListFooterComponent={<Text style={styles.version}>Corridas {APP_RELEASE}</Text>}
            ListEmptyComponent={
              <View style={styles.empty}>
                <EmptyHint text={'Nenhum piloto cadastrado.\nCadastre número, nome e categoria.'} />
                <Pressable testID="btn-cadastrar-primeiro" onPress={() => openPilot(null)} style={styles.cta}>
                  <Text style={styles.ctaText}>Cadastrar piloto</Text>
                </Pressable>
              </View>
            }
          />
        ) : (
          <FlatList
            style={styles.list}
            contentContainerStyle={[styles.content, { paddingBottom: bottom }]}
            data={categories}
            keyExtractor={(c) => c.id}
            ListHeaderComponent={
              categories.length ? (
                <Text style={styles.hint}>Ex.: 450, XC 35+, Nacional. Toque para renomear ou excluir.</Text>
              ) : undefined
            }
            renderItem={({ item, index }) => (
              <Pressable
                testID={`categoria-${item.name}`}
                onPress={() => openCategory(item)}
                style={({ pressed }) => [
                  styles.row,
                  index === 0 && styles.first,
                  index === categories.length - 1 && styles.last,
                  pressed && styles.pressed,
                ]}>
                <View style={styles.catIcon}>
                  <CategoryDot color={item.color} size={14} />
                </View>
                <View style={[styles.rowBody, index < categories.length - 1 && styles.rowSep]}>
                  <Text style={[styles.name, styles.flex]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.count}>{countByCat.get(item.id) ?? 0}</Text>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <EmptyHint text={'Nenhuma categoria.\nCrie as categorias e vincule aos pilotos.'} />
                <Pressable
                  testID="btn-criar-primeira-categoria"
                  onPress={() => openCategory(null)}
                  style={styles.cta}>
                  <Text style={styles.ctaText}>Criar categoria</Text>
                </Pressable>
              </View>
            }
          />
        )}
      </View>

      <PilotFormModal
        visible={pilotOpen}
        session={session}
        pilot={editingPilot}
        suggestedNumber={nextNumber}
        defaultCategoryId={defaultCat}
        categories={categories}
        onAddCategory={store.addCategory}
        onClose={() => setPilotOpen(false)}
        onSave={(input) => {
          const err = editingPilot ? store.updatePilot(editingPilot.id, input) : store.addPilot(input);
          if (!err) setLastCategoryId(input.categoryId);
          return err;
        }}
        onDelete={store.removePilot}
      />

      <CategoryFormModal
        visible={catOpen}
        session={session}
        category={editingCat}
        pilotCount={editingCat ? (countByCat.get(editingCat.id) ?? 0) : 0}
        onClose={() => setCatOpen(false)}
        onSave={(name) =>
          editingCat ? store.updateCategory(editingCat.id, name) : (store.addCategory(name).error ?? null)
        }
        onDelete={store.removeCategory}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  segment: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  list: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4 },
  hint: { color: C.textSecondary, fontSize: 13, marginVertical: 10, marginLeft: 4 },
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
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 14,
    gap: 8,
  },
  rowSep: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator },
  flex: { flex: 1 },
  name: { color: C.text, fontSize: 17 },
  count: { color: C.textSecondary, fontSize: 15 },
  chevron: { color: C.textTertiary, fontSize: 24 },
  catIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  cta: { backgroundColor: C.card, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  ctaText: { color: C.orange, fontSize: 15, fontWeight: '600' },
  version: { color: C.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 24 },
});
