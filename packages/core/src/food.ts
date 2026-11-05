import { NON_CONCENTRATION } from './nutrients';

/** Metabolizable-energy models available per food, in kcal/100 g as fed. */
export type EnergyModel =
  | 'ruminant'
  | 'herbivore_monogastric'
  | 'carnivore'
  | 'primate_fermenter'
  | 'primate'
  | 'atwater';

export interface FoodSourceRef {
  /** e.g. "INSA (PT)", "CIQUAL (FR)", "USDA FDC", "Banco Erinacia". */
  source: string;
  /** Identifier of the item in the source table, when there is one. */
  code?: string;
  version?: string;
}

/**
 * Whether the founder has checked reference data against its source.
 * Absent means "pending": nothing is treated as validated by default.
 */
export type ReviewStatus = 'pending' | 'reviewed' | 'reservations';

export interface Review {
  status: ReviewStatus;
  /** ISO date of the review. */
  date?: string;
  note?: string;
}

/**
 * How a single value was obtained. Values without a note are measured
 * (analytical result as published, only unit or basis converted).
 * - calculated: derived from other values (by difference, cross-table conversion…);
 * - estimated: an assumption is involved (midpoint of a published range, conversion factor…).
 */
export type ValueOrigin = 'measured' | 'calculated' | 'estimated';

export interface ValueNote {
  origin: ValueOrigin;
  note?: string;
}

export interface Food {
  id: string;
  name: string;
  group: string;
  /** Classification path in the source table (e.g. FoodEx2 levels 1–3 for INSA). */
  classification?: string[];
  /** Dry matter, % as fed. */
  dryMatter: number;
  /** Nutrient values as fed (MN), keyed by NUTRIENTS[].key, in the catalog unit. */
  nutrients: Record<string, number | undefined>;
  /** ME in kcal/100 g as fed, per model. Atwater is derived when absent. */
  energy: Partial<Record<EnergyModel, number>>;
  sources: FoodSourceRef[];
  /** How many analytical records back the values, when known. */
  sampleCount?: number;
  /** Per-nutrient provenance for values that are not plain measurements. */
  valueNotes?: Record<string, ValueNote>;
  /** Problems found in the source while transcribing (inconsistent sums, likely typos…). */
  dataQuality?: string[];
  review?: Review;
}

/** General Atwater factors (4/9/4 kcal/g) applied to protein, fat and NFE as fed. */
export function atwaterKcalPer100g(crudeProtein: number, etherExtract: number, nfe: number): number {
  return 4 * crudeProtein + 9 * etherExtract + 4 * nfe;
}

const MJ_TO_KCAL = 238.846;

/** Forage-type foods use the fibre-based branches of the Banco equations. */
function isForage(group: string): boolean {
  return /volumoso|feno|forragem|pastagem|silagem/i.test(group);
}

/**
 * Fibre fractions as fed. Crude fibre and NDF are subsets of total dietary
 * fibre, so a food analysed as having no dietary fibre (meat, fish, eggs…)
 * also has none of them, even when the table does not report them.
 */
function fibre(food: Food) {
  const n = food.nutrients;
  const none = n.dietary_fibre === 0 ? 0 : undefined;
  return { cf: n.crude_fibre ?? none, ndf: n.ndf ?? none, adf: n.adf ?? none };
}

/**
 * ME (kcal/100 g as fed) from proximate analysis, reproducing the formulas in
 * the author's Banco.xlsm column by column. Inputs are converted to a DM basis
 * because the published equations are in MJ/kg DM with g/kg DM or % DM terms.
 * Returns undefined when a needed fraction was not analysed.
 */
export function derivedEnergyPer100g(food: Food, model: EnergyModel): number | undefined {
  const { crude_protein: cp, ether_extract: ee, nfe, ash } = food.nutrients;
  const dm = food.dryMatter / 100;
  const { cf, ndf, adf } = fibre(food);
  const known = (...v: (number | undefined)[]) => v.every((x) => x !== undefined);
  const forage = isForage(food.group);

  switch (model) {
    case 'atwater':
    case 'primate':
      return known(cp, ee, nfe) ? atwaterKcalPer100g(cp!, ee!, nfe!) : undefined;
    case 'carnivore':
      // Modified Atwater (3.5/8.5/3.5) for prey items, as in the Banco.
      if (!known(cp, ee, nfe)) return undefined;
      return /presa/i.test(food.group) ? 3.5 * cp! + 8.5 * ee! + 3.5 * nfe! : atwaterKcalPer100g(cp!, ee!, nfe!);
    case 'primate_fermenter':
      // Atwater plus 1.6 kcal per g of NDF fermented in the hindgut.
      return known(cp, ee, nfe, ndf) ? atwaterKcalPer100g(cp!, ee!, nfe!) + 1.6 * ndf! : undefined;
    case 'ruminant': {
      if (dm <= 0) return undefined;
      if (forage) {
        // ME (MJ/kg DM) = 16.654 − 0.024·ADF (g/kg DM).
        if (adf === undefined) return undefined;
        return ((16.654 - 0.024 * (adf / dm) * 10) * MJ_TO_KCAL) / 10 * dm;
      }
      if (!known(cp, ee, cf, ash)) return undefined;
      // ME (MJ/kg DM) = 11.78 + 0.0654·CP + (0.0665·EE)² − 0.0414·EE·CF − 0.118·Ash, all % DM.
      const [p, e, f, a] = [cp! / dm, ee! / dm, cf! / dm, ash! / dm];
      return ((11.78 + 0.0654 * p + (0.0665 * e) ** 2 - 0.0414 * e * f - 0.118 * a) * MJ_TO_KCAL) / 10 * dm;
    }
    case 'herbivore_monogastric': {
      if (dm <= 0 || !known(cp, ee, cf, nfe)) return undefined;
      // DE (MJ/kg DM) from g/kg DM fractions; forages ×0.9 for ME.
      const [p, e, f, x] = [cp! / dm * 10, ee! / dm * 10, cf! / dm * 10, nfe! / dm * 10];
      if (forage) return ((-3.54 + 0.0209 * p + 0.042 * e + 0.0001 * f + 0.0185 * x) * MJ_TO_KCAL) / 10 * 0.9 * dm;
      return ((-3.54 + 0.0129 * p + 0.042 * e - 0.0019 * f + 0.0185 * x) / 4.184) * 100 * dm;
    }
  }
}

export function energyPer100g(food: Food, model: EnergyModel): number | undefined {
  return food.energy[model] ?? derivedEnergyPer100g(food, model);
}

/** kcal ME per gram of dry matter. */
export function energyPerGramDM(food: Food, model: EnergyModel): number | undefined {
  const e = energyPer100g(food, model);
  if (e === undefined || food.dryMatter <= 0) return undefined;
  return e / food.dryMatter;
}

/** Converts an as-fed concentration to a dry-matter basis. */
export function toDryMatterBasis(valueAsFed: number, dryMatterPct: number): number {
  if (dryMatterPct <= 0) throw new RangeError('dryMatter must be > 0');
  return (valueAsFed * 100) / dryMatterPct;
}

export function nutrientDM(food: Food, key: string): number | undefined {
  const v = food.nutrients[key];
  if (v === undefined) return undefined;
  return NON_CONCENTRATION.has(key) ? v : toDryMatterBasis(v, food.dryMatter);
}

export function calciumPhosphorusRatio(calcium: number | undefined, phosphorus: number | undefined): number | undefined {
  if (calcium === undefined || phosphorus === undefined || phosphorus === 0) return undefined;
  return calcium / phosphorus;
}
