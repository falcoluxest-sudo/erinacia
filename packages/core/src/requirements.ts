import type { NutrientResult } from './diet';

export interface RequirementRange {
  min?: number;
  max?: number;
}

/** Nutrient requirements on a dry-matter basis for a taxonomic/physiological group. */
export interface RequirementProfile {
  id: string;
  group: string;
  values: Record<string, RequirementRange>;
  reference?: string;
}

export type RequirementStatus = 'below' | 'within' | 'above' | 'no_data';

export interface RequirementCheck {
  key: string;
  status: RequirementStatus;
  valueDM?: number;
  min?: number;
  max?: number;
  coverage?: number;
}

export function checkRequirements(
  nutrients: Record<string, NutrientResult>,
  profile: RequirementProfile,
): RequirementCheck[] {
  return Object.entries(profile.values).map(([key, range]) => {
    const r = nutrients[key];
    if (!r) return { key, status: 'no_data', ...range };
    let status: RequirementStatus = 'within';
    if (range.min !== undefined && r.valueDM < range.min) status = 'below';
    else if (range.max !== undefined && r.valueDM > range.max) status = 'above';
    return { key, status, valueDM: r.valueDM, coverage: r.coverage, ...range };
  });
}
