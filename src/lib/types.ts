export type Category = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
};

export type Pilot = {
  id: string;
  number: number;
  name: string;
  categoryId: string | null;
  createdAt: number;
};

/** Cópia do piloto no momento da corrida (histórico não muda se o cadastro mudar). */
export type RacePilot = {
  id: string;
  number: number;
  name: string;
  categoryId: string | null;
  categoryName: string;
  categoryColor: string;
  groupId: string;
};

/** Pelotão: conjunto de categorias que largam juntas. */
export type RaceGroup = {
  id: string;
  name: string;
  categoryIds: (string | null)[];
  /** Momento da largada no relógio da corrida (ms). null = ainda não largou. */
  startOffsetMs: number | null;
};

/** Passagem pela linha: t = relógio da corrida (ms) no momento da volta. */
export type Lap = {
  id: string;
  pilotId: string;
  t: number;
};

export type RaceStatus = 'running' | 'paused' | 'finished';

export type Race = {
  id: string;
  name: string;
  /** Data/hora (relógio) do início da corrida (largada do 1º pelotão). */
  startedAt: number;
  finishedAt: number | null;
  status: RaceStatus;
  groups: RaceGroup[];
  pilots: RacePilot[];
  laps: Lap[];
  /** Tempo acumulado até a última pausa. */
  accumulatedMs: number;
  /** Date.now() do último início/retomada; null se pausada/finalizada. */
  runningSince: number | null;
};

export type PilotInput = {
  number: number;
  name: string;
  categoryId: string | null;
};

/** Montagem da próxima corrida (fica salva para as próximas baterias). */
export type RaceSetup = {
  groups: { id: string; categoryIds: (string | null)[] }[];
  excludedPilotIds: string[];
};
