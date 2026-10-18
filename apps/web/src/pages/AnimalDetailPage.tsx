import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { dailyGains, daysBetween, overallDailyGain, percentOfExpected, relativeDailyGains } from '@erinacia/core';
import { AnimalForm } from '../components/AnimalForm';
import { GrowthChart } from '../components/GrowthChart';
import { ageDays, formatAge, formatWeight, REARING_LABEL, SEX_LABEL, sortedWeighings, STAGE_LABEL, today, uid, useAnimals, useCurves } from '../data/animals';
import { fmt } from '../data/foods';

export function AnimalDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { animals, upsert, remove } = useAnimals();
  const { curves } = useCurves();
  const a = animals.find((x) => x.id === id);
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(today());
  const [grams, setGrams] = useState('');
  const [cc, setCc] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const w = useMemo(() => (a ? sortedWeighings(a) : []), [a]);
  if (!a) {
    return (
      <div className="empty">
        <p>Animal não encontrado.</p>
        <Link to="/animais" className="btn">Voltar aos animais</Link>
      </div>
    );
  }

  const records = w.map((x) => ({ date: x.date, grams: x.grams }));
  const gains = dailyGains(records);
  const rel = relativeDailyGains(records);
  const adg = overallDailyGain(records);
  const last = w[w.length - 1];
  const curve = curves.find((c) => c.id === a.curveId);
  const hasBirth = !!a.birthDate;
  const xOf = (d: string) => (hasBirth ? daysBetween(a.birthDate!, d) : daysBetween(w[0]!.date, d));
  const observed = w.map((x) => ({ date: x.date, ageDays: xOf(x.date), grams: x.grams }));
  const pctExpected = curve && hasBirth && last ? percentOfExpected(last.grams, curve.points, xOf(last.date)) : undefined;
  const lastRel = rel[rel.length - 1];
  const lastGain = gains[gains.length - 1];

  const addWeighing = (e: React.FormEvent) => {
    e.preventDefault();
    const g = Number(grams.replace(',', '.'));
    if (!Number.isFinite(g) || g <= 0) return setErr('Indique um peso maior que zero.');
    if (!date || date > today()) return setErr('Indique uma data válida (não futura).');
    if (a.birthDate && date < a.birthDate) return setErr('A data é anterior ao nascimento.');
    const c = cc.trim() ? Number(cc.replace(',', '.')) : undefined;
    upsert({ ...a, weighings: [...a.weighings, { id: uid('w'), date, grams: g, condition: Number.isFinite(c) ? c : undefined, note: note.trim() || undefined }] });
    setGrams(''); setCc(''); setNote(''); setErr('');
  };

  const sameSpecies = curves.filter((c) => a.scientificName && c.species.toLowerCase() === a.scientificName.toLowerCase());
  const others = curves.filter((c) => !sameSpecies.includes(c));

  return (
    <>
      <Link to="/animais" className="btn" style={{ marginBottom: 12 }}><ArrowLeft size={16} aria-hidden="true" /> Animais</Link>
      <header className="page-head">
        <div>
          <h1 className="page-title">{a.name}</h1>
          <div className="guide-meta">{a.species}{a.scientificName && <> · <em>{a.scientificName}</em></>}{a.site && <> · {a.site}</>}</div>
          <div className="badges" style={{ marginTop: 8 }}>
            <span className="badge badge-source">{STAGE_LABEL[a.stage]}</span>
            <span className="badge badge-source">{SEX_LABEL[a.sex]}</span>
            <span className="badge badge-source">{REARING_LABEL[a.rearing]}</span>
            {a.birthDate && <span className="badge badge-source">Nascimento {new Date(a.birthDate).toLocaleDateString('pt-PT')}{a.birthEstimated ? ' (estimado)' : ''}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn" onClick={() => setEditing(true)}><Pencil size={16} aria-hidden="true" /> Editar</button>
          <button type="button" className="btn btn-danger" onClick={() => { if (window.confirm(`Apagar ${a.name} e todas as pesagens?`)) { remove(a.id); nav('/animais'); } }}><Trash2 size={16} aria-hidden="true" /> Apagar</button>
        </div>
      </header>

      <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 16 }}>
        <div className="stat"><div className="stat-label">Idade</div><div className="stat-value">{formatAge(ageDays(a))}</div></div>
        <div className="stat"><div className="stat-label">Último peso</div><div className="stat-value">{formatWeight(last?.grams)}</div></div>
        <div className="stat"><div className="stat-label">GMD global</div><div className="stat-value">{adg === undefined ? '—' : `${fmt(adg, 1)} g/d`}</div></div>
        <div className="stat"><div className="stat-label">GMD último intervalo</div><div className="stat-value">{lastGain ? `${fmt(lastGain.gramsPerDay, 1)} g/d` : '—'}</div></div>
        <div className="stat"><div className="stat-label">Ganho relativo</div><div className="stat-value">{lastRel ? `${fmt(lastRel.percentPerDay, 2)} %/d` : '—'}</div></div>
        <div className="stat"><div className="stat-label">Face à referência</div><div className="stat-value">{pctExpected ? `${fmt(pctExpected * 100, 0)} %` : '—'}</div></div>
      </div>

      <div className="diet-layout">
        <div className="diet-form">
          <form className="card" onSubmit={addWeighing} aria-labelledby="new-w" noValidate>
            <h2 id="new-w" className="step">Nova pesagem</h2>
            <div className="form-grid">
              <label className="lbl">Data<input className="input" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} /></label>
              <label className="lbl">Peso (g)<input className="input" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} /></label>
              <label className="lbl">Condição corporal<input className="input" inputMode="decimal" placeholder="opcional" value={cc} onChange={(e) => setCc(e.target.value)} /></label>
              <label className="lbl">Nota<input className="input" placeholder="opcional" value={note} onChange={(e) => setNote(e.target.value)} /></label>
            </div>
            {err && <p className="error" role="alert" style={{ margin: 0 }}>{err}</p>}
            <button type="submit" className="btn btn-primary"><Plus size={16} aria-hidden="true" /> Registar pesagem</button>
          </form>

          <section className="card" aria-labelledby="ref">
            <h2 id="ref" className="step">Curva de referência</h2>
            <select className="select" aria-label="Curva de referência" value={a.curveId ?? ''} onChange={(e) => upsert({ ...a, curveId: e.target.value || undefined })}>
              <option value="">Sem curva</option>
              {sameSpecies.length > 0 && <optgroup label="Mesma espécie">{sameSpecies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
              <optgroup label="Outras">{others.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
            </select>
            {!hasBirth && curve && <p className="note" style={{ margin: 0 }}>Indique a data de nascimento (mesmo estimada) para comparar com a curva.</p>}
            {curve?.note && <p className="hint" style={{ margin: 0 }}>{curve.note}</p>}
            {curve && <p className="hint" style={{ margin: 0 }}>Fonte: {curve.citation}</p>}
            <Link to="/crescimento" className="hint">Gerir curvas de referência</Link>
          </section>
        </div>

        <div className="diet-results">
          <section className="card" aria-labelledby="chart">
            <h2 id="chart" className="step">Crescimento</h2>
            {w.length === 0 ? (
              <p className="hint" style={{ margin: 0 }}>Registe pesagens para ver a curva.</p>
            ) : (
              <GrowthChart observed={observed} reference={hasBirth ? curve?.points : undefined}
                xLabel={hasBirth ? 'Idade (dias)' : 'Dias desde a 1.ª pesagem'} referenceName={curve?.name} />
            )}
          </section>

          {w.length > 0 && (
            <section className="card" aria-labelledby="tbl">
              <h2 id="tbl" className="step">Pesagens</h2>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Data</th><th style={{ textAlign: 'right' }}>{hasBirth ? 'Idade (d)' : 'Dia'}</th><th style={{ textAlign: 'right' }}>Peso</th><th style={{ textAlign: 'right' }}>g/dia</th><th style={{ textAlign: 'right' }}>%/dia</th><th style={{ textAlign: 'right' }}>CC</th><th>Nota</th><th><span style={{ position: 'absolute', left: -9999 }}>Apagar</span></th></tr></thead>
                  <tbody>
                    {w.map((x, i) => {
                      const g = i > 0 ? gains.find((y) => y.to === x.date && y.from === w[i - 1]!.date) : undefined;
                      const r = i > 0 ? rel.find((y) => y.to === x.date && y.from === w[i - 1]!.date) : undefined;
                      return (
                        <tr key={x.id}>
                          <td>{new Date(x.date).toLocaleDateString('pt-PT')}</td>
                          <td className="num">{xOf(x.date)}</td>
                          <td className="num">{formatWeight(x.grams)}</td>
                          <td className="num">{g ? fmt(g.gramsPerDay, 1) : '—'}</td>
                          <td className="num">{r ? fmt(r.percentPerDay, 2) : '—'}</td>
                          <td className="num">{x.condition ?? '—'}</td>
                          <td>{x.note ?? ''}</td>
                          <td style={{ width: 48 }}>
                            <button type="button" className="btn btn-icon btn-danger" aria-label={`Apagar pesagem de ${x.date}`}
                              onClick={() => upsert({ ...a, weighings: a.weighings.filter((y) => y.id !== x.id) })}><Trash2 size={15} aria-hidden="true" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
      {editing && <AnimalForm initial={a} onCancel={() => setEditing(false)} onSave={(x) => { upsert(x); setEditing(false); }} />}
    </>
  );
}
