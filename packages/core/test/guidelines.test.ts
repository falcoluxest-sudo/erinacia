import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dailyEnergyKcal, validateGuideline, type Guideline, type MetabolicFormula } from '../src';

const dir = join(__dirname, '../../../data/references/guidelines');
const guidelines: Guideline[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
const byId = (id: string) => guidelines.find((g) => g.id === id)!;

const asFormula = (g: Guideline, id: string): MetabolicFormula => {
  const e = g.energy!.find((x) => x.id === id)!;
  return { id, group: g.id, type: 'NEM', constant: e.coefficient, exponent: e.exponent, weightUnit: e.weightUnit, energyUnit: e.energyUnit };
};

describe('transcribed manuals', () => {
  it('loads all eight', () => expect(guidelines.map((g) => g.id).sort()).toHaveLength(8));

  it.each(guidelines.map((g) => [g.id, g] as const))('%s is valid', (_id, g) => {
    expect(validateGuideline(g)).toEqual([]);
    expect(g.citation.length).toBeGreaterThan(20);
  });

  it('reproduces the worked energy examples', () => {
    const tiger = asFormula(byId('dierenfeld-1994-tiger'), 'kleiber-maintenance');
    expect(dailyEnergyKcal(tiger, 123)).toBeCloseTo(5170, -1);
    expect(dailyEnergyKcal(tiger, 160)).toBeCloseTo(6300, -1);
    const orangutan = asFormula(byId('dierenfeld-1997-orangutan'), 'kleiber-maintenance');
    expect(dailyEnergyKcal(orangutan, 40)).toBeCloseTo(2227, 0);
    expect(dailyEnergyKcal(orangutan, 75)).toBeCloseTo(3568, 0);
    const chimp = asFormula(byId('aza-2010-chimpanzee'), 'nrc-2003-mer');
    const c = dailyEnergyKcal(chimp, 76.5);
    expect(c).toBeGreaterThan(1800);
    expect(c).toBeLessThan(2600);
  });

  it('lion maintenance gives ≈ 3.5 kg/d for a male on a 1.75 kcal/g diet', () => {
    const lion = asFormula(byId('aza-2012-lion'), 'zoo-maintenance');
    expect(dailyEnergyKcal(lion, 185) / 1.75 / 1000).toBeCloseTo(3.6, 1);
  });

  it('a validator catches broken data', () => {
    const bad = { ...byId('aza-2013-seriema'), targets: [{ lifeStage: 'all', basis: 'DM', values: { nope: { min: 2, max: 1 } } }] } as Guideline;
    expect(validateGuideline(bad)).toEqual(['targets.all: unknown nutrient "nope"', 'targets.all.nope: min > max']);
  });
});
