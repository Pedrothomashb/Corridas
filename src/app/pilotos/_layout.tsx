import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/constants/navigation';

export default function PilotosLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}
