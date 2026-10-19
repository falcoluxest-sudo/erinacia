import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { categoryFromGroup, energyPer100g, NUTRIENT_BY_KEY, nutrientDM, type Food } from '../src';

const foods: Food[] = JSON.parse(readFileSync(join(__dirname, '../../../data/seed/foods_insa.json'), 'utf8'));
const byName = (name: string) => foods.find((f) => f.name === name)!;

describe('INSA seed', () => {
  it('has unique ids, a source code and catalog keys only', () => {
    expect(foods.length).toBeGreaterThan(1300);
    expect(new Set(foods.map((f) => f.id)).size).toBe(foods.length);
    for (const f of foods) {
      expect(f.sources[0]?.code).toBeTruthy();
      expect(f.dryMatter).toBeGreaterThanOrEqual(0);
      for (const k of Object.keys(f.nutrients)) expect(NUTRIENT_BY_KEY.has(k), `${f.name}: ${k}`).toBe(true);
    }
  });

  it('converts units from per-100 g to the catalog', () => {
    // Abrótea crua (code 800): water 81.5 g, protein 17.2 g, P 230 mg, Fe 0.2 mg, Se not analysed.
    const f = byName('Abrótea crua');
    expect(f.dryMatter).toBeCloseTo(18.5);
    expect(f.nutrients.crude_protein).toBe(17.2);
    expect(f.nutrients.phosphorus).toBeCloseTo(0.23);
    expect(f.nutrients.iron).toBeCloseTo(2);
    expect(f.nutrients.selenium).toBeUndefined();
    expect(nutrientDM(f, 'crude_protein')).toBeCloseTo(93, 0);
  });

  it('Atwater energy tracks the declared INSA energy for low-fibre foods', () => {
    expect(energyPer100g(byName('Abrótea crua'), 'atwater')).toBeCloseTo(70, -1);
  });

  it('maps groups to diet categories', () => {
    const cat = (n: string) => { const f = byName(n); return categoryFromGroup(f.group, f.name); };
    expect(cat('Porco, fígado cru')).toBe('organ_meat');
    expect(cat('Grilo doméstico, pó')).toBe('invertebrate_prey');
    expect(cat('Caracol, cru')).toBe('invertebrate_prey');
    expect(cat('Abacate, Hass')).toBe('fruit');
  });
});

describe('energy models for proximate-only foods', () => {
  it('derives fibre-based models only when fibre is known', () => {
    const liver = byName('Porco, fígado cru');
    expect(energyPer100g(liver, 'carnivore')).toBe(energyPer100g(liver, 'atwater'));
    // No dietary fibre ⇒ no crude fibre or NDF, so every model is available.
    expect(energyPer100g(liver, 'ruminant')).toBeGreaterThan(0);
    expect(energyPer100g(liver, 'primate_fermenter')).toBe(energyPer100g(liver, 'atwater'));
    // Avocado has dietary fibre but no crude fibre/NDF analysis.
    const avocado = byName('Abacate, Hass');
    expect(energyPer100g(avocado, 'primate')).toBeGreaterThan(0);
    expect(energyPer100g(avocado, 'ruminant')).toBeUndefined();
    expect(energyPer100g(avocado, 'primate_fermenter')).toBeUndefined();
  });
});

describe('USDA seed', () => {
  const usda: Food[] = JSON.parse(readFileSync(join(__dirname, '../../../data/seed/foods_usda.json'), 'utf8'));
  const find = (name: string) => usda.find((f) => f.name === name)!;

  it('uses catalog keys and unique ids', () => {
    expect(usda.length).toBeGreaterThan(4000);
    expect(new Set(usda.map((f) => f.id)).size).toBe(usda.length);
    for (const f of usda) for (const k of Object.keys(f.nutrients)) expect(NUTRIENT_BY_KEY.has(k), `${f.name}: ${k}`).toBe(true);
  });

  it('converts beef liver (NDB 13325) per 100 g to catalog units', () => {
    const f = find('Beef, variety meats and by-products, liver, raw');
    expect(f.dryMatter).toBeCloseTo(29.19);
    expect(f.nutrients.phosphorus).toBeCloseTo(0.387); // 387 mg
    expect(f.nutrients.copper).toBeCloseTo(97.55); // 9.755 mg
    expect(categoryFromGroup(f.group, f.name)).toBe('organ_meat');
  });
});
