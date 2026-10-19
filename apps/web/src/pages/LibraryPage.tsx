import { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Search, X } from 'lucide-react';
import { NUTRIENT_BY_KEY, DERIVED_INDICATORS, FOOD_CATEGORY_LABEL, type FeedingGuild, type Guideline } from '@erinacia/core';
import { useEscape } from '../components/FoodDetail';
import { fmt, matchesQuery } from '../data/foods';
import { GUIDES as guidelines, GUILD_LABEL, guideSource } from '../data/diets';

const STAGE: Record<string, string> = {
  all: 'Todas as fases', maintenance: 'Manutenção', breeding: 'Reprodução', gestation: 'Gestação',
  gestation_late: 'Final de gestação', lactation: 'Lactação', laying: 'Postura', growth: 'Crescimento',
};
const RULE: Record<string, string> = {
  supplement: 'Suplementação', limit: 'Limite', avoid: 'Evitar', alert: 'Alerta', schedule: 'Manejo', monitoring: 'Monitorização', safety: 'Segurança',
};

const label = (k: string) => NUTRIENT_BY_KEY.get(k)?.label.pt ?? (DERIVED_INDICATORS as Record<string, { label: { pt: string } }>)[k]?.label.pt ?? k;
const unit = (k: string) => NUTRIENT_BY_KEY.get(k)?.unit ?? (DERIVED_INDICATORS as Record<string, { unit: string }>)[k]?.unit ?? '';
const range = (r: { min?: number; max?: number; target?: number }) =>
  r.target !== undefined ? fmt(r.target, 3) : r.min !== undefined && r.max !== undefined ? `${fmt(r.min, 3)}–${fmt(r.max, 3)}` : r.min !== undefined ? `≥ ${fmt(r.min, 3)}` : `≤ ${fmt(r.max, 3)}`;

export function LibraryPage() {
  const [open, setOpen] = useState<Guideline | null>(null);
  const [q, setQ] = useState('');
  const [guild, setGuild] = useState<'' | FeedingGuild>('');
  const visible = useMemo(() => guidelines.filter((g) => (!guild || g.guild === guild) && (!q.trim() || matchesQuery(
    [g.title, g.citation, g.modelSpecies ?? '', ...g.species.flatMap((s) => [s.commonName.pt, s.commonName.en, s.scientificName])].join(' '), q.trim(),
  ))), [q, guild]);
  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Biblioteca científica</h1>
      </header>
      <div className="toolbar" style={{ gridTemplateColumns: 'minmax(0, 1fr) 280px' }}>
        <label className="field">
          <Search size={18} aria-hidden="true" />
          <input className="input" type="search" aria-label="Pesquisar guias" placeholder="Pesquisar espécie, nome científico ou fonte (ex.: ouriço, Panthera, NRC)…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="select" aria-label="Regime alimentar" value={guild} onChange={(e) => setGuild(e.target.value as typeof guild)}>
          <option value="">Todos os regimes alimentares</option>
          {(Object.keys(GUILD_LABEL) as FeedingGuild[]).map((k) => <option key={k} value={k}>{GUILD_LABEL[k]}</option>)}
        </select>
      </div>
      <p className="result-count">A mostrar <strong>{visible.length}</strong> de {guidelines.length} guias transcritos de fontes publicadas, com citação e notas de qualidade.</p>
      <div className="grid">
        {visible.map((g) => (
          <article className="card" key={g.id}>
            <div className="card-head">
              <BookOpen size={20} aria-hidden="true" style={{ color: 'var(--folha)', marginTop: 2 }} />
              <button type="button" className="card-title" onClick={() => setOpen(g)}>
                {g.species.map((s) => s.commonName.pt).join(', ')}
              </button>
            </div>
            <div className="guide-meta"><em>{g.species.map((s) => s.scientificName).join(', ')}</em></div>
            <div className="badges">
              <span className="badge badge-source">{guideSource(g)}</span>
              <span className="badge badge-source">{GUILD_LABEL[g.guild]}</span>
              {g.modelSpecies && <span className="badge badge-source">Modelo: {g.modelSpecies}</span>}
            </div>
            <div className="chip-list">
              {g.energy?.length ? <span className="chip">Energia</span> : null}
              {g.targets?.length ? <span className="chip">Exigências</span> : null}
              {g.proportions?.length ? <span className="chip">Proporções</span> : null}
              {g.growth?.length ? <span className="chip">Crescimento</span> : null}
              {g.rules?.length ? <span className="chip">{g.rules.length} regras</span> : null}
            </div>
            <div className="biblio">{g.citation}</div>
            {g.dataQuality?.length ? (
              <div className="row" style={{ fontSize: 13, color: '#5c4410' }}>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#5c4410' }}>
                  <AlertTriangle size={14} aria-hidden="true" /> {g.dataQuality.length} nota(s) a rever
                </span>
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {open && <GuideDetail g={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function GuideDetail({ g, onClose }: { g: Guideline; onClose: () => void }) {
  useEscape(onClose);
  return (
    <div className="overlay" onClick={onClose}>
      <aside className="panel" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2 id="guide-title" className="panel-title">{g.species.map((s) => s.commonName.pt).join(', ')}</h2>
          <button type="button" className="btn btn-icon" aria-label="Fechar" onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </div>
        <p className="guide-meta" style={{ margin: 0 }}>{g.citation}</p>
        {g.modelSpecies && <p style={{ margin: 0 }}><strong>Espécie-modelo:</strong> {g.modelSpecies}</p>}
        {g.dataQuality?.map((d) => <div key={d} className="note">{d}</div>)}

        {g.energy?.length ? (
          <section>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Energia</h3>
            <div className="rows">
              {g.energy.map((e) => (
                <div key={e.id}>
                  <strong>{e.label}:</strong>{' '}
                  <span style={{ fontFamily: 'var(--mono)' }}>
                    {e.coefficientRange ? `${e.coefficientRange[0]}–${e.coefficientRange[1]}` : e.coefficient} × PV({e.weightUnit})^{e.exponent} {e.energyUnit} {e.energyType}/d
                  </span>
                  {e.note && <div className="hint">{e.note}</div>}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {g.targets?.map((t, i) => (
          <section key={i}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{STAGE[t.lifeStage]}{t.label ? ` — ${t.label}` : ''} ({t.basis === 'DM' ? 'MS' : 'MN'})</h3>
            <div className="table-wrap">
              <table>
                <tbody>
                  {Object.entries(t.values).map(([k, r]) => (
                    <tr key={k}>
                      <td>{label(k)}{r.note && <div className="hint">{r.note}</div>}</td>
                      <td className="num">{range(r)}</td>
                      <td>{unit(k)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {g.proportions?.map((p) => (
          <section key={p.label}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{p.label} ({p.basis === 'DM' ? '% MS' : '% MN'})</h3>
            <div className="rows">
              {p.rules.map((r, i) => (
                <div className="row" key={i}><span>{r.label ?? FOOD_CATEGORY_LABEL[r.category]}</span><strong>{range(r.range)} %</strong></div>
              ))}
            </div>
          </section>
        ))}

        {g.rules?.length ? (
          <section>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Regras</h3>
            <div className="rows">
              {g.rules.map((r, i) => (
                <div key={i}><span className="chip" style={{ marginRight: 8 }}>{RULE[r.kind]}</span>{r.text.pt}</div>
              ))}
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
