export const KJ_PER_KCAL = 4.184;

export type MetabolicRateType = 'NEM' | 'TMB' | 'NEP';

/** Allometric energy equation: constant × BW^exponent (e.g. 140 × PV^0,75). */
export interface MetabolicFormula {
  id: string;
  group: string;
  type: MetabolicRateType;
  constant: number;
  exponent: number;
  weightUnit: 'kg' | 'g';
  energyUnit: 'kcal' | 'kJ';
  reference?: string;
  year?: number;
}

export type WeightMode = 'predefined' | 'max' | 'mean' | 'min';

export function selectWeightKg(weightsKg: number[], mode: WeightMode, predefinedKg?: number): number {
  if (mode === 'predefined') {
    if (predefinedKg === undefined || predefinedKg <= 0) throw new RangeError('predefined weight required');
    return predefinedKg;
  }
  if (weightsKg.length === 0) throw new RangeError('no weights recorded');
  if (mode === 'max') return Math.max(...weightsKg);
  if (mode === 'min') return Math.min(...weightsKg);
  return weightsKg.reduce((a, b) => a + b, 0) / weightsKg.length;
}

/**
 * Daily energy requirement in kcal. For TMB (basal rate) the result is multiplied
 * by `basalMultiplier`, as in the spreadsheet's "Ajuste TMB".
 */
export function dailyEnergyKcal(formula: MetabolicFormula, weightKg: number, basalMultiplier = 1): number {
  if (weightKg <= 0) throw new RangeError('weight must be > 0');
  const w = formula.weightUnit === 'g' ? weightKg * 1000 : weightKg;
  let e = formula.constant * Math.pow(w, formula.exponent);
  if (formula.type === 'TMB') e *= basalMultiplier;
  return formula.energyUnit === 'kJ' ? e / KJ_PER_KCAL : e;
}

/**
 * Applies a physiological adjustment (e.g. +0.2 for late gestation, -0.1 for inactivity).
 * A fixed override in kcal wins over the computed value.
 */
export function adjustedEnergyKcal(requirementKcal: number, adjustment = 0, overrideKcal?: number): number {
  if (overrideKcal !== undefined && overrideKcal > 0) return overrideKcal;
  return requirementKcal * (1 + adjustment);
}

export const kcalToKj = (kcal: number) => kcal * KJ_PER_KCAL;
export const kjToKcal = (kj: number) => kj / KJ_PER_KCAL;
