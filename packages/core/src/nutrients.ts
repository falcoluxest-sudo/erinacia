// Canonical nutrient catalog. Food values are stored as-fed (matéria natural, MN)
// in the unit below; diet results are reported on a dry-matter (MS) basis.

export type NutrientUnit = '%' | 'mg/kg' | 'UI/g' | 'µg/kg' | 'kcal/100g' | 'ratio' | 'index' | 'kgCO2eq/kg';

export type NutrientCategory =
  | 'proximate'
  | 'macromineral'
  | 'micromineral'
  | 'vitamin'
  | 'amino_acid'
  | 'fatty_acid'
  | 'fibre'
  | 'carbohydrate'
  | 'other';

export interface NutrientDef {
  key: string;
  unit: NutrientUnit;
  category: NutrientCategory;
  label: { pt: string; en: string };
  /** Header used in the original Banco.xlsm spreadsheet, for import. */
  sheetHeader?: string;
}

const n = (
  key: string,
  unit: NutrientUnit,
  category: NutrientCategory,
  pt: string,
  en: string,
  sheetHeader?: string,
): NutrientDef => ({ key, unit, category, label: { pt, en }, sheetHeader });

export const NUTRIENTS: NutrientDef[] = [
  n('moisture', '%', 'proximate', 'Umidade', 'Moisture', 'Umidade (%)'),
  n('dry_matter', '%', 'proximate', 'Matéria seca', 'Dry matter', 'MS (%)'),
  n('crude_protein', '%', 'proximate', 'Proteína bruta', 'Crude protein', 'PB (%MN)'),
  n('ether_extract', '%', 'proximate', 'Extrato etéreo', 'Ether extract', 'EE (%MN)'),
  n('crude_fibre', '%', 'proximate', 'Fibra bruta', 'Crude fibre', 'FB (%MN)'),
  n('nfe', '%', 'proximate', 'Extrativo não nitrogenado', 'Nitrogen-free extract', 'ENN (%MN)'),
  n('ash', '%', 'proximate', 'Matéria mineral', 'Ash', 'MM (%MN)'),

  n('calcium', '%', 'macromineral', 'Cálcio', 'Calcium', 'Ca (%MN)'),
  n('phosphorus', '%', 'macromineral', 'Fósforo', 'Phosphorus', 'P (%MN)'),
  n('sodium', '%', 'macromineral', 'Sódio', 'Sodium', 'Na (%MN)'),
  n('potassium', '%', 'macromineral', 'Potássio', 'Potassium', 'K (%MN)'),
  n('magnesium', '%', 'macromineral', 'Magnésio', 'Magnesium', 'Mg (%MN)'),

  n('iron', 'mg/kg', 'micromineral', 'Ferro', 'Iron', 'Fe (mg/kg)'),
  n('copper', 'mg/kg', 'micromineral', 'Cobre', 'Copper', 'Cu (mg/kg)'),
  n('zinc', 'mg/kg', 'micromineral', 'Zinco', 'Zinc', 'Zn (mg/kg)'),
  n('manganese', 'mg/kg', 'micromineral', 'Manganês', 'Manganese', 'Mn (mg/kg)'),
  n('iodine', 'mg/kg', 'micromineral', 'Iodo', 'Iodine', 'I (mg/kg)'),
  n('selenium', 'mg/kg', 'micromineral', 'Selénio', 'Selenium', 'Se (mg/kg)'),

  n('vitamin_a', 'UI/g', 'vitamin', 'Vitamina A', 'Vitamin A', 'Vitamina A RAE (UI/g)'),
  n('vitamin_d2', 'UI/g', 'vitamin', 'Vitamina D2', 'Vitamin D2', 'Vitamina D2 (UI/g)'),
  n('vitamin_d3', 'UI/g', 'vitamin', 'Vitamina D3', 'Vitamin D3', 'Vitamina D3(UI/g)'),
  n('vitamin_k', 'mg/kg', 'vitamin', 'Vitamina K', 'Vitamin K', 'Vitamina K (mg/kg)'),
  n('vitamin_e', 'mg/kg', 'vitamin', 'Vitamina E', 'Vitamin E', 'Vitamina E (mg/kg)'),
  n('vitamin_c', 'mg/kg', 'vitamin', 'Vitamina C', 'Vitamin C', 'Vitamina C (mg/kg)'),
  n('thiamin', 'mg/kg', 'vitamin', 'Vitamina B1 (tiamina)', 'Thiamin (B1)', 'Vitamina B1 (Tiamina) (mg/kg)'),
  n('riboflavin', 'mg/kg', 'vitamin', 'Vitamina B2 (riboflavina)', 'Riboflavin (B2)', 'Vitamina B2 (Riboflavina) (mg/kg)'),
  n('niacin', 'mg/kg', 'vitamin', 'Vitamina B3 (niacina)', 'Niacin (B3)', 'Vitamina B3 (Niacina) (mg/kg)'),
  n('pantothenic_acid', 'mg/kg', 'vitamin', 'Vitamina B5 (ác. pantoténico)', 'Pantothenic acid (B5)', 'Vitamina B5 (Acido Pantotenico) (mg/kg)'),
  n('pyridoxine', 'mg/kg', 'vitamin', 'Vitamina B6 (piridoxina)', 'Pyridoxine (B6)', 'Vitamina B6 (Piridoxina) (mg/kg)'),
  n('biotin', 'mg/kg', 'vitamin', 'Vitamina B7 (biotina)', 'Biotin (B7)', 'Vitamina B7 (Biotina) (mg/kg)'),
  n('folic_acid', 'mg/kg', 'vitamin', 'Vitamina B9 (ác. fólico)', 'Folic acid (B9)', 'Vitamina B9 (Acido Fólico) (mg/kg)'),
  n('cobalamin', 'mg/kg', 'vitamin', 'Vitamina B12 (cobalamina)', 'Cobalamin (B12)', 'Vitamina B12 (Cobalamina) (mg/kg)'),

  n('taurine', '%', 'amino_acid', 'Taurina', 'Taurine', 'Taurina  (%MN)'),
  n('lysine', '%', 'amino_acid', 'Lisina', 'Lysine', 'Lisina  (%MN)'),
  n('methionine', '%', 'amino_acid', 'Metionina', 'Methionine', 'Metionina  (%MN)'),
  n('histidine', '%', 'amino_acid', 'Histidina', 'Histidine', 'Histidina  (%MN)'),
  n('leucine', '%', 'amino_acid', 'Leucina', 'Leucine', 'Leucina  (%MN)'),
  n('isoleucine', '%', 'amino_acid', 'Isoleucina', 'Isoleucine', 'Isoleucina  (%MN)'),
  n('phenylalanine', '%', 'amino_acid', 'Fenilalanina', 'Phenylalanine', 'Fenilalanina  (%MN)'),
  n('threonine', '%', 'amino_acid', 'Treonina', 'Threonine', 'Treonina  (%MN)'),
  n('tryptophan', '%', 'amino_acid', 'Triptofano', 'Tryptophan', 'Triptofano  (%MN)'),
  n('valine', '%', 'amino_acid', 'Valina', 'Valine', 'Valina  (%MN)'),
  n('arginine', '%', 'amino_acid', 'Arginina', 'Arginine', 'Arginina  (%MN)'),
  n('glutamine', '%', 'amino_acid', 'Glutamina', 'Glutamine', 'Glutamina  (%MN)'),
  n('cysteine', '%', 'amino_acid', 'Cisteína', 'Cysteine', 'Cisteína  (%MN)'),
  n('tyrosine', '%', 'amino_acid', 'Tirosina', 'Tyrosine', 'Tirosina  (%MN)'),

  n('mufa', '%', 'fatty_acid', 'AG monoinsaturados', 'Monounsaturated FA', 'AG Monoinsaturadas  (%MN)'),
  n('pufa', '%', 'fatty_acid', 'AG polinsaturados', 'Polyunsaturated FA', 'AG Polinsaturadas  (%MN)'),
  n('sfa', '%', 'fatty_acid', 'AG saturados', 'Saturated FA', 'AG Saturadas (%MN)'),
  n('omega6', '%', 'fatty_acid', 'Ómega 6', 'Omega-6', 'Ômega 6'),
  n('omega3', '%', 'fatty_acid', 'Ómega 3', 'Omega-3', 'Ômega 3'),
  n('linoleic_acid', '%', 'fatty_acid', 'Ácido linoleico', 'Linoleic acid', 'Ácido linoleico  (%MN)'),
  n('linolenic_acid', '%', 'fatty_acid', 'Ácido linolénico', 'Linolenic acid', 'Acido Linolênico  (%MN)'),
  n('epa', '%', 'fatty_acid', 'EPA', 'EPA', 'EPA  (%MN)'),
  n('dha', '%', 'fatty_acid', 'DHA', 'DHA', 'DHA  (%MN)'),
  n('arachidonic_acid', '%', 'fatty_acid', 'Ácido araquidónico', 'Arachidonic acid', 'A. Aracdônico  (%MN)'),

  n('dietary_fibre', '%', 'fibre', 'Fibra dietética', 'Dietary fibre', 'Fibra Dietética  (%MN)'),
  n('cellulose', '%', 'fibre', 'Celulose', 'Cellulose', 'Celulose  (%MN)'),
  n('hemicellulose', '%', 'fibre', 'Hemicelulose', 'Hemicellulose', 'Hemicelulose  (%MN)'),
  n('lignin', '%', 'fibre', 'Lenhina', 'Lignin', 'Lignina  (%MN)'),
  n('ndf', '%', 'fibre', 'FDN', 'NDF', 'FDN  (%MN)'),
  n('adf', '%', 'fibre', 'FDA', 'ADF', 'FDA  (%MN)'),

  n('glucose', '%', 'carbohydrate', 'Glicose', 'Glucose', 'Glicose  (%MN)'),
  n('fructose', '%', 'carbohydrate', 'Frutose', 'Fructose', 'Fructose  (%MN)'),
  n('sucrose', '%', 'carbohydrate', 'Sacarose', 'Sucrose', 'Sucrose  (%MN)'),
  n('starch', '%', 'carbohydrate', 'Amido', 'Starch', 'Amido (%MN)'),
  n('lactose', '%', 'carbohydrate', 'Lactose', 'Lactose', 'Lactose  (%MN)'),
  n('glycemic_index', 'index', 'carbohydrate', 'Índice glicémico', 'Glycaemic index', 'Indice Glicemico'),
  n('glycemic_load', 'index', 'carbohydrate', 'Carga glicémica (100 g)', 'Glycaemic load (100 g)', 'Carga Glicêmica (100g)'),

  n('co2eq', 'kgCO2eq/kg', 'other', 'Pegada de carbono', 'Carbon footprint', 'CO2eqkg/kg'),
];

export const NUTRIENT_BY_KEY: ReadonlyMap<string, NutrientDef> = new Map(NUTRIENTS.map((d) => [d.key, d]));

/** Nutrients that are not concentrations and must not be converted to a dry-matter basis. */
export const NON_CONCENTRATION = new Set(['moisture', 'dry_matter', 'glycemic_index', 'glycemic_load', 'co2eq']);
