import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/constants/theme';
import { confirm } from '@/lib/dialog';
import type { Pilot, PilotInput } from '@/lib/types';

type Props = {
  visible: boolean;
  /** Muda a cada abertura para reiniciar o formulário. */
  session: number;
  pilot: Pilot | null;
  suggestedNumber: number;
  onClose: () => void;
  onSave: (input: PilotInput) => string | null;
  onDelete?: (id: string) => void;
};

export function PilotFormModal(props: Props) {
  const pageSheet = Platform.OS === 'ios';
  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle={pageSheet ? 'pageSheet' : 'fullScreen'}
      onRequestClose={props.onClose}>
      <PilotForm key={props.session} {...props} />
    </Modal>
  );
}

function PilotForm({ pilot, suggestedNumber, onClose, onSave, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const [number, setNumber] = useState(() => (pilot ? String(pilot.number) : String(suggestedNumber)));
  const [name, setName] = useState(pilot?.name ?? '');
  const [team, setTeam] = useState(pilot?.team ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const n = Number.parseInt(number, 10);
    const err = onSave({ number: Number.isNaN(n) ? -1 : n, name, team });
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

  const pageSheet = Platform.OS === 'ios';

  return (
    <KeyboardAvoidingView
      style={[styles.sheet, { paddingTop: pageSheet ? 0 : insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.nav}>
        <Pressable hitSlop={10} onPress={onClose}>
          <Text style={styles.navBtn}>Cancelar</Text>
        </Pressable>
        <Text style={styles.navTitle}>{pilot ? 'Editar piloto' : 'Novo piloto'}</Text>
        <Pressable testID="btn-salvar-piloto" hitSlop={10} onPress={save}>
          <Text style={[styles.navBtn, styles.navBtnBold]}>Salvar</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.group}>
          <Field label="Número">
            <TextInput
              testID="input-numero"
              value={number}
              onChangeText={(t) => setNumber(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={4}
              style={styles.input}
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
              style={styles.input}
              placeholder="Nome do piloto"
              placeholderTextColor={C.textTertiary}
              autoCapitalize="words"
              autoFocus={!pilot}
              returnKeyType="next"
            />
          </Field>
          <Sep />
          <Field label="Equipe">
            <TextInput
              testID="input-equipe"
              value={team}
              onChangeText={setTeam}
              style={styles.input}
              placeholder="Opcional"
              placeholderTextColor={C.textTertiary}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={save}
            />
          </Field>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {pilot && onDelete && (
          <Pressable onPress={remove} style={[styles.group, styles.deleteBtn]}>
            <Text style={styles.deleteText}>Excluir piloto</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const Sep = () => <View style={styles.sep} />;

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: '#000' },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  navTitle: { color: C.text, fontSize: 17, fontWeight: '600' },
  navBtn: { color: C.orange, fontSize: 17 },
  navBtnBold: { fontWeight: '600' },
  content: { padding: 16, gap: 16 },
  group: { backgroundColor: C.card, borderRadius: 12, overflow: 'hidden' },
  field: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 48 },
  label: { color: C.text, fontSize: 17, width: 90 },
  input: { flex: 1, color: C.text, fontSize: 17, paddingVertical: 12, textAlign: 'right' },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.separator, marginLeft: 16 },
  error: { color: C.red, fontSize: 14, paddingHorizontal: 4 },
  deleteBtn: { alignItems: 'center', paddingVertical: 14 },
  deleteText: { color: C.red, fontSize: 17 },
});
