import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { uid } from './id';
import { elapsedMs } from './race';
import { KEYS, load, save } from './storage';
import type { Pilot, PilotInput, Race } from './types';

type Store = {
  ready: boolean;
  pilots: Pilot[];
  races: Race[];
  current: Race | null;
  addPilot(input: PilotInput): string | null;
  updatePilot(id: string, input: PilotInput): string | null;
  removePilot(id: string): void;
  startRace(name: string, pilotIds: string[]): void;
  pauseRace(): void;
  resumeRace(): void;
  addLap(pilotId: string, at?: number): void;
  undoLap(): void;
  removeLap(lapId: string): void;
  finishRace(): Race | null;
  discardRace(): void;
  removeRace(id: string): void;
};

const Ctx = createContext<Store | null>(null);

function validatePilot(input: PilotInput, pilots: Pilot[], ignoreId?: string): string | null {
  if (!Number.isInteger(input.number) || input.number < 0 || input.number > 9999)
    return 'Informe um número de piloto válido (0 a 9999).';
  if (!input.name.trim()) return 'Informe o nome do piloto.';
  const dup = pilots.find((p) => p.number === input.number && p.id !== ignoreId);
  if (dup) return `O número ${input.number} já pertence a ${dup.name}.`;
  return null;
}

const byNumber = (a: { number: number }, b: { number: number }) => a.number - b.number;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [current, setCurrent] = useState<Race | null>(null);

  useEffect(() => {
    (async () => {
      const [p, r, c] = await Promise.all([
        load<Pilot[]>(KEYS.pilots, []),
        load<Race[]>(KEYS.races, []),
        load<Race | null>(KEYS.current, null),
      ]);
      setPilots(p);
      setRaces(r);
      setCurrent(c);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (ready) save(KEYS.pilots, pilots);
  }, [pilots, ready]);
  useEffect(() => {
    if (ready) save(KEYS.races, races);
  }, [races, ready]);
  useEffect(() => {
    if (ready) save(KEYS.current, current);
  }, [current, ready]);

  const addPilot = useCallback(
    (input: PilotInput) => {
      const clean = { ...input, name: input.name.trim(), team: input.team.trim() };
      const err = validatePilot(clean, pilots);
      if (err) return err;
      setPilots((prev) => [...prev, { id: uid(), createdAt: Date.now(), ...clean }].sort(byNumber));
      return null;
    },
    [pilots],
  );

  const updatePilot = useCallback(
    (id: string, input: PilotInput) => {
      const clean = { ...input, name: input.name.trim(), team: input.team.trim() };
      const err = validatePilot(clean, pilots, id);
      if (err) return err;
      setPilots((prev) => prev.map((p) => (p.id === id ? { ...p, ...clean } : p)).sort(byNumber));
      return null;
    },
    [pilots],
  );

  const removePilot = useCallback((id: string) => {
    setPilots((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const startRace = useCallback(
    (name: string, pilotIds: string[]) => {
      const now = Date.now();
      const selected = pilots
        .filter((p) => pilotIds.includes(p.id))
        .map(({ id, number, name: n, team }) => ({ id, number, name: n, team }))
        .sort(byNumber);
      setCurrent({
        id: uid(),
        name: name.trim(),
        startedAt: now,
        finishedAt: null,
        status: 'running',
        pilots: selected,
        laps: [],
        accumulatedMs: 0,
        runningSince: now,
      });
    },
    [pilots],
  );

  const pauseRace = useCallback(() => {
    setCurrent((r) =>
      r && r.status === 'running'
        ? { ...r, status: 'paused', accumulatedMs: elapsedMs(r), runningSince: null }
        : r,
    );
  }, []);

  const resumeRace = useCallback(() => {
    setCurrent((r) =>
      r && r.status === 'paused' ? { ...r, status: 'running', runningSince: Date.now() } : r,
    );
  }, []);

  const addLap = useCallback((pilotId: string, at?: number) => {
    const when = at ?? Date.now();
    setCurrent((r) => {
      if (!r || r.status !== 'running') return r;
      const t = elapsedMs(r, when);
      return { ...r, laps: [...r.laps, { id: uid(), pilotId, t }] };
    });
  }, []);

  const undoLap = useCallback(() => {
    setCurrent((r) => (r && r.laps.length ? { ...r, laps: r.laps.slice(0, -1) } : r));
  }, []);

  const removeLap = useCallback((lapId: string) => {
    setCurrent((r) => (r ? { ...r, laps: r.laps.filter((l) => l.id !== lapId) } : r));
  }, []);

  const finishRace = useCallback(() => {
    const r = current;
    if (!r) return null;
    const done: Race = {
      ...r,
      status: 'finished',
      accumulatedMs: elapsedMs(r),
      runningSince: null,
      finishedAt: Date.now(),
    };
    setRaces((prev) => [done, ...prev]);
    setCurrent(null);
    return done;
  }, [current]);

  const discardRace = useCallback(() => setCurrent(null), []);

  const removeRace = useCallback((id: string) => {
    setRaces((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const value = useMemo<Store>(
    () => ({
      ready,
      pilots,
      races,
      current,
      addPilot,
      updatePilot,
      removePilot,
      startRace,
      pauseRace,
      resumeRace,
      addLap,
      undoLap,
      removeLap,
      finishRace,
      discardRace,
      removeRace,
    }),
    [
      ready,
      pilots,
      races,
      current,
      addPilot,
      updatePilot,
      removePilot,
      startRace,
      pauseRace,
      resumeRace,
      addLap,
      undoLap,
      removeLap,
      finishRace,
      discardRace,
      removeRace,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fora do StoreProvider');
  return s;
}
