import { describe, expect, it } from 'vitest';
import foodsJson from '../../../data/seed/foods.json';
import formulasJson from '../../../data/seed/metabolic_formulas.json';
import {
  adjustedEnergyKcal,
  atwaterKcalPer100g,
  calciumPhosphorusRatio,
  checkRequirements,
  computeDiet,
  consumption,
  dailyEnergyKcal,
  dailyGains,
  dietCost,
  energyPerGramDM,
  expectedWeight,
  gompertz,
  intakePercentBodyWeight,
  overallDailyGain,
  percentOfExpected,
  selectWeightKg,
  type Food,
  type MetabolicFormula,
} from '../src';

const foods = foodsJson as unknown as Food[];
const formulas = formulasJson as unknown as MetabolicFormula[];
const food = (id: string) => {
  const f = foods.find((x) => x.id === id);
  if (!f) throw new Error(`missing seed food ${id}`);
  return f;
};

describe('seed foods match the Banco.xlsm calculations', () => {
  it.each(foods.map((f) => [f.name, f] as const))('%s: Atwater energy', (_name, f) => {
    const { crude_protein: pb = 0, ether_extract: ee = 0, nfe = 0 } = f.nutrients;
    expect(atwaterKcalPer100g(pb, ee, nfe)).toBeCloseTo(f.energy.atwater!, 6);
  });

  it.each(foods.map((f) => [f.name, f] as const))('%s: dry matter = 100 − moisture', (_name, f) => {
    expect(f.dryMatter).toBeCloseTo(100 - f.nutrients.moisture!, 6);
  });

  it('kcal/g MS as in the "Energia kcal/g MS" column', () => {
    expect(energyPerGramDM(food('abacate'), 'atwater')).toBeCloseTo(6.5067164179104475, 9);
    expect(energyPerGramDM(food('alfafa-feno'), 'atwater')).toBeCloseTo(2.6037, 4);
  });

  it('Ca:P as in the "Relação Ca/P" column', () => {
    const a = food('abacate').nutrients;
    expect(calciumPhosphorusRatio(a.calcium, a.phosphorus)).toBeCloseTo(0.23076923076923078, 12);
    const b = food('alfafa-feno').nutrients;
    expect(calciumPhosphorusRatio(b.calcium, b.phosphorus)).toBeCloseTo(5.416666666666666, 9);
  });
});

describe('energy requirement', () => {
  const placental = formulas.find((f) => f.group.startsWith('Mamifero placentado'))!;
  const tortoise = formulas.find((f) => f.group.startsWith('Réptil, jabutis'))!;

  it('placental mammal maintenance: 140 × PV^0,75', () => {
    expect(placental.constant).toBe(140);
    expect(dailyEnergyKcal(placental, 0.45)).toBeCloseTo(76.92, 2);
    expect(dailyEnergyKcal(placental, 2.1)).toBeCloseTo(140 * 2.1 ** 0.75, 9);
  });

  it('tortoise: 32 × PV^0,86', () => {
    expect(dailyEnergyKcal(tortoise, 2.1)).toBeCloseTo(32 * 2.1 ** 0.86, 9);
  });

  it('basal rate is multiplied by the TMB factor; kJ formulas convert to kcal', () => {
    const tmb: MetabolicFormula = { ...placental, type: 'TMB', constant: 70 };
    expect(dailyEnergyKcal(tmb, 1, 2)).toBeCloseTo(140, 9);
    const kj: MetabolicFormula = { ...placental, energyUnit: 'kJ', constant: 418.4 };
    expect(dailyEnergyKcal(kj, 1)).toBeCloseTo(100, 9);
  });

  it('weight selection and adjustments', () => {
    expect(selectWeightKg([2, 2.4, 1.6], 'max')).toBe(2.4);
    expect(selectWeightKg([2, 2.4, 1.6], 'mean')).toBeCloseTo(2, 12);
    expect(selectWeightKg([2, 2.4, 1.6], 'min')).toBe(1.6);
    expect(selectWeightKg([], 'predefined', 3)).toBe(3);
    expect(adjustedEnergyKcal(100, 0.2)).toBeCloseTo(120, 12);
    expect(adjustedEnergyKcal(100, 0.2, 90)).toBe(90);
  });
});

const A: Food = {
  id: 'a', name: 'A', group: 'x', dryMatter: 50, sources: [],
  nutrients: { crude_protein: 10, calcium: 1, phosphorus: 0.5 }, energy: { carnivore: 200 },
};
const B: Food = {
  id: 'b', name: 'B', group: 'x', dryMatter: 25, sources: [],
  nutrients: { crude_protein: 2, calcium: 0.1 }, energy: { carnivore: 100 },
};

