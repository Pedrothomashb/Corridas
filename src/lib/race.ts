import { catKey, NO_CATEGORY_COLOR, NO_CATEGORY_NAME } from './categories';
import { formatGap, plural } from './format';
import type { Race, RaceGroup, RacePilot } from './types';

export function elapsedMs(race: Pick<Race, 'accumulatedMs' | 'runningSince'>, now = Date.now()) {
  return race.accumulatedMs + (race.runningSince != null ? Math.max(0, now - race.runningSince) : 0);
}

/** Duração total da corrida (relógio geral, desde a largada do 1º pelotão). */
export function raceDuration(race: Race) {
  return elapsedMs(race);
}

export function groupById(race: Race) {
  return new Map(race.groups.map((g) => [g.id, g]));
}

export function groupName(index: number) {
  return `Pelotão ${index + 1}`;
}

/** Categorias de um pelotão, na ordem da montagem, só as que têm pilotos. */
export function groupCategories(race: Race, group: RaceGroup) {
  const seen = new Map<string, { id: string | null; name: string; color: string }>();
  for (const id of group.categoryIds) {
    const p = race.pilots.find((x) => x.groupId === group.id && x.categoryId === id);
    if (p && !seen.has(catKey(id)))
      seen.set(catKey(id), { id, name: p.categoryName, color: p.categoryColor });
  }
  for (const p of race.pilots) {
    if (p.groupId === group.id && !seen.has(catKey(p.categoryId)))
      seen.set(catKey(p.categoryId), { id: p.categoryId, name: p.categoryName, color: p.categoryColor });
  }
  return [...seen.values()];
}

export type LapRow = {
  id: string;
  pilot: RacePilot;
  group: RaceGroup;
  lapNumber: number;
  lapMs: number;
  /** Tempo de prova do piloto (desde a largada do pelotão dele). */
  totalMs: number;
  /** Relógio geral da corrida. */
  raceMs: number;
};

/** Voltas em ordem cronológica, com número da volta e tempo de cada volta por piloto. */
export function lapRows(race: Race): LapRow[] {
  const pilots = new Map(race.pilots.map((p) => [p.id, p]));
  const groups = groupById(race);
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
    const group = groups.get(pilot.groupId);
    if (!group || group.startOffsetMs == null) continue;
    const start = group.startOffsetMs;
    const prev = lastT.get(lap.pilotId) ?? start;
    const n = (count.get(lap.pilotId) ?? 0) + 1;
    count.set(lap.pilotId, n);
    lastT.set(lap.pilotId, lap.t);
    rows.push({
      id: lap.id,
      pilot,
      group,
      lapNumber: n,
      lapMs: lap.t - prev,
      totalMs: lap.t - start,
      raceMs: lap.t,
    });
  }
  return rows;
}

/** Volta mais rápida (verde) e mais lenta (vermelha) de cada categoria. */
export function highlightByCategory(rows: LapRow[]) {
  const byCat = new Map<string, LapRow[]>();
  for (const r of rows) {
    const k = catKey(r.pilot.categoryId);
    const list = byCat.get(k) ?? [];
    list.push(r);
    byCat.set(k, list);
  }
  const out = new Map<string, 'best' | 'worst'>();
  for (const list of byCat.values()) {
    if (list.length < 2) continue;
    let best = list[0];
    let worst = list[0];
    for (const r of list) {
      if (r.lapMs < best.lapMs) best = r;
      if (r.lapMs > worst.lapMs) worst = r;
    }
    out.set(best.id, 'best');
    if (worst.id !== best.id) out.set(worst.id, 'worst');
  }
  return out;
}

export type Standing = {
  position: number;
  pilot: RacePilot;
  group: RaceGroup;
  laps: number;
  /** Tempo de prova do piloto na última passagem (null se não completou volta). */
  totalMs: number | null;
  bestMs: number | null;
  bestLap: number | null;
  avgMs: number | null;
  lastLapMs: number | null;
  lapTimes: number[];
  gap: string;
};

export type CategoryStanding = {
  key: string;
  categoryId: string | null;
  name: string;
  color: string;
  group: RaceGroup;
  groupIndex: number;
  rows: Standing[];
};

/**
 * Classificação por categoria (na ordem dos pelotões).
 * Mais voltas primeiro; empate → menor tempo de prova na última passagem.
 */
export function standingsByCategory(race: Race): CategoryStanding[] {
  const rows = lapRows(race);
  const lapTimes = new Map<string, number[]>();
  const lastTotal = new Map<string, number>();
  for (const r of rows) {
    const list = lapTimes.get(r.pilot.id) ?? [];
    list.push(r.lapMs);
    lapTimes.set(r.pilot.id, list);
    lastTotal.set(r.pilot.id, r.totalMs);
  }
  const groups = groupById(race);

  const out: CategoryStanding[] = [];
  race.groups.forEach((group, groupIndex) => {
    for (const cat of groupCategories(race, group)) {
      const pilots = race.pilots.filter((p) => p.groupId === group.id && p.categoryId === cat.id);
      const list: Standing[] = pilots.map((pilot) => {
        const times = lapTimes.get(pilot.id) ?? [];
        let bestMs: number | null = null;
        let bestLap: number | null = null;
        times.forEach((ms, i) => {
          if (bestMs == null || ms < bestMs) {
            bestMs = ms;
            bestLap = i + 1;
          }
        });
        return {
          position: 0,
          pilot,
          group: groups.get(pilot.groupId) ?? group,
          laps: times.length,
          totalMs: lastTotal.get(pilot.id) ?? null,
          bestMs,
          bestLap,
          avgMs: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
          lastLapMs: times.length ? times[times.length - 1] : null,
          lapTimes: times,
          gap: '',
        };
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
        if (s.laps === 0) s.gap = '—';
        else if (i === 0) s.gap = 'Líder';
        else if (s.laps === leader.laps) s.gap = formatGap((s.totalMs ?? 0) - (leader.totalMs ?? 0));
        else s.gap = `+${plural(leader.laps - s.laps, 'volta', 'voltas')}`;
      });

      out.push({
        key: `${group.id}:${catKey(cat.id)}`,
        categoryId: cat.id,
        name: cat.name,
        color: cat.color,
        group,
        groupIndex,
        rows: list,
      });
    }
  });
  return out;
}

export function fastestLap(race: Race) {
  let best: LapRow | null = null;
  for (const r of lapRows(race)) if (!best || r.lapMs < best.lapMs) best = r;
  return best;
}

export function fastestLapOf(rows: LapRow[], categoryId: string | null) {
  let best: LapRow | null = null;
  for (const r of rows) if (r.pilot.categoryId === categoryId && (!best || r.lapMs < best.lapMs)) best = r;
  return best;
}

/** Converte corridas salvas pela v1–v5 (sem pelotões/categorias) para o formato novo. */
export function normalizeRace(raw: any): Race {
  const r = { ...raw } as Race & { groups?: RaceGroup[] };
  if (!Array.isArray(r.groups) || r.groups.length === 0) {
    const gid = 'g1';
    r.groups = [{ id: gid, name: groupName(0), categoryIds: [null], startOffsetMs: 0 }];
    r.pilots = (raw.pilots ?? []).map((p: any) => ({
      id: p.id,
      number: p.number,
      name: p.name,
      categoryId: p.categoryId ?? null,
      categoryName: p.categoryName ?? NO_CATEGORY_NAME,
      categoryColor: p.categoryColor ?? NO_CATEGORY_COLOR,
      groupId: p.groupId ?? gid,
    }));
  }
  return r as Race;
}
