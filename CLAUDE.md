# CLAUDE.md — Erinacia

Este ficheiro dá contexto ao Claude Code no início de cada sessão. Mantém-no atualizado quando
o estado do projeto ou as decisões mudarem.

## 1. O que é o Erinacia

Ferramenta de formulação de dietas e acompanhamento nutricional animal, com foco forte em fauna
selvagem, zoológica e exótica. Hoje é uma ferramenta de uso próprio. O objetivo é torná-la num
**SaaS comercialmente viável** de nutrição animal.

O produto ainda não está definido. Segmento inicial, MVP e modelo de preços estão em análise
(fases 2 e 3 do plano abaixo). Não assumas que devemos servir todas as espécies ou todos os
segmentos desde o primeiro dia.

## 2. Quem é o fundador e como trabalhar com ele

- Formação em Ciência e Tecnologia Animal (Universidade de Évora), experiência em nutrição de
  animais domésticos e selvagens, investigação (RStudio, QGIS, ArcGIS).
- Investigação em curso sobre crescimento e metabolismo energético de ouriço-cacheiro europeu
  (*Erinaceus europaeus*) em centro de recuperação. Esta é uma vantagem competitiva do produto.
- **Não é programador.** Explica as decisões técnicas em linguagem simples: o que faz, porque é
  necessário, vantagens e desvantagens, complexidade, custo e impacto futuro. Se houver várias
  alternativas, recomenda uma e justifica.
- Comunicação em **português europeu**.
- Sê um parceiro estratégico, não um executor. Questiona pressupostos, identifica riscos e diz
  quando uma ideia não faz sentido. Sê objetivo, sem teoria desnecessária.
- **Não avances para desenvolvimento sem acordo.** Primeiro percebe o problema, vê o que já
  existe, propõe a solução mais simples e define critérios de sucesso.

## 3. Princípios científicos (não negociáveis)

- Cada número (exigência, fórmula de energia, proporção, regra) tem **citação**.
- Distingue valores **medidos, estimados e calculados**. Mostra pressupostos, limitações e
  incerteza. Indica quando um valor foi extrapolado de uma espécie-modelo.
- **Nunca inventes** referências, valores nutricionais, fórmulas ou recomendações. Se não houver
  fonte, diz que não há.
- Diferencia recomendações gerais de específicas (espécie, idade, estado fisiológico, clínica).
- O produto não substitui a avaliação de veterinários ou nutricionistas qualificados.
- Os campos `dataQuality` dos guias assinalam incoerências nas fontes. **Os valores dos guias
  ainda não foram todos revistos pelo fundador** e não devem ser tratados como validados.

## 4. Estado atual (auditoria de 2026-11-05)

| Camada | Estado |
|---|---|
| `packages/core` — motor de cálculo (TypeScript puro, sem dependências) | Sólido e testado (155 testes a passar). Energia alométrica, composição da dieta (MN/MS), ficha por vasilha e refeição, avaliação vs. exigências e proporções, regras dos guias, crescimento (GMD, Gompertz, curvas de referência), custos e sobras. |
| `data/references/guidelines/` | 54 guias transcritos (NRC, AZA, EAZA, FEDIAF, Merck, NAG…), 155 entradas de espécie, cada um com citação e `dataQuality`. |
| `data/seed/` | Alimentos: INSA PT v7.1 (1340), USDA SR Legacy (4913), Banco próprio (19 + 5 curados). 5 perfis de exigência, 4 fórmulas metabólicas, 9 referências de ingestão, 4 modelos de dieta. |
| `apps/web` — Vite + React 18 + React Router | Funciona como ferramenta pessoal: alimentos, biblioteca, fórmulas, glossário, dietas, animais, curvas de crescimento, cópia de segurança (exportar/importar JSON). Painel, Nutrientes, Stock e Importar são apenas "em breve". |
| `db/migrations/0001_init.sql` — PostgreSQL/Supabase | Desenhado (multi-organização, papéis, row-level security), mas **não ligado à app**. |

### Problemas conhecidos

