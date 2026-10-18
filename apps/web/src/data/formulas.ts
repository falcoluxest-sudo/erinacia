import type { Guideline } from '@erinacia/core';
import curated from '../../../../data/references/metabolic_formulas.json';
import banco from '../../../../data/seed/metabolic_formulas.json';

export type Taxon = 'mammal' | 'bird' | 'reptile' | 'aquatic';
export type RateType = 'TMB' | 'NEM' | 'NEP' | 'TMC';
export type Status = 'verified' | 'to_verify' | 'author' | 'guide';

export interface FormulaRef {
  id: string;
  taxon: Taxon;
  name: string;
  description?: string;
  type: RateType;
  coefficient: number;
  coefficientRange?: [number, number];
  exponent: number;
  weightUnit: 'kg' | 'g';
  energyUnit: 'kcal' | 'kJ';
  citation: string;
  status: Status;
  note?: string;
}

export const TAXON_LABEL: Record<Taxon, string> = { mammal: 'Mamíferos', bird: 'Aves', reptile: 'Répteis', aquatic: 'Aquáticos' };
export const TYPE_LABEL: Record<RateType, string> = {
  TMB: 'Taxa metabólica basal',
  NEM: 'Necessidade energética de manutenção',
  NEP: 'Necessidade energética (padrão)',
  TMC: 'Taxa metabólica de campo',
};
export const STATUS_LABEL: Record<Status, string> = {
  verified: 'Verificada',
  to_verify: 'A verificar',
  author: 'Banco da autora',
  guide: 'Guia da biblioteca',
};

const taxonFromGroup = (g: string): Taxon =>
  /^aves?\b/i.test(g) ? 'bird' : /r[ée]ptil/i.test(g) ? 'reptile' : /peix|aqu[áa]t/i.test(g) ? 'aquatic' : 'mammal';

const fromBanco: FormulaRef[] = (banco as { id: string; group: string; type: string; constant: number; exponent: number; weightUnit: string; energyUnit: string; reference?: string; year?: number }[]).map((f) => ({
  id: `banco-${f.id}`,
  taxon: taxonFromGroup(f.group),
  name: f.group,
  type: (['TMB', 'NEM', 'NEP'].includes(f.type) ? f.type : 'NEM') as RateType,
  coefficient: f.constant,
  exponent: f.exponent,
  weightUnit: f.weightUnit === 'g' ? 'g' : 'kg',
  energyUnit: f.energyUnit === 'kJ' ? 'kJ' : 'kcal',
  citation: f.reference ?? '',
  status: 'author',
}));

const guideFiles = import.meta.glob('../../../../data/references/guidelines/*.json', { eager: true, import: 'default' });
const fromGuides: FormulaRef[] = (Object.values(guideFiles) as Guideline[]).flatMap((g) =>
  (g.energy ?? []).map((e) => ({
    id: `${g.id}-${e.id}`,
    taxon: 'mammal' as Taxon,
    name: `${g.species.map((s) => s.commonName.pt).join(', ')} — ${e.label}`,
    description: e.note,
    type: (e.energyType === 'BMR' ? 'TMB' : e.energyType === 'FMR' ? 'TMC' : 'NEM') as RateType,
    coefficient: e.coefficient,
    coefficientRange: e.coefficientRange,
    exponent: e.exponent,
    weightUnit: e.weightUnit,
    energyUnit: e.energyUnit,
    citation: g.citation,
    status: 'guide' as Status,
  })),
);

export const FORMULAS: FormulaRef[] = [...(curated as FormulaRef[]), ...fromBanco, ...fromGuides];

/** kcal/day for a body weight in kg; ranges return [low, mid, high]. */
export function evaluate(f: FormulaRef, weightKg: number): { low: number; mid: number; high: number } {
  const w = f.weightUnit === 'g' ? weightKg * 1000 : weightKg;
  const toKcal = (v: number) => (f.energyUnit === 'kJ' ? v / 4.184 : v);
  const at = (a: number) => toKcal(a * Math.pow(w, f.exponent));
  const [a, b] = f.coefficientRange ?? [f.coefficient, f.coefficient];
  return { low: at(a), mid: at(f.coefficient), high: at(b) };
}

export const num = (v: number, d = 2) => v.toLocaleString('pt-PT', { maximumFractionDigits: d });
