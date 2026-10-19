import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FilePlus2, Plus, Printer, Save, Trash2 } from 'lucide-react';
import {
  categoryFromGroup,
  checkRequirements,
  computeDiet,
  DERIVED_INDICATORS,
  evaluateProportions,
  evaluateRules,
  NUTRIENT_BY_KEY,
  FOOD_CATEGORY_LABEL,
  type DietResult,
  type EnergyModel,
  type FeedingGuild,
  type Guideline,
  type NutrientResult,
  type RequirementStatus,
} from '@erinacia/core';
import { useFoods, fmt, matchesQuery, sourceOf, type AppFood } from '../data/foods';
import { evaluate, FORMULAS, TYPE_LABEL } from '../data/formulas';
import { DEFAULT_MODEL, GUIDES, GUILD_LABEL, guideLabel, loadDiets, newDiet, saveDiets, type DietDraft } from '../data/diets';

const STAGE: Record<string, string> = {
  all: 'Todas as fases', maintenance: 'Manutenção', breeding: 'Reprodução', gestation: 'Gestação',
  gestation_late: 'Final de gestação', lactation: 'Lactação', growth: 'Crescimento',
};
const MODEL_LABEL: Record<EnergyModel, string> = {
  atwater: 'Atwater (4/9/4)', carnivore: 'Carnívoro', ruminant: 'Ruminante',
  herbivore_monogastric: 'Herbívoro monogástrico', primate: 'Primata', primate_fermenter: 'Primata com fermentação',
};
const STATUS: Record<RequirementStatus | 'within', { label: string; bg: string; fg: string }> = {
  below: { label: 'Abaixo', bg: '#fdecd9', fg: '#8a3b06' },
  within: { label: 'Dentro', bg: '#dcefdc', fg: '#1f5b33' },
  above: { label: 'Acima', bg: '#fde2e1', fg: '#9b1c1c' },
  no_data: { label: 'Sem dados', bg: '#eceeea', fg: '#4a5a50' },
};

const n = (s: string) => { const v = Number(s.replace(',', '.')); return Number.isFinite(v) ? v : 0; };
const label = (k: string) => NUTRIENT_BY_KEY.get(k)?.label.pt ?? (DERIVED_INDICATORS as Record<string, { label: { pt: string } }>)[k]?.label.pt ?? k;
const unit = (k: string) => NUTRIENT_BY_KEY.get(k)?.unit ?? (DERIVED_INDICATORS as Record<string, { unit: string }>)[k]?.unit ?? '';

