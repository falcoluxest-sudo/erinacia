"""Import the author's Banco.xlsm workbook into data/seed/*.json.

Usage: python3 scripts/import_banco.py path/to/Banco.xlsm

Foods are stored as fed (MN) using the canonical nutrient keys from
packages/core/src/nutrients.ts. Requirement values are on a dry-matter basis;
zeros in the workbook mean "not analysed" and are dropped, for foods and
requirements alike.
"""

import json
import re
import sys
import unicodedata
import warnings
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SEED = ROOT / "data" / "seed"
SOURCE = "Banco Erinacia (planilha da autora)"

ENERGY_COLUMNS = {
    "EM Ruminante kcal/100gr MN": "ruminant",
    "EM Herb. Monogástrico kcal/100gr MN": "herbivore_monogastric",
    "EM Carnívoro kcal/100gr MN": "carnivore",
    "EM Primata C/ Ferm. kcal/100gr MN": "primate_fermenter",
    "EM Primata kcal/100gr MN": "primate",
    "Atwater": "atwater",
}

REQUIREMENT_EXTRA = {
    "água": "water",
    "energiametabolizável": "metabolizable_energy",
    "kcalem/gpb": "kcal_per_g_protein",
    "vitaminab9(acidofolico)(mg/kg)": "folic_acid",
    "agmono(%)": "mufa",
    "agpoli(%)": "pufa",
    "agsat(%)": "sfa",
    "ômega6(%)": "omega6",
    "ômega3(%)": "omega3",
}


def norm(header: str) -> str:
    h = unicodedata.normalize("NFC", str(header)).lower()
    h = re.sub(r"\s+", "", h)
    h = h.replace("%mn", "%").replace("%ms", "%").replace("mg/kgmn", "mg/kg").replace("rae", "")
    return h


def load_catalog() -> dict[str, str]:
    src = (ROOT / "packages/core/src/nutrients.ts").read_text(encoding="utf-8")
    pattern = re.compile(r"n\('(\w+)',[^\n]*?'([^']+)'\),\s*$", re.M)
    return {norm(header): key for key, header in pattern.findall(src)}


def rows(ws):
    for r in ws.iter_rows(values_only=True):
        if any(v is not None for v in r):
            yield r


def slug(text: str) -> str:
    t = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def num(v):
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def import_foods(wb, catalog):
    data = list(rows(wb["Banco dados"]))
    header = data[1]
    foods = []
    for r in data[2:]:
        name = r[0]
        if not name or str(name).startswith("Inserir"):
            continue
        rec = dict(zip(header, r))
        nutrients, energy = {}, {}
        for col, val in rec.items():
            if col is None:
                continue
            if col in ENERGY_COLUMNS and num(val) is not None:
                energy[ENERGY_COLUMNS[col]] = round(num(val), 6)
                continue
            key = catalog.get(norm(col))
            # A zero in the Banco means "not analysed" (confirmed by the author), not a true zero.
            if key and key not in ("dry_matter",) and num(val) is not None and num(val) != 0:
                nutrients[key] = round(num(val), 6)
        foods.append({
            "id": slug(str(name)),
            "name": str(name).strip(),
            "group": rec.get("Grupo alimentar"),
            "dryMatter": round(num(rec.get("MS (%)")), 6),
            "nutrients": nutrients,
            "energy": energy,
            "sources": [{"source": SOURCE, "reference": rec.get("Bibliografia")}],
            "sampleCount": rec.get("Nº dados"),
        })
    return foods


def import_requirements(wb, catalog):
    data = list(rows(wb["Requerimento"]))
    header = data[0]
    profiles = {}
    for r in data[1:]:
        group = r[0]
        if not group or str(group).startswith("Sempre"):
            continue
        group = str(group).strip()
        bound = "min"
        m = re.search(r",?\s*(m[ií]n|m[aá]x)\.?$", group, re.I)
        if m:
            bound = "max" if m.group(1).lower() in ("max", "máx") else "min"
            group = group[: m.start()].strip()
        prof = profiles.setdefault(group, {"id": slug(group), "group": group, "values": {}, "reference": None})
        for col, val in zip(header, r):
            if col is None or num(val) in (None, 0.0):
                continue
            n = norm(col)
            key = REQUIREMENT_EXTRA.get(n) or catalog.get(n)
            if key:
                prof["values"].setdefault(key, {})[bound] = num(val)
            elif "bibliografia" in n:
                prof["reference"] = val
    return list(profiles.values())


def import_metabolic(wb):
    out = []
    for r in list(rows(wb["Taxa Metabólica"]))[1:]:
        group, kind, _formula, const, exp, wunit, eunit, year, ref = (list(r) + [None] * 9)[:9]
        if not group:
            continue
        out.append({
            "id": slug(str(group)),
            "group": str(group).strip(),
            "type": kind,
            "constant": num(const),
            "exponent": num(exp),
            "weightUnit": str(wunit).lower(),
            "energyUnit": "kJ" if str(eunit).lower() == "kj" else "kcal",
            "year": year,
            "reference": ref,
        })
    return out


def import_intake(wb):
    out = []
    for r in list(rows(wb["Ingestão"]))[1:]:
        group, pct, basis, ref = (list(r) + [None] * 4)[:4]
        if not group or not num(pct):
            continue
        out.append({"id": slug(str(group)), "group": str(group).strip(), "percentBodyWeight": num(pct),
                    "basis": "DM" if basis == "MS" else "asFed", "reference": ref})
    return out


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    warnings.filterwarnings("ignore")
    wb = openpyxl.load_workbook(sys.argv[1], read_only=True, data_only=True)
    catalog = load_catalog()
    SEED.mkdir(parents=True, exist_ok=True)
    outputs = {
        "foods.json": import_foods(wb, catalog),
        "requirements.json": import_requirements(wb, catalog),
        "metabolic_formulas.json": import_metabolic(wb),
        "intake_references.json": import_intake(wb),
    }
    for name, payload in outputs.items():
        (SEED / name).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{name}: {len(payload)}")


if __name__ == "__main__":
    main()
