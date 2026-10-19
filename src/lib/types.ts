export type Pilot = {
  id: string;
  number: number;
  name: string;
  team: string;
  createdAt: number;
};

/** Cópia do piloto no momento da corrida (histórico não muda se o cadastro mudar). */
export type RacePilot = {
  id: string;
  number: number;
  name: string;
  team: string;
};

/** Passagem pela linha: t = tempo de prova (ms) no momento da volta. */
export type Lap = {
  id: string;
  pilotId: string;
  t: number;
};

export type RaceStatus = 'running' | 'paused' | 'finished';

export type Race = {
  id: string;
  name: string;
  /** Data/hora (relógio) da largada. */
  startedAt: number;
  finishedAt: number | null;
  status: RaceStatus;
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
  team: string;
};
