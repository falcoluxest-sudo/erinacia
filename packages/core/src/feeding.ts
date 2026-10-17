import { compositionDM, type NutrientResult } from './diet';
import type { Food } from './food';

export interface PricedItem {
  gramsPerDay: number;
  /** Currency per kg as fed. */
  pricePerKg: number;
}

export interface CostSummary {
  perDay: number;
  perMonth: number;
  perYear: number;
  perKgDiet: number;
  itemShares: number[];
}

/** Diet cost for the whole group; a month is 30 days, as in the spreadsheet. */
export function dietCost(items: PricedItem[], animals = 1): CostSummary {
  const itemCosts = items.map((i) => (i.gramsPerDay / 1000) * i.pricePerKg * animals);
  const perDay = itemCosts.reduce((a, b) => a + b, 0);
  const kg = (items.reduce((s, i) => s + i.gramsPerDay, 0) * animals) / 1000;
  return {
    perDay,
    perMonth: perDay * 30,
    perYear: perDay * 365,
    perKgDiet: kg > 0 ? perDay / kg : 0,
    itemShares: itemCosts.map((c) => (perDay > 0 ? c / perDay : 0)),
  };
}

export interface LeftoverRecord {
  food: Food;
  offeredGrams: number;
  leftoverGrams: number;
}

export interface ConsumptionResult {
  items: { foodId: string; consumedGrams: number; consumedShare: number }[];
  consumedGramsAsFed: number;
  consumedGramsDM: number;
  nutrients: Record<string, NutrientResult>;
}

/** What was actually eaten, from the keepers' leftover weighings. */
export function consumption(records: LeftoverRecord[]): ConsumptionResult {
  const parts = records.map((r) => ({ food: r.food, gramsAsFed: Math.max(0, r.offeredGrams - r.leftoverGrams) }));
  const total = parts.reduce((s, p) => s + p.gramsAsFed, 0);
  return {
    items: parts.map((p) => ({
      foodId: p.food.id,
      consumedGrams: p.gramsAsFed,
      consumedShare: total > 0 ? p.gramsAsFed / total : 0,
    })),
    consumedGramsAsFed: total,
    consumedGramsDM: parts.reduce((s, p) => s + p.gramsAsFed * (p.food.dryMatter / 100), 0),
    nutrients: compositionDM(parts),
  };
}
