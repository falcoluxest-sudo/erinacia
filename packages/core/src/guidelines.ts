// Species nutrition guidelines transcribed from published manuals (AZA, AZAB,
// Dierenfeld…). Values are stored on the basis stated in `basis` and in the
// catalog units of nutrients.ts; any unit conversion made during transcription
// is recorded in the value's `note`.

import { DERIVED_INDICATORS, NUTRIENT_BY_KEY } from './nutrients';

export type LifeStage =
  | 'all'
  | 'maintenance'
  | 'breeding'
  | 'gestation'
  | 'gestation_late'
  | 'lactation'
  | 'growth';

export type FeedingGuild =
  | 'obligate_carnivore'
  | 'carnivore'
  | 'omnivore'
  | 'insectivore_omnivore'
  | 'frugivore_folivore'
  | 'hindgut_herbivore'
  | 'ruminant';

export type FoodCategory =
  | 'complete_feed_dry'
  | 'complete_feed_raw_meat'
  | 'complete_feed_gel'
  | 'meat_mix'
  | 'muscle_meat'
  | 'organ_meat'
  | 'bones'
  | 'whole_prey_vertebrate'
  | 'invertebrate_prey'
  | 'marine_fish'
  | 'produce'
  | 'fruit'
  | 'vegetable_root'
  | 'greens'
  | 'browse'
  | 'grass_forage'
  | 'hay'
  | 'concentrate'
  | 'seeds_nuts'
  | 'animal_products'
  | 'supplement'
  | 'enrichment_misc';

export interface Range {
  min?: number;
  max?: number;
  /** Single recommended value, when the source gives one number. */
  target?: number;
  note?: string;
}

export interface EnergyEquation {
  id: string;
  /** a × BW^b. */
  coefficient: number;
  exponent: number;
  /** Range of the coefficient when the source gives one (e.g. 115–130). */
  coefficientRange?: [number, number];
  weightUnit: 'kg' | 'g';
  energyUnit: 'kcal' | 'kJ';
  energyType: 'ME' | 'BMR' | 'FMR' | 'GE' | 'DE';
  lifeStage: LifeStage;
  label: string;
  note?: string;
}

export interface EnergyAdjustment {
  label: string;
  /** Multiplier on maintenance (1.4 = +40 %), or a range of them. */
  factor?: number;
  factorRange?: [number, number];
  note?: string;
}

export interface TargetSet {
  lifeStage: LifeStage;
  label?: string;
  basis: 'DM' | 'asFed';
  values: Record<string, Range>;
}

export interface ProportionRule {
  category: FoodCategory;
  range: Range;
  label?: string;
}

export interface ProportionSet {
  label: string;
  basis: 'DM' | 'asFed';
  rules: ProportionRule[];
}

export interface IntakeReference {
  label: string;
  basis: 'DM' | 'asFed';
  percentBodyWeight: Range;
}

export interface GrowthInterval {
  fromDay: number;
  toDay: number;
  /** Average daily gain, g/day; a pair means it changes linearly across the interval. */
  adgGramsPerDay: number | [number, number];
}

export interface GrowthReference {
  label: string;
  sex?: 'male' | 'female';
  rearing?: 'parent' | 'hand' | 'wild';
  birthWeightKg?: number;
  matureWeightKg?: number;
  daysToMaturity?: number;
  /** Daily gain as % of body weight (hand-rearing protocols). */
  dailyGainPercent?: Range;
  intervals?: GrowthInterval[];
  note?: string;
}

export type RuleKind = 'supplement' | 'limit' | 'avoid' | 'alert' | 'schedule' | 'monitoring' | 'safety';

export interface GuidelineRule {
  kind: RuleKind;
  text: { pt: string; en?: string };
  /** Machine-checkable form, when there is one. */
  check?:
    | { type: 'category_share_above'; category: FoodCategory; percent: number; basis: 'DM' | 'asFed' }
    | { type: 'food_present'; category: FoodCategory }
    | { type: 'no_intake_hours'; hours: number };
}

export interface ProductSpec {
  label: string;
  basis: 'DM' | 'asFed';
  values: Record<string, Range>;
}

export interface Guideline {
  id: string;
  title: string;
  citation: string;
  language: string;
  species: { scientificName: string; commonName: { pt: string; en: string } }[];
  guild: FeedingGuild;
  /** Domestic or reference species the requirements are extrapolated from. */
  modelSpecies?: string;
  energy?: EnergyEquation[];
  energyAdjustments?: EnergyAdjustment[];
  targets?: TargetSet[];
  proportions?: ProportionSet[];
  intake?: IntakeReference[];
  growth?: GrowthReference[];
  productSpecs?: ProductSpec[];
  rules?: GuidelineRule[];
  /** Places where the source looks inconsistent and needs checking. */
  dataQuality?: string[];
}

/** Returns problems found in a guideline (unknown nutrient keys, inverted ranges…). */
export function validateGuideline(g: Guideline): string[] {
  const problems: string[] = [];
  const known = (k: string) => NUTRIENT_BY_KEY.has(k) || k in DERIVED_INDICATORS;
  const checkRange = (where: string, r: Range) => {
    if (r.min === undefined && r.max === undefined && r.target === undefined) problems.push(`${where}: empty range`);
    if (r.min !== undefined && r.max !== undefined && r.min > r.max) problems.push(`${where}: min > max`);
  };
  for (const t of g.targets ?? []) {
    for (const [k, r] of Object.entries(t.values)) {
      if (!known(k)) problems.push(`targets.${t.lifeStage}: unknown nutrient "${k}"`);
      checkRange(`targets.${t.lifeStage}.${k}`, r);
    }
  }
  for (const p of g.productSpecs ?? []) {
    for (const [k, r] of Object.entries(p.values)) {
      if (!known(k)) problems.push(`productSpecs: unknown nutrient "${k}"`);
      checkRange(`productSpecs.${k}`, r);
    }
  }
  for (const set of g.proportions ?? []) {
    const minSum = set.rules.reduce((s, r) => s + (r.range.min ?? r.range.target ?? 0), 0);
    if (minSum > 100.0001) problems.push(`proportions "${set.label}": minimums add up to ${minSum}%`);
    set.rules.forEach((r) => checkRange(`proportions.${r.category}`, r.range));
  }
  for (const e of g.energy ?? []) {
    if (e.coefficient <= 0 || e.exponent <= 0) problems.push(`energy.${e.id}: invalid equation`);
  }
  return problems;
}
