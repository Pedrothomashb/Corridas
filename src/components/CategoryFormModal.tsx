import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Field, FormSheet, formStyles } from '@/components/FormSheet';
import { C } from '@/constants/theme';
import { confirm } from '@/lib/dialog';
import { plural } from '@/lib/format';
import type { Category } from '@/lib/types';

type Props = {
  visible: boolean;
  session: number;
  category: Category | null;
  pilotCount: number;
  onClose: () => void;
  onSave: (name: string) => string | null;
  onDelete?: (id: string) => void;
};

export function CategoryFormModal(props: Props) {
  return <CategoryForm key={props.session} {...props} />;
}

function CategoryForm({ visible, category, pilotCount, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState(category?.name ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const err = onSave(name);
    if (err) setError(err);
    else onClose();
  };

  const remove = async () => {
    if (!category || !onDelete) return;
    const msg = pilotCount
      ? `${plural(pilotCount, 'piloto ficará', 'pilotos ficarão')} sem categoria. O histórico não é afetado.`
      : 'O histórico de corridas não é afetado.';
    if (await confirm(`Excluir "${category.name}"`, msg, 'Excluir', true)) {
      onDelete(category.id);
      onClose();
    }
  };

  return (
    <FormSheet
      visible={visible}
      title={category ? 'Editar categoria' : 'Nova categoria'}
      onClose={onClose}
      onSave={save}
      saveTestID="btn-salvar-categoria">
      <View style={formStyles.group}>
        <Field label="Nome">
          <TextInput
            testID="input-nome-categoria"
            value={name}
            onChangeText={setName}
            style={formStyles.input}
            placeholder="Ex.: 450, XC 35+, Nacional"
            placeholderTextColor={C.textTertiary}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={save}
          />
        </Field>
      </View>
      {category && (
        <Text style={formStyles.hint}>{plural(pilotCount, 'piloto', 'pilotos')} nesta categoria.</Text>
      )}
      {error && <Text style={formStyles.error}>{error}</Text>}
      {category && onDelete && (
        <Pressable onPress={remove} style={[formStyles.group, formStyles.deleteBtn]}>
          <Text style={formStyles.deleteText}>Excluir categoria</Text>
        </Pressable>
      )}
    </FormSheet>
  );
}
