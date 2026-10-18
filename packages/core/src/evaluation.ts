// Checks a diet against a guideline's category proportions and rules.

import type { FoodCategory, GuidelineRule, ProportionSet } from './guidelines';

/** Umbrella categories: a rule on the parent counts all its children. */
const CHILDREN: Partial<Record<FoodCategory, FoodCategory[]>> = {
  produce: ['fruit', 'vegetable_root', 'greens'],
  complete_feed_dry: [],
  whole_prey_vertebrate: [],
};

export interface CategorizedItem {
  category: FoodCategory;
  /** Fractions 0–1 of the diet as fed and on a dry-matter basis. */
  inclusionAsFed: number;
  inclusionDM: number;
}

export type ProportionStatus = 'below' | 'within' | 'above';

export interface ProportionCheck {
  category: FoodCategory;
  label?: string;
  /** Percent of the diet in the set's basis. */
  sharePercent: number;
  min?: number;
  max?: number;
  target?: number;
  status: ProportionStatus;
}

export function categoryShare(items: CategorizedItem[], category: FoodCategory, basis: 'DM' | 'asFed'): number {
  const members = new Set<FoodCategory>([category, ...(CHILDREN[category] ?? [])]);
  return items.filter((i) => members.has(i.category)).reduce((s, i) => s + (basis === 'DM' ? i.inclusionDM : i.inclusionAsFed), 0) * 100;
}

/** A target-only rule is met within ±2 percentage points. */
export function evaluateProportions(items: CategorizedItem[], set: ProportionSet): ProportionCheck[] {
  return set.rules.map((r) => {
    const share = categoryShare(items, r.category, set.basis);
    const { min, max, target } = r.range;
    const lo = min ?? (max === undefined && target !== undefined ? target - 2 : undefined);
    const hi = max ?? (min === undefined && target !== undefined ? target + 2 : undefined);
    const eps = 1e-9;
    const status: ProportionStatus = lo !== undefined && share < lo - eps ? 'below' : hi !== undefined && share > hi + eps ? 'above' : 'within';
    return { category: r.category, label: r.label, sharePercent: share, min, max, target, status };
  });
}

export interface RuleResult {
  rule: GuidelineRule;
  /** true when the rule's automatic check fires; undefined when the rule has no check. */
  triggered?: boolean;
}

export function evaluateRules(rules: GuidelineRule[], items: CategorizedItem[]): RuleResult[] {
  return rules.map((rule) => {
    const c = rule.check;
    if (!c || c.type === 'no_intake_hours') return { rule };
    if (c.type === 'food_present') return { rule, triggered: categoryShare(items, c.category, 'asFed') > 0 };
    return { rule, triggered: categoryShare(items, c.category, c.basis) > c.percent };
  });
}

/** Maps a food-table group (and name) to a functional category. */
export function categoryFromGroup(group: string, name = ''): FoodCategory {
  const g = group.toLocaleLowerCase('pt');
  const n = name.toLocaleLowerCase('pt');
  if (/fígado|figado|rim|coração|coracao|víscera|viscera/.test(n)) return 'organ_meat';
  if (/osso/.test(n)) return 'bones';
  if (/fruta/.test(g)) return 'fruit';
  if (/legume/.test(g)) return 'vegetable_root';
  if (/verdura|hortaliça/.test(g)) return 'greens';
  if (/volumoso|feno/.test(g)) return /feno/.test(n) ? 'hay' : 'grass_forage';
  if (/carne/.test(g)) return 'muscle_meat';
  if (/presa/.test(g)) return /inset|larva|grilo|tenébrio|tenebrio|barata|caracol|minhoca/.test(n) ? 'invertebrate_prey' : 'whole_prey_vertebrate';
  if (/pescado|peixe/.test(g)) return 'marine_fish';
  if (/semente|castanha/.test(g)) return 'seeds_nuts';
  if (/suplement/.test(g)) return 'supplement';
  if (/derivados oa|ovo|leite/.test(g)) return 'animal_products';
  if (/cereal|concentrado/.test(g)) return 'concentrate';
  if (/ração|racao/.test(g)) return 'complete_feed_dry';
  return 'enrichment_misc';
}