1. **Não é ainda um SaaS:** animais e dietas guardados em `localStorage` do browser
   (`apps/web/src/data/*.ts`). Não há login, servidor nem sincronização. Limpar o browser
   apaga os dados. Paliativo: página **Cópia de segurança** (`/copia-seguranca`,
   `apps/web/src/data/backup.ts`) para exportar e repor os dados num ficheiro.
2. **Esquema da BD desatualizado:** falta a migração `0002` (guias e tabelas filhas, categoria
   funcional e atributos de segurança dos alimentos). A app carrega os JSON dos guias diretamente.
3. **Documentação desatualizada:** `docs/ARQUITETURA.md` refere Next.js (a app usa Vite);
   `docs/ESTRUTURA_SAAS.md` refere 9 guias (existem 54); o README descreve a Fase 0 com menos
   dados do que existem. **O código é a fonte de verdade**; corrige os docs quando mexeres neles.
4. **Licenças por confirmar:** `commercial_use_ok` das tabelas de composição está por verificar
   (USDA é domínio público; INSA exige a fonte visível onde os dados aparecem).
5. Sem otimizador de menor custo (programação linear) e sem exportação da ficha alimentar em PDF.
6. Sem validação com utilizadores reais além do fundador.

## 5. Plano de trabalho

1. ✅ Auditoria e diagnóstico.
2. ⏳ Validação da oportunidade: segmentos, concorrência (ex.: NutriWild), disposição para pagar.
3. Definição do MVP.
4. Arquitetura e planeamento técnico (provável primeiro passo: ligar a app ao Supabase com login).
5. Desenvolvimento.
6. Testes com utilizadores reais.
7. Lançamento comercial.
8. Evolução e escalabilidade.

Não saltes etapas. Cada etapa tem objetivos, entregáveis e critérios de conclusão.

## 6. Decisões de arquitetura

- **Manter o motor `packages/core` em TypeScript puro**, sem dependências de UI ou servidor, para
  servir web, app do tratador (PWA/offline) e servidor sem reescrever cálculos.
- Dados e login previstos em **Supabase, região UE** (RGPD, row-level security).
- Todas as tabelas de utilizador têm `organization_id`; dados de referência partilhados têm
  `organization_id = null`. Papéis: `owner`, `nutritionist`, `keeper`, `viewer`.
- Nomes de nutrientes e alimentos em `jsonb` por idioma.
- Faturação (Stripe, EUR, IVA PT + OSS) só quando houver venda.
- Não substituas tecnologias nem refaças componentes sem justificar a necessidade.
- Privilegia código simples, modular, seguro e com baixo custo operacional.

## 7. Convenções de dados

- Alimentos guardados **como oferecidos (MN)** na unidade do catálogo
  (`packages/core/src/nutrients.ts`); resultados da dieta em **matéria seca (MS)**.
- Exigências em MS. Zeros do Banco.xlsm significam "sem dados" e não são importados.
- INSA: células vazias = "não analisado" (não importado); zeros mantidos.
- Cada alimento indica a tabela de origem. A licença de cada tabela fica em `food_sources`.
- **Não importar bases curadas de terceiros** (ex.: o backup NutriWild serve só como referência
  funcional). PDFs de manuais ficam **fora do repositório** (direitos de autor): guardamos factos
  numéricos, citação e notas próprias.
- `data/raw/` está fora do git. As planilhas do fundador (Banco.xlsm, Formulação.xlsm, dietas de
  clientes) **não estão no repositório**; pede-as se forem necessárias e nunca as publiques.

## 8. Comandos

```bash
pnpm install
pnpm --filter @erinacia/web dev   # app web em http://localhost:5173
pnpm test                         # testes do motor
pnpm typecheck
python3 scripts/import_banco.py caminho/para/Banco.xlsm
python3 scripts/import_insa.py data/raw/insa_tca.xlsx
python3 scripts/import_usda.py data/raw/FoodData_Central_sr_legacy_food_csv_2018-04
```

Antes de dar uma alteração como concluída, corre `pnpm test` e `pnpm typecheck`.
