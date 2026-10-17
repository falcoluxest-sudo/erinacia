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

export interface Food {
  id: string;
  name: string;
  group: string;
  /** Dry matter, % as fed. */
  dryMatter: number;
  /** Nutrient values as fed (MN), keyed by NUTRIENTS[].key, in the catalog unit. */
  nutrients: Record<string, number | undefined>;
  /** ME in kcal/100 g as fed, per model. Atwater is derived when absent. */
  energy: Partial<Record<EnergyModel, number>>;
  sources: FoodSourceRef[];
  /** How many analytical records back the values, when known. */
  sampleCount?: number;
}

/** General Atwater factors (4/9/4 kcal/g) applied to protein, fat and NFE as fed. */
export function atwaterKcalPer100g(crudeProtein: number, etherExtract: number, nfe: number): number {
  return 4 * crudeProtein + 9 * etherExtract + 4 * nfe;
}

export function energyPer100g(food: Food, model: EnergyModel): number | undefined {
  const explicit = food.energy[model];
  if (explicit !== undefined) return explicit;
  if (model !== 'atwater') return undefined;
  const { crude_protein: pb, ether_extract: ee, nfe } = food.nutrients;
  if (pb === undefined || ee === undefined || nfe === undefined) return undefined;
  return atwaterKcalPer100g(pb, ee, nfe);
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
