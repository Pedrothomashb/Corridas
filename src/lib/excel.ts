import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

import { formatClock, formatDate } from './format';
import { lapRows, raceDuration, standings } from './race';
import type { Race } from './types';

const DAY = 86400000;
const LAP_FMT = '[mm]:ss.00';
const TOTAL_FMT = '[h]:mm:ss.00';

type Cell = string | number | null | { t: 'n'; v: number; z: string };

const lapCell = (ms: number | null): Cell => (ms == null ? '' : { t: 'n', v: ms / DAY, z: LAP_FMT });
const totalCell = (ms: number | null): Cell => (ms == null ? '' : { t: 'n', v: ms / DAY, z: TOTAL_FMT });

function sheet(rows: Cell[][], widths: number[], filterFromRow?: number) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = widths.map((wch) => ({ wch }));
  if (filterFromRow != null && rows.length > filterFromRow) {
    const lastCol = Math.max(...rows.slice(filterFromRow).map((r) => r.length)) - 1;
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({ s: { r: filterFromRow, c: 0 }, e: { r: rows.length - 1, c: lastCol } }),
    };
  }
  return ws;
}

export function buildWorkbook(race: Race): XLSX.WorkBook {
  const table = standings(race);
  const laps = lapRows(race);
  const duration = raceDuration(race);
  const best = laps.reduce<(typeof laps)[number] | null>((b, r) => (!b || r.lapMs < b.lapMs ? r : b), null);

  // Resumo
  const resumo: Cell[][] = [
    ['Corrida', race.name],
    ['Data', formatDate(race.startedAt)],
    ['Largada', formatClock(race.startedAt, true)],
    ['Término', race.finishedAt ? formatClock(race.finishedAt, true) : ''],
    ['Duração', totalCell(duration)],
    ['Pilotos', race.pilots.length],
    ['Total de voltas', laps.length],
    ['Volta mais rápida', best ? `#${best.pilot.number} ${best.pilot.name} — volta ${best.lapNumber}` : '—'],
    ['Tempo da volta mais rápida', lapCell(best?.lapMs ?? null)],
    ['Vencedor', table[0] && table[0].laps > 0 ? `#${table[0].pilot.number} ${table[0].pilot.name}` : '—'],
  ];

  // Classificação
  const classificacao: Cell[][] = [
    [
      'Pos',
      'Nº',
      'Piloto',
      'Equipe',
      'Voltas',
      'Tempo total',
      'Diferença',
      'Melhor volta',
      'Nº melhor volta',
      'Média',
      'Última volta',
    ],
  ];
  for (const s of table) {
    classificacao.push([
      s.position,
      s.pilot.number,
      s.pilot.name,
      s.pilot.team,
      s.laps,
      totalCell(s.totalMs),
      s.gap,
      lapCell(s.bestMs),
      s.bestLap ?? '',
      lapCell(s.avgMs == null ? null : Math.round(s.avgMs)),
      lapCell(s.lastLapMs),
    ]);
  }

  // Todas as voltas em ordem de passagem
  const voltas: Cell[][] = [['Ordem', 'Nº', 'Piloto', 'Equipe', 'Volta', 'Tempo da volta', 'Tempo de prova']];
  laps.forEach((r, i) => {
    voltas.push([
      i + 1,
      r.pilot.number,
      r.pilot.name,
      r.pilot.team,
      r.lapNumber,
      lapCell(r.lapMs),
      totalCell(r.totalMs),
    ]);
  });

  // Matriz volta x piloto
  const ordered = [...race.pilots].sort((a, b) => a.number - b.number);
  const lapTimesById = new Map(table.map((s) => [s.pilot.id, s]));
  const maxLaps = Math.max(0, ...table.map((s) => s.laps));
  const matriz: Cell[][] = [['Volta', ...ordered.map((p) => `#${p.number} ${p.name}`)]];
  for (let i = 0; i < maxLaps; i++) {
    matriz.push([i + 1, ...ordered.map((p) => lapCell(lapTimesById.get(p.id)?.lapTimes[i] ?? null))]);
  }
  matriz.push([]);
  matriz.push(['Melhor', ...ordered.map((p) => lapCell(lapTimesById.get(p.id)?.bestMs ?? null))]);
  matriz.push([
    'Média',
    ...ordered.map((p) => {
      const avg = lapTimesById.get(p.id)?.avgMs;
      return lapCell(avg == null ? null : Math.round(avg));
    }),
  ]);
  matriz.push(['Total', ...ordered.map((p) => totalCell(lapTimesById.get(p.id)?.totalMs ?? null))]);

  const wb = XLSX.utils.book_new();
  wb.Props = { Title: race.name, Author: 'CorridasApp', CreatedDate: new Date() };
  XLSX.utils.book_append_sheet(wb, sheet(resumo, [28, 34]), 'Resumo');
  XLSX.utils.book_append_sheet(
    wb,
    sheet(classificacao, [6, 6, 24, 18, 8, 14, 12, 13, 15, 12, 12], 0),
    'Classificação',
  );
  XLSX.utils.book_append_sheet(wb, sheet(voltas, [8, 6, 24, 16, 7, 15, 15], 0), 'Voltas');
  XLSX.utils.book_append_sheet(wb, sheet(matriz, [8, ...ordered.map(() => 18)]), 'Por piloto');
  return wb;
}

export function excelFileName(race: Race) {
  const d = new Date(race.startedAt);
  const stamp = `${formatDate(race.startedAt).replace(/\//g, '-')}_${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
  const base = race.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 40);
  return `${base || 'Corrida'}_${stamp}.xlsx`;
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Gera o .xlsx e abre a planilha de compartilhamento (WhatsApp, e-mail, Drive, Arquivos...). */
export async function exportRaceToExcel(race: Race) {
  const wb = buildWorkbook(race);
  const name = excelFileName(race);

  if (Platform.OS === 'web') {
    XLSX.writeFile(wb, name);
    return;
  }

  const data = XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer;
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(new Uint8Array(data));

  if (!(await Sharing.isAvailableAsync()))
    throw new Error('Compartilhamento indisponível neste dispositivo.');
  await Sharing.shareAsync(file.uri, {
    dialogTitle: 'Exportar corrida',
    ...(Platform.OS === 'android' ? { mimeType: XLSX_MIME } : {}),
  });
}
