import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';

import { C } from '@/constants/theme';

/** Versão web (para testar no navegador): barra inferior simples no estilo iOS. */
export default function AppTabs() {
  return (
    <Tabs style={styles.root}>
      <View style={styles.slot}>
        <TabSlot />
      </View>
      <TabList style={styles.bar}>
        <TabTrigger name="index" href="/" asChild>
          <TabButton icon="⏱">Corrida</TabButton>
        </TabTrigger>
        <TabTrigger name="pilotos" href="/pilotos" asChild>
          <TabButton icon="👥">Pilotos</TabButton>
        </TabTrigger>
        <TabTrigger name="historico" href="/historico" asChild>
          <TabButton icon="🕘">Histórico</TabButton>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, icon, ...props }: TabTriggerSlotProps & { icon: string }) {
  const color = isFocused ? C.orange : C.textSecondary;
  return (
    <Pressable {...(props as PressableProps)} style={styles.btn}>
      <Text style={[styles.icon, { opacity: isFocused ? 1 : 0.6 }]}>{icon}</Text>
      <Text style={[styles.label, { color }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  slot: { flex: 1 },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0D0D0D',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.separator,
    paddingTop: 6,
    paddingBottom: 10,
  },
  btn: { alignItems: 'center', gap: 2, paddingHorizontal: 16 },
  icon: { fontSize: 20 },
  label: { fontSize: 11, fontWeight: '500' },
});
