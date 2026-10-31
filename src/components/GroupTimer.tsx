import { useEffect, useState } from 'react';
import { Text, type TextStyle } from 'react-native';

import { formatMs } from '@/lib/format';
import { elapsedMs } from '@/lib/race';
import type { Race, RaceGroup } from '@/lib/types';

/** Tempo de prova de um pelotão (desde a largada dele). */
export function GroupTimer({ race, group, style }: { race: Race; group: RaceGroup; style?: TextStyle }) {
  const [now, setNow] = useState(() => Date.now());
  const runningSince = race.runningSince;

  useEffect(() => {
    if (runningSince == null) return;
    const id = setInterval(() => setNow(Date.now()), 47);
    return () => clearInterval(id);
  }, [runningSince]);

  if (group.startOffsetMs == null) return null;
  const ms = elapsedMs(race, Math.max(now, runningSince ?? 0)) - group.startOffsetMs;
  return <Text style={style}>{formatMs(ms)}</Text>;
}
