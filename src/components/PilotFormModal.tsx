import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { Field, FormSheet, formStyles, Sep } from '@/components/FormSheet';
import { C } from '@/constants/theme';
import { NO_CATEGORY_COLOR, NO_CATEGORY_NAME } from '@/lib/categories';
import { confirm } from '@/lib/dialog';
import type { Category, Pilot, PilotInput } from '@/lib/types';

type Props = {
  visible: boolean;
  /** Muda a cada abertura para reiniciar o formulário. */
  session: number;
  pilot: Pilot | null;
  suggestedNumber: number;
  defaultCategoryId: string | null;
  categories: Category[];
  onAddCategory: (name: string) => { id?: string; error?: string };
  onClose: () => void;
  onSave: (input: PilotInput) => string | null;
  onDelete?: (id: string) => void;
};

export function PilotFormModal(props: Props) {
  return <PilotForm key={props.session} {...props} />;
}

function PilotForm({
  visible,
  pilot,
  suggestedNumber,
  defaultCategoryId,
  categories,
  onAddCategory,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [number, setNumber] = useState(() => (pilot ? String(pilot.number) : String(suggestedNumber)));
  const [name, setName] = useState(pilot?.name ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(pilot ? pilot.categoryId : defaultCategoryId);
  const [newCat, setNewCat] = useState<string | null>(categories.length === 0 ? '' : null);
  const [error, setError] = useState<string | null>(null);

  const createCategory = () => {
    if (newCat == null) return;
    const r = onAddCategory(newCat);
    if (r.error) {
      setError(r.error);
      return;
    }
    setError(null);
    setCategoryId(r.id ?? null);
    setNewCat(null);
  };

  const save = () => {
    const n = Number.parseInt(number, 10);
    const err = onSave({ number: Number.isNaN(n) ? -1 : n, name, categoryId });
    if (err) setError(err);
    else onClose();
  };

  const remove = async () => {
    if (!pilot || !onDelete) return;
    if (
      await confirm(
        'Excluir piloto',
        `Excluir #${pilot.number} ${pilot.name}? O histórico de corridas não é afetado.`,
        'Excluir',
        true,
      )
    ) {
      onDelete(pilot.id);
      onClose();
    }
  };

  return (
    <FormSheet
      visible={visible}
      title={pilot ? 'Editar piloto' : 'Novo piloto'}
      onClose={onClose}
      onSave={save}
      saveTestID="btn-salvar-piloto">
      <View style={formStyles.group}>
        <Field label="Número">
          <TextInput
            testID="input-numero"
            value={number}
            onChangeText={(t) => setNumber(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={4}
            style={formStyles.input}
            placeholder="Ex.: 7"
            placeholderTextColor={C.textTertiary}
            selectTextOnFocus
          />
        </Field>
        <Sep />
        <Field label="Nome">
          <TextInput
            testID="input-nome"
            value={name}
            onChangeText={setName}
            style={formStyles.input}
            placeholder="Nome do piloto"
            placeholderTextColor={C.textTertiary}
            autoCapitalize="words"
            autoFocus={!pilot}
            returnKeyType="done"
          />
        </Field>
      </View>

      <Text style={formStyles.section}>Categoria</Text>
      <View style={[formStyles.group, styles.chips]}>
        {categories.map((c) => (
          <Chip
            key={c.id}
            testID={`cat-chip-${c.name}`}
            label={c.name}
            color={c.color}
            active={categoryId === c.id}
            onPress={() => setCategoryId(c.id)}
          />
        ))}
        <Chip
          label={NO_CATEGORY_NAME}
          color={NO_CATEGORY_COLOR}
          active={categoryId == null}
          onPress={() => setCategoryId(null)}
        />
        {newCat == null ? (
          <Pressable testID="btn-nova-categoria-inline" onPress={() => setNewCat('')} style={styles.newChip}>
            <Text style={styles.newChipText}>+ Nova</Text>
          </Pressable>
        ) : (
          <View style={styles.newRow}>
            <TextInput
              testID="input-nova-categoria"
              value={newCat}
              onChangeText={setNewCat}
              placeholder="Nova categoria (ex.: 450)"
              placeholderTextColor={C.textTertiary}
              style={styles.newInput}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={createCategory}
            />
            <Pressable testID="btn-criar-categoria-inline" onPress={createCategory} style={styles.addBtn}>
              <Text style={styles.addBtnText}>Criar</Text>
            </Pressable>
          </View>
        )}
      </View>
      <Text style={formStyles.hint}>O mesmo número pode existir em categorias diferentes.</Text>

      {error && <Text style={formStyles.error}>{error}</Text>}

      {pilot && onDelete && (
        <Pressable onPress={remove} style={[formStyles.group, formStyles.deleteBtn]}>
          <Text style={formStyles.deleteText}>Excluir piloto</Text>
        </Pressable>
      )}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  newChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.textTertiary,
  },
  newChipText: { color: C.orange, fontSize: 14, fontWeight: '600' },
  newRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  newInput: {
    flex: 1,
    color: C.text,
    fontSize: 16,
    backgroundColor: C.card2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    outlineWidth: 0,
  },
  addBtn: { backgroundColor: C.orange, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText: { color: C.bg, fontSize: 15, fontWeight: '700' },
});
