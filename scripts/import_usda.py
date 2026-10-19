"""Import USDA FoodData Central SR Legacy into data/seed/foods_usda.json.

Usage: python3 scripts/import_usda.py data/raw/FoodData_Central_sr_legacy_food_csv_2018-04

Source: U.S. Department of Agriculture, Agricultural Research Service.
FoodData Central, SR Legacy (2018). https://fdc.nal.usda.gov/ — public domain
(CC0); citation requested.

Values are per 100 g edible portion (as fed), converted to the catalog units in
packages/core/src/nutrients.ts. Nutrients without a record are left out (not
analysed); recorded zeros are kept. Categories of prepared human foods (fast
food, restaurant meals, sweets, baked goods…) are skipped: they are not used in
animal diets and would only clutter the food list.
"""

import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "seed" / "foods_usda.json"
SOURCE = "USDA FDC (SR Legacy)"
VERSION = "SR Legacy 2018-04"

# FDC nutrient id -> (catalog key, factor from FDC unit per 100 g to catalog unit).
G_TO_PCT, MG_TO_PCT, MG_TO_MGKG, UG_TO_MGKG = 1, 1 / 1000, 10, 1 / 100
NUTRIENTS = {
    1051: ("moisture", G_TO_PCT),
    1003: ("crude_protein", G_TO_PCT),
    1004: ("ether_extract", G_TO_PCT),
    1007: ("ash", G_TO_PCT),
    1079: ("dietary_fibre", G_TO_PCT),
    1009: ("starch", G_TO_PCT),
    1010: ("sucrose", G_TO_PCT),
    1011: ("glucose", G_TO_PCT),
    1012: ("fructose", G_TO_PCT),
    1013: ("lactose", G_TO_PCT),
    1021: ("hemicellulose", G_TO_PCT),
    1022: ("cellulose", G_TO_PCT),
    1080: ("lignin", G_TO_PCT),
    1087: ("calcium", MG_TO_PCT),
    1091: ("phosphorus", MG_TO_PCT),
    1093: ("sodium", MG_TO_PCT),
    1092: ("potassium", MG_TO_PCT),
    1090: ("magnesium", MG_TO_PCT),
    1094: ("sulfur", MG_TO_PCT),
    1089: ("iron", MG_TO_MGKG),
    1095: ("zinc", MG_TO_MGKG),
    1098: ("copper", MG_TO_MGKG),
    1101: ("manganese", MG_TO_MGKG),
    1103: ("selenium", UG_TO_MGKG),
    1100: ("iodine", UG_TO_MGKG),
    1097: ("cobalt", UG_TO_MGKG),
    1109: ("vitamin_e", MG_TO_MGKG),
    1185: ("vitamin_k", UG_TO_MGKG),
    1162: ("vitamin_c", MG_TO_MGKG),
    1165: ("thiamin", MG_TO_MGKG),
    1166: ("riboflavin", MG_TO_MGKG),
    1167: ("niacin", MG_TO_MGKG),
    1170: ("pantothenic_acid", MG_TO_MGKG),
    1175: ("pyridoxine", MG_TO_MGKG),
    1176: ("biotin", UG_TO_MGKG),
    1177: ("folic_acid", UG_TO_MGKG),
    1178: ("cobalamin", UG_TO_MGKG),
    1180: ("choline", MG_TO_MGKG),
    1210: ("tryptophan", G_TO_PCT),
    1211: ("threonine", G_TO_PCT),
    1212: ("isoleucine", G_TO_PCT),
    1213: ("leucine", G_TO_PCT),
    1214: ("lysine", G_TO_PCT),
    1215: ("methionine", G_TO_PCT),
    1216: ("cysteine", G_TO_PCT),
    1217: ("phenylalanine", G_TO_PCT),
    1218: ("tyrosine", G_TO_PCT),
    1219: ("valine", G_TO_PCT),
    1220: ("arginine", G_TO_PCT),
    1221: ("histidine", G_TO_PCT),
    1233: ("glutamine", G_TO_PCT),
    1234: ("taurine", G_TO_PCT),
    1258: ("sfa", G_TO_PCT),
    1292: ("mufa", G_TO_PCT),
    1293: ("pufa", G_TO_PCT),
    1269: ("linoleic_acid", G_TO_PCT),
    1270: ("linolenic_acid", G_TO_PCT),
    1271: ("arachidonic_acid", G_TO_PCT),
    1278: ("epa", G_TO_PCT),
    1272: ("dha", G_TO_PCT),
}
CARB_BY_DIFFERENCE = 1005
VITAMIN_A_RAE_UG, VITAMIN_A_IU = 1106, 1104
VITAMIN_D2_UG, VITAMIN_D3_UG, VITAMIN_D_IU = 1111, 1112, 1110

