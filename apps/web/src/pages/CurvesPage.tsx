import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { GrowthChart } from '../components/GrowthChart';
import { useEscape } from '../components/FoodDetail';
import { formatWeight, parseCurve, uid, useCurves, type ReferenceCurve } from '../data/animals';

export function CurvesPage() {
  const { curves, upsert, remove } = useCurves();
  const [creating, setCreating] = useState(false);
  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Curvas de crescimento</h1>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={18} aria-hidden="true" /> Nova curva</button>
      </header>
      <p className="result-count" style={{ marginTop: -8 }}>Curvas de referência (peso esperado por idade) para comparar com as pesagens dos juvenis. As dos guias vêm das tabelas publicadas; pode criar as suas, por exemplo a partir de dados da sua dissertação.</p>
      <div className="grid">
        {curves.map((c) => (
          <article className="card" key={c.id}>
            <div className="card-head">
              <h2 className="card-title" style={{ cursor: 'default' }}>{c.name}</h2>
              {c.origin === 'own' && (
                <button type="button" className="btn btn-icon btn-danger" aria-label={`Apagar ${c.name}`} onClick={() => window.confirm(`Apagar a curva "${c.name}"?`) && remove(c.id)}><Trash2 size={16} aria-hidden="true" /></button>
              )}
            </div>
            <div className="guide-meta"><em>{c.species}</em></div>
            <div className="badges"><span className="badge badge-source">{c.origin === 'guide' ? 'Guia da biblioteca' : 'Curva própria'}</span><span className="badge badge-source">{c.points.length} pontos</span></div>
            <GrowthChart observed={[]} reference={c.points} xLabel="Idade (dias)" referenceName="Peso esperado" />
            <div className="rows">
              <div className="row"><span>Nascimento</span><strong>{formatWeight(c.points[0]?.grams)}</strong></div>
              <div className="row"><span>Último ponto</span><strong>{formatWeight(c.points[c.points.length - 1]?.grams)} aos {c.points[c.points.length - 1]?.ageDays} d</strong></div>
            </div>
            {c.note && <p className="hint" style={{ margin: 0 }}>{c.note}</p>}
            <div className="biblio"><strong>Fonte:</strong> {c.citation}</div>
          </article>
        ))}
      </div>
      {creating && <CurveForm onCancel={() => setCreating(false)} onSave={(c) => { upsert(c); setCreating(false); }} />}
    </>
  );
}

function CurveForm({ onCancel, onSave }: { onCancel: () => void; onSave: (c: ReferenceCurve) => void }) {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [citation, setCitation] = useState('');
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  useEscape(onCancel);
  const parsed = parseCurve(text);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p: string[] = [];
    if (!name.trim()) p.push('Indique o nome da curva.');
    if (!species.trim()) p.push('Indique o nome científico da espécie.');
    if (parsed.points.length < 2) p.push('Indique pelo menos dois pontos (idade;peso).');
    if (parsed.errors.length) p.push(`Linhas inválidas: ${parsed.errors.join(', ')}.`);
    setErrors(p);
    if (p.length) return;
    onSave({ id: uid('curve'), name: name.trim(), species: species.trim(), points: parsed.points, citation: citation.trim() || 'Dados próprios', origin: 'own' });
  };

  return (
    <div className="overlay" onClick={onCancel}>
      <aside className="panel" role="dialog" aria-modal="true" aria-labelledby="curve-form" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={submit} style={{ display: 'grid', gap: 16 }} noValidate>
          <div className="panel-head">
            <h2 id="curve-form" className="panel-title">Nova curva de referência</h2>
            <button type="button" className="btn btn-icon" aria-label="Fechar" onClick={onCancel}><X size={18} aria-hidden="true" /></button>
          </div>
          {errors.length > 0 && <div className="note" role="alert" style={{ background: 'var(--perigo-claro)', borderColor: '#f1b9b3', color: 'var(--perigo)' }}>{errors.map((x) => <div key={x}>{x}</div>)}</div>}
          <label className="lbl">Nome<input className="input" placeholder="Ex.: Ouriço juvenil — fibra de quitina" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="lbl">Espécie (nome científico)<input className="input" placeholder="Erinaceus europaeus" value={species} onChange={(e) => setSpecies(e.target.value)} /></label>
          <label className="lbl">Fonte<input className="input" placeholder="Ex.: dissertação de mestrado, 2026" value={citation} onChange={(e) => setCitation(e.target.value)} /></label>
          <label className="lbl">Pontos: idade em dias ; peso em gramas (um por linha)
            <textarea className="input" rows={8} style={{ padding: 12, fontFamily: 'var(--mono)' }} placeholder={'0;20\n14;80\n28;160\n42;250'} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <p className="hint" style={{ margin: 0 }}>Pode colar duas colunas copiadas do Excel. Reconhecidos: {parsed.points.length} pontos.</p>
          {parsed.points.length > 1 && <GrowthChart observed={[]} reference={parsed.points} xLabel="Idade (dias)" referenceName="Pré-visualização" />}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onCancel}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar</button>
          </div>
        </form>
      </aside>
    </div>
  );
}
