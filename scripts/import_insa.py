"""Import the INSA food composition table (Portugal) into data/seed/foods_insa.json.

Usage: python3 scripts/import_insa.py data/raw/insa_tca.xlsx

Source: Base de Dados da Composição de Alimentos, Instituto Nacional de Saúde
Doutor Ricardo Jorge, I. P. (INSA), https://portfir.insa.min-saude.pt/
The terms of use require the source to be shown wherever the data appear, so
every food carries it and the app displays ATTRIBUTION.

INSA values are per 100 g edible portion, i.e. as fed (MN), which is our
storage basis. Units are converted to the catalog in packages/core/src/nutrients.ts:
g/100 g -> %; mg/100 g -> % (/1000) or mg/kg (x10); µg/100 g -> mg/kg (/100).
Empty cells mean "not analysed" and are left out; zeros are real zeros
("0 or trace" in INSA's convention) and are kept.
"""

import json
import sys
import unicodedata
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "seed" / "foods_insa.json"
SOURCE = "INSA (PT)"
ATTRIBUTION = "Fonte: Base de Dados da Composição de Alimentos. Instituto Nacional de Saúde Doutor Ricardo Jorge, I. P. - INSA."

# Header (text before the unit line) -> (nutrient key, factor from INSA unit to catalog unit).
COLUMNS = {
    "Lípidos": ("ether_extract", 1),
    "Ácidos gordos saturados": ("sfa", 1),
    "Ácidos gordos monoinsaturados": ("mufa", 1),
    "Ácidos gordos polinsaturados": ("pufa", 1),
    "Ácido linoleico": ("linoleic_acid", 1),
    # Available carbohydrate stands in for NFE so Atwater 4/9/4 matches INSA's energy.
    "Hidratos de carbono": ("nfe", 1),
    "Amido": ("starch", 1),
    "Fibra": ("dietary_fibre", 1),
    "Proteínas": ("crude_protein", 1),
    "Água": ("moisture", 1),
    "Cinza": ("ash", 1),
    # µg RAE -> IU (3.33 IU/µg retinol) per g.
    "Vitamina A": ("vitamin_a", 3.33 / 100),
    "α-tocoferol": ("vitamin_e", 10),
    "Tiamina": ("thiamin", 10),
    "Riboflavina": ("riboflavin", 10),
    "Niacina": ("niacin", 10),
    # Tryptophan/60 in mg -> tryptophan in g/100 g.
    "Triptofano/60": ("tryptophan", 60 / 1000),
    "Vitamina B6": ("pyridoxine", 10),
    "Vitamina B12": ("cobalamin", 1 / 100),
    "Vitamina C": ("vitamin_c", 10),
    "Folatos": ("folic_acid", 1 / 100),
    "Sódio": ("sodium", 1 / 1000),
    "Potássio": ("potassium", 1 / 1000),
    "Cálcio": ("calcium", 1 / 1000),
    "Fósforo": ("phosphorus", 1 / 1000),
    "Magnésio": ("magnesium", 1 / 1000),
    "Ferro": ("iron", 10),
    "Zinco": ("zinc", 10),
    "Selénio": ("selenium", 1 / 100),
    "Iodo": ("iodine", 1 / 100),
}
# µg -> IU (40 IU/µg) per g; INSA does not split D2/D3.
VITAMIN_D = ("Vitamina D", 40 / 100)

# FoodEx2 level 1 -> app group. Groups follow the Banco naming so the diet
# evaluation (categoryFromGroup) classifies them.
LEVEL1 = {
    "Carne e produtos cárneos": "Carnes",
    "Peixes, mariscos, anfíbios, répteis e invertebrados": "Pescado",
    "Frutos e produtos derivados de frutos": "Frutas",
    "Produtos hortícolas e derivados": "Legumes",
    "Raízes amiláceas ou tubérculos e seus produtos, plantas sacarinas": "Legumes",
    "Cereais e produtos à base de cereais": "Cereais",
    "Leite e produtos lácteos": "Ovos e lácteos",
    "Ovos e ovoprodutos": "Ovos e lácteos",
    "Óleos e gorduras de origem animal e vegetal e seus derivados": "Óleos e gorduras",
    "Anfíbios, répteis, e invertebrados terrestres": "Presas",
}
LEVEL2 = {
    "Hortícolas folhosos": "Verduras",
    "Couves de inflorescência": "Verduras",
    "Ervas e flores comestíveis": "Verduras",
    "Germinados, rebentos e similares": "Verduras",
    "Leguminosas": "Cereais e leguminosas",
    "Leguminosas, frutos de casca rija, sementes oleaginosas e especiarias - Processadas": "Sementes",
    "Frutos de casca rija, sementes oleaginosas e frutos oleaginosos": "Sementes",
    "Especiarias": "Temperos",
}
# Values per 100 ml, not 100 g: incompatible with the as-fed basis.
EXCLUDED_LEVEL1 = {"Bebidas alcoólicas"}


def label(header: str) -> str:
    return " ".join(str(header).split("\n")[0].split())


def slug(text: str) -> str:
    t = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return "-".join("".join(c if c.isalnum() else " " for c in t).split())


def group_of(l1: str, l2: str) -> str:
    l1, l2 = l1.strip(), l2.strip()
    if l2 in LEVEL2:
        return LEVEL2[l2]
    return LEVEL1.get(l1, "Alimentos processados")


def main(path: str) -> None:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.worksheets[0]
    version = ws.title.split("BDCA_")[-1].replace("v ", "").strip()  # e.g. "7.1 - 2026"
    rows = ws.iter_rows(values_only=True)
    next(rows)
    header = [label(h) if h else "" for h in next(rows)]
    unknown = [h for h in header[5:] if h and h not in COLUMNS and h != VITAMIN_D[0]]
    col = {h: i for i, h in enumerate(header)}

    foods, skipped = [], 0
    for r in rows:
        if not r[0]:
            continue
        code, name, l1, l2, l3 = (str(x or "").strip() for x in r[:5])
        if l1 in EXCLUDED_LEVEL1:
            skipped += 1
            continue
        nutrients = {}
        for h, (key, factor) in COLUMNS.items():
            v = r[col[h]]
            if v is None or v == "":
                continue
            nutrients[key] = round(float(v) * factor, 6)
        vd = r[col[VITAMIN_D[0]]]
        if vd not in (None, ""):
            animal = l1 in LEVEL1 and LEVEL1[l1] in {"Carnes", "Pescado", "Ovos e lácteos", "Presas"}
            nutrients["vitamin_d3" if animal else "vitamin_d2"] = round(float(vd) * VITAMIN_D[1], 6)
        moisture = nutrients.get("moisture")
        if moisture is None:
            skipped += 1
            continue
        dm = round(100 - moisture, 4)
        foods.append({
            "id": f"insa-{code}",
            "name": name,
            "group": group_of(l1, l2),
            "classification": [x for x in (l1, l2, l3) if x],
            "dryMatter": dm,
            "nutrients": nutrients,
            "energy": {},
            "sources": [{"source": SOURCE, "code": code, "version": version}],
        })

    foods.sort(key=lambda f: slug(f["name"]))
    OUT.write_text(json.dumps(foods, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(foods)} alimentos -> {OUT.relative_to(ROOT)} (ignorados: {skipped}; colunas sem correspondência: {unknown})")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "data" / "raw" / "insa_tca.xlsx"))