describe('diet calculation (worked example)', () => {
  const diet = computeDiet({
    items: [{ food: A, inclusionAsFed: 0.5 }, { food: B, inclusionAsFed: 0.5, intakeFraction: 0.8 }],
    energyModel: 'carnivore',
    energyKcal: 150,
    animals: 2,
    vessels: 1,
    mealsPerDay: 2,
  });

  it('amounts that meet the energy requirement', () => {
    expect(diet.totals.ingestedGramsAsFed).toBeCloseTo(100, 9);
    expect(diet.items[0]!.ingestedGramsAsFed).toBeCloseTo(50, 9);
    expect(diet.items[1]!.offeredGramsAsFed).toBeCloseTo(62.5, 9);
    expect(diet.totals.ingestedGramsDM).toBeCloseTo(37.5, 9);
    expect(diet.items.reduce((s, i) => s + i.kcal, 0)).toBeCloseTo(150, 9);
  });

  it('inclusion on a dry-matter basis', () => {
    expect(diet.items[0]!.inclusionDM).toBeCloseTo(2 / 3, 12);
    expect(diet.items[1]!.inclusionDM).toBeCloseTo(1 / 3, 12);
  });

  it('composition on a dry-matter basis and ratios', () => {
    expect(diet.nutrients.crude_protein!.valueDM).toBeCloseTo(16, 9);
    expect(diet.nutrients.crude_protein!.coverage).toBe(1);
    expect(diet.nutrients.phosphorus!.coverage).toBeCloseTo(2 / 3, 12);
    expect(diet.totals.kcalPerGramProtein).toBeCloseTo(25, 9);
    expect(diet.totals.kcalPerGramDM).toBeCloseTo(4, 9);
  });

  it('quantity per vessel per meal for the feeding sheet', () => {
    expect(diet.items[0]!.gramsPerVesselPerMeal).toBeCloseTo(50, 9);
  });

  it('flags inclusions that do not sum to 100 %', () => {
    const d = computeDiet({ items: [{ food: A, inclusionAsFed: 2 }], energyModel: 'carnivore', energyKcal: 100 });
    expect(d.warnings).toContain('inclusion_normalised');
    expect(d.items[0]!.inclusionAsFed).toBe(1);
  });
});

describe('requirements, intake, cost and leftovers', () => {
  it('classifies nutrients against a profile', () => {
    const diet = computeDiet({ items: [{ food: A, inclusionAsFed: 1 }], energyModel: 'carnivore', energyKcal: 100 });
    const checks = checkRequirements(diet.nutrients, {
      id: 'p', group: 'g',
      values: { crude_protein: { min: 25 }, calcium: { min: 0.5, max: 1.5 }, vitamin_e: { min: 50 } },
    });
    expect(checks.map((c) => c.status)).toEqual(['below', 'above', 'no_data']);
  });

  it('dry-matter intake as % of body weight', () => {
    expect(intakePercentBodyWeight(20, 1)).toBeCloseTo(2, 12);
  });

  it('cost per day, month and year', () => {
    const c = dietCost([{ gramsPerDay: 50, pricePerKg: 4 }, { gramsPerDay: 50, pricePerKg: 0 }], 2);
    expect(c.perDay).toBeCloseTo(0.4, 12);
    expect(c.perMonth).toBeCloseTo(12, 12);
    expect(c.perYear).toBeCloseTo(146, 12);
    expect(c.perKgDiet).toBeCloseTo(2, 12);
    expect(c.itemShares).toEqual([1, 0]);
  });

  it('composition of what was actually eaten', () => {
    const r = consumption([
      { food: A, offeredGrams: 50, leftoverGrams: 0 },
      { food: B, offeredGrams: 50, leftoverGrams: 50 },
    ]);
    expect(r.consumedGramsAsFed).toBe(50);
    expect(r.nutrients.crude_protein!.valueDM).toBeCloseTo(20, 9);
  });
});

describe('growth curves', () => {
  const records = [
    { date: '2026-09-01', grams: 200 },
    { date: '2026-09-11', grams: 300 },
    { date: '2026-09-21', grams: 400 },
  ];

  it('daily gain between weighings and overall', () => {
    expect(dailyGains(records).map((g) => g.gramsPerDay)).toEqual([10, 10]);
    expect(overallDailyGain(records)).toBeCloseTo(10, 9);
  });

  it('comparison with a reference curve', () => {
    const curve = [{ ageDays: 30, grams: 200 }, { ageDays: 60, grams: 500 }];
    expect(expectedWeight(curve, 45)).toBeCloseTo(350, 9);
    expect(percentOfExpected(280, curve, 45)).toBeCloseTo(0.8, 12);
  });

  it('Gompertz curve', () => {
    const p = { asymptoteGrams: 1000, b: 2, k: 0.05 };
    expect(gompertz(p, 0)).toBeCloseTo(1000 * Math.exp(-2), 9);
    expect(gompertz(p, 1000)).toBeCloseTo(1000, 6);
  });
});

describe('a diet built from the seed table', () => {
  it('meets the energy target and keeps shares consistent', () => {
    const d = computeDiet({
      items: [
        { food: food('ovo-de-galinha-inteiro-cozido'), inclusionAsFed: 0.4 },
        { food: food('carne-musculo-bovino'), inclusionAsFed: 0.6 },
      ],
      energyModel: 'carnivore',
      energyKcal: 76.92,
    });
    expect(d.items.reduce((s, i) => s + i.kcal, 0)).toBeCloseTo(76.92, 9);
    expect(d.items.reduce((s, i) => s + i.inclusionDM, 0)).toBeCloseTo(1, 12);
    expect(d.warnings).toEqual([]);
  });
});
