"""Build data/seed/foods_curated.json: single foods transcribed by hand from
product labels or feed databases, each with its source.

Usage: python3 scripts/build_curated_foods.py

Values are entered as published (as fed for labels, % DM / g per kg DM for
Feedipedia) and converted here to the as-fed catalog units, so each number can
be checked against its source line by line. Label "additives" (vitamins and
trace elements added per kg) are supplements, not totals, so they go into the
reference text and not into the nutrient values.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "seed" / "foods_curated.json"

LABEL = "Rótulo do fabricante"
FEEDIPEDIA = "Feedipedia (INRAE, CIRAD, AFZ, FAO)"


def from_label(v: dict) -> dict:
    """Guaranteed analysis as fed; NFE by difference."""
    n = dict(v)
    n["nfe"] = round(100 - sum(v[k] for k in ("moisture", "crude_protein", "ether_extract", "crude_fibre", "ash")), 4)
    return n


def from_feedipedia(dm: float, pct_dm: dict, g_kg_dm: dict, mg_kg_dm: dict, aa_g16n: dict) -> dict:
    """Feedipedia: % DM, g/kg DM (minerals), mg/kg DM (trace), g/16 g N (amino acids)."""
    f = dm / 100
    n = {"moisture": round(100 - dm, 4)}
    n.update({k: round(x * f, 4) for k, x in pct_dm.items()})
    n.update({k: round(x / 10 * f, 4) for k, x in g_kg_dm.items()})
    n.update({k: round(x * f, 4) for k, x in mg_kg_dm.items()})
    cp = n["crude_protein"]
    n.update({k: round(x / 100 * cp, 4) for k, x in aa_g16n.items()})
    nfe = 100 - sum(n.get(k, 0) for k in ("moisture", "crude_protein", "ether_extract", "crude_fibre", "ash"))
    # Averages from different samples can add up to more than 100 %.
    n["nfe"] = round(max(0.0, nfe), 4)
    return n


FOODS = [
    {
        "id": "rotulo-ownat-classic-junior-dog",
        "name": "Ownat Classic Junior (cão), ração seca",
        "group": "Ração",
        "source": LABEL,
        "reference": (
            "Ownat Classic Junior (DOG), análise garantida do rótulo: proteína 28 %, gordura 14 %, celulose bruta 2,5 %, "
            "matéria inorgânica 7 %, humidade 8 %, cálcio 1,5 %, fósforo 1,1 %. Aditivos/kg: vit. A 18 000 UI, vit. D3 1500 UI, "
            "vit. E 90 UI, vit. C 100 mg, Cu 4 mg, Mn 38 mg, Zn 107,5 mg, Fe 30 mg, I 3 mg, Se 0,2 mg. "
            "Transcrito de zooplus.fr (art. 9980002141) e ornibird.com (ref. 031406), consultados em 2026-10-19."
        ),
        "nutrients": from_label({
            "moisture": 8, "crude_protein": 28, "ether_extract": 14, "crude_fibre": 2.5, "ash": 7,
            "calcium": 1.5, "phosphorus": 1.1,
        }),
    },
    {
        "id": "rotulo-royal-canin-recovery-humido",
        "name": "Royal Canin Veterinary Recovery (cão e gato), húmido",
        "group": "Ração",
        "source": LABEL,
        "reference": (
            "Royal Canin Veterinary Diet Recovery, rótulo UE: proteína 12,7 %, gordura 6,4 %, cinza bruta 2,3 %, fibra bruta 1,7 %, "
            "humidade 73 %, ómega 3 0,68 %, ómega 6 1,5 %. Aditivos/kg: vit. A 2600 UI, vit. D3 210 UI, taurina 1,5 g, Fe 14 mg, "
            "I 0,58 mg, Cu 2,9 mg, Mn 9,6 mg, Zn 29 mg, Se 0,053 mg. Transcrito de shop.thepethealthclub.co.uk, consultado em "
            "2026-10-19. Atenção: o rótulo varia por mercado (ex.: Finlândia 14 % PB, 72,5 % humidade); confirmar na embalagem usada."
        ),
        "nutrients": from_label({
            "moisture": 73, "crude_protein": 12.7, "ether_extract": 6.4, "crude_fibre": 1.7, "ash": 2.3,
            "omega3": 0.68, "omega6": 1.5,
        }),
    },
    {
        "id": "feedipedia-tenebrio-vivo",
        "name": "Tenébrio, larva viva (Tenebrio molitor)",
        "group": "Presas",
        "source": FEEDIPEDIA,
        "reference": (
            "Tran G., Gnaedinger C., Mélin C., 2026. Mealworm (Tenebrio molitor), fresh. Feedipedia, a programme by INRAE, CIRAD, "
            "AFZ and FAO. https://feedipedia.org/node/16401 "
            "(médias de 3–11 amostras; inclui Finke 2002). Larvas vivas não suplementadas: Ca:P ≈ 0,3, por isso "
            "precisam de gut-loading ou polvilhamento com cálcio."
        ),
        "nutrients": from_feedipedia(
            41.1,
            {"crude_protein": 53.5, "ether_extract": 35, "ash": 3.2, "ndf": 12, "adf": 6.7},
            {"calcium": 2.5, "phosphorus": 7.9, "potassium": 9.5, "sodium": 0.83, "magnesium": 2.2},
            {"manganese": 9, "zinc": 125, "copper": 18, "iron": 59, "selenium": 0.5},
            {"arginine": 5.5, "cysteine": 0.8, "histidine": 3.3, "isoleucine": 4.6, "leucine": 8.3, "lysine": 5.5,
             "methionine": 1.5, "methionine_cystine": 2.4, "phenylalanine": 3.8, "threonine": 4.0, "tryptophan": 1.0,
             "tyrosine": 7.2, "valine": 6.2},
        ),
    },
    {
        "id": "feedipedia-tenebrio-seco",
        "name": "Farinha de tenébrio, seca (Tenebrio molitor)",
        "group": "Presas",
        "source": FEEDIPEDIA,
        "reference": "Tran G., Gnaedinger C., Mélin C., 2026. Mealworm (Tenebrio molitor), dried. Feedipedia, a programme by INRAE, CIRAD, AFZ and FAO. https://feedipedia.org/node/16401.",
        "nutrients": from_feedipedia(
            94.6,
            {"crude_protein": 50.4, "crude_fibre": 5.1, "ether_extract": 35.6, "ash": 3.6, "ndf": 12, "adf": 6.7},
            {"calcium": 2.4, "phosphorus": 7.7, "potassium": 9.5, "sodium": 0.83, "magnesium": 2.2},
            {"manganese": 9, "zinc": 125, "copper": 18, "iron": 59, "selenium": 0.5},
            {"arginine": 5.9, "cysteine": 7.0, "histidine": 3.2, "isoleucine": 6.0, "leucine": 11.0, "lysine": 6.4,
             "methionine": 1.9, "methionine_cystine": 9.0, "phenylalanine": 4.3, "threonine": 5.2, "tryptophan": 1.7,
             "tyrosine": 6.3, "valine": 8.8},
        ),
    },
    {
        "id": "feedipedia-farinha-de-pena",
        "name": "Farinha de pena hidrolisada",
        "group": "Suplementos",
        "source": FEEDIPEDIA,
        "reference": (
            "Heuzé V., Tran G., Nozière P., Bastianelli D., Lebas F., 2020. Feather meal. Feedipedia, a programme by INRAE, CIRAD, "
            "AFZ and FAO. https://feedipedia.org/node/213 "
            "(médias de até 156 amostras). Proteína sobretudo queratina: rica em cistina, pobre em lisina, metionina e histidina."
        ),
        "nutrients": from_feedipedia(
            92,
            {"crude_protein": 85.5, "crude_fibre": 1.4, "ndf": 7.3, "adf": 5.5, "ether_extract": 9.2, "ash": 5.9},
            {"calcium": 13.3, "phosphorus": 8.9, "potassium": 1.4, "sodium": 1.32, "magnesium": 0.8, "sulfur": 18.2},
            {"manganese": 16, "zinc": 138, "copper": 10, "iron": 536, "selenium": 0.8},
            {"arginine": 6.8, "cysteine": 4.5, "histidine": 0.8, "isoleucine": 4.9, "leucine": 8.0, "lysine": 2.1,
             "methionine": 0.7, "methionine_cystine": 5.2, "phenylalanine": 4.7, "threonine": 4.7, "tryptophan": 0.6,
             "tyrosine": 2.8, "valine": 7.3},
        ),
    },
]


def main() -> None:
    out = []
    for f in FOODS:
        n = f["nutrients"]
        out.append({
            "id": f["id"], "name": f["name"], "group": f["group"],
            "dryMatter": round(100 - n["moisture"], 4), "nutrients": n, "energy": {},
            "sources": [{"source": f["source"], "reference": f["reference"]}],
        })
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(out)} alimentos -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
