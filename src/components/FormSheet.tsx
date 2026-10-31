import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/constants/theme';

/** Modal estilo "page sheet" do iOS com Cancelar / título / Salvar. */
export function FormSheet({
  visible,
  title,
  onClose,
  onSave,
  saveTestID,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saveTestID?: string;
  children: ReactNode;
}) {
  const pageSheet = Platform.OS === 'ios';
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={pageSheet ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}>
      <SheetBody title={title} onClose={onClose} onSave={onSave} saveTestID={saveTestID}>
        {children}
      </SheetBody>
    </Modal>
  );
}

function SheetBody({
  title,
  onClose,
  onSave,
  saveTestID,
  children,
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  saveTestID?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const pageSheet = Platform.OS === 'ios';
  return (
    <KeyboardAvoidingView
      style={[styles.sheet, { paddingTop: pageSheet ? 0 : insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.nav}>
        <Pressable hitSlop={10} onPress={onClose}>
          <Text style={styles.navBtn}>Cancelar</Text>
        </Pressable>
        <Text style={styles.navTitle}>{title}</Text>
        <Pressable testID={saveTestID} hitSlop={10} onPress={onSave}>
          <Text style={[styles.navBtn, styles.navBtnBold]}>Salvar</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={formStyles.field}>
      <Text style={formStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

export const Sep = () => <View style={formStyles.sep} />;

export const formStyles = StyleSheet.create({
  group: { backgroundColor: C.card, borderRadius: 12, overflow: 'hidden' },
  field: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 48 },
  label: { color: C.text, fontSize: 17, width: 90 },
  input: {
    flex: 1,
    color: C.text,
    fontSize: 17,
    paddingVertical: 12,
    textAlign: 'right',
    outlineWidth: 0,
  },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.separator, marginLeft: 16 },
  section: {
    color: C.textSecondary,
    fontSize: 13,
    textTransform: 'uppercase',
    marginLeft: 16,
    marginBottom: -8,
  },
  error: { color: C.red, fontSize: 14, paddingHorizontal: 4 },
  deleteBtn: { alignItems: 'center', paddingVertical: 14 },
  deleteText: { color: C.red, fontSize: 17 },
  hint: { color: C.textTertiary, fontSize: 13, paddingHorizontal: 16 },
});

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
});
