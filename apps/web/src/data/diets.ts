import type { EnergyModel, FeedingGuild, Guideline } from '@erinacia/core';

const files = import.meta.glob('../../../../data/references/guidelines/*.json', { eager: true, import: 'default' });
export const GUIDES = (Object.values(files) as Guideline[]).sort((a, b) =>
  a.species[0]!.commonName.pt.localeCompare(b.species[0]!.commonName.pt, 'pt'),
);
export const guideName = (g: Guideline) => g.species.map((s) => s.commonName.pt).join(', ');

export const DEFAULT_MODEL: Record<FeedingGuild, EnergyModel> = {
  obligate_carnivore: 'carnivore',
  carnivore: 'carnivore',
  omnivore: 'atwater',
  insectivore_omnivore: 'atwater',
  frugivore_folivore: 'primate',
  hindgut_herbivore: 'herbivore_monogastric',
  ruminant: 'ruminant',
};

export interface DietItemDraft {
  foodId: string;
  /** Percent of the ingested diet as fed. */
  inclusionPct: number;
  /** Percent of the offered amount expected to be eaten. */
  intakePct: number;
}

export interface DietDraft {
  id: string;
  name: string;
  animal: string;
  guideId: string;
  targetIndex: number;
  proportionIndex: number;
  weightKg: number;
  animals: number;
  vessels: number;
  meals: number;
  formulaId: string;
  activityFactor: number;
  adjustmentPct: number;
  overrideKcal?: number;
  energyModel: EnergyModel;
  items: DietItemDraft[];
  updatedAt?: string;
}

const KEY = 'erinacia.diets.v1';

export function loadDiets(): DietDraft[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as DietDraft[];
  } catch {
    return [];
  }
}

export function saveDiets(list: DietDraft[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable: keep the list for this session only.
  }
}

export function newDiet(): DietDraft {
  return {
    id: `diet-${Date.now().toString(36)}`,
    name: 'Nova dieta',
    animal: '',
    guideId: '',
    targetIndex: 0,
    proportionIndex: 0,
    weightKg: 1,
    animals: 1,
    vessels: 1,
    meals: 1,
    formulaId: 'banco-mamifero-placentado-manutencao',
    activityFactor: 2,
    adjustmentPct: 0,
    energyModel: 'atwater',
    items: [],
  };
}
