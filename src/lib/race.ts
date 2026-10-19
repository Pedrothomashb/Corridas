import { formatGap, plural } from './format';
import type { Race, RacePilot } from './types';

export function elapsedMs(race: Pick<Race, 'accumulatedMs' | 'runningSince'>, now = Date.now()) {
  return race.accumulatedMs + (race.runningSince != null ? Math.max(0, now - race.runningSince) : 0);
}

/** Duração total da prova (para corridas finalizadas é o tempo acumulado). */
export function raceDuration(race: Race) {
  return elapsedMs(race);
}

export type LapRow = {
  id: string;
  pilot: RacePilot;
  lapNumber: number;
  lapMs: number;
  totalMs: number;
};

/** Voltas em ordem cronológica, com número da volta e tempo de cada volta por piloto. */
export function lapRows(race: Race): LapRow[] {
  const pilots = new Map(race.pilots.map((p) => [p.id, p]));
  const lastT = new Map<string, number>();
  const count = new Map<string, number>();
  const rows: LapRow[] = [];
  const sorted = race.laps
    .map((l, i) => ({ l, i }))
    .sort((a, b) => a.l.t - b.l.t || a.i - b.i)
    .map((x) => x.l);

  for (const lap of sorted) {
    const pilot = pilots.get(lap.pilotId);
    if (!pilot) continue;
    const prev = lastT.get(lap.pilotId) ?? 0;
    const n = (count.get(lap.pilotId) ?? 0) + 1;
    count.set(lap.pilotId, n);
    lastT.set(lap.pilotId, lap.t);
    rows.push({ id: lap.id, pilot, lapNumber: n, lapMs: lap.t - prev, totalMs: lap.t });
  }
  return rows;
}

/** Volta mais rápida (verde) e mais lenta (vermelha), como no cronômetro do iPhone. */
export function bestWorstIds(rows: LapRow[]) {
  if (rows.length < 2) return { bestId: null as string | null, worstId: null as string | null };
  let best = rows[0];
  let worst = rows[0];
  for (const r of rows) {
    if (r.lapMs < best.lapMs) best = r;
    if (r.lapMs > worst.lapMs) worst = r;
  }
  return { bestId: best.id, worstId: worst.id };
}

export type Standing = {
  position: number;
  pilot: RacePilot;
  laps: number;
  /** Tempo de prova na última passagem (null se não completou volta). */
  totalMs: number | null;
  bestMs: number | null;
  bestLap: number | null;
  avgMs: number | null;
  lastLapMs: number | null;
  lapTimes: number[];
  gap: string;
};

/** Classificação: mais voltas primeiro; empate → quem completou a última volta antes. */
export function standings(race: Race): Standing[] {
  const rows = lapRows(race);
  const byPilot = new Map<string, number[]>();
  const lastT = new Map<string, number>();
  for (const r of rows) {
    const list = byPilot.get(r.pilot.id) ?? [];
    list.push(r.lapMs);
    byPilot.set(r.pilot.id, list);
    lastT.set(r.pilot.id, r.totalMs);
  }

  const list = race.pilots.map((pilot) => {
    const lapTimes = byPilot.get(pilot.id) ?? [];
    let bestMs: number | null = null;
    let bestLap: number | null = null;
    lapTimes.forEach((ms, i) => {
      if (bestMs == null || ms < bestMs) {
        bestMs = ms;
        bestLap = i + 1;
      }
    });
    const totalMs = lastT.get(pilot.id) ?? null;
    return {
      position: 0,
      pilot,
      laps: lapTimes.length,
      totalMs,
      bestMs,
      bestLap,
      avgMs: lapTimes.length ? lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length : null,
      lastLapMs: lapTimes.length ? lapTimes[lapTimes.length - 1] : null,
      lapTimes,
      gap: '',
    } satisfies Standing;
  });

  list.sort((a, b) => {
    if (b.laps !== a.laps) return b.laps - a.laps;
    const ta = a.totalMs ?? Infinity;
    const tb = b.totalMs ?? Infinity;
    if (ta !== tb) return ta - tb;
    return a.pilot.number - b.pilot.number;
  });

  const leader = list[0];
  list.forEach((s, i) => {
    s.position = i + 1;
    if (i === 0 || s.laps === 0 || !leader) s.gap = i === 0 ? 'Líder' : '—';
    else if (s.laps === leader.laps) s.gap = formatGap((s.totalMs ?? 0) - (leader.totalMs ?? 0));
    else s.gap = `+${plural(leader.laps - s.laps, 'volta', 'voltas')}`;
  });
  return list;
}

export function fastestLap(race: Race) {
  const rows = lapRows(race);
  let best: LapRow | null = null;
  for (const r of rows) if (!best || r.lapMs < best.lapMs) best = r;
  return best;
}
