# Arquitetura

## Visão geral

| Camada | Escolha | Porquê |
|---|---|---|
| Motor de cálculo | `packages/core` (TypeScript puro) | Igual na web, no app e no servidor; fácil de testar |
| Web | Next.js (Fase 1) | Interface de formulação para a nutricionista |
| App do tratador | PWA a partir da mesma base, depois Capacitor | Funciona sem rede; ficha do dia e sobras |
| Dados e login | Supabase (PostgreSQL, região UE) | RGPD, row-level security, armazenamento de fotos |
| Faturação (futuro) | Stripe, EUR, IVA PT + OSS | Só quando houver venda |

## Preparado para vender mais tarde

- **Instituições:** todas as tabelas de utilizador têm `organization_id`. Hoje existe uma
  organização (a sua); amanhã cada cliente é outra, sem migrar dados.
- **Papéis:** `owner`, `nutritionist`, `keeper`, `viewer` em `memberships`.
- **Dados de referência partilhados:** alimentos, exigências e fórmulas com
  `organization_id = null` são vistos por todos; os próprios de cada instituição ficam privados.
- **Origem e licença:** `food_sources` guarda versão, URL e licença de cada tabela de
  composição, e `commercial_use_ok` fica por confirmar até à verificação.
- **Idiomas:** nomes de nutrientes e alimentos em `jsonb` por idioma (`pt`, `en`, …).
- **Plano:** `organizations.plan` existe desde já (`personal`), para os limites dos planos pagos.

## Fluxo de cálculo (igual ao da planilha Formulação)

1. Peso de cálculo → necessidade energética (fórmula da Taxa Metabólica) → ajuste (%).
2. Inclusões em %MN → densidade energética da dieta (modelo de EM escolhido: carnívoro,
   ruminante, herbívoro monogástrico, primata, primata com fermentação ou Atwater).
3. g MN/dia = kcal ÷ Σ(inclusão × kcal/g). Oferta por item = ingerido ÷ % de ingestão.
4. Composição em MS = Σ(g × valor MN) ÷ Σ(g × MS). Comparação com o perfil de exigências.
5. Por vasilha e refeição → ficha alimentar. Sobras → consumo real → nova composição.

## Roteiro

- **Fase 1:** web com login, plantel, alimentos (Banco + INSA), formulação passo a passo,
  ficha alimentar em PDF.
- **Fase 2:** otimizador (programação linear de menor custo), sobras, custos, histórico,
  curvas de crescimento com os dados da dissertação.
- **Fase 3:** app do tratador offline; tabelas CIQUAL, BEDCA e USDA; idiomas EN/ES/FR/DE.
- **Fase 4 (venda):** faturação, planos, páginas públicas, termos e RGPD.
