# Erinacia — wildlife nutrition

Formulação de dietas e acompanhamento nutricional de fauna silvestre.
Nesta fase é uma ferramenta de uso e teste próprio, estruturada desde o início
para vir a ser um SaaS (várias instituições, vários idiomas, faturação).

## Estado

**Fase 0 — fundação** (concluída)

- `packages/core` — motor de cálculo em TypeScript, sem dependências:
  - necessidade energética alométrica (constante × PV^expoente; NEM, TMB, NEP; kcal/kJ);
  - escolha do peso de cálculo (predefinido, maior, médio, menor) e ajustes fisiológicos;
  - composição da dieta: inclusão em %MN e %MS, gramas oferecidas/ingeridas, energia por alimento,
    composição em matéria seca, cobertura dos dados por nutriente, kcal EM/g PB, relação Ca:P;
  - quantidades por vasilha e por refeição (ficha alimentar);
  - comparação com exigências (abaixo / dentro / acima / sem dados);
  - ingestão em % do peso vivo, custos (€/dia, mês, ano, €/kg) e consumo real a partir das sobras;
  - curvas de crescimento: ganho médio diário, regressão, curva de referência e Gompertz.
- `data/seed` — dados importados do Banco.xlsm (19 alimentos, 5 perfis de exigência, 4 fórmulas de
  taxa metabólica, 9 referências de ingestão).
- `db/migrations/0001_init.sql` — esquema PostgreSQL/Supabase, já multi-instituição com
  row-level security.

## Comandos

```bash
pnpm install
pnpm --filter @erinacia/web dev   # app web em http://localhost:5173
pnpm test          # testes do motor (comparados com o Banco.xlsm e exemplos resolvidos)
pnpm typecheck
python3 scripts/import_banco.py caminho/para/Banco.xlsm   # regenera data/seed
```

## Convenções

- Valores dos alimentos guardados **como oferecidos (MN)** na unidade do catálogo
  (`packages/core/src/nutrients.ts`); resultados da dieta em **matéria seca (MS)**.
- Exigências em MS. Zeros do Banco.xlsm significam "sem dados" e não são importados.
- Cada alimento indica a tabela de origem (INSA, CIQUAL, USDA, Banco Erinacia…). As licenças
  de cada tabela ficam em `food_sources` e têm de ser verificadas antes de uso comercial.

Mais detalhe em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).
