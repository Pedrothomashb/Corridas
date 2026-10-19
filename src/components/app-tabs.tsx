import { NativeTabs } from 'expo-router/native-tabs';

import { C } from '@/constants/theme';

export default function AppTabs() {
  return (
    <NativeTabs
      tintColor={C.orange}
      backgroundColor={C.bg}
      indicatorColor={C.card2}
      iconColor={{ default: C.textSecondary, selected: C.orange }}
      labelStyle={{ default: { color: C.textSecondary }, selected: { color: C.orange } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Corrida</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'stopwatch', selected: 'stopwatch.fill' }} md="timer" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="pilotos">
        <NativeTabs.Trigger.Label>Pilotos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="group" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="historico">
        <NativeTabs.Trigger.Label>Histórico</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" md="history" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
