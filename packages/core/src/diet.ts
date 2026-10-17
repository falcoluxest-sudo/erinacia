import { calciumPhosphorusRatio, energyPer100g, type EnergyModel, type Food } from './food';
import { NON_CONCENTRATION, NUTRIENTS } from './nutrients';

export interface DietItemInput {
  food: Food;
  /** Share of the ingested diet as fed (MN), 0–1. Shares are normalised to sum to 1. */
  inclusionAsFed: number;
  /** Expected fraction of the offered amount that is eaten (spreadsheet "% de ingestão"), 0–1. */
  intakeFraction?: number;
}

export interface DietInput {
  items: DietItemInput[];
  energyModel: EnergyModel;
  /** Energy to be ingested per animal per day, kcal. */
  energyKcal: number;
  animals?: number;
  vessels?: number;
  mealsPerDay?: number;
}

export interface DietItemResult {
  foodId: string;
  name: string;
  inclusionAsFed: number;
  inclusionDM: number;
  /** Per animal per day. */
  ingestedGramsAsFed: number;
  offeredGramsAsFed: number;
  ingestedGramsDM: number;
  kcal: number;
  energyShare: number;
  /** Offered per vessel per meal, for the feeding sheet. */
  gramsPerVesselPerMeal: number;
}

export interface NutrientResult {
  /** Diet concentration on a dry-matter basis, in the catalog unit. */
  valueDM: number;
  /** Fraction of diet dry matter coming from foods that have this nutrient analysed. */
  coverage: number;
}

export interface DietResult {
  items: DietItemResult[];
  totals: {
    ingestedGramsAsFed: number;
    offeredGramsAsFed: number;
    ingestedGramsDM: number;
    kcal: number;
    dryMatterPct: number;
    kcalPerGramDM: number;
    /** kcal ME per g crude protein. */
    kcalPerGramProtein?: number;
    calciumPhosphorusRatio?: number;
  };
  nutrients: Record<string, NutrientResult>;
  warnings: string[];
}

export function computeDiet(input: DietInput): DietResult {
  const warnings: string[] = [];
  const animals = input.animals ?? 1;
  const vessels = input.vessels ?? 1;
  const meals = input.mealsPerDay ?? 1;

  const active = input.items.filter((i) => i.inclusionAsFed > 0);
  const inclusionSum = active.reduce((s, i) => s + i.inclusionAsFed, 0);
  if (active.length === 0 || inclusionSum <= 0) throw new RangeError('diet has no items');
  if (Math.abs(inclusionSum - 1) > 1e-6) warnings.push('inclusion_normalised');

  const rows = active.map((i) => {
    const share = i.inclusionAsFed / inclusionSum;
    const em = energyPer100g(i.food, input.energyModel);
    if (em === undefined) warnings.push(`missing_energy:${i.food.id}`);
    return { item: i, share, kcalPerGram: (em ?? 0) / 100, dmFraction: i.food.dryMatter / 100 };
  });

  const kcalPerGramDiet = rows.reduce((s, r) => s + r.share * r.kcalPerGram, 0);
  if (kcalPerGramDiet <= 0) throw new RangeError('diet has no energy for the chosen model');
  const dmFractionDiet = rows.reduce((s, r) => s + r.share * r.dmFraction, 0);
  const totalAsFed = input.energyKcal / kcalPerGramDiet;

  const items: DietItemResult[] = rows.map((r) => {
    const ingested = r.share * totalAsFed;
    const intake = r.item.intakeFraction ?? 1;
    const offered = intake > 0 ? ingested / intake : ingested;
    const kcal = ingested * r.kcalPerGram;
    return {
      foodId: r.item.food.id,
      name: r.item.food.name,
      inclusionAsFed: r.share,
      inclusionDM: (r.share * r.dmFraction) / dmFractionDiet,
      ingestedGramsAsFed: ingested,
      offeredGramsAsFed: offered,
      ingestedGramsDM: ingested * r.dmFraction,
      kcal,
      energyShare: kcal / input.energyKcal,
      gramsPerVesselPerMeal: (offered * animals) / vessels / meals,
    };
  });

  const nutrients = compositionDM(rows.map((r) => ({ food: r.item.food, gramsAsFed: r.share })));
  const ingestedDM = totalAsFed * dmFractionDiet;
  const protein = nutrients.crude_protein;
  const gramsProtein = protein ? (protein.valueDM / 100) * ingestedDM : undefined;

  return {
    items,
    totals: {
      ingestedGramsAsFed: totalAsFed,
      offeredGramsAsFed: items.reduce((s, i) => s + i.offeredGramsAsFed, 0),
      ingestedGramsDM: ingestedDM,
      kcal: input.energyKcal,
      dryMatterPct: dmFractionDiet * 100,
      kcalPerGramDM: input.energyKcal / ingestedDM,
      kcalPerGramProtein: gramsProtein ? input.energyKcal / gramsProtein : undefined,
      calciumPhosphorusRatio: calciumPhosphorusRatio(nutrients.calcium?.valueDM, nutrients.phosphorus?.valueDM),
    },
    nutrients,
    warnings,
  };
}

/**
 * Dry-matter composition of a mix: Σ(g_i × v_i) / Σ(g_i × MS_i). Works for any
 * as-fed concentration unit (%, mg/kg, UI/g). Used for planned diets and for
 * what was actually eaten after leftovers.
 */
export function compositionDM(parts: { food: Food; gramsAsFed: number }[]): Record<string, NutrientResult> {
  const dmGrams = parts.map((p) => p.gramsAsFed * (p.food.dryMatter / 100));
  const totalDM = dmGrams.reduce((a, b) => a + b, 0);
  const out: Record<string, NutrientResult> = {};
  if (totalDM <= 0) return out;
  for (const def of NUTRIENTS) {
    if (NON_CONCENTRATION.has(def.key)) continue;
    let weighted = 0;
    let coveredDM = 0;
    parts.forEach((p, idx) => {
      const v = p.food.nutrients[def.key];
      if (v === undefined) return;
      weighted += p.gramsAsFed * v;
      coveredDM += dmGrams[idx] ?? 0;
    });
    if (coveredDM === 0) continue;
    out[def.key] = { valueDM: weighted / totalDM, coverage: coveredDM / totalDM };
  }
  return out;
}

/** Dry-matter intake as % of body weight, to compare with species references. */
export function intakePercentBodyWeight(gramsPerDay: number, weightKg: number): number {
  return (gramsPerDay / (weightKg * 1000)) * 100;
}
