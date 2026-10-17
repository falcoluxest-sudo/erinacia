# Estrutura do SaaS Erinacia

Este documento define **o que a Erinacia faz e como os dados se organizam**, com base:

- nas planilhas da autora (Banco.xlsm e Formulação.xlsm);
- nos manuais de nutrição que servem de base científica (ver tabela abaixo);
- na experiência de uso de ferramentas existentes (só como referência funcional, nunca como fonte de dados).

## 1. Princípio científico

Cada número que a Erinacia usa (exigência, fórmula de energia, proporção de categorias,
regra de suplementação) tem **uma citação**. Quando uma espécie não tem estudos próprios,
o guia diz de que **espécie-modelo** os valores foram extrapolados (gato doméstico, cão,
equinos, aves domésticas, primatas NRC…). A interface mostra sempre a fonte e o grau de
evidência; quem formula decide.

### Manuais transcritos (`data/references/guidelines/`) — 9 guias

| Ficheiro | Espécies | Energia | Exigências | Proporções | Crescimento | Regras |
|---|---|---|---|---|---|---|
| `aza-2013-seriema` | Seriema | — | faixa min–máx (26 nutrientes) | sim (MN) | ganho diário 10–15 % | 7 |
| `dierenfeld-1994-tiger` | Tigre | 140·PV^0,75 | Ca, vit A, vit E | — | — | 8 |
| `dierenfeld-1997-orangutan` | Orangotangos | 140·PV^0,75 | NRC 1978 (4) | sim (MN) | — | 6 |
| `aza-2010-chimpanzee` | Chimpanzé | 100·PV^0,75 | → NRC 2003 | sim (MN) + especificação de biscoito | — | 6 |
| `azab-elephant` | Elefantes | ingestão 1,5–1,9 % PV MS | por fase (manutenção a crescimento) | modelos verão/inverno (MS) | — | 5 |
| `aza-2012-lion` | Leão | 115–130·PV^0,75; fatores gestação/lactação/crescimento | por fase (NRC 2006 gato) | observadas (MN) | curvas por sexo e criação | 8 |
| `aza-2009-polar-bear` | Urso-polar | 110·PV^0,75 | mínimos (31) | sim (MN) | — | 4 |
| `aza-2010-mustelids` | Mustelídeos | Nagy 2,23·PV(g)^0,85 kJ | omnívoros vs. carnívoros | — | — | 5 |
| `aza-2012-large-canids` | Lobos, coiote, mabeco, dole, lobo-guará | 130·PV^0,75; gestação e lactação NRC 2006 | AAFCO cão (crescimento, manutenção, máximos) | base 90–95 % / complementos 5–10 % | — | 8 |

Cada ficheiro tem `dataQuality` com as incoerências encontradas nas fontes (por exemplo,
vitamina A do elefante "3 UI/kg", zinco do urso-polar 100 vs. 97). **Estas notas devem ser
revistas pela nutricionista antes de os valores serem usados em produção.**

Os PDFs dos manuais **não** entram no repositório (direitos de autor): guardamos factos
numéricos, a citação e notas próprias.

## 2. Módulos

```
Erinacia
├── Biblioteca científica      guias por espécie, referências, notas de qualidade
├── Alimentos                  tabelas nacionais (INSA, CIQUAL, BEDCA, USDA…), Banco próprio, rótulos comerciais
├── Plantel                    instituições, setores, recintos, animais, grupos
├── Formulação                 animal → alimentos → nutrientes → energia → manejo → relatório
├── Avaliação                  dieta atual / oferecida / consumida vs. guia
├── Manejo diário (app)        ficha do dia, sobras com foto, jejuns, ocorrências
├── Crescimento e condição     pesagens, CC, curvas de referência, criação artificial
├── Custos e stock             preços por fornecedor, custo por animal/dia, inventário
└── Administração (futuro)     equipas, papéis, planos, faturação, RGPD
```

## 3. Modelo de dados (o que os manuais acrescentam)

### 3.1 Guia nutricional (`Guideline`, `packages/core/src/guidelines.ts`)

Um guia liga **espécies** a:

- **Equações de energia**: `a × PV^b`, em kcal ou kJ, PV em kg ou g, com o tipo (EM, basal,
  campo, bruta) e, quando a fonte dá uma faixa, `coefficientRange` (leão 115–130).
- **Ajustes de energia**: fatores (gestação × 1,4; lactação × 2,0; inverno exterior × 1,1–1,2;
  verão × 0,8–0,9) e equações fatoriais descritas (crescimento: EMm + 1,8 × GMD).
- **Metas de nutrientes por fase de vida** (manutenção, reprodução, gestação, lactação,
  crescimento), sempre em **MS**, com mínimo, máximo ou valor-alvo e notas.
- **Indicadores derivados**: relação Ca:P, kcal/g MS e MN, kcal EM/g PB.
- **Proporções por categoria de alimento**, em MN ou MS, com mínimo e máximo
  (seriema: presas invertebradas 10–30 %; urso-polar: peixe 15–30 %).
