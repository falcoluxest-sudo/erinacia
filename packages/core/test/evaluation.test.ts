import { describe, expect, it } from 'vitest';
import { categoryFromGroup, categoryShare, evaluateProportions, evaluateRules, type CategorizedItem, type ProportionSet } from '../src';

const items: CategorizedItem[] = [
  { category: 'fruit', inclusionAsFed: 0.3, inclusionDM: 0.1 },
  { category: 'greens', inclusionAsFed: 0.2, inclusionDM: 0.1 },
  { category: 'complete_feed_dry', inclusionAsFed: 0.4, inclusionDM: 0.7 },
  { category: 'marine_fish', inclusionAsFed: 0.1, inclusionDM: 0.1 },
];

describe('proportions', () => {
  it('umbrella categories add their children', () => {
    expect(categoryShare(items, 'produce', 'asFed')).toBeCloseTo(50, 9);
    expect(categoryShare(items, 'produce', 'DM')).toBeCloseTo(20, 9);
  });

  it('classifies against min, max and target', () => {
    const set: ProportionSet = {
      label: 't', basis: 'asFed',
      rules: [
        { category: 'fruit', range: { max: 25 } },
        { category: 'complete_feed_dry', range: { min: 40, max: 75 } },
        { category: 'greens', range: { min: 45 } },
        { category: 'marine_fish', range: { target: 11 } },
      ],
    };
    expect(evaluateProportions(items, set).map((c) => c.status)).toEqual(['above', 'within', 'below', 'within']);
  });
});

describe('rules', () => {
  it('fires on presence and on share above a threshold', () => {
    const r = evaluateRules([
      { kind: 'supplement', text: { pt: 'a' }, check: { type: 'food_present', category: 'marine_fish' } },
      { kind: 'supplement', text: { pt: 'b' }, check: { type: 'category_share_above', category: 'marine_fish', percent: 33, basis: 'asFed' } },
      { kind: 'avoid', text: { pt: 'c' }, check: { type: 'food_present', category: 'organ_meat' } },
      { kind: 'monitoring', text: { pt: 'd' } },
    ], items);
    expect(r.map((x) => x.triggered)).toEqual([true, false, false, undefined]);
  });
});

describe('categories from food-table groups', () => {
  it.each([
    ['Frutas', 'Banana', 'fruit'],
    ['Carnes', 'Carne, fígado, bovino', 'organ_meat'],
    ['Carnes', 'Carne, músculo bovino', 'muscle_meat'],
    ['Volumosos', 'Alfafa, feno', 'hay'],
    ['Presas', 'Larva de tenébrio', 'invertebrate_prey'],
    ['Derivados OA', 'Ovo de galinha', 'animal_products'],
    ['Sementes', 'Castanha de caju', 'seeds_nuts'],
  ] as const)('%s / %s → %s', (g, n, c) => expect(categoryFromGroup(g, n)).toBe(c));
});
