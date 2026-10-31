import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { catKey, categoryLabel, nextCategoryColor } from './categories';
import { uid } from './id';
import { elapsedMs, groupName, normalizeRace } from './race';
import { KEYS, load, save } from './storage';
import type { Category, Pilot, PilotInput, Race, RaceGroup, RacePilot, RaceSetup } from './types';

type Store = {
  ready: boolean;
  categories: Category[];
  pilots: Pilot[];
  races: Race[];
  current: Race | null;
  setup: RaceSetup;

  addCategory(name: string): { id?: string; error?: string };
  updateCategory(id: string, name: string): string | null;
  removeCategory(id: string): void;

  addPilot(input: PilotInput): string | null;
  updatePilot(id: string, input: PilotInput): string | null;
  removePilot(id: string): void;

  setSetup(setup: RaceSetup): void;
  startRace(name: string): void;
  startGroup(groupId: string, at?: number): void;
  cancelGroupStart(groupId: string): void;
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

const EMPTY_SETUP: RaceSetup = { groups: [], excludedPilotIds: [] };

function validatePilot(input: PilotInput, pilots: Pilot[], categories: Category[], ignoreId?: string) {
  if (!Number.isInteger(input.number) || input.number < 0 || input.number > 9999)
    return 'Informe um número de piloto válido (0 a 9999).';
  if (!input.name.trim()) return 'Informe o nome do piloto.';
  const dup = pilots.find(
    (p) => p.number === input.number && p.categoryId === input.categoryId && p.id !== ignoreId,
  );
  if (dup) {
    const cat = categoryLabel(categories, input.categoryId).name;
    return `O número ${input.number} já pertence a ${dup.name} (${cat}).`;
  }
  return null;
}

function validateCategoryName(name: string, categories: Category[], ignoreId?: string) {
  const n = name.trim();
  if (!n) return 'Informe o nome da categoria.';
  if (categories.some((c) => c.id !== ignoreId && c.name.toLowerCase() === n.toLowerCase()))
    return `Já existe a categoria "${n}".`;
  return null;
}

const byNumber = (a: { number: number }, b: { number: number }) => a.number - b.number;

/** Montagem padrão: um pelotão com todas as categorias que têm pilotos. */
export function defaultSetup(categories: Category[], pilots: Pilot[]): RaceSetup {
  const ids: (string | null)[] = categories
    .filter((c) => pilots.some((p) => p.categoryId === c.id))
    .map((c) => c.id);
  if (pilots.some((p) => p.categoryId == null)) ids.push(null);
  return { groups: [{ id: uid(), categoryIds: ids }], excludedPilotIds: [] };
}

/** Remove da montagem categorias/pilotos que não existem mais. */
export function sanitizeSetup(setup: RaceSetup, categories: Category[], pilots: Pilot[]): RaceSetup {
  const valid = new Set(categories.map((c) => c.id));
  const groups = setup.groups.map((g) => ({
    ...g,
    categoryIds: g.categoryIds.filter((id) => id == null || valid.has(id)),
  }));
  if (groups.length === 0) return defaultSetup(categories, pilots);
  const pilotIds = new Set(pilots.map((p) => p.id));
  return { groups, excludedPilotIds: setup.excludedPilotIds.filter((id) => pilotIds.has(id)) };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [current, setCurrent] = useState<Race | null>(null);
  const [setup, setSetupState] = useState<RaceSetup>(EMPTY_SETUP);

  useEffect(() => {
    (async () => {
      const [cats, p, r, c, s] = await Promise.all([
        load<Category[]>(KEYS.categories, []),
        load<Pilot[]>(KEYS.pilots, []),
        load<unknown[]>(KEYS.races, []),
        load<unknown | null>(KEYS.current, null),
        load<RaceSetup>(KEYS.setup, EMPTY_SETUP),
      ]);
      setCategories(cats);
      // v1–v5 tinham "equipe"; agora o piloto pertence a uma categoria
      setPilots(
        p.map((x) => ({
          id: x.id,
          number: x.number,
          name: x.name,
          categoryId: x.categoryId ?? null,
          createdAt: x.createdAt,
        })),
      );
      setRaces(r.map(normalizeRace));
      setCurrent(c ? normalizeRace(c) : null);
      setSetupState(s ?? EMPTY_SETUP);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (ready) save(KEYS.categories, categories);
  }, [categories, ready]);
  useEffect(() => {
    if (ready) save(KEYS.pilots, pilots);
  }, [pilots, ready]);
  useEffect(() => {
    if (ready) save(KEYS.races, races);
  }, [races, ready]);
  useEffect(() => {
    if (ready) save(KEYS.current, current);
  }, [current, ready]);
  useEffect(() => {
    if (ready) save(KEYS.setup, setup);
  }, [setup, ready]);

  // ---------------- categorias
  const addCategory = useCallback(
    (name: string) => {
      const error = validateCategoryName(name, categories);
      if (error) return { error };
      const cat: Category = {
        id: uid(),
        name: name.trim(),
        color: nextCategoryColor(categories),
        createdAt: Date.now(),
      };
      setCategories((prev) => [...prev, cat]);
      return { id: cat.id };
    },
    [categories],
  );

  const updateCategory = useCallback(
    (id: string, name: string) => {
      const error = validateCategoryName(name, categories, id);
      if (error) return error;
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)));
      return null;
    },
    [categories],
  );

  const removeCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setPilots((prev) => prev.map((p) => (p.categoryId === id ? { ...p, categoryId: null } : p)));
    setSetupState((s) => ({
      ...s,
      groups: s.groups.map((g) => ({ ...g, categoryIds: g.categoryIds.filter((c) => c !== id) })),
    }));
  }, []);

  // ---------------- pilotos
  const addPilot = useCallback(
    (input: PilotInput) => {
      const clean = { ...input, name: input.name.trim() };
      const err = validatePilot(clean, pilots, categories);
      if (err) return err;
      setPilots((prev) => [...prev, { id: uid(), createdAt: Date.now(), ...clean }].sort(byNumber));
      return null;
    },
    [pilots, categories],
  );

  const updatePilot = useCallback(
    (id: string, input: PilotInput) => {
      const clean = { ...input, name: input.name.trim() };
      const err = validatePilot(clean, pilots, categories, id);
      if (err) return err;
      setPilots((prev) => prev.map((p) => (p.id === id ? { ...p, ...clean } : p)).sort(byNumber));
      return null;
    },
    [pilots, categories],
  );

  const removePilot = useCallback((id: string) => {
    setPilots((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ---------------- corrida
  const setSetup = useCallback((s: RaceSetup) => setSetupState(s), []);

  const startRace = useCallback(
    (name: string) => {
      const s = sanitizeSetup(setup, categories, pilots);
      const excluded = new Set(s.excludedPilotIds);
      const groups: RaceGroup[] = [];
      const racePilots: RacePilot[] = [];

      for (const g of s.groups) {
        const keys = new Set(g.categoryIds.map(catKey));
        const members = pilots.filter((p) => keys.has(catKey(p.categoryId)) && !excluded.has(p.id));
        if (!members.length) continue;
        const group: RaceGroup = {
          id: g.id,
          name: groupName(groups.length),
          categoryIds: g.categoryIds,
          startOffsetMs: groups.length === 0 ? 0 : null,
        };
        groups.push(group);
        for (const p of [...members].sort(byNumber)) {
          const label = categoryLabel(categories, p.categoryId);
          racePilots.push({
            id: p.id,
            number: p.number,
            name: p.name,
            categoryId: p.categoryId,
            categoryName: label.name,
            categoryColor: label.color,
            groupId: group.id,
          });
        }
      }
      if (!groups.length) return;

      const now = Date.now();
      setCurrent({
        id: uid(),
        name: name.trim(),
        startedAt: now,
        finishedAt: null,
        status: 'running',
        groups,
        pilots: racePilots,
        laps: [],
        accumulatedMs: 0,
        runningSince: now,
      });
    },
    [setup, categories, pilots],
  );

  const startGroup = useCallback((groupId: string, at?: number) => {
    const when = at ?? Date.now();
    setCurrent((r) => {
      if (!r || r.status !== 'running') return r;
      const t = elapsedMs(r, when);
      return {
        ...r,
        groups: r.groups.map((g) =>
          g.id === groupId && g.startOffsetMs == null ? { ...g, startOffsetMs: t } : g,
        ),
      };
    });
  }, []);

  const cancelGroupStart = useCallback((groupId: string) => {
    setCurrent((r) => {
      if (!r) return r;
      const ids = new Set(r.pilots.filter((p) => p.groupId === groupId).map((p) => p.id));
      if (r.laps.some((l) => ids.has(l.pilotId))) return r;
      return { ...r, groups: r.groups.map((g) => (g.id === groupId ? { ...g, startOffsetMs: null } : g)) };
    });
  }, []);

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
      const pilot = r.pilots.find((p) => p.id === pilotId);
      const group = r.groups.find((g) => g.id === pilot?.groupId);
      if (!group || group.startOffsetMs == null) return r;
      const t = elapsedMs(r, when);
      if (t <= group.startOffsetMs) return r;
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
      categories,
      pilots,
      races,
      current,
      setup,
      addCategory,
      updateCategory,
      removeCategory,
      addPilot,
      updatePilot,
      removePilot,
      setSetup,
      startRace,
      startGroup,
      cancelGroupStart,
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
      categories,
      pilots,
      races,
      current,
      setup,
      addCategory,
      updateCategory,
      removeCategory,
      addPilot,
      updatePilot,
      removePilot,
      setSetup,
      startRace,
      startGroup,
      cancelGroupStart,
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
