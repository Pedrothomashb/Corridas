import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

import { formatClock, formatDate, formatMs } from './format';
import { fastestLapOf, groupCategories, lapRows, raceDuration, standingsByCategory } from './race';
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
  const cats = standingsByCategory(race);
  const table = cats.flatMap((c) => c.rows);
  const laps = lapRows(race);
  const duration = raceDuration(race);

  // Resumo
  const resumo: Cell[][] = [
    ['Corrida', race.name],
    ['Data', formatDate(race.startedAt)],
    ['Início', formatClock(race.startedAt, true)],
    ['Término', race.finishedAt ? formatClock(race.finishedAt, true) : ''],
    ['Duração', totalCell(duration)],
    ['Pilotos', race.pilots.length],
    ['Total de voltas', laps.length],
    [],
    ['PELOTÕES'],
    ['Pelotão', 'Categorias', 'Largada (relógio)', 'Pilotos'],
  ];
  for (const g of race.groups) {
    resumo.push([
      g.name,
      groupCategories(race, g)
        .map((c) => c.name)
        .join(', '),
      g.startOffsetMs == null ? 'não largou' : totalCell(g.startOffsetMs),
      race.pilots.filter((p) => p.groupId === g.id).length,
    ]);
  }
  resumo.push(
    [],
    ['VENCEDORES'],
    ['Categoria', 'Vencedor', 'Voltas', 'Tempo total', 'Melhor volta da categoria'],
  );
  for (const c of cats) {
    const w = c.rows[0];
    const best = fastestLapOf(laps, c.categoryId);
    resumo.push([
      c.name,
      w && w.laps > 0 ? `#${w.pilot.number} ${w.pilot.name}` : '—',
      w ? w.laps : 0,
      totalCell(w?.totalMs ?? null),
      best
        ? `${formatMsExcel(best.lapMs)} (#${best.pilot.number} ${best.pilot.name}, volta ${best.lapNumber})`
        : '—',
    ]);
  }

  // Classificação por categoria
  const classificacao: Cell[][] = [
    [
      'Categoria',
      'Pelotão',
      'Pos',
      'Nº',
      'Piloto',
      'Voltas',
      'Tempo total',
      'Diferença',
      'Melhor volta',
      'Nº melhor volta',
      'Média',
      'Última volta',
    ],
  ];
  for (const c of cats) {
    for (const s of c.rows) {
      classificacao.push([
        c.name,
        c.group.name,
        s.position,
        s.pilot.number,
        s.pilot.name,
        s.laps,
        totalCell(s.totalMs),
        s.gap,
        lapCell(s.bestMs),
        s.bestLap ?? '',
        lapCell(s.avgMs == null ? null : Math.round(s.avgMs)),
        lapCell(s.lastLapMs),
      ]);
    }
  }

  // Todas as voltas em ordem de passagem
  const voltas: Cell[][] = [
    [
      'Ordem',
      'Nº',
      'Piloto',
      'Categoria',
      'Pelotão',
      'Volta',
      'Tempo da volta',
      'Tempo de prova',
      'Relógio da corrida',
    ],
  ];
  laps.forEach((r, i) => {
    voltas.push([
      i + 1,
      r.pilot.number,
      r.pilot.name,
      r.pilot.categoryName,
      r.group.name,
      r.lapNumber,
      lapCell(r.lapMs),
      totalCell(r.totalMs),
      totalCell(r.raceMs),
    ]);
  });

  // Matriz volta x piloto (agrupada por categoria)
  const maxLaps = Math.max(0, ...table.map((s) => s.laps));
  const matriz: Cell[][] = [
    ['Categoria', ...table.map((s) => s.pilot.categoryName)],
    ['Volta', ...table.map((s) => `#${s.pilot.number} ${s.pilot.name}`)],
  ];
  for (let i = 0; i < maxLaps; i++) {
    matriz.push([i + 1, ...table.map((s) => lapCell(s.lapTimes[i] ?? null))]);
  }
  matriz.push([]);
  matriz.push(['Melhor', ...table.map((s) => lapCell(s.bestMs))]);
  matriz.push(['Média', ...table.map((s) => lapCell(s.avgMs == null ? null : Math.round(s.avgMs)))]);
  matriz.push(['Total', ...table.map((s) => totalCell(s.totalMs))]);
  matriz.push(['Posição', ...table.map((s) => s.position)]);

  const wb = XLSX.utils.book_new();
  wb.Props = { Title: race.name, Author: 'CorridasApp', CreatedDate: new Date() };
  XLSX.utils.book_append_sheet(wb, sheet(resumo, [26, 30, 18, 14, 44]), 'Resumo');
  XLSX.utils.book_append_sheet(
    wb,
    sheet(classificacao, [16, 11, 5, 6, 24, 7, 14, 12, 13, 15, 12, 12], 0),
    'Classificação',
  );
  XLSX.utils.book_append_sheet(wb, sheet(voltas, [7, 6, 24, 16, 11, 6, 15, 15, 17], 0), 'Voltas');
  XLSX.utils.book_append_sheet(wb, sheet(matriz, [10, ...table.map(() => 18)]), 'Por piloto');
  return wb;
}

/** mm:ss.cc para texto dentro de células (o Excel formata as células numéricas). */
function formatMsExcel(ms: number) {
  return formatMs(ms).replace(',', '.');
}

export function excelFileName(race: Race) {
  const d = new Date(race.startedAt);
  const stamp = `${formatDate(race.startedAt).replace(/\//g, '-')}_${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
  const base = race.name
    .replace(/\s*·\s*\d{2}\/\d{2}\s+\d{2}:\d{2}\s*$/, '') // tira a data automática do nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 40);
  return `${base || 'Corrida'}_${stamp}.xlsx`;
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function workbookBytes(race: Race) {
  const data = XLSX.write(buildWorkbook(race), {
    type: 'array',
    bookType: 'xlsx',
    compression: true,
  }) as ArrayBuffer;
  return new Uint8Array(data);
}

/**
 * Android: o usuário escolhe uma pasta do celular (Downloads, Documentos...) e o .xlsx é salvo nela.
 * Retorna o nome do arquivo salvo, ou null se o usuário cancelou a escolha da pasta.
 */
export async function saveRaceToDevice(race: Race): Promise<string | null> {
  const name = excelFileName(race);
  let dir: Directory;
  try {
    dir = await Directory.pickDirectoryAsync();
  } catch {
    return null;
  }
  const file = dir.createFile(name, XLSX_MIME);
  await file.write(workbookBytes(race));
  return file.name || name;
}

/** Gera o .xlsx e abre a planilha de compartilhamento (WhatsApp, e-mail, Drive, Arquivos...). */
export async function exportRaceToExcel(race: Race) {
  const name = excelFileName(race);

  if (Platform.OS === 'web') {
    XLSX.writeFile(buildWorkbook(race), name);
    return;
  }

  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(workbookBytes(race));

  if (!(await Sharing.isAvailableAsync()))
    throw new Error('Compartilhamento indisponível neste dispositivo.');
  await Sharing.shareAsync(file.uri, {
    dialogTitle: 'Exportar corrida',
    ...(Platform.OS === 'android' ? { mimeType: XLSX_MIME } : {}),
  });
}