export function DietPage() {
  const { foods } = useFoods();
  const [saved, setSaved] = useState<DietDraft[]>(loadDiets);
  const [d, setD] = useState<DietDraft>(() => loadDiets()[0] ?? newDiet());
  const [pick, setPick] = useState('');
  const [msg, setMsg] = useState('');
  const set = (patch: Partial<DietDraft>) => { setD((x) => ({ ...x, ...patch })); setMsg(''); };

  const guide: Guideline | undefined = GUIDES.find((g) => g.id === d.guideId);
  const formula = FORMULAS.find((f) => f.id === d.formulaId) ?? FORMULAS[0]!;
  const foodById = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);

  const chooseGuide = (id: string) => {
    const g = GUIDES.find((x) => x.id === id);
    const me = g?.energy?.find((e) => e.energyType === 'ME');
    set({
      guideId: id,
      targetIndex: 0,
      proportionIndex: 0,
      energyModel: g ? DEFAULT_MODEL[g.guild] : d.energyModel,
      formulaId: g && me ? `${g.id}-${me.id}` : d.formulaId,
    });
  };

  // Energy requirement
  const base = d.weightKg > 0 ? evaluate(formula, d.weightKg).mid : 0;
  const maintenance = formula.type === 'TMB' ? base * d.activityFactor : base;
  const energyKcal = d.overrideKcal && d.overrideKcal > 0 ? d.overrideKcal : maintenance * (1 + d.adjustmentPct / 100);

  // Diet
  const lines = d.items.map((i) => ({ ...i, food: foodById.get(i.foodId) })).filter((i): i is typeof i & { food: AppFood } => !!i.food);
  const inclusionSum = lines.reduce((s, i) => s + i.inclusionPct, 0);
  let result: DietResult | undefined;
  let error = '';
  try {
    if (lines.length && energyKcal > 0) {
      result = computeDiet({
        items: lines.map((i) => ({ food: i.food, inclusionAsFed: i.inclusionPct / 100, intakeFraction: i.intakePct / 100 })),
        energyModel: d.energyModel,
        energyKcal,
        animals: d.animals,
        vessels: d.vessels,
        mealsPerDay: d.meals,
      });
    }
  } catch (e) {
    error = e instanceof Error && /energy/.test(e.message) ? 'Os alimentos escolhidos não têm energia no modelo selecionado.' : 'Indique as inclusões dos alimentos.';
  }

  const categorized = result ? result.items.map((r) => {
    const f = foodById.get(r.foodId)!;
    return { category: categoryFromGroup(f.group, f.name), inclusionAsFed: r.inclusionAsFed, inclusionDM: r.inclusionDM };
  }) : [];

  const nutrientsWithDerived: Record<string, NutrientResult> = result ? {
    ...result.nutrients,
    ...(result.totals.calciumPhosphorusRatio !== undefined ? { ca_p_ratio: { valueDM: result.totals.calciumPhosphorusRatio, coverage: 1 } } : {}),
    ...(result.totals.kcalPerGramProtein !== undefined ? { kcal_per_g_protein: { valueDM: result.totals.kcalPerGramProtein, coverage: 1 } } : {}),
    energy_density_dm: { valueDM: result.totals.kcalPerGramDM, coverage: 1 },
    energy_density_as_fed: { valueDM: result.totals.kcal / result.totals.ingestedGramsAsFed, coverage: 1 },
  } : {};
  const targetSet = guide?.targets?.[d.targetIndex];
  const checks = result && targetSet ? checkRequirements(nutrientsWithDerived, { id: '', group: '', values: targetSet.values }) : [];
  const propSet = guide?.proportions?.[d.proportionIndex];
  const props = result && propSet ? evaluateProportions(categorized, propSet) : [];
  const rules = guide?.rules ? evaluateRules(guide.rules, categorized) : [];

  const addFood = () => {
    if (!pick || d.items.some((i) => i.foodId === pick)) return;
    const remaining = Math.max(0, 100 - inclusionSum);
    set({ items: [...d.items, { foodId: pick, inclusionPct: remaining || 10, intakePct: 100 }] });
    setPick('');
  };
  const setItem = (idx: number, patch: Partial<DietDraft['items'][number]>) =>
    set({ items: d.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) });

  const persist = () => {
    const next = [{ ...d, updatedAt: new Date().toISOString() }, ...saved.filter((s) => s.id !== d.id)];
    setSaved(next); saveDiets(next); setMsg('Dieta guardada.');
  };
  const removeDiet = () => {
    if (!saved.some((s) => s.id === d.id) || !window.confirm(`Apagar a dieta "${d.name}"?`)) return;
    const next = saved.filter((s) => s.id !== d.id);
    setSaved(next); saveDiets(next); setD(next[0] ?? newDiet());
  };

  const [foodQuery, setFoodQuery] = useState('');
  const byGroup = useMemo(() => {
    const m = new Map<string, AppFood[]>();
    const q = foodQuery.trim();
    [...foods].filter((f) => !q || matchesQuery(f.name, q)).sort((a, b) => a.name.localeCompare(b.name, 'pt')).forEach((f) => m.set(f.group, [...(m.get(f.group) ?? []), f]));
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt'));
  }, [foods, foodQuery]);
  const shown = byGroup.reduce((n, [, l]) => n + l.length, 0);

  return (
    <>
      <header className="page-head no-print">
        <h1 className="page-title">Formular dieta</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select className="select" style={{ width: 220 }} aria-label="Dietas guardadas" value={saved.some((s) => s.id === d.id) ? d.id : ''}
            onChange={(e) => { const s = saved.find((x) => x.id === e.target.value); if (s) { setD(s); setMsg(''); } }}>
            <option value="">Dietas guardadas ({saved.length})</option>
            {saved.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="button" className="btn" onClick={() => { setD(newDiet()); setMsg(''); }}><FilePlus2 size={16} aria-hidden="true" /> Nova</button>
          <button type="button" className="btn" onClick={() => window.print()} disabled={!result}><Printer size={16} aria-hidden="true" /> Ficha alimentar</button>
          <button type="button" className="btn btn-primary" onClick={persist}><Save size={16} aria-hidden="true" /> Guardar</button>
        </div>
      </header>
      {msg && <p className="result-count no-print" role="status">{msg}</p>}

      <div className="diet-layout">
        <div className="diet-form no-print">
          <section className="card" aria-labelledby="s-animal">
            <h2 id="s-animal" className="step">1 · Animal</h2>
            <div className="form-grid">
              <label className="lbl full">Nome da dieta<input className="input" value={d.name} onChange={(e) => set({ name: e.target.value })} /></label>
              <label className="lbl full">Animal ou grupo<input className="input" placeholder="Ex.: Ouriço juvenil, sala 2" value={d.animal} onChange={(e) => set({ animal: e.target.value })} /></label>
              <label className="lbl full">Guia da espécie
                <select className="select" value={d.guideId} onChange={(e) => chooseGuide(e.target.value)}>
                  <option value="">Sem guia (só energia e nutrientes)</option>
                  {(Object.keys(GUILD_LABEL) as FeedingGuild[]).filter((k) => GUIDES.some((g) => g.guild === k)).map((k) => (
                    <optgroup key={k} label={GUILD_LABEL[k]}>
                      {GUIDES.filter((g) => g.guild === k).map((g) => <option key={g.id} value={g.id}>{guideLabel(g)}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              {guide?.targets?.length ? (
                <label className="lbl full">Exigências
                  <select className="select" value={d.targetIndex} onChange={(e) => set({ targetIndex: Number(e.target.value) })}>
                    {guide.targets.map((t, i) => <option key={i} value={i}>{STAGE[t.lifeStage]}{t.label ? ` — ${t.label}` : ''}</option>)}
                  </select>
                </label>
              ) : null}
              <label className="lbl">Peso vivo (kg)<input className="input" inputMode="decimal" defaultValue={d.weightKg} key={`w-${d.id}`} onChange={(e) => set({ weightKg: n(e.target.value) })} /></label>
              <label className="lbl">N.º de animais<input className="input" type="number" min={1} value={d.animals} onChange={(e) => set({ animals: Math.max(1, n(e.target.value)) })} /></label>
              <label className="lbl">N.º de vasilhas<input className="input" type="number" min={1} value={d.vessels} onChange={(e) => set({ vessels: Math.max(1, n(e.target.value)) })} /></label>
              <label className="lbl">Refeições por dia<input className="input" type="number" min={1} value={d.meals} onChange={(e) => set({ meals: Math.max(1, n(e.target.value)) })} /></label>
            </div>
          </section>

          <section className="card" aria-labelledby="s-energy">
            <h2 id="s-energy" className="step">2 · Energia</h2>
            <label className="lbl">Fórmula
              <select className="select" value={d.formulaId} onChange={(e) => set({ formulaId: e.target.value })}>
                {FORMULAS.map((f) => <option key={f.id} value={f.id}>{f.type} · {f.name}{f.status === 'to_verify' ? ' (a verificar)' : ''}</option>)}
              </select>
            </label>
            <p className="hint" style={{ margin: 0 }}>{TYPE_LABEL[formula.type]}: {formula.coefficientRange ? `${formula.coefficientRange.join('–')}` : formula.coefficient} × PV^{formula.exponent} = <strong>{fmt(base, 1)} kcal/dia</strong></p>
            <div className="form-grid">
              {formula.type === 'TMB' && (
                <label className="lbl">Fator de atividade (× TMB)<input className="input" inputMode="decimal" defaultValue={d.activityFactor} key={`a-${d.id}`} onChange={(e) => set({ activityFactor: n(e.target.value) })} /></label>
              )}
              <label className="lbl">Ajuste fisiológico (%)<input className="input" inputMode="decimal" defaultValue={d.adjustmentPct} key={`j-${d.id}`} onChange={(e) => set({ adjustmentPct: n(e.target.value) })} /></label>
              <label className="lbl">Energia fixa (kcal/dia)<input className="input" inputMode="decimal" placeholder="opcional" defaultValue={d.overrideKcal ?? ''} key={`o-${d.id}`} onChange={(e) => set({ overrideKcal: n(e.target.value) || undefined })} /></label>
              <label className="lbl">Modelo de EM dos alimentos
                <select className="select" value={d.energyModel} onChange={(e) => set({ energyModel: e.target.value as EnergyModel })}>
                  {(Object.keys(MODEL_LABEL) as EnergyModel[]).map((m) => <option key={m} value={m}>{MODEL_LABEL[m]}</option>)}
                </select>
              </label>
            </div>
            {guide?.energyAdjustments?.length ? (
              <div className="note" style={{ background: '#eaf2f5', borderColor: '#c9dde5', color: 'var(--rio-escuro)' }}>
                <strong>Ajustes do guia:</strong> {guide.energyAdjustments.map((a) => `${a.label}${a.factor ? ` × ${a.factor}` : a.factorRange ? ` × ${a.factorRange.join('–')}` : ''}`).join(' · ')}
              </div>
            ) : null}
          </section>

          <section className="card" aria-labelledby="s-foods">
            <h2 id="s-foods" className="step">3 · Alimentos</h2>
            <input className="input" type="search" aria-label="Filtrar alimentos" placeholder={`Filtrar ${foods.length} alimentos (ex.: fígado porco)…`}
              value={foodQuery} onChange={(e) => setFoodQuery(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="select" aria-label="Alimento a adicionar" value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">{foodQuery.trim() ? `${shown} alimentos encontrados…` : 'Escolher alimento…'}</option>
                {byGroup.map(([g, list]) => (
                  <optgroup key={g} label={g}>
                    {list.map((f) => <option key={f.id} value={f.id} disabled={d.items.some((i) => i.foodId === f.id)}>{f.name} · {sourceOf(f)}</option>)}
                  </optgroup>
                ))}
              </select>
              <button type="button" className="btn btn-primary" onClick={addFood} disabled={!pick}><Plus size={16} aria-hidden="true" /> Adicionar</button>
            </div>
            {d.items.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Alimento</th><th>% MN</th><th>% ingestão</th><th><span className="sr-only" style={{ position: 'absolute', left: -9999 }}>Remover</span></th></tr></thead>
                  <tbody>
                    {d.items.map((it, idx) => (
                      <tr key={it.foodId}>
                        <td>{foodById.get(it.foodId)?.name ?? 'Alimento removido'}</td>
                        <td style={{ width: 90 }}><input className="input" aria-label="Inclusão % MN" inputMode="decimal" value={it.inclusionPct} onChange={(e) => setItem(idx, { inclusionPct: n(e.target.value) })} /></td>
                        <td style={{ width: 90 }}><input className="input" aria-label="% ingestão" inputMode="decimal" value={it.intakePct} onChange={(e) => setItem(idx, { intakePct: n(e.target.value) })} /></td>
                        <td style={{ width: 48 }}><button type="button" className="btn btn-icon btn-danger" aria-label="Remover" onClick={() => set({ items: d.items.filter((_, i) => i !== idx) })}><Trash2 size={15} aria-hidden="true" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className={Math.abs(inclusionSum - 100) > 0.01 && d.items.length ? 'error' : 'hint'} style={{ margin: 0 }}>
              Soma das inclusões: {fmt(inclusionSum, 2)} %{Math.abs(inclusionSum - 100) > 0.01 && d.items.length ? ' — o cálculo normaliza para 100 %.' : ''}
            </p>
          </section>
        </div>

        <div className="diet-results">
          <section className="card energy-card" aria-labelledby="r-energy">
            <h2 id="r-energy" style={{ margin: 0, fontSize: 17 }}>{d.name || 'Dieta'}{d.animal ? ` · ${d.animal}` : ''}</h2>
            <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
              <Stat label="Energia" value={`${fmt(energyKcal, 0)} kcal`} />
              <Stat label="Ingerido" value={result ? `${fmt(result.totals.ingestedGramsAsFed, 0)} g MN` : '—'} />
              <Stat label="Matéria seca" value={result ? `${fmt(result.totals.ingestedGramsDM, 0)} g` : '—'} />
              <Stat label="kcal/g MS" value={result ? fmt(result.totals.kcalPerGramDM, 2) : '—'} />
              <Stat label="Ca:P" value={result?.totals.calciumPhosphorusRatio !== undefined ? `${fmt(result.totals.calciumPhosphorusRatio, 2)}:1` : '—'} />
              <Stat label="Ingestão MS" value={result && d.weightKg ? `${fmt((result.totals.ingestedGramsDM / (d.weightKg * 1000)) * 100, 2)} % PV` : '—'} />
            </div>
            {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
            {!result && !error && <p className="hint" style={{ margin: 0 }}>Adicione alimentos para ver as quantidades e a composição.</p>}
            {result?.warnings.filter((w) => w.startsWith('missing_energy')).map((w) => (
              <p key={w} className="error" style={{ margin: 0 }}>Sem energia no modelo escolhido: {foodById.get(w.split(':')[1]!)?.name}</p>
            ))}
          </section>

          {result && (
            <section className="card" aria-labelledby="r-sheet">
              <h2 id="r-sheet" style={{ margin: 0, fontSize: 17 }}>Quantidades {d.animals > 1 || d.vessels > 1 ? `(${d.animals} animais, ${d.vessels} vasilhas)` : ''}</h2>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Alimento</th><th style={{ textAlign: 'right' }}>% MN</th><th style={{ textAlign: 'right' }}>% MS</th><th style={{ textAlign: 'right' }}>g/animal/dia</th><th style={{ textAlign: 'right' }}>g/vasilha/refeição</th><th style={{ textAlign: 'right' }}>% energia</th></tr></thead>
                  <tbody>
                    {result.items.map((r) => (
                      <tr key={r.foodId}>
                        <td>{r.name}</td>
                        <td className="num">{fmt(r.inclusionAsFed * 100)}</td>
                        <td className="num">{fmt(r.inclusionDM * 100)}</td>
                        <td className="num">{fmt(r.offeredGramsAsFed, 1)}</td>
                        <td className="num">{fmt(r.gramsPerVesselPerMeal, 1)}</td>
                        <td className="num">{fmt(r.energyShare * 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {result && targetSet && (
            <section className="card" aria-labelledby="r-req">
              <h2 id="r-req" style={{ margin: 0, fontSize: 17 }}>Nutrientes × exigências <span className="hint">({STAGE[targetSet.lifeStage]}, base MS)</span></h2>
              <div className="badges">
                {(['within', 'below', 'above', 'no_data'] as const).map((s) => {
                  const c = checks.filter((x) => x.status === s).length;
                  return c ? <span key={s} className="badge" style={{ background: STATUS[s].bg, color: STATUS[s].fg }}>{c} {STATUS[s].label.toLowerCase()}</span> : null;
                })}
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Nutriente</th><th style={{ textAlign: 'right' }}>Dieta</th><th style={{ textAlign: 'right' }}>Exigência</th><th>Estado</th></tr></thead>
                  <tbody>
                    {checks.map((c) => (
                      <tr key={c.key}>
                        <td>{label(c.key)} <span className="hint">{unit(c.key)}</span>{c.coverage !== undefined && c.coverage < 0.999 && <div className="hint">dados em {fmt(c.coverage * 100, 0)} % da MS</div>}</td>
                        <td className="num">{fmt(c.valueDM, 3)}</td>
                        <td className="num">{c.min !== undefined && c.max !== undefined ? `${fmt(c.min, 3)}–${fmt(c.max, 3)}` : c.min !== undefined ? `≥ ${fmt(c.min, 3)}` : c.max !== undefined ? `≤ ${fmt(c.max, 3)}` : '—'}</td>
                        <td><span className="badge" style={{ background: STATUS[c.status].bg, color: STATUS[c.status].fg }}>{STATUS[c.status].label}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="hint" style={{ margin: 0 }}>Valores-alvo únicos do guia aparecem como "—" e não são classificados. Fonte: {guide?.citation}</p>
            </section>
          )}

          {result && guide?.proportions?.length ? (
            <section className="card" aria-labelledby="r-prop">
              <h2 id="r-prop" style={{ margin: 0, fontSize: 17 }}>Proporções por categoria</h2>
              {guide.proportions.length > 1 && (
                <select className="select" aria-label="Conjunto de proporções" value={d.proportionIndex} onChange={(e) => set({ proportionIndex: Number(e.target.value) })}>
                  {guide.proportions.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
                </select>
              )}
              <div className="rows">
                {props.map((p, i) => (
                  <div className="row" key={i}>
                    <span>{p.label ?? FOOD_CATEGORY_LABEL[p.category]}</span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <strong style={{ fontFamily: 'var(--mono)' }}>{fmt(p.sharePercent)} %</strong>
                      <span className="hint">({p.min ?? (p.target !== undefined ? `≈${p.target}` : 0)}{p.max !== undefined ? `–${p.max}` : p.min !== undefined ? '+' : ''} %)</span>
                      <span className="badge" style={{ background: STATUS[p.status].bg, color: STATUS[p.status].fg }}>{STATUS[p.status].label}</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="hint" style={{ margin: 0 }}>Base {propSet?.basis === 'DM' ? 'MS' : 'MN'}. A categoria de cada alimento é deduzida do grupo da tabela.</p>
            </section>
          ) : null}

          {guide?.rules?.length ? (
            <section className="card" aria-labelledby="r-rules">
              <h2 id="r-rules" style={{ margin: 0, fontSize: 17 }}>Regras do guia</h2>
              <div className="rows">
                {[...rules].sort((a, b) => Number(!!b.triggered) - Number(!!a.triggered)).map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 0', color: r.triggered ? '#8a3b06' : 'inherit', fontWeight: r.triggered ? 600 : 400 }}>
                    {r.triggered ? <AlertTriangle size={16} aria-label="Aplica-se a esta dieta" style={{ flex: 'none', marginTop: 2 }} /> : <CheckCircle2 size={16} aria-hidden="true" style={{ flex: 'none', marginTop: 2, color: 'var(--linha-forte)' }} />}
                    <span>{r.rule.text.pt}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
      <div className="no-print" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-danger" onClick={removeDiet} disabled={!saved.some((s) => s.id === d.id)}><Trash2 size={16} aria-hidden="true" /> Apagar esta dieta</button>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="stat"><div className="stat-label">{label}</div><div className="stat-value">{value}</div></div>;
}
