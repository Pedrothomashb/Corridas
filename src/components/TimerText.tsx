import { useEffect, useState } from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';

import { C, MONO_DIGITS, THIN } from '@/constants/theme';
import { formatMs } from '@/lib/format';
import { elapsedMs } from '@/lib/race';
import type { Race } from '@/lib/types';

/** Display grande do cronômetro; atualiza a cada frame só enquanto a corrida está rodando. */
export function TimerText({ race, fontSize }: { race: Race | null; fontSize: number }) {
  const [now, setNow] = useState(() => Date.now());
  const runningSince = race?.runningSince ?? null;

  useEffect(() => {
    if (runningSince == null) return;
    let id = 0;
    const tick = () => {
      setNow(Date.now());
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [runningSince]);

  const ms = race ? elapsedMs(race, Math.max(now, runningSince ?? 0)) : 0;
  const style: TextStyle = { fontSize, lineHeight: fontSize * 1.15 };

  return (
    <Text testID="timer" style={[styles.timer, style]} numberOfLines={1} adjustsFontSizeToFit>
      {formatMs(ms)}
    </Text>
  );
}

const styles = StyleSheet.create({
  timer: {
    color: C.text,
    textAlign: 'center',
    letterSpacing: -1,
    ...THIN,
    ...MONO_DIGITS,
  },
});
