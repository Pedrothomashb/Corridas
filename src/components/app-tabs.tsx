import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { C } from '@/constants/theme';

function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        props.onPressIn?.(ev);
      }}
    />
  );
}

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: C.orange,
        tabBarInactiveTintColor: C.textSecondary,
        tabBarStyle: {
          backgroundColor: '#0D0D0D',
          borderTopColor: C.separator,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        sceneStyle: { backgroundColor: C.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Corrida',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? 'stopwatch.fill' : 'stopwatch'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pilotos"
        options={{
          title: 'Pilotos',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? 'person.2.fill' : 'person.2'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock.arrow.circlepath" color={color} />,
        }}
      />
    </Tabs>
  );
}