# FDC food category id -> app group (None = skipped).
CATEGORY = {
    1: "Ovos e lácteos", 2: "Temperos", 4: "Óleos e gorduras", 5: "Carnes", 9: "Frutas",
    10: "Carnes", 11: "Legumes", 12: "Sementes", 13: "Carnes", 15: "Pescado",
    16: "Cereais e leguminosas", 17: "Carnes", 20: "Cereais", 24: None,
}
LEAFY = re.compile(r"\b(lettuce|spinach|kale|cabbage|chard|collards?|greens|endive|arugula|cress|dandelion|"
                   r"chicory|parsley|lambsquarters|purslane|amaranth leaves|beet greens|clover|alfalfa)\b", re.I)
FISH = re.compile(r"\b(fish|salmon|whitefish|trout|cod|herring|smelt|seal|whale|walrus|sea lion|octopus|clam|"
                  r"shrimp|crab|char|sheefish|burbot|pike|grayling|lingcod|oil, beluga)\b", re.I)
PLANT = re.compile(r"\b(berries|berry|roots?|shoots?|leaves|plant|rose hips|willow|sourdock|fireweed|"
                   r"cattail|stinging nettles|chokecherries|acorn|corn|squash|beans?|tea)\b", re.I)
ANIMAL_GROUPS = {"Carnes", "Pescado", "Ovos e lácteos"}


def group_of(cat: int, name: str) -> str | None:
    if cat == 24:  # American Indian/Alaska Native foods: mixed; many wild animals.
        if FISH.search(name):
            return "Pescado"
        return "Legumes" if PLANT.search(name) else "Carnes"
    g = CATEGORY.get(cat)
    if g == "Legumes" and LEAFY.search(name):
        return "Verduras"
    return g


def main(folder: str) -> None:
    d = Path(folder)
    foods = {}
    for r in csv.DictReader(open(d / "food.csv", encoding="utf-8")):
        cat = int(r["food_category_id"] or 0)
        g = group_of(cat, r["description"])
        if g:
            foods[r["fdc_id"]] = {"name": r["description"], "group": g, "cat": cat}
    ndb = {r["fdc_id"]: r["NDB_number"] for r in csv.DictReader(open(d / "sr_legacy_food.csv", encoding="utf-8"))}
    cats = {r["id"]: r["description"] for r in csv.DictReader(open(d / "food_category.csv", encoding="utf-8"))}

    raw = defaultdict(dict)
    for r in csv.DictReader(open(d / "food_nutrient.csv", encoding="utf-8")):
        if r["fdc_id"] in foods and r["amount"] != "":
            raw[r["fdc_id"]][int(r["nutrient_id"])] = float(r["amount"])

    out, skipped = [], 0
    for fid, meta in foods.items():
        v = raw.get(fid, {})
        if 1051 not in v:
            skipped += 1
            continue
        n = {key: round(v[i] * f, 6) for i, (key, f) in NUTRIENTS.items() if i in v}
        if CARB_BY_DIFFERENCE in v:
            # Available carbohydrate (as in INSA): carbohydrate by difference minus fibre.
            n["nfe"] = round(max(0.0, v[CARB_BY_DIFFERENCE] - v.get(1079, 0.0)), 6)
        if VITAMIN_A_RAE_UG in v:
            n["vitamin_a"] = round(v[VITAMIN_A_RAE_UG] * 3.33 / 100, 6)
        elif VITAMIN_A_IU in v:
            n["vitamin_a"] = round(v[VITAMIN_A_IU] / 100, 6)
        if VITAMIN_D2_UG in v:
            n["vitamin_d2"] = round(v[VITAMIN_D2_UG] * 40 / 100, 6)
        if VITAMIN_D3_UG in v:
            n["vitamin_d3"] = round(v[VITAMIN_D3_UG] * 40 / 100, 6)
        if VITAMIN_D2_UG not in v and VITAMIN_D3_UG not in v and VITAMIN_D_IU in v:
            n["vitamin_d3" if meta["group"] in ANIMAL_GROUPS else "vitamin_d2"] = round(v[VITAMIN_D_IU] / 100, 6)
        if "methionine" in n and "cysteine" in n:
            n["methionine_cystine"] = round(n["methionine"] + n["cysteine"], 6)
        out.append({
            "id": f"usda-{ndb.get(fid, fid)}",
            "name": meta["name"],
            "group": meta["group"],
            "classification": [cats[str(meta["cat"])]],
            "dryMatter": round(100 - n["moisture"], 4),
            "nutrients": n,
            "energy": {},
            "sources": [{"source": SOURCE, "code": ndb.get(fid, fid), "version": VERSION}],
        })

    out.sort(key=lambda f: f["name"].lower())
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(out)} alimentos -> {OUT.relative_to(ROOT)} (sem humidade: {skipped})")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "data/raw/FoodData_Central_sr_legacy_food_csv_2018-04"))
