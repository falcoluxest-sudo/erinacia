import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { categoryFromGroup, energyPer100g, NUTRIENT_BY_KEY, nutrientDM, type Food } from '../src';

const foods: Food[] = JSON.parse(readFileSync(join(__dirname, '../../../data/seed/foods_prey.json'), 'utf8'));
const byId = (id: string) => {
  const f = foods.find((x) => x.id === id);
  if (!f) throw new Error(`missing ${id}`);
  return f;
};

describe('Prey seed (Dierenfeld 2002, NAG FS005, Finke 2015)', () => {
  it('has unique ids, catalog keys, a citation and a pending review on every food', () => {
    expect(foods.length).toBeGreaterThan(80);
    expect(new Set(foods.map((f) => f.id)).size).toBe(foods.length);
    for (const f of foods) {
      expect(f.dryMatter, f.id).toBeGreaterThan(0);
      expect(f.dryMatter, f.id).toBeLessThanOrEqual(100);
      expect((f.sources[0] as { reference?: string }).reference, f.id).toBeTruthy();
      expect(f.review?.status, f.id).toBe('pending');
      for (const k of Object.keys(f.nutrients)) expect(NUTRIENT_BY_KEY.has(k), `${f.id}: ${k}`).toBe(true);
      for (const k of Object.keys(f.valueNotes ?? {})) expect(k in f.nutrients, `${f.id}: note for absent ${k}`).toBe(true);
      for (const v of Object.values(f.nutrients)) expect(v === undefined || v >= 0, f.id).toBe(true);
    }
  });

  it('converts Dierenfeld DM values back to the published figures', () => {
    // Table 1: adult mouse DM 32.7 %, CP 55.8 % DM; Table 3: Ca 2.98 % DM, Fe 137.9 mg/kg DM; Table 2: vit A 578 272 IU/kg DM.
    const f = byId('dierenfeld2002-mouse-adult');
    expect(f.dryMatter).toBe(32.7);
    expect(nutrientDM(f, 'crude_protein')).toBeCloseTo(55.8, 6);
    expect(nutrientDM(f, 'calcium')).toBeCloseTo(2.98, 6);
    expect(nutrientDM(f, 'iron')).toBeCloseTo(137.9, 6);
    expect(nutrientDM(f, 'vitamin_a')).toBeCloseTo(578.272, 4);
    expect(f.nutrients.phosphorus).toBeCloseTo(1.72 * 0.327, 6);
    expect(f.valueNotes?.calcium?.origin).toBe('calculated'); // Table 3 has n=78, Table 1 n=108
    expect(f.nutrients.sodium).toBeUndefined(); // "NA" in the source, not zero
  });

  it('keeps NAG ranges as flagged midpoints and wet-basis vitamins as published', () => {
    // Capelin: DM 14.6–22.8 %, CP 56.0–76.5 % DM; Table 4 wet: vit D3 463 IU/kg.
    const f = byId('nag-fs005-capelin');
    expect(f.dryMatter).toBeCloseTo(18.7, 6);
    expect(nutrientDM(f, 'crude_protein')).toBeCloseTo(66.25, 6);
    expect(f.valueNotes?.crude_protein?.origin).toBe('estimated');
    expect(f.valueNotes?.crude_protein?.note).toMatch(/56–76,5/);
    expect(f.nutrients.vitamin_d3).toBeCloseTo(0.463, 6);
    // Single-sample items carry exact values without a midpoint note.
    const s = byId('nag-fs005-butterfish');
    expect(nutrientDM(s, 'ether_extract')).toBeCloseTo(38.2, 6);
    expect(s.valueNotes?.ether_extract).toBeUndefined();
  });

  it('uses the Finke fat value consistent with the published NFE and ME', () => {
    const f = byId('finke2015-waxworm');
    const n = f.nutrients;
    expect(n.ether_extract).toBe(19.4);
    // With fat = 194 g/kg both published derived values check out: ME 2322 kcal/kg = 4·144 + 9·194
    // (negative NFE counted as 0), and NFE = 1000 − 641 − 144 − 194 − 8.0 − 15.2 (ADF) ≈ −2 g/kg.
    // With the online 19.4 g/kg, ME would be 750 kcal/kg.
    expect(4 * 144 + 9 * 194).toBe(2322);
    expect(Math.round(1000 - 641 - 144 - 194 - 8.0 - 15.2)).toBe(-2);
    expect(energyPer100g(f, 'atwater')).toBe(232.2);
    expect(f.dataQuality?.[0]).toMatch(/19,4 g\/kg/);
    expect(n.nfe).toBe(0);
    expect(n.vitamin_a).toBeUndefined(); // below detection limit, not zero
    expect(byId('finke2015-cricket').nutrients.cobalamin).toBeCloseTo(0.193, 6);
  });

  it('maps prey sub-groups to diet categories', () => {
    const cat = (id: string) => { const f = byId(id); return categoryFromGroup(f.group, f.name); };
    expect(cat('dierenfeld2002-mouse-adult')).toBe('whole_prey_vertebrate');
    expect(cat('dierenfeld2002-chick-day-old')).toBe('whole_prey_vertebrate');
    expect(cat('nag-fs005-capelin')).toBe('marine_fish');
    expect(cat('nag-fs005-squid')).toBe('marine_fish');
    expect(cat('finke2015-waxworm')).toBe('invertebrate_prey');
    expect(cat('finke2015-superworm')).toBe('invertebrate_prey');
  });
});
