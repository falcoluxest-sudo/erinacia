import { useSyncExternalStore } from 'react';
import { curveFromIntervals, daysBetween, type CurvePoint, type Guideline } from '@erinacia/core';
import { GUIDES, guideName } from './diets';

export type Sex = 'male' | 'female' | 'unknown';
export type Rearing = 'parent' | 'hand' | 'rehab' | 'wild';
export type Stage = 'neonate' | 'juvenile' | 'subadult' | 'adult';

export interface Weighing {
  id: string;
  date: string;
  grams: number;
  condition?: number;
  note?: string;
}

export interface Animal {
  id: string;
  name: string;
  species: string;
  scientificName?: string;
  sex: Sex;
  birthDate?: string;
  birthEstimated?: boolean;
  admissionDate?: string;
  rearing: Rearing;
  stage: Stage;
  site?: string;
  notes?: string;
  curveId?: string;
  weighings: Weighing[];
}

export interface ReferenceCurve {
  id: string;
  name: string;
  species: string;
  sex?: Sex;
  rearing?: Rearing;
  points: CurvePoint[];
  citation: string;
  origin: 'guide' | 'own';
  note?: string;
}

export const SEX_LABEL: Record<Sex, string> = { male: 'Macho', female: 'Fêmea', unknown: 'Indeterminado' };
export const REARING_LABEL: Record<Rearing, string> = { parent: 'Criado pelos pais', hand: 'Criação artificial', rehab: 'Reabilitação', wild: 'Vida livre' };
export const STAGE_LABEL: Record<Stage, string> = { neonate: 'Neonato', juvenile: 'Juvenil', subadult: 'Subadulto', adult: 'Adulto' };

const A_KEY = 'erinacia.animals.v1';
const C_KEY = 'erinacia.curves.v1';

function load<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[];
  } catch {
    return [];
  }
}
function store(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // Storage unavailable: data lasts for this session only.
  }
}

export const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
export const today = () => new Date().toISOString().slice(0, 10);

/** Small persisted store shared by every component, written on each change. */
function createStore<T extends { id: string }>(key: string) {
  let items = load<T>(key);
  const listeners = new Set<() => void>();
  const emit = (next: T[]) => { items = next; store(key, items); listeners.forEach((l) => l()); };
  return {
    subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
    get: () => items,
    upsert: (x: T) => emit(items.some((i) => i.id === x.id) ? items.map((i) => (i.id === x.id ? x : i)) : [x, ...items]),
    remove: (id: string) => emit(items.filter((i) => i.id !== id)),
  };
}

const animalStore = createStore<Animal>(A_KEY);
const curveStore = createStore<ReferenceCurve>(C_KEY);

export function useAnimals() {
  const animals = useSyncExternalStore(animalStore.subscribe, animalStore.get);
  return { animals, upsert: animalStore.upsert, remove: animalStore.remove };
}

const guideCurves: ReferenceCurve[] = GUIDES.flatMap((g: Guideline) =>
  (g.growth ?? [])
    .filter((r) => r.birthWeightKg !== undefined && r.intervals?.length)
    .map((r, i) => ({
      id: `${g.id}-growth-${i}`,
      name: `${guideName(g)} — ${r.label}`,
      species: g.species[0]!.scientificName,
      sex: r.sex,
      rearing: r.rearing === 'hand' ? 'hand' : r.rearing === 'wild' ? 'wild' : 'parent',
      points: curveFromIntervals(r.birthWeightKg! * 1000, r.intervals!),
      citation: g.citation,
      origin: 'guide' as const,
      note: r.note,
    })),
);

export function useCurves() {
  const own = useSyncExternalStore(curveStore.subscribe, curveStore.get);
  return { curves: [...own, ...guideCurves], upsert: curveStore.upsert, remove: curveStore.remove };
}

export const sortedWeighings = (a: Animal) => [...a.weighings].sort((x, y) => x.date.localeCompare(y.date));

export function ageDays(a: Animal, date = today()): number | undefined {
  return a.birthDate ? daysBetween(a.birthDate, date) : undefined;
}

export function formatAge(days: number | undefined): string {
  if (days === undefined) return '—';
  if (days < 60) return `${days} dias`;
  if (days < 730) return `${Math.floor(days / 30.44)} meses`;
  return `${(days / 365.25).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} anos`;
}

export function formatWeight(grams: number | undefined): string {
  if (grams === undefined) return '—';
  return grams >= 10000 ? `${(grams / 1000).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} kg` : `${grams.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} g`;
}

/** Parses "idade;peso" lines (days;grams), accepting comma decimals and tabs. */
export function parseCurve(text: string): { points: CurvePoint[]; errors: number[] } {
  const points: CurvePoint[] = [];
  const errors: number[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const [a, b] = line.split(/[;\t]/).map((s) => Number(s.trim().replace(',', '.')));
    if (a === undefined || b === undefined || !Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b <= 0) errors.push(i + 1);
    else points.push({ ageDays: a, grams: b });
  });
  return { points: points.sort((x, y) => x.ageDays - y.ageDays), errors };
}
