"""Build data/seed/foods_prey.json: whole prey (vertebrates, fish, marine
invertebrates, feeder insects) transcribed from zoo-nutrition literature.

Usage: python3 scripts/build_prey_foods.py

Values are typed exactly as printed in each source table (basis and units of
the source), so every number can be checked line by line against the original.
This script converts them to the catalog's as-fed units and records how each
value was obtained:

- measured (no note): analytical value as published, only unit/basis converted
  using the dry matter of the same row;
- calculated: derived from other values (NFE by difference, minerals from
  another table converted with the dry matter of the proximate table…);
- estimated: involves an assumption (midpoint of a published min–max range,
  IU→mg vitamin E equivalence).

Every food starts with review status "pending": the founder has not yet checked
the transcription against the source.

Sources
- Dierenfeld ES, Alcorn HL, Jacobsen KL (2002). Nutrient composition of whole
  vertebrate prey (excluding fish) fed in zoos. USDA/NAL, Z7158-G2, 20 pp.
  Tables 1–3 (published data) and 4–6 (unpublished zoo data), DM basis.
- Bernard JB, Allen ME (1997, rev. 2002). Feeding captive piscivorous animals:
  nutritional aspects of fish as food. AZA Nutrition Advisory Group Handbook,
  Fact Sheet 005. Tables 1–3 DM basis (min–max ranges), Table 4 wet basis.
- Finke MD (2015). Complete nutrient content of four species of commercially
  available feeder insects fed enhanced diets during growth. Zoo Biology
  34(6):554–564. doi:10.1002/zoo.21246. As-is basis (online HTML version).
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "seed" / "foods_prey.json"

DIERENFELD = (
    "Dierenfeld E.S., Alcorn H.L., Jacobsen K.L. (2002). Nutrient composition of whole vertebrate prey "
    "(excluding fish) fed in zoos. U.S. Department of Agriculture, National Agricultural Library, Z7158-G2. 20 pp."
)
NAG_FISH = (
    "Bernard J.B., Allen M.E. (1997, revisto 2002). Feeding captive piscivorous animals: nutritional aspects of fish "
    "as food. AZA Nutrition Advisory Group Handbook, Fact Sheet 005. "
    "https://nagonline.net/wp-content/uploads/2014/01/NAG-FS005-97-Fish-JONI-FEB-24-2002-MODIFIED.pdf"
)
FINKE_2015 = (
    "Finke M.D. (2015). Complete nutrient content of four species of commercially available feeder insects fed "
    "enhanced diets during growth. Zoo Biology 34(6): 554–564. doi:10.1002/zoo.21246"
)

VIT_E_NOTE = (
    "Publicado em UI/kg; convertido com 1 UI = 1 mg (equivalência usada nas exigências NRC, expressas em "
    "acetato de all-rac-α-tocoferol). Se o valor for α-tocoferol natural, o equivalente em mg seria ≈0,67×."
)

MACRO = ("calcium", "phosphorus", "magnesium", "sodium", "potassium")  # % DM in the sources
TRACE = ("copper", "iron", "zinc", "manganese", "selenium")  # mg/kg (ppm) DM in the sources

NUM_PT = lambda x: f"{x:g}".replace(".", ",")


class FoodBuilder:
    def __init__(self, fid, name, group, source, reference):
        self.food = {
            "id": fid,
            "name": name,
            "group": group,
            "dryMatter": None,
            "nutrients": {},
            "energy": {},
            "sources": [{"source": source, "reference": reference}],
            "valueNotes": {},
            "dataQuality": [],
            "review": {"status": "pending"},
        }

    def note(self, key, origin, text):
        self.food["valueNotes"][key] = {"origin": origin, "note": text}

    def set_dm(self, dm):
        self.food["dryMatter"] = round(dm, 4)
        self.food["nutrients"]["moisture"] = round(100 - dm, 4)

    def dm_pct(self, key, value_dm):
        """% of DM -> % as fed."""
        self.food["nutrients"][key] = round(value_dm * self.food["dryMatter"] / 100, 6)

    def dm_mgkg(self, key, value_dm):
        """mg/kg DM -> mg/kg as fed."""
        self.food["nutrients"][key] = round(value_dm * self.food["dryMatter"] / 100, 6)

    def nfe_by_difference(self):
        n = self.food["nutrients"]
        if all(k in n for k in ("crude_protein", "ether_extract", "ash")):
            nfe = 100 - n["moisture"] - n["crude_protein"] - n["ether_extract"] - n["ash"] - n.get("crude_fibre", 0)
            n["nfe"] = round(max(0.0, nfe), 6)
            text = "Calculado por diferença (100 − humidade − PB − EE − cinza); a fonte não analisa hidratos de carbono."
            if nfe < 0:
                text += f" A soma excede 100 % ({NUM_PT(round(-nfe, 2))} pontos a mais); fixado em 0."
            self.note("nfe", "calculated", text)

    def build(self):
        f = self.food
        for k in ("valueNotes", "dataQuality"):
            if not f[k]:
                del f[k]
        return f


# ---------------------------------------------------------------------------
# Dierenfeld et al. 2002 — DM basis. None = "NA" (not analysed) in the source.
# Proximate: (DM %, CP % DM, fat % DM, ash % DM). Vit A, Vit E: IU/kg DM.
# Minerals: Ca, P, Mg, Na, K (% DM); Cu, Fe, Zn, Mn (mg/kg DM).
# ---------------------------------------------------------------------------

def mins(ca=None, p=None, mg=None, na=None, k=None, cu=None, fe=None, zn=None, mn=None):
    return {"calcium": ca, "phosphorus": p, "magnesium": mg, "sodium": na, "potassium": k,
            "copper": cu, "iron": fe, "zinc": zn, "manganese": mn}


D_PREY = [
    # id, name (pt), scientific name, group, table-1 row, table-2 row, table-3 row, extra notes
    # Each tableX row: dict(n=, refs=, values…, label=) or None.
    dict(id="calf-fetal", name="Vitelo, feto (190–270 dias)", sci="Bos taurus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=72, refs="4", prox=(22.5, 60.0, 8.9, 16.0)),
         t3=dict(table="Tabela 3", n=72, refs="17", min=mins(4.12, 2.88, 0.12, 0.97, 0.86, 1.8, 37.8, 16.3, 0.3)),
         dq=["Tabela 3, nota a: todos os minerais deste item foram calculados a partir de uma equação da referência original, não analisados."],
         mineral_origin="calculated"),
    dict(id="deer-wt-neonate", name="Veado-de-cauda-branca, neonato", sci="Odocoileus virginianus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=None, refs="29", prox=(22.3, 80.7, 6.3, 17.9))),
    dict(id="deer-wt-juvenile", name="Veado-de-cauda-branca, juvenil (sem conteúdo digestivo)", sci="Odocoileus virginianus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=22, refs="19, 39", prox=(36.9, 57.0, 24.5, 13.8)),
         t3=dict(table="Tabela 3", n=6, refs="19", min=mins(4.82, 2.49, 0.12, 0.20, 0.54, 5.0, 81.1, 65.6, None))),
    dict(id="deer-wt-adult", name="Veado-de-cauda-branca, adulto (sem conteúdo digestivo)", sci="Odocoileus virginianus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=6, refs="28", prox=(41.1, 47.4, 41.4, 11.4)),
         t3=dict(table="Tabela 3", n=None, refs="40", min=mins(3.09, 2.26, 0.19, 0.39, 0.95, 26.1, 164.5, 68.4, 28.5))),
    dict(id="guinea-pig-neonate", name="Porquinho-da-índia, neonato (machos)", sci="Cavia porcellus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=None, refs="7", prox=(29.1, 51.2, 34.7, 14.1))),
    dict(id="guinea-pig-10wk", name="Porquinho-da-índia, macho de 10 semanas", sci="Cavia porcellus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=6, refs="7", prox=(31.3, 51.4, 46.1, 9.2)),
         t2=dict(table="Tabela 2", n=6, refs="7", vit_a=16506, vit_e=24.2),
         t3=dict(table="Tabela 3", n=6, refs="7", min=mins(3.02, None, 0.07, None, None, 5.6, 56.4, 46.4, 6.6))),
    dict(id="hamster-juvenile", name="Hamster, juvenil", sci="Mesocricetus auratus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=6, refs="34", prox=(30.3, 49.8, 34.7, 7.5)),
         t3=dict(table="Tabela 3", n=6, refs="34", min=mins(2.51, 2.03, 0.12, 0.46, 0.88, 12.0, 237.0, 94.0, 45.0))),
    dict(id="hare-snowshoe", name="Lebre-americana", sci="Lepus americanus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=None, refs="28", prox=(28.0, 73.0, 2.9, 17.5))),
    dict(id="mink-neonate", name="Vison, neonato", sci="Neovison vison", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=None, refs="27", prox=(18.0, 72.8, 11.7, 10.0)),
         dq=["A Tabela 7 da fonte não indica o nome científico do vison; usado Neovison vison."]),
    dict(id="mouse-neonate", name="Rato-doméstico (murganho), neonato < 3 g", sci="Mus musculus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=287, refs="9, 13, 15", prox=(19.1, 64.2, 17.0, 9.7)),
         t2=dict(table="Tabela 2", n=6, refs="15", vit_a=35533, vit_e=52.7),
         t3=dict(table="Tabela 3", n=5, refs="14", min=mins(1.17, None, 0.11, None, None, 19.2, 181.3, 82.5, 0.2))),
    dict(id="mouse-juvenile", name="Rato-doméstico (murganho), juvenil 3–10 g", sci="Mus musculus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=292, refs="9, 13, 15", prox=(18.2, 44.2, 30.1, 8.5)),
         t2=dict(table="Tabela 2", n=17, refs="15", vit_a=30888, vit_e=173.9),
         t3=dict(table="Tabela 3", n=5, refs="14", min=mins(1.47, None, 0.09, None, None, 13.4, 153.6, 75.4, 13.1)),
         dq=["MS do juvenil (18,2 %) inferior à do neonato (19,1 %) e muito inferior à dos dados de zoos da Tabela 4 (28,7 %); confirmar no original."]),
    dict(id="mouse-adult", name="Rato-doméstico (murganho), adulto > 10 g", sci="Mus musculus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=108, refs="6, 7, 9, 13, 15", prox=(32.7, 55.8, 23.6, 11.8)),
         t2=dict(table="Tabela 2", n=24, refs="7, 15", vit_a=578272, vit_e=100.4),
         t3=dict(table="Tabela 3", n=78, refs="6, 7, 13, 14", min=mins(2.98, 1.72, 0.16, None, None, 6.7, 137.9, 67.5, 7.7)),
         dq=["Vitamina A de 578 272 UI/kg MS é muito superior às restantes presas e ao limite máximo seguro indicado pelos autores para cães (33 000 UI/kg MS); confirmar no original."]),
    dict(id="mouse-jumping", name="Rato-saltador-dos-bosques", sci="Napaeozapus insignis", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=None, refs="28", prox=(29.7, 62.9, 18.7, 12.9))),
    dict(id="mouse-oldfield-neonate", name="Rato-do-campo (Peromyscus polionotus), neonato", sci="Peromyscus polionotus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=44, refs="15", prox=(17.4, 70.3, 8.6, 11.3))),
    dict(id="mouse-oldfield-juvenile", name="Rato-do-campo (Peromyscus polionotus), juvenil", sci="Peromyscus polionotus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=171, refs="15", prox=(29.8, 54.6, 21.9, 10.7))),
    dict(id="mouse-whitefooted", name="Rato-de-patas-brancas", sci="Peromyscus leucopus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=None, refs="28", prox=(34.1, 59.7, 19.9, 12.9))),
    dict(id="pig-juvenile", name="Porco doméstico, leitão", sci="Sus scrofa domesticus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=32, refs="31", prox=(28.9, 50.7, 33.2, 11.9)),
         dq=["A Tabela 7 da fonte não indica o nome científico do porco; usado Sus scrofa domesticus."]),
    dict(id="jackrabbit-dressed", name="Lebre-da-califórnia, carcaça limpa", sci="Lepus californicus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=3, refs="28", prox=(27.0, 74.4, 4.5, 15.0)),
         extra="Carcaça limpa = corpo eviscerado, sem cabeça, patas nem pele."),
    dict(id="rabbit-neonate", name="Coelho doméstico, neonato", sci="Oryctolagus cuniculus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=None, refs="27", prox=(15.4, 72.1, 13.0, 14.9))),
    dict(id="rabbit-dressed", name="Coelho doméstico, carcaça limpa", sci="Oryctolagus cuniculus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=2, refs="27", prox=(26.2, 65.2, 15.8, 3.4)),
         t2=dict(table="Tabela 2", n=2, refs="27", vit_a=6200, vit_e=None),
         extra="Carcaça limpa = corpo eviscerado, sem cabeça, patas nem pele.",
         dq=["Os minerais do coelho doméstico na Tabela 3 (n=2, ref. 27: Ca 5,93 % MS) não foram atribuídos: a mesma referência dá neonato e carcaça limpa, e Ca 5,93 % é incompatível com a cinza de 3,4 % da carcaça limpa."]),
    dict(id="rat-neonate", name="Ratazana, neonato < 10 g", sci="Rattus norvegicus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=5, refs="15", prox=(20.8, 57.9, 23.7, 12.2)),
         t2=dict(table="Tabela 2", n=5, refs="15", vit_a=21333, vit_e=470.4),
         t3=dict(table="Tabela 3", n=5, refs="14", min=mins(1.85, None, 0.14, None, None, 60.6, 275.8, 113.6, 6.2))),
    dict(id="rat-juvenile", name="Ratazana, juvenil 10–50 g", sci="Rattus norvegicus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=5, refs="15", prox=(30.0, 56.1, 27.5, 14.8)),
         t3=dict(table="Tabela 3", n=10, refs="14", min=mins(2.07, None, 0.12, None, None, 11.3, 133.2, 81.9, 2.6))),
    dict(id="rat-adult", name="Ratazana, adulto > 50 g", sci="Rattus norvegicus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=51, refs="6, 7, 15", prox=(33.9, 61.8, 32.6, 9.8)),
         t2=dict(table="Tabela 2", n=24, refs="7, 15", vit_a=151389, vit_e=139.2),
         t3=dict(table="Tabela 3", n=49, refs="6, 7, 14", min=mins(2.62, 1.48, 0.08, None, None, 6.3, 148.0, 62.1, 11.0))),
    dict(id="squirrel-fox-neonate", name="Esquilo-raposa, neonato", sci="Sciurus niger", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=None, refs="28", prox=(17.6, 55.7, None, None))),
    dict(id="squirrel-gray", name="Esquilo-cinzento", sci="Sciurus carolinensis", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=None, refs="27", prox=(33.3, 62.4, 18.4, 11.6))),
    dict(id="vole-bank-neonate", name="Rato-do-mato-ruivo, neonato", sci="Myodes glareolus", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=None, refs="28", prox=(15.5, 63.2, 24.5, 10.3)),
         extra="Na fonte: Clethrionomys glareolus (sinónimo antigo)."),
    dict(id="vole-common-neonate", name="Rato-do-campo-comum, neonato", sci="Microtus arvalis", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=None, refs="28", prox=(16.5, 64.2, 16.4, 12.7)),
         extra="Na fonte: Microtus arralis (gralha de M. arvalis)."),
    dict(id="vole-meadow", name="Ratos-do-campo (Microtus pennsylvanicus e Clethrionomys gapperi)", sci="Microtus pennsylvanicus; Clethrionomys gapperi", group="Presas — mamíferos",
         t1=dict(table="Tabela 1", n=None, refs="27", prox=(32.0, 62.5, 15.5, 13.5))),
    # Birds
    dict(id="chick-day-old", name="Pinto de 1 dia", sci="Gallus gallus", group="Presas — aves",
         t1=dict(table="Tabela 1", n=66, refs="6, 34", prox=(25.6, 64.9, 22.4, 6.4)),
         t3=dict(table="Tabela 3", n=66, refs="6, 34", min=mins(1.69, 1.22, 0.05, 0.71, 0.80, 5.2, 119.5, 97.4, 3.9))),
    dict(id="chicken-adult", name="Galinha, adulta", sci="Gallus gallus", group="Presas — aves",
         t1=dict(table="Tabela 1", n=16, refs="6, 13", prox=(32.5, 42.3, 37.8, 9.4)),
         t3=dict(table="Tabela 3", n=16, refs="6, 13", min=mins(2.22, 1.40, 0.50, None, None, 3.6, 122.2, 116.1, 10.1)),
         dq=["Mg 0,50 % MS é ~5–10× superior às outras aves e mamíferos da tabela (0,05–0,16 %); possível gralha (0,05?). Confirmar no original.",
             "A Tabela 2 dá vitamina A/E para 'Chicken, males' (n=6, ref. 13) sem idade; não atribuída."]),
    dict(id="mallard-dressed", name="Pato-real, carcaça limpa", sci="Anas platyrhynchos", group="Presas — aves",
         t1=dict(table="Tabela 1", n=3, refs="33", prox=(33.1, 63.1, 26.4, 9.5)),
         extra="Carcaça limpa = corpo eviscerado, sem cabeça, patas nem pele."),
    dict(id="quail-japanese", name="Codorniz-japonesa", sci="Coturnix japonica", group="Presas — aves",
         t1=dict(table="Tabela 1", n=18, refs="7", prox=(34.6, 71.5, 31.9, None)),
         t2=dict(table="Tabela 2", n=18, refs="7", vit_a=70294, vit_e=66.8),
         t3=dict(table="Tabela 3", n=18, refs="7", min=mins(3.43, None, 0.06, None, None, 2.6, 74.9, 53.0, 6.4)),
         extra="Na fonte: Coturnix coturnix. Cinza publicada em base isenta de gordura (9,9 %); não transcrita por não ser comparável.",
         dq=["PB (71,5 %) + gordura (31,9 %) = 103,4 % da MS: a PB pode estar também em base isenta de gordura. Confirmar no original (ref. 7: Clum et al. 1996)."]),
    # Reptiles & amphibians
    dict(id="frog-cuban-tree", name="Rela-cubana", sci="Osteopilus septentrionalis", group="Presas — répteis e anfíbios",
         t1=dict(table="Tabela 1", n=19, refs="1", prox=(26.6, None, 4.8, None)),
         t3=dict(table="Tabela 3", n=19, refs="1", min=mins(4.79, 2.57))),
    dict(id="frog-green", name="Rã-verde-americana", sci="Lithobates clamitans", group="Presas — répteis e anfíbios",
         t1=dict(table="Tabela 1", n=7, refs="30", prox=(22.5, 71.2, 10.2, None)),
         t2=dict(table="Tabela 2", n=7, refs="30", vit_a=25110, vit_e=82.2),
         t3=dict(table="Tabela 3", n=7, refs="30", min=mins(4.29, 1.87, 2.47, 0.55, None, 11.2, 102.6, 100.3, 11.5)),
         extra="Na fonte: Rana clamitans.",
         dq=["Mg 2,47 % MS é ~15× superior às outras presas (0,06–0,19 %); possível gralha. Confirmar no original."]),
    dict(id="gecko-fox", name="Osga-raposa", sci="Hemidactylus garnotii", group="Presas — répteis e anfíbios",
         t1=dict(table="Tabela 1", n=5, refs="1", prox=(25.3, None, None, None)),
         t3=dict(table="Tabela 3", n=5, refs="1", min=mins(5.22, 2.18))),
    dict(id="lizards-19spp", name="Lagartos (19 espécies, média)", sci="19 espécies (Tabela 7 da fonte)", group="Presas — répteis e anfíbios",
         t1=dict(table="Tabela 1", n=151, refs="38", prox=(28.8, None, None, 15.9))),
    dict(id="anole-adult", name="Anolis-verde, adulto", sci="Anolis carolinensis", group="Presas — répteis e anfíbios",
         t1=dict(table="Tabela 1", n=13, refs="8", prox=(29.4, 67.4, None, None)),
         t2=dict(table="Tabela 2", n=19, refs="8", vit_a=4880, vit_e=44.8),
         t3=dict(table="Tabela 3", n=13, refs="8", min=mins(5.54, 2.88, 0.15, 0.33, 0.73, 5.0, 127.8, 142.5, 4.0))),
    dict(id="bearded-dragon", name="Dragão-barbudo, várias idades", sci="Pogona vitticeps", group="Presas — répteis e anfíbios",
         t1=dict(table="Tabela 1", n=17, refs="8", prox=(17.9, 63.6, None, None)),
         t2=dict(table="Tabela 2", n=15, refs="8", vit_a=38562, vit_e=95.5),
         t3=dict(table="Tabela 3", n=18, refs="8", min=mins(3.53, 2.35, 0.16, 0.66, 1.12, 8.9, 276.4, 133.3, 9.3))),
    dict(id="snakes-4spp", name="Cobras (4 espécies, média)", sci="Chilomeniscus cinctus; Contia tenuis; Salvadora hexalepis; …", group="Presas — répteis e anfíbios",
         t1=dict(table="Tabela 1", n=4, refs="38", prox=(28.0, None, None, 17.0))),
    dict(id="toad-southern-juvenile", name="Sapo-do-sul, juvenil", sci="Anaxyrus terrestris", group="Presas — répteis e anfíbios",
         t1=dict(table="Tabela 1", n=1, refs="30", prox=(26.4, 61.8, 13.7, None)),
         t2=dict(table="Tabela 2", n=1, refs="30", vit_a=15940, vit_e=231.8),
         t3=dict(table="Tabela 3", n=1, refs="30", min=mins(5.16, 2.68, 0.07, 0.36, None, 127.0, 294.7, 471.6, 11.1)),
         extra="A Tabela 7 da fonte não indica o nome científico; 'southern toad' = Anaxyrus (Bufo) terrestris.",
         dq=["Cu 127 mg/kg e Zn 472 mg/kg MS muito superiores às outras presas; os autores recomendam cautela com presas ricas em cobre."]),
    dict(id="toad-southern-adult", name="Sapo-do-sul, adulto", sci="Anaxyrus terrestris", group="Presas — répteis e anfíbios",
         t1=dict(table="Tabela 1", n=4, refs="30", prox=(28.2, 61.0, 14.0, None)),
         t2=dict(table="Tabela 2", n=4, refs="30", vit_a=38261, vit_e=369.0),
         t3=dict(table="Tabela 3", n=4, refs="30", min=mins(2.94, 1.79, 0.06, 0.36, None, 117.4, 286.0, 662.9, 4.7)),
         extra="A Tabela 7 da fonte não indica o nome científico; 'southern toad' = Anaxyrus (Bufo) terrestris.",
         dq=["Cu 117 mg/kg e Zn 663 mg/kg MS muito superiores às outras presas; os autores recomendam cautela com presas ricas em cobre."]),
    # Unpublished zoo data (Tables 4–6)
    dict(id="zoo-hamster", name="Hamster (dados de zoos)", sci="Mesocricetus auratus", group="Presas — mamíferos",
         t1=dict(table="Tabela 4", n=2, refs="WCS", prox=(32.0, 51.2, 26.0, 7.2)),
         t2=dict(table="Tabela 5", n=2, refs="WCS", vit_a=26666, vit_e=12.4)),
    dict(id="zoo-mouse-neonate", name="Rato-doméstico (murganho), neonato < 3 g (dados de zoos)", sci="Mus musculus", group="Presas — mamíferos",
         t1=dict(table="Tabela 4", n=30, refs="CZS, DZ", prox=(26.1, 50.8, 34.4, 8.0)),
         t2=dict(table="Tabela 5", n=5, refs="CZS", vit_a=17000, vit_e=7.0),
         t3=dict(table="Tabela 6", n=30, refs="CZS, DZ", min=mins(3.54, 1.63, 0.12, 0.51, 1.15, 11.0, 158.7, 77.0, 3.6))),
    dict(id="zoo-mouse-juvenile", name="Rato-doméstico (murganho), juvenil 3–10 g (dados de zoos)", sci="Mus musculus", group="Presas — mamíferos",
         t1=dict(table="Tabela 4", n=57, refs="DZ, LAZ", prox=(28.7, 59.2, 23.8, 10.0)),
         t3=dict(table="Tabela 6", n=57, refs="DZ, LAZ", min=mins(2.96, 1.84, 0.12, 0.49, 1.03, 12.1, 311.9, 96.5, 9.5))),
    dict(id="zoo-mouse-adult", name="Rato-doméstico (murganho), adulto > 10 g (dados de zoos)", sci="Mus musculus", group="Presas — mamíferos",
         t1=dict(table="Tabela 4", n=7, refs="CZS, DZ", prox=(32.6, 56.9, 23.5, 11.3)),
         t2=dict(table="Tabela 5", n=1, refs="CZS", vit_a=130000, vit_e=6.0),
         t3=dict(table="Tabela 6", n=7, refs="CZS, DZ", min=mins(2.64, 1.91, 0.13, 0.43, 1.02, 8.0, 251.0, 89.4, 11.5))),
    dict(id="zoo-rabbit-whole", name="Coelho doméstico, inteiro (dados de zoos)", sci="Oryctolagus cuniculus", group="Presas — mamíferos",
         t1=dict(table="Tabela 4", n=1, refs="MTZ", prox=(28.1, 63.5, 15.3, 9.4)),
         t3=dict(table="Tabela 6", n=1, refs="MTZ", min=mins(2.35, 1.68, 0.16, 0.54, 0.94, 16.0, 302.0, 86.0, 16.9))),
    dict(id="zoo-rabbit-eviscerated-mtz", name="Coelho doméstico, eviscerado com pele (dados de zoos, MTZ)", sci="Oryctolagus cuniculus", group="Presas — mamíferos",
         t1=dict(table="Tabela 4", n=1, refs="MTZ", prox=(33.5, 71.2, 14.6, 11.1)),
         t3=dict(table="Tabela 6", n=1, refs="MTZ", min=mins(1.85, 1.36, 0.12, 0.44, 0.87, 3.0, 100.0, 76.0, 3.0))),
    dict(id="zoo-rabbit-eviscerated-wcs", name="Coelho doméstico, eviscerado com pele (dados de zoos, WCS)", sci="Oryctolagus cuniculus", group="Presas — mamíferos",
         t1=dict(table="Tabela 4", n=2, refs="WCS", prox=(31.3, 63.2, 20.0, 16.0)),
         t2=dict(table="Tabela 5", n=2, refs="WCS", vit_a=None, vit_e=60.0),
         t3=dict(table="Tabela 6", n=3, refs="WCS", min=mins(2.25, 1.72, 0.19, None, None, 22.2, 127.0, 73.0, 2.4))),
    dict(id="zoo-rabbit-meat", name="Coelho doméstico, carne com coração, pulmões e rins (dados de zoos)", sci="Oryctolagus cuniculus", group="Presas — mamíferos",
         t1=dict(table="Tabela 4", n=6, refs="WCS", prox=(28.4, 61.8, 22.6, 12.8)),
         t2=dict(table="Tabela 5", n=6, refs="WCS", vit_a=None, vit_e=16.2)),
    dict(id="zoo-rat", name="Ratazana (dados de zoos)", sci="Rattus norvegicus", group="Presas — mamíferos",
         t1=dict(table="Tabela 4", n=22, refs="LAZ, MTZ", prox=(31.1, 60.4, 35.0, 10.9)),
         t3=dict(table="Tabela 6", n=22, refs="LAZ, MTZ", min=mins(3.45, 1.91, 0.15, 0.43, 1.05, 7.5, 194.9, 92.1, 15.3)),
         extra="Idade não indicada na fonte.",
         dq=["PB + gordura + cinza = 106,3 % da MS."]),
    dict(id="zoo-rat-juvenile", name="Ratazana, juvenil 10–50 g (dados de zoos)", sci="Rattus norvegicus", group="Presas — mamíferos",
         t1=dict(table="Tabela 4", n=15, refs="WCS", prox=(23.0, 60.3, 26.8, 11.8)),
         t2=dict(table="Tabela 5", n=15, refs="WCS", vit_a=19265, vit_e=139.4)),
    dict(id="zoo-chick-juvenile", name="Pinto, juvenil (dados de zoos)", sci="Gallus gallus", group="Presas — aves",
         t1=dict(table="Tabela 4", n=11, refs="LAZ, DZ", prox=(22.8, 67.7, 16.5, 8.2)),
         dq=["A Tabela 6 dá minerais de 'Chicken, juvenile' (n=11) mas de outro laboratório (MSU); não atribuídos."]),
    dict(id="zoo-chicken-adult", name="Galinha, adulta (dados de zoos)", sci="Gallus gallus", group="Presas — aves",
         t1=dict(table="Tabela 4", n=1, refs="MTZ", prox=(40.5, 45.0, 51.1, 6.2)),
         dq=["PB + gordura + cinza = 102,3 % da MS (n=1).",
             "A Tabela 6 dá minerais de 'Chicken, adult' (n=1) mas de outro laboratório (MSU); não atribuídos."]),
    dict(id="zoo-anole", name="Anolis-verde (dados de zoos)", sci="Anolis carolinensis", group="Presas — répteis e anfíbios",
         t1=dict(table="Tabela 4", n=4, refs="CZS, WCS", prox=(27.2, 66.0, 9.0, 15.2)),
         t2=dict(table="Tabela 5", n=4, refs="WCS", vit_a=10583, vit_e=11.9),
         dq=["A Tabela 6 dá minerais de anolis (n=3, CZS) com Cu 353 mg/kg MS, muito acima de qualquer outra presa; não atribuídos (n e laboratório diferentes)."]),
    dict(id="zoo-tadpole-bullfrog-young", name="Girino de rã-touro, jovem (dados de zoos)", sci="Lithobates catesbeianus", group="Presas — répteis e anfíbios",
         t1=dict(table="Tabela 4", n=1, refs="WCS", prox=(12.4, None, 16.4, 44.0)),
         t2=dict(table="Tabela 5", n=1, refs="WCS", vit_a=None, vit_e=21.6),
         extra="A fonte não indica o nome científico da rã-touro."),
    dict(id="zoo-tadpole-bullfrog-mature", name="Girino de rã-touro, maduro (dados de zoos)", sci="Lithobates catesbeianus", group="Presas — répteis e anfíbios",
         t1=dict(table="Tabela 4", n=1, refs="WCS", prox=(17.6, 34.4, 31.4, 19.9)),
         t2=dict(table="Tabela 5", n=1, refs="WCS", vit_a=None, vit_e=18.0),
         extra="A fonte não indica o nome científico da rã-touro."),
    dict(id="zoo-tadpole-pr-crested-toad", name="Girino de sapo-de-crista-de-Porto-Rico (dados de zoos)", sci="Peltophryne lemur", group="Presas — répteis e anfíbios",
         t1=dict(table="Tabela 4", n=3, refs="MTZ", prox=(6.9, 23.3, 21.3, 22.7)),
         t2=dict(table="Tabela 5", n=3, refs="MTZ", vit_a=8727, vit_e=62.3),
         t3=dict(table="Tabela 6", n=3, refs="MTZ", min=mins(7.67, 1.67, 0.15, 0.73, 0.88, 46.7, 610.2, 278.8, 58.4)),
         extra="A fonte não indica o nome científico; Puerto Rican crested toad = Peltophryne lemur."),
]

ZOO_KEY = "Chaves das Tabelas 4–6: CZS Chicago Zoological Society; DZ Detroit Zoo; LAZ Los Angeles Zoo; MTZ Metro Toronto Zoo; WCS Wildlife Conservation Society; MSU Michigan State University."


def n_txt(n):
    return f"n={n}" if n else "n não indicado"


def build_dierenfeld(p):
    t1 = p["t1"]
    b = FoodBuilder(f"dierenfeld2002-{p['id']}", p["name"], p["group"], "Dierenfeld et al. 2002 (USDA/NAL)", "")
    dm, cp, ee, ash = t1["prox"]
    b.set_dm(dm)
    for key, v in (("crude_protein", cp), ("ether_extract", ee), ("ash", ash)):
        if v is not None:
            b.dm_pct(key, v)
    b.nfe_by_difference()
    sample_ns = [t1["n"]]

    lines = [
        DIERENFELD,
        f"Nome científico: {p['sci']}.",
        f"Composição centesimal: {t1['table']} ({n_txt(t1['n'])}; refs. {t1['refs']}). Valores publicados em % da MS, médias ponderadas "
        "(ou dados brutos quando n não foi indicado), sem medidas de dispersão.",
    ]
    t2 = p.get("t2")
    if t2:
        if t2.get("vit_a") is not None:
            b.dm_mgkg("vitamin_a", t2["vit_a"] / 1000)  # IU/kg DM -> IU/g DM -> IU/g as fed
        if t2.get("vit_e") is not None:
            b.dm_mgkg("vitamin_e", t2["vit_e"])
            b.note("vitamin_e", "estimated", VIT_E_NOTE)
        lines.append(f"Vitaminas A e E: {t2['table']} ({n_txt(t2['n'])}; refs. {t2['refs']}).")
        sample_ns.append(t2["n"])
    t3 = p.get("t3")
    if t3:
        for key, v in t3["min"].items():
            if v is None:
                continue
            if key in MACRO:
                b.dm_pct(key, v)
            else:
                b.dm_mgkg(key, v)
        lines.append(f"Minerais: {t3['table']} ({n_txt(t3['n'])}; refs. {t3['refs']}).")
        sample_ns.append(t3["n"])

    # Vitamins/minerals from another table (other n) converted to as-fed with the DM of the proximate table.
    for tx, keys in ((t2, ("vitamin_a", "vitamin_e")), (t3, tuple(mins().keys()))):
        if tx and tx["n"] != t1["n"]:
            for key in keys:
                if key not in b.food["nutrients"]:
                    continue
                text = (f"Publicado em base MS ({tx['table']}, {n_txt(tx['n'])}); convertido para MN com a MS da "
                        f"{t1['table']} ({NUM_PT(dm)} %, {n_txt(t1['n'])}), de outras amostras.")
                prev = b.food["valueNotes"].get(key)
                if prev:
                    prev["note"] = text + " " + prev["note"]
                else:
                    b.note(key, "calculated", text)
    if p.get("mineral_origin") == "calculated" and t3:
        for key in t3["min"]:
            if key in b.food["nutrients"]:
                b.note(key, "calculated", "A fonte indica que todos os minerais deste item foram calculados por equação, não analisados.")

    if p.get("extra"):
        lines.append(p["extra"])
    if t1["table"] == "Tabela 4":
        lines.append("Dados não publicados fornecidos por zoos aos autores. " + ZOO_KEY)
    lines.append("Energia bruta publicada (kcal/g MS) não transcrita: não é energia metabolizável. A EM é calculada pela app a partir da composição.")
    b.food["sources"][0]["reference"] = "\n".join(lines)
    if t1["n"]:
        b.food["sampleCount"] = t1["n"]  # n of the proximate analysis; vitamins/minerals may come from fewer samples
    b.food["dataQuality"] = list(p.get("dq", []))
    return b.build()


# ---------------------------------------------------------------------------
# NAG Fact Sheet 005 (Bernard & Allen) — Tables 1–3: min–max on a DM basis.
# A single value means n=1. Table 4: vitamins on a wet (as fed) basis.
# ---------------------------------------------------------------------------

R = tuple  # (min, max) or (value,)

NAG_ITEMS = [
    # id, name, sci, group, n (T1), prox: DM, CP, EE, ash; n2 (T2/T3), macro (Ca,P,Mg,Na,K), trace (Cu,Fe,Zn,Mn,Se), vit (T4 wet: n, A IU/kg, D3 IU/kg, E IU/kg)
    dict(id="anchovy", name="Anchova-do-pacífico, inteira", sci="Engraulis mordax", group="Presas — peixes", n=10,
         prox=(R((25.8, 36.9)), R((43.1, 66.3)), R((16.8, 33.3)), R((10.2, 24.5))), n2=10,
         macro=(R((1.84, 2.80)), R((1.55, 2.52)), R((0.14, 0.28)), R((1.06, 5.56)), R((0.87, 1.63))),
         trace=(R((5, 17)), R((98, 2060)), R((57, 113)), R((6, 34)), R((0.70, 1.77))),
         vit=dict(n=9, a=(2197, 11855), d3=None, e=(13, 83))),
    dict(id="butterfish", name="Peixe-manteiga (Peprilus), inteiro", sci="Peprilus sp.", group="Presas — peixes", n=1,
         prox=(R((31.0,)), R((46.2,)), R((38.2,)), R((7.7,))), n2=1,
         macro=(R((1.46,)), R((1.06,)), R((0.14,)), R((0.44,)), R((1.15,))),
         trace=(R((15,)), R((147,)), R((156,)), R((9,)), R((1.13,)))),
    dict(id="capelin", name="Capelim, inteiro", sci="Mallotus villosus", group="Presas — peixes", n=16,
         prox=(R((14.6, 22.8)), R((56.0, 76.5)), R((7.0, 23.3)), R((8.6, 12.8))), n2=16,
         macro=(R((1.19, 2.20)), R((1.34, 2.33)), R((0.08, 0.23)), R((0.39, 1.74)), R((0.78, 1.96))),
         trace=(R((3, 10)), R((36, 140)), R((41, 87)), R((2, 5)), R((0.52, 1.25))),
         vit=dict(n=12, a=(1665, 35498), d3=463, e=(5, 66)), extra="Na fonte: Mallatus villosus."),
    dict(id="clams", name="Amêijoa (Spisula solidissima)", sci="Spisula solidissima", group="Presas — invertebrados marinhos", n=1,
         prox=(R((20.6,)), R((48.5,)), R((5.5,)), R((7.41,))), n2=1,
         macro=(R((0.17,)), R((0.61,)), R((0.29,)), R((1.11,)), R((0.96,))),
         trace=(R((12,)), R((135,)), R((27,)), R((6,)), R((0.95,))),
         dq=["Contém tiaminase (a fonte recomenda suplementar tiamina)."]),
    dict(id="goldfish", name="Peixe-dourado, inteiro", sci="Cyprinus carpio (segundo a fonte; ver nota)", group="Presas — peixes", n=1,
         prox=(R((19.4,)), R((58.8,)), R((8.5,)), R((23.0,))), n2=1,
         macro=(R((6.99,)), R((4.36,)), R((0.17,)), R((0.65,)), R((1.22,))),
         trace=(R((14,)), R((307,)), R((225,)), R((64,)), R((1.22,))),
         dq=["A Tabela 5 da fonte indica Cyprinus carpio (carpa) para 'goldfish'; o peixe-dourado é Carassius auratus. Confirmar a espécie analisada."]),
    dict(id="herring", name="Arenque (espécie não indicada), inteiro", sci="Espécie não indicada", group="Presas — peixes", n=10,
         prox=(R((23.9, 32.1)), R((46.8, 69.0)), R((13.3, 43.0)), R((7.5, 14.8))), n2=6,
         macro=(R((1.62, 6.41)), R((1.29, 2.34)), R((0.09, 0.24)), R((0.36, 1.08)), R((1.15, 1.78))),
         trace=(R((3, 14)), R((64, 274)), R((55, 101)), R((4, 10)), R((0.94, 2.13))),
         vit=dict(n=5, a=(2997, 9400), d3=2240, e=(8, 36)),
         dq=["Contém tiaminase (a fonte recomenda suplementar tiamina)."]),
    dict(id="herring-atlantic", name="Arenque-do-atlântico, inteiro", sci="Clupea harengus", group="Presas — peixes", n=5,
         prox=(R((20.6, 28.6)), R((44.2, 70.2)), R((16.4, 38.3)), R((7.3, 11.9))), n2=5,
         macro=(R((1.56, 1.85)), R((1.00, 2.13)), R((0.10, 0.24)), R((0.35, 0.85)), R((0.94, 1.94))),
         trace=(R((4, 6)), R((64, 132)), R((44, 80)), R((3, 7)), R((0.93, 4.48))),
         dq=["Contém tiaminase (a fonte recomenda suplementar tiamina)."]),
    dict(id="krill", name="Krill (Euphausia sp.), inteiro", sci="Euphausia sp.", group="Presas — invertebrados marinhos", n=3,
         prox=(R((14.4, 26.2)), R((47.9, 60.2)), R((2.0, 22.8)), R((11.1, 16.5))), n2=3,
         macro=(R((1.24, 2.01)), R((0.71, 1.10)), R((0.29, 0.47)), R((1.84, 2.96)), R((0.97, 1.07))),
         trace=(R((47, 85)), R((96, 138)), R((46, 48)), R((5, 7)), R((1.04, 1.55))),
         vit=dict(n=1, a=11500, d3=100, e=32), extra="Na fonte: Euphasia sp."),
    dict(id="krill-dry", name="Krill, seco", sci="Euphausia sp.", group="Presas — invertebrados marinhos", n=1,
         prox=(R((95.3,)), R((47.9,)), R((17.4,)), R((12.5,))), n2=1,
         macro=(R((2.53,)), R((0.83,)), R((0.48,)), R((2.18,)), R((0.31,))),
         trace=(R((66,)), R((59,)), R((41,)), R((4,)), R((1.30,)))),
    dict(id="krill-pacifica", name="Krill-do-pacífico, inteiro", sci="Euphausia pacifica", group="Presas — invertebrados marinhos", n=1,
         prox=(R((18.9,)), R((59.6,)), R((10.4,)), R((15.3,))), n2=1,
         macro=(R((1.84,)), R((1.29,)), R((0.17,)), R((3.02,)), R((0.72,))),
         trace=(R((39,)), R((19,)), R((45,)), R((4,)), R((1.53,)))),
    dict(id="krill-superba", name="Krill-antártico, inteiro", sci="Euphausia superba", group="Presas — invertebrados marinhos", n=1,
         prox=(R((19.2,)), R((57.0,)), R((15.0,)), R((16.5,))), n2=1,
         macro=(R((2.11,)), R((1.35,)), R((0.53,)), R((2.76,)), R((1.25,))),
         trace=(R((89,)), R((432,)), R((53,)), R((12,)), R((1.61,)))),
    dict(id="mackerel-atlantic", name="Sarda-do-atlântico, inteira", sci="Scomber scombrus", group="Presas — peixes", n=3,
         prox=(R((31.2, 36.9)), R((41.8, 50.1)), R((42.3, 48.4)), R((6.2, 6.4))), n2=3,
         macro=(R((0.73, 1.16)), R((1.09, 1.23)), R((0.10, 0.14)), R((0.38, 0.48)), R((0.77, 1.03))),
         trace=(R((5, 10)), R((63, 100)), R((39, 46)), R((2, 3)), R((2.09, 2.67))),
         vit=dict(n=1, a=15900, d3=4520, e=9),
         extra="Na fonte: Scomberomorus scrombrus (a sarda-do-atlântico é Scomber scombrus).",
         dq=["Contém tiaminase (a fonte recomenda suplementar tiamina)."]),
    dict(id="mackerel-pacific", name="Cavala-do-pacífico, inteira", sci="Scomber japonicus", group="Presas — peixes", n=3,
         prox=(R((23.7, 33.4)), R((43.4, 79.2)), R((3.7, 37.5)), R((7.0, 13.8))), n2=3,
         macro=(R((1.55, 3.08)), R((1.21, 2.65)), R((0.09, 0.23)), R((0.35, 1.17)), R((0.75, 1.60))),
         trace=(R((4, 8)), R((153, 184)), R((41, 82)), R((0, 2)), R((2.90, 4.67))),
         extra="Na fonte: Scomberomorus japonicus.",
         dq=["Contém tiaminase (a fonte recomenda suplementar tiamina)."]),
    dict(id="mackerel-spanish", name="Serra-espanhola, inteira", sci="Scomberomorus maculatus", group="Presas — peixes", n=1,
         prox=(R((33.8,)), R((33.4,)), R((41.4,)), R((5.2,))), n2=1,
         macro=(R((1.20,)), R((1.13,)), R((0.05,)), R((0.24,)), R((0.82,))),
         trace=(R((2,)), R((83,)), R((32,)), R((3,)), R((1.26,)))),
    dict(id="minnows", name="Peixinhos (Cyprinidae), inteiros", sci="Cyprinidae", group="Presas — peixes", n=1,
         prox=(R((18.6,)), R((64.6,)), R((14.1,)), R((14.5,))), n2=1,
         macro=(R((3.71,)), R((3.01,)), R((0.19,)), R((0.59,)), R((1.38,))),
         trace=(R((13,)), R((225,)), R((165,)), R((17,)), R((0.82,)))),
    dict(id="plankton", name="Plâncton marinho", sci="Espécie não indicada", group="Presas — invertebrados marinhos", n=1,
         prox=(R((9.0,)), R((54.7,)), R((7.5,)), R((14.8,))), n2=1,
         macro=(R((4.28,)), R((0.89,)), R((0.54,)), R((1.57,)), R((1.02,))),
         trace=(R((68,)), R((225,)), R((82,)), R((8,)), R((0.73,)))),
    dict(id="salmon", name="Salmão (Oncorhynchus), inteiro", sci="Oncorhynchus sp.", group="Presas — peixes", n=1,
         prox=(R((22.3,)), R((73.0,)), None, None), n2=1,
         macro=(R((1.06,)), R((0.79,)), None, None, None), trace=None),
    dict(id="brine-shrimp", name="Artémia, viva", sci="Artemia salina", group="Presas — invertebrados marinhos", n=4,
         prox=(R((9.7, 13.3)), R((44.6, 59.8)), R((5.9, 14.6)), R((10.1, 17.1))), n2=4,
         macro=(R((0.14, 0.30)), R((0.90, 1.22)), R((0.13, 0.41)), R((0.47, 3.86)), R((1.10, 1.47))),
         trace=(R((7, 16)), R((155, 848)), R((54, 155)), R((7, 44)), R((1.46, 1.96)))),
    dict(id="brine-shrimp-dry", name="Artémia, seca", sci="Artemia salina", group="Presas — invertebrados marinhos", n=1,
         prox=(R((93.9,)), R((44.8,)), R((4.4,)), R((19.6,))), n2=1,
         macro=(R((5.21,)), R((0.82,)), R((0.55,)), R((1.14,)), R((0.53,))),
         trace=(R((25,)), R((1335,)), R((55,)), R((33,)), R((1.21,)))),
    dict(id="shrimp-meat", name="Camarão (Penaeus), miolo", sci="Penaeus sp.", group="Presas — invertebrados marinhos", n=2,
         prox=(R((17.8, 19.9)), R((86.5, 89.9)), R((3.1, 3.5)), R((6.2, 6.5))), n2=2,
         macro=(R((0.33, 0.75)), R((0.89, 1.05)), R((0.15, 0.25)), R((0.77, 0.89)), R((0.95, 1.20))),
         trace=(R((10, 27)), R((75, 107)), R((60, 82)), R((4, 11)), R((1.12, 1.38))),
         dq=["A Tabela 5 da fonte só dá o nome científico de 'Shrimp, whole' (Penaeus sp.); assumido o mesmo para o miolo e a casca."]),
    dict(id="shrimp-shell", name="Camarão (Penaeus), casca", sci="Penaeus sp.", group="Presas — invertebrados marinhos", n=1,
         prox=(R((22.7,)), R((52.5,)), R((1.5,)), R((23.5,))), n2=1,
         macro=(R((7.63,)), R((3.25,)), R((0.67,)), R((0.49,)), R((0.65,))),
         trace=(R((13,)), R((78,)), R((89,)), R((20,)), R((0.65,)))),
    dict(id="shrimp-whole", name="Camarão (Penaeus), inteiro", sci="Penaeus sp.", group="Presas — invertebrados marinhos", n=2,
         prox=(R((18.8, 23.3)), R((71.1, 81.9)), R((3.3, 3.4)), R((9.9, 14.4))), n2=2,
         macro=(R((1.89, 3.26)), R((1.41, 1.53)), R((0.23, 0.26)), R((0.69, 0.86)), R((0.86, 1.11))),
         trace=(R((18, 180)), R((82, 293)), R((57, 97)), R((12, 53)), R((1.57, 1.59))),
         vit=dict(n=1, a=68, d3=None, e=78)),
    dict(id="silversides", name="Peixe-rei-do-atlântico, inteiro", sci="Menidia sp. (na fonte: Menidia andens)", group="Presas — peixes", n=4,
         prox=(R((26.7, 29.3)), R((53.5, 57.3)), R((23.5, 28.3)), R((10.5, 11.9))), n2=4,
         macro=(R((2.29, 2.89)), R((1.69, 2.36)), R((0.11, 0.18)), R((0.59, 1.58)), R((0.66, 1.02))),
         trace=(R((3, 10)), R((32, 54)), R((75, 99)), R((4, 8)), R((1.18, 1.38))),
         dq=["Espécie: 'Menidia andens' não existe; confirmar a espécie analisada."]),
    dict(id="smelt", name="Eperlano (espécie não indicada), inteiro", sci="Espécie não indicada", group="Presas — peixes", n=11,
         prox=(R((15.8, 24.3)), R((51.9, 73.6)), R((12.7, 39.5)), R((6.1, 11.2))), n2=11,
         macro=(R((0.97, 2.88)), R((1.16, 2.10)), R((0.07, 0.13)), R((0.18, 0.51)), R((0.36, 1.70))),
         trace=(R((2, 6)), R((32, 113)), R((45, 129)), R((0, 10)), R((0.45, 1.21))),
         vit=dict(n=1, a=2458, d3=None, e=33),
         dq=["Contém tiaminase (a fonte recomenda suplementar tiamina)."]),
    dict(id="smelt-columbia", name="Eulacão (eperlano do rio Columbia), inteiro", sci="Thaleichthys pacificus", group="Presas — peixes", n=9,
         prox=(R((18.9, 28.8)), R((45.3, 58.5)), R((31.0, 43.6)), R((5.6, 7.3))), n2=9,
         macro=(R((0.93, 1.88)), R((1.03, 1.63)), R((0.05, 0.14)), R((0.29, 0.50)), R((0.82, 1.21))),
         trace=(R((4, 13)), R((56, 114)), R((35, 83)), R((2, 5)), R((0.56, 1.26))),
         vit=dict(n=3, a=(23543, 75300), d3=100, e=(33, 67)),
         dq=["Contém tiaminase (a fonte recomenda suplementar tiamina)."]),
    dict(id="smelt-freshwater", name="Eperlano-arco-íris (água doce), inteiro", sci="Osmerus mordax", group="Presas — peixes", n=10,
         prox=(R((15.8, 34.4)), R((56.2, 73.2)), R((15.9, 28.9)), R((7.2, 10.2))), n2=10,
         macro=(R((1.64, 2.56)), R((1.62, 2.01)), R((0.10, 0.15)), R((0.24, 0.58)), R((0.95, 1.41))),
         trace=(R((2, 8)), R((26, 87)), R((78, 113)), R((4, 19)), R((0.73, 1.29))),
         vit=dict(n=10, a=(2331, 18848), d3=100, e=(14, 63)),
         dq=["Contém tiaminase (a fonte recomenda suplementar tiamina)."]),
    dict(id="smelt-ocean", name="Eperlano marinho (Osmerus), inteiro", sci="Osmerus sp.", group="Presas — peixes", n=2,
         prox=(R((20.4, 25.4)), R((63.6, 65.2)), R((17.0, 19.3)), R((9.0, 9.4))), n2=2,
         macro=(R((1.74, 2.81)), R((1.57, 1.71)), R((0.11, 0.15)), R((0.36, 0.63)), R((0.93, 1.42))),
         trace=(R((2, 3)), R((29, 36)), R((80, 94)), R((7, 14)), R((0.55, 1.00))),
         vit=dict(n=2, a=(4500, 5300), d3=121, e=(8, 13)),
         dq=["Contém tiaminase (a fonte recomenda suplementar tiamina)."]),
    dict(id="squid", name="Lula (Illex e Loligo), inteira", sci="Illex sp.; Loligo sp.", group="Presas — invertebrados marinhos", n=2,
         prox=(R((15.4, 18.8)), R((65.4, 77.3)), R((8.3, 11.4)), R((4.8, 6.4))), n2=2,
         macro=(R((0.11, 0.17)), R((1.12, 1.21)), R((0.21, 0.23)), R((0.84, 0.90)), R((0.66, 1.17))),
         trace=(R((106, 245)), R((12, 29)), R((63, 87)), R((0, 2)), R((2.42, 2.71))),
         dq=["Cobre elevado (106–245 mg/kg MS); a fonte discute se reflete exigência ou tolerância das espécies que comem lula."]),
    dict(id="trout-rainbow", name="Truta-arco-íris, inteira", sci="Oncorhynchus mykiss", group="Presas — peixes", n=5,
         prox=(R((27.7, 30.7)), R((54.7, 68.5)), R((27.2, 33.9)), R((7.0, 9.2))), n2=5,
         macro=(R((1.54, 1.82)), R((1.54, 1.78)), R((0.10, 0.11)), R((0.22, 0.27)), R((1.33, 1.60))),
         trace=(R((5, 9)), R((41, 62)), R((96, 130)), R((0, 1)), R((0.69, 1.03))),
         extra="Na fonte: Salmo gairdneri (sinónimo antigo)."),
    dict(id="whitebait", name="Petinga/espadilha (whitebait), inteira", sci="Clupea harengus ou Sprattus sprattus", group="Presas — peixes", n=1,
         prox=(R((20.4,)), R((67.7,)), R((10.0,)), R((12.3,))), n2=1,
         macro=(R((2.32,)), R((1.95,)), R((0.18,)), R((0.46,)), R((1.47,))),
         trace=(R((4,)), R((112,)), R((75,)), R((10,)), R((0.80,))),
         vit=dict(n=1, a=3000, d3=512, e=5)),
]


def mid(r):
    return r[0] if len(r) == 1 else (r[0] + r[1]) / 2


def rng_txt(r, unit):
    return f"{NUM_PT(r[0])}–{NUM_PT(r[1])} {unit}"


def build_nag(p):
    b = FoodBuilder(f"nag-fs005-{p['id']}", p["name"], p["group"], "NAG Fact Sheet 005 (Bernard & Allen)", "")
    dm_r, cp_r, ee_r, ash_r = p["prox"]
    b.set_dm(mid(dm_r))
    ranged = False
    if len(dm_r) == 2:
        ranged = True
        b.note("moisture", "estimated", f"Ponto médio do intervalo publicado de MS ({rng_txt(dm_r, '%')}, n={p['n']}); não é uma média.")
    for key, r in (("crude_protein", cp_r), ("ether_extract", ee_r), ("ash", ash_r)):
        if r is None:
            continue
        b.dm_pct(key, mid(r))
        if len(r) == 2:
            ranged = True
            b.note(key, "estimated", f"Ponto médio do intervalo publicado ({rng_txt(r, '% MS')}, n={p['n']}), convertido para MN com o ponto médio da MS; não é uma média.")
    b.nfe_by_difference()

    def put(keys, values, unit_pct):
        nonlocal ranged
        for key, r in zip(keys, values):
            if r is None:
                continue
            (b.dm_pct if unit_pct else b.dm_mgkg)(key, mid(r))
            if len(r) == 2:
                ranged = True
                unit = "% MS" if unit_pct else "mg/kg MS"
                b.note(key, "estimated", f"Ponto médio do intervalo publicado ({rng_txt(r, unit)}, n={p['n2']}); não é uma média.")
            elif dm_r and len(dm_r) == 2:
                b.note(key, "estimated", "Valor único publicado em base MS, convertido para MN com o ponto médio do intervalo de MS.")

    if p.get("macro"):
        put(MACRO, p["macro"], True)
    if p.get("trace"):
        put(TRACE, p["trace"], False)

    lines = [NAG_FISH, f"Nome científico: {p['sci']}."]
    lines.append(f"Composição centesimal: Tabela 1 (n={p['n']}); minerais: Tabelas 2–3 (n={p['n2']}). Valores publicados em base MS"
                 + (" como intervalo mínimo–máximo; a app usa o ponto médio, que não é uma média e pode diferir dela." if ranged else "."))
    v = p.get("vit")
    if v:
        # Table 4 is printed both wet and DM; the wet (as fed) column is used directly.
        for key, val, unit_div in (("vitamin_a", v.get("a"), 1000), ("vitamin_d3", v.get("d3"), 1000), ("vitamin_e", v.get("e"), 1)):
            if val is None:
                continue
            r = val if isinstance(val, tuple) else (val,)
            b.food["nutrients"][key] = round(mid(r) / unit_div, 6)
            notes = []
            if len(r) == 2:
                notes.append(f"Ponto médio do intervalo publicado ({NUM_PT(r[0])}–{NUM_PT(r[1])} UI/kg MN, n={v['n']}); não é uma média.")
            if key == "vitamin_d3":
                notes.append("A fonte indica uma única amostra analisada para vitamina D por espécie.")
            if key == "vitamin_e":
                notes.append(VIT_E_NOTE)
            if notes:
                b.note(key, "estimated" if len(r) == 2 or key == "vitamin_e" else "measured", " ".join(notes))
        lines.append(f"Vitaminas A, D3 e E: Tabela 4, base húmida (MN), n={v['n']}. Vitamina E perde-se no armazenamento congelado; "
                     "a fonte recomenda suplementar 100 UI de vitamina E e 25–30 mg de tiamina por kg de peixe (base húmida).")
    if p.get("extra"):
        lines.append(p["extra"])
    lines.append("Energia bruta publicada (kcal/g MS) não transcrita: não é energia metabolizável. Os autores avisam que amostras pequenas devem ser usadas com cautela.")
    b.food["sources"][0]["reference"] = "\n".join(lines)
    b.food["sampleCount"] = p["n"]
    b.food["dataQuality"] = list(p.get("dq", []))
    return b.build()


# ---------------------------------------------------------------------------
# Finke 2015 — as-is basis. Table 1 g/kg; Table 4 units per row.
# Minerals (Table 2) and amino acids (Table 3) are left out: the online HTML
# does not show their units; they will be added once checked against the PDF.
# ---------------------------------------------------------------------------

FINKE = [
    dict(id="cricket", name="Grilo-doméstico, ninfa de último estádio (dieta enriquecida)", sci="Acheta domesticus", weight=349,
         prox=dict(moisture=725, crude_protein=165, ether_extract=79, nfe=1, ash=12.2), tdf=10.9, adf=17.8, me=1375,
         vit=dict(vitamin_d2=None, vitamin_e=53.7, vitamin_k=78.4, vitamin_c=92.0, thiamin=2.0, riboflavin=16.6, pantothenic_acid=20.3,
                  niacin=29.5, pyridoxine=2.13, folic_acid=1.07, biotin=0.21, cobalamin_ug=193.0, choline=1020)),
    dict(id="mealworm", name="Tenébrio, larva de último estádio (dieta enriquecida)", sci="Tenebrio molitor", weight=78,
         prox=dict(moisture=689, crude_protein=186, ether_extract=82, nfe=9, ash=11.3), tdf=12.9, adf=22.3, me=1520,
         vit=dict(vitamin_d2=None, vitamin_e=36.2, vitamin_k=None, vitamin_c=99.0, thiamin=1.1, riboflavin=8.7, pantothenic_acid=15.6,
                  niacin=46.5, pyridoxine=6.90, folic_acid=1.55, biotin=0.43, cobalamin_ug=1.3, choline=1410)),
    dict(id="superworm", name="Superworm, larva de último estádio (dieta enriquecida)", sci="Zophobas morio", weight=558,
         prox=dict(moisture=630, crude_protein=186, ether_extract=144, nfe=7, ash=9.3), tdf=14.4, adf=23.4, me=2069,
         vit=dict(vitamin_d2=531, vitamin_e=163.0, vitamin_k=None, vitamin_c=101.0, thiamin=1.7, riboflavin=11.2, pantothenic_acid=7.0,
                  niacin=35.3, pyridoxine=3.55, folic_acid=0.64, biotin=0.38, cobalamin_ug=9.9, choline=1240),
         fat_fix="14.4"),
    dict(id="waxworm", name="Traça-da-cera, larva de último estádio (dieta enriquecida)", sci="Galleria mellonella", weight=235,
         prox=dict(moisture=641, crude_protein=144, ether_extract=194, nfe=-2, ash=8.0), tdf=None, adf=15.2, me=2322,
         vit=dict(vitamin_d2=None, vitamin_e=63.3, vitamin_k=None, vitamin_c=90.0, thiamin=1.2, riboflavin=9.3, pantothenic_acid=32.8,
                  niacin=33.6, pyridoxine=1.74, folic_acid=0.61, biotin=0.29, cobalamin_ug=None, choline=1550),
         fat_fix="19.4", extra="Fibra dietética total < 7,5 g/kg (abaixo do limite de deteção); não transcrita."),
]

FINKE_BELOW_LOD = (
    "Abaixo do limite de deteção em todas as espécies (não transcrito como zero): vitamina A/retinol < 1000 UI/kg, "
    "vitamina D3 < 40 UI/kg; vitamina D2 < 40 UI/kg exceto superworm; vitamina K < 50 mg/kg exceto grilo; "
    "vitamina B12 < 1,2 µg/kg na traça-da-cera."
)


def build_finke(p):
    b = FoodBuilder(f"finke2015-{p['id']}", p["name"], "Presas — insetos", "Finke 2015 (Zoo Biology)", "")
    pr = p["prox"]
    b.set_dm(100 - pr["moisture"] / 10)
    for key in ("crude_protein", "ether_extract", "ash"):
        b.food["nutrients"][key] = pr[key] / 10
    b.food["nutrients"]["nfe"] = max(0.0, pr["nfe"] / 10)
    b.note("nfe", "calculated", "Calculado pelo autor: 100 − (humidade + PB + gordura + cinza + FDA)."
           + (f" Publicado {NUM_PT(pr['nfe'])} g/kg; fixado em 0." if pr["nfe"] < 0 else ""))
    b.food["nutrients"]["adf"] = p["adf"] / 10
    if p["tdf"] is not None:
        b.food["nutrients"]["dietary_fibre"] = p["tdf"] / 10
    b.food["energy"]["atwater"] = p["me"] / 10
    vit = p["vit"]
    for key in ("vitamin_k", "vitamin_c", "thiamin", "riboflavin", "pantothenic_acid", "niacin", "pyridoxine", "folic_acid", "biotin", "choline"):
        if vit.get(key) is not None:
            b.food["nutrients"][key] = vit[key]  # mg/kg as is = catalog unit
    if vit.get("vitamin_e") is not None:
        b.food["nutrients"]["vitamin_e"] = vit["vitamin_e"]
        b.note("vitamin_e", "estimated", VIT_E_NOTE)
    if vit.get("vitamin_d2") is not None:
        b.food["nutrients"]["vitamin_d2"] = vit["vitamin_d2"] / 1000
    if vit.get("cobalamin_ug") is not None:
        b.food["nutrients"]["cobalamin"] = vit["cobalamin_ug"] / 1000

    dq = []
    if p.get("fat_fix"):
        dq.append(
            f"Na versão online da Tabela 1 a gordura aparece como {p['fat_fix'].replace('.', ',')} g/kg; foi transcrito "
            f"{NUM_PT(pr['ether_extract'])} g/kg, o único valor coerente com o ENA e a EM publicados pelo autor "
            "(EM = 4·PB + 9·gordura + 4·ENA, com ENA negativo contado como 0). Confirmar no PDF."
        )
    lines = [
        FINKE_2015,
        f"Nome científico: {p['sci']}. Peso médio: {p['weight']} mg por inseto (n=25 pesados).",
        "Insetos Vita-bugs® (Timberline) criados com dieta enriquecida em ómega-3, vitamina E, β-caroteno (e tiamina e luteína "
        "no grilo e superworm); jejum de ~24 h antes da análise. Uma única análise por espécie (Covance Laboratories). "
        "Valores tal e qual (MN). Não representam insetos de criação comum sem dieta enriquecida.",
        "Tabela 1 (composição centesimal, FDA, fibra dietética total, EM) e Tabela 4 (vitaminas), versão HTML do artigo. "
        "EM publicada pelo autor (4/9/4 sobre PB, gordura e ENA).",
        FINKE_BELOW_LOD,
        "Minerais (Tabela 2) e aminoácidos (Tabela 3) ainda não transcritos: a versão online não mostra as unidades. "
        "Ca muito baixo em todas as espécies (< 50 % da exigência de ratos e frangos em crescimento, segundo o autor): suplementar.",
    ]
    if p.get("extra"):
        lines.append(p["extra"])
    b.food["sources"][0]["reference"] = "\n".join(lines)
    b.food["sampleCount"] = 1
    b.food["dataQuality"] = dq
    return b.build()


def main():
    foods = [build_dierenfeld(p) for p in D_PREY] + [build_nag(p) for p in NAG_ITEMS] + [build_finke(p) for p in FINKE]
    ids = [f["id"] for f in foods]
    assert len(ids) == len(set(ids)), "duplicate ids"
    OUT.write_text(json.dumps(foods, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(foods)} foods -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
