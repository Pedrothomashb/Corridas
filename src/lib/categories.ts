import type { Category } from './types';

export const NO_CATEGORY_NAME = 'Sem categoria';
export const NO_CATEGORY_COLOR = '#8E8E93';

/** Cores automáticas para novas categorias. */
export const CATEGORY_COLORS = [
  '#FF9F0A',
  '#0A84FF',
  '#30D158',
  '#BF5AF2',
  '#FF375F',
  '#64D2FF',
  '#FFD60A',
  '#AC8E68',
  '#5E5CE6',
  '#FF6482',
];

export function nextCategoryColor(categories: Category[]) {
  const used = new Set(categories.map((c) => c.color));
  return (
    CATEGORY_COLORS.find((c) => !used.has(c)) ?? CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length]
  );
}

export function categoryLabel(categories: Category[], id: string | null) {
  if (id == null) return { name: NO_CATEGORY_NAME, color: NO_CATEGORY_COLOR };
  const c = categories.find((x) => x.id === id);
  return c ? { name: c.name, color: c.color } : { name: NO_CATEGORY_NAME, color: NO_CATEGORY_COLOR };
}

/** Chave usada em mapas (null vira string fixa). */
export const catKey = (id: string | null) => id ?? '__none__';
