import { useCallback, useEffect, useMemo, useState } from 'react';
import { energyPer100g, nutrientDM, type Food } from '@erinacia/core';
import seed from '../../../../data/seed/foods.json';

export interface AppFood extends Food {
  origin: 'reference' | 'own';
  reference?: string;
  pricePerKg?: number;
  createdAt?: string;
}

const STORAGE_KEY = 'erinacia.foods.v1';
export const REFERENCE_SOURCE = 'Banco Erinacia';
export const OWN_SOURCE = 'Meus alimentos';

const referenceFoods: AppFood[] = (seed as unknown as (Food & { sources: { source: string; reference?: string }[] })[]).map(
  (f) => ({
    ...f,
    origin: 'reference',
    sources: [{ source: REFERENCE_SOURCE }],
    reference: f.sources[0]?.reference ?? undefined,
  }),
);

function loadOwn(): AppFood[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppFood[]) : [];
  } catch {
    return [];
  }
}

function saveOwn(foods: AppFood[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(foods));
  } catch {
    // Storage unavailable (private mode): changes last for this session only.
  }
}

export function useFoods() {
  const [own, setOwn] = useState<AppFood[]>(loadOwn);
  useEffect(() => saveOwn(own), [own]);

  const all = useMemo(() => [...own, ...referenceFoods], [own]);

  const upsert = useCallback((food: AppFood) => {
    setOwn((prev) => {
      const i = prev.findIndex((f) => f.id === food.id);
      if (i === -1) return [{ ...food, createdAt: new Date().toISOString() }, ...prev];
      const next = [...prev];
      next[i] = food;
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => setOwn((prev) => prev.filter((f) => f.id !== id)), []);

  return { foods: all, upsert, remove };
}

export function newFoodId() {
  return `own-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function sourceOf(f: AppFood) {
  return f.origin === 'own' ? OWN_SOURCE : f.sources[0]?.source ?? REFERENCE_SOURCE;
}

export function nutrientCount(f: AppFood) {
  return Object.values(f.nutrients).filter((v) => v !== undefined).length;
}

/** Headline figures for cards: DM %, crude protein on DM, and ME kcal/100 g as fed. */
export function headline(f: AppFood) {
  return {
    dm: f.dryMatter,
    proteinDM: nutrientDM(f, 'crude_protein'),
    energy: energyPer100g(f, 'atwater'),
  };
}

export const GROUP_COLORS: Record<string, { bg: string; fg: string }> = {
  Frutas: { bg: '#fdecd9', fg: '#7a3e0a' },
  Legumes: { bg: '#fff3c4', fg: '#5c4410' },
  Verduras: { bg: '#dcefdc', fg: '#1f5b33' },
  Volumosos: { bg: '#e5efe7', fg: '#14372c' },
  Carnes: { bg: '#f8dede', fg: '#7d1f1f' },
  'Derivados OA': { bg: '#f3e6f5', fg: '#5b2a63' },
  Cereais: { bg: '#f1ead9', fg: '#5a4520' },
  Sementes: { bg: '#ece4d8', fg: '#4f3a20' },
  Suplementos: { bg: '#dcebf2', fg: '#1e5368' },
  Ração: { bg: '#e3e7f6', fg: '#2c3a73' },
  Presas: { bg: '#f6e3d6', fg: '#6b3410' },
  Pescado: { bg: '#d9eef0', fg: '#174f57' },
};

export const GROUPS = Object.keys(GROUP_COLORS);

export function groupColor(group: string) {
  return GROUP_COLORS[group] ?? { bg: '#eceeea', fg: '#3a4a40' };
}

export const fmt = (v: number | undefined, digits = 1) =>
  v === undefined || Number.isNaN(v) ? '—' : v.toLocaleString('pt-PT', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