- **Ingestão de referência** em % do peso vivo (elefante 1,5–1,9 % MS).
- **Referências de crescimento**: peso ao nascer, peso adulto, ganho médio diário por
  intervalo de idade, por sexo e tipo de criação (leão), ou ganho diário em % do peso
  (seriema em criação artificial).
- **Especificações de produto** (biscoito de chimpanzé: 15–25 % PB, < 3 kcal/g).
- **Regras** tipadas: `supplement`, `limit`, `avoid`, `alert`, `schedule`, `monitoring`,
  `safety`. Quando possível, com uma verificação automática:
  - percentagem de uma categoria acima de X (peixe > 33 % → tiamina e vitamina E);
  - presença de uma categoria (fígado → não suplementar vitamina A; músculo → cálcio);
  - horas sem ingestão (seriema > 48 h → veterinário).

### 3.2 Categorias de alimento

Cada alimento passa a ter uma **categoria funcional** (lista fechada em `FoodCategory`), além
do grupo da tabela de origem. É o que permite aplicar as proporções dos manuais:
ração completa (seca, crua, gel), mistura de carne, músculo, víscera, osso, presa vertebrada,
presa invertebrada, peixe marinho, fruta, legume de raiz, verdura, browse, gramínea, feno,
concentrado, sementes, produtos animais, suplemento, enriquecimento.

### 3.3 Atributos de segurança dos alimentos

Para as regras funcionarem, o alimento precisa de saber:

- `hasThiaminase` (peixes com tiaminase);
- `oxalateLevel` (verduras ricas em oxalato);
- `isLiver` / vitamina A pré-formada elevada;
- `gutLoaded` (insetos);
- tipo de energia aplicável: alguns itens não contam para energia, como suplementos minerais.

### 3.4 Unidades

As exigências chegam em unidades diferentes (UI/kg, UI/g, ppm, mg/kg, %). Na transcrição
convertem-se para as unidades do catálogo e a conversão fica registada na nota. A conversão
UI ↔ mg de vitamina E (1 UI = 1 mg de acetato de dl-α-tocoferol; 0,67 mg de RRR) é sinalizada,
não escondida.

### 3.5 Energia dos alimentos

Além de Atwater geral (4/9/4) e dos modelos por espécie do Banco, juntar a equação para
alimentos de carnívoros (Clauss et al. 2010):
`EM (kcal/kg) = 39,9 × (%PB + %ENN) + 90,0 × %gordura`.

## 4. Fluxos principais

1. **Criar animal ou grupo** → escolher espécie → a Erinacia propõe o guia, a equação de
   energia e a fase de vida.
2. **Formular**: escolher alimentos; ver em tempo real
   - energia oferecida vs. necessidade;
   - nutrientes vs. metas (abaixo / dentro / acima / sem dados, com a cobertura dos dados);
   - proporções por categoria vs. guia;
   - regras disparadas (p. ex. "peixe = 35 % da dieta → suplementar tiamina 30 mg/kg de peixe").
3. **Otimizar** (Fase 2): programação linear que cumpre metas e proporções ao menor custo.
4. **Manejo**: ficha alimentar por vasilha, refeição e dia da semana, incluindo dias de
   jejum (tigre: 1 dia/semana → ração × 7/6 nos outros dias).
5. **Registar**: sobras, pesagens, CC, ocorrências; recalcular o **consumido**.
6. **Avaliar**: comparar oferecido, consumido e guia; histórico de alterações.

## 5. O que o backup do NutriWild ensina (só funcionalidade)

O ficheiro exportado é a **base curada da plataforma NutriWild**, não dados próprios: 1145
alimentos e 278 perfis de exigência, todos marcados como partilhados e curados por eles,
nenhuma dieta da conta. Por isso **não é importado** para a Erinacia.

Ideias de funcionalidade que confirmam o desenho acima (e que construímos à nossa maneira):

- sinalização de qualidade por registo (a rever, base seca derivada, composição incoerente,
  duplicado, rótulo divergente) → equivalente ao nosso `dataQuality`, mas por alimento;
- atributos de segurança (tiaminase, oxalato);
- modo de alimentação por espécie (por volume ou por energia) e massa corporal de referência;
- estado de verificação da referência (pendente, inconsistente);
- biblioteca de documentos com extração de texto e observações estruturadas;
- registo de consumo e "tetos" (limites máximos definidos pelo utilizador).

## 6. Política de dados

| Fonte | Uso |
|---|---|
| Banco.xlsm e planilhas da autora | Importado (`data/seed`). |
| Manuais publicados | Factos numéricos com citação; PDFs fora do repositório. |
| Tabelas nacionais (INSA, CIQUAL, BEDCA, USDA…) | Importação direta da fonte oficial, com licença registada. |
| Bases curadas de terceiros (p. ex. NutriWild) | Não importadas. |

## 7. Próximos passos de implementação

1. Migração `0002`: `guidelines` e tabelas filhas, `food_category` e atributos de segurança
   em `foods`, carga dos 8 guias.
2. Motor: avaliação de proporções por categoria, avaliação de regras, energia de crescimento
   e lactação, alimentação com jejum semanal, curvas de referência por intervalos.
3. Fase 1a (web): biblioteca científica, alimentos, formulação com o guia da espécie.
