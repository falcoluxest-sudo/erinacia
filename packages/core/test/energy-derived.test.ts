import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { derivedEnergyPer100g, type EnergyModel, type Food } from '../src';

const banco: Food[] = JSON.parse(readFileSync(join(__dirname, '../../../data/seed/foods.json'), 'utf8'));
// The workbook's cached value for this cell is stale: recomputing its own
// formula from the row's PB/EE/FB/ENN gives 172.7, not the stored 154.2.
const STALE = new Set(['Alfafa, feno:herbivore_monogastric']);
const MODELS: EnergyModel[] = ['ruminant', 'herbivore_monogastric', 'carnivore', 'primate_fermenter', 'primate', 'atwater'];

describe('energy formulas reproduce the Banco columns', () => {
  it.each(banco.map((f) => [f.name, f] as const))('%s', (_n, f) => {
    for (const m of MODELS) {
      const want = f.energy[m];
      const got = derivedEnergyPer100g(f, m);
      if (want === undefined || got === undefined || STALE.has(`${f.name}:${m}`)) continue;
      expect(got, m).toBeCloseTo(want, 0);
    }
  });
});
