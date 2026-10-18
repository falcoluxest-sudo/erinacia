import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { overallDailyGain } from '@erinacia/core';
import { AnimalForm } from '../components/AnimalForm';
import { ageDays, formatAge, formatWeight, REARING_LABEL, SEX_LABEL, sortedWeighings, STAGE_LABEL, useAnimals, type Stage } from '../data/animals';
import { fmt } from '../data/foods';

const STAGE_COLOR: Record<Stage, { bg: string; fg: string }> = {
  neonate: { bg: '#fde2e1', fg: '#9b1c1c' },
  juvenile: { bg: '#fff3c4', fg: '#5c4410' },
  subadult: { bg: '#dcebf2', fg: '#1e5368' },
  adult: { bg: '#dcefdc', fg: '#1f5b33' },
};

export function AnimalsPage() {
  const { animals, upsert } = useAnimals();
  const [q, setQ] = useState('');
  const [stage, setStage] = useState<'' | 'young' | Stage>('');
  const [creating, setCreating] = useState(false);
  const nav = useNavigate();

  const visible = useMemo(() => {
    const s = q.trim().toLocaleLowerCase('pt');
    return animals
      .filter((a) => !s || `${a.name} ${a.species} ${a.scientificName ?? ''} ${a.site ?? ''}`.toLocaleLowerCase('pt').includes(s))
      .filter((a) => !stage || (stage === 'young' ? a.stage !== 'adult' : a.stage === stage))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  }, [animals, q, stage]);

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Animais</h1>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={18} aria-hidden="true" /> Novo animal</button>
      </header>
      <div className="toolbar" style={{ gridTemplateColumns: 'minmax(0, 1fr) 240px' }}>
        <label className="field">
          <Search size={18} aria-hidden="true" />
          <input className="input" type="search" aria-label="Pesquisar animais" placeholder="Pesquisar por identificação, espécie ou recinto…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="select" aria-label="Fase" value={stage} onChange={(e) => setStage(e.target.value as typeof stage)}>
          <option value="">Todas as fases</option>
          <option value="young">Juvenis e crias (não adultos)</option>
          {(Object.keys(STAGE_LABEL) as Stage[]).map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
        </select>
      </div>
      <p className="result-count">A mostrar <strong>{visible.length}</strong> de {animals.length} animais</p>

      {animals.length === 0 ? (
        <div className="empty">
          <p>Ainda não há animais. Registe o primeiro para começar a acompanhar pesagens e crescimento.</p>
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={18} aria-hidden="true" /> Novo animal</button>
        </div>
      ) : (
        <div className="grid">
          {visible.map((a) => {
            const w = sortedWeighings(a);
            const last = w[w.length - 1];
            const adg = overallDailyGain(w.map((x) => ({ date: x.date, grams: x.grams })));
            const c = STAGE_COLOR[a.stage];
            return (
              <article className="card" key={a.id}>
                <div className="card-head">
                  <Link to={`/animais/${a.id}`} className="card-title" style={{ color: 'inherit', textDecoration: 'none' }}>{a.name}</Link>
                </div>
                <div className="guide-meta">{a.species}{a.scientificName && <> · <em>{a.scientificName}</em></>}</div>
                <div className="badges">
                  <span className="badge" style={{ background: c.bg, color: c.fg }}>{STAGE_LABEL[a.stage]}</span>
                  <span className="badge badge-source">{SEX_LABEL[a.sex]}</span>
                  <span className="badge badge-source">{REARING_LABEL[a.rearing]}</span>
                </div>
                <div className="stats">
                  <div className="stat"><div className="stat-label">Idade</div><div className="stat-value" style={{ fontSize: 14 }}>{formatAge(ageDays(a))}</div></div>
                  <div className="stat"><div className="stat-label">Último peso</div><div className="stat-value" style={{ fontSize: 14 }}>{formatWeight(last?.grams)}</div></div>
                  <div className="stat"><div className="stat-label">GMD</div><div className="stat-value" style={{ fontSize: 14 }}>{adg === undefined ? '—' : `${fmt(adg, 1)} g/d`}</div></div>
                </div>
                <div className="rows">
                  <div className="row"><span>Pesagens</span><strong>{w.length}{last ? ` · última ${new Date(last.date).toLocaleDateString('pt-PT')}` : ''}</strong></div>
                  {a.site && <div className="row"><span>Recinto</span><strong>{a.site}</strong></div>}
                </div>
                <Link to={`/animais/${a.id}`} className="btn">Abrir ficha</Link>
              </article>
            );
          })}
        </div>
      )}
      {creating && <AnimalForm onCancel={() => setCreating(false)} onSave={(a) => { upsert(a); setCreating(false); nav(`/animais/${a.id}`); }} />}
    </>
  );
}
