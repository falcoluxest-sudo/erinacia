import { useEffect, useMemo, useState } from 'react';
import { Copy, Info, Lock, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { fmt, groupColor, headline, nutrientCount, matchesQuery, SOURCE_ATTRIBUTION, sourceOf, useFoods, type AppFood } from '../data/foods';
import { FoodDetail } from '../components/FoodDetail';
import { FoodForm } from '../components/FoodForm';

const PAGE = 60;

type Panel = { kind: 'detail'; food: AppFood } | { kind: 'form'; food?: AppFood; copyOf?: AppFood } | null;

export function FoodsPage() {
  const { foods, upsert, remove } = useFoods();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [source, setSource] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  const [limit, setLimit] = useState(PAGE);

  const groups = useMemo(() => [...new Set(foods.map((f) => f.group))].sort((a, b) => a.localeCompare(b, 'pt')), [foods]);
  const sources = useMemo(() => {
    const counts = new Map<string, number>();
    foods.forEach((f) => counts.set(sourceOf(f), (counts.get(sourceOf(f)) ?? 0) + 1));
    return [...counts.entries()];
  }, [foods]);

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('pt');
    return foods
      .filter((f) => !q || matchesQuery(f.name, q))
      .filter((f) => !group || f.group === group)
      .filter((f) => !source || sourceOf(f) === source)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  }, [foods, query, group, source]);
  useEffect(() => setLimit(PAGE), [query, group, source]);
  const attributions = [...new Set(visible.slice(0, limit).map(sourceOf))].map((s) => SOURCE_ATTRIBUTION[s]).filter(Boolean);

  const confirmRemove = (f: AppFood) => {
    if (window.confirm(`Apagar "${f.name}"? Esta ação não pode ser desfeita.`)) remove(f.id);
  };

  return (
    <>
      <div className="page-intro" role="note">
        <Info size={18} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
        <span>
          Os alimentos do <strong>Banco Erinacia</strong> e da tabela portuguesa do <strong>INSA</strong> são a base de referência e não se
          editam: use <em>Duplicar</em> para criar uma versão sua. Os seus alimentos podem ser editados e apagados.
        </span>
      </div>

      <header className="page-head">
        <h1 className="page-title">Alimentos</h1>
        <button type="button" className="btn btn-primary" onClick={() => setPanel({ kind: 'form' })}>
          <Plus size={18} aria-hidden="true" /> Novo alimento
        </button>
      </header>

      <div className="toolbar">
        <label className="field">
          <span className="sr-only" style={{ position: 'absolute', left: -9999 }}>Pesquisar alimentos</span>
          <Search size={18} aria-hidden="true" />
          <input className="input" type="search" placeholder="Pesquisar alimentos…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <select className="select" aria-label="Categoria" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">Todas as categorias</option>
          {groups.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select className="select" aria-label="Fonte" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">Todas as fontes ({foods.length})</option>
          {sources.map(([s, n]) => (
            <option key={s} value={s}>{s} ({n})</option>
          ))}
        </select>
      </div>

      <p className="result-count" aria-live="polite">
        A mostrar <strong>{visible.length}</strong> alimento{visible.length === 1 ? '' : 's'}
        {source && <> da fonte <strong>{source}</strong></>}
        {group && <> na categoria <strong>{group}</strong></>}
      </p>

      {visible.length === 0 ? (
        <div className="empty">
          <p>Nenhum alimento encontrado.</p>
          <button type="button" className="btn" onClick={() => { setQuery(''); setGroup(''); setSource(''); }}>Limpar filtros</button>
        </div>
      ) : (
        <>
        <div className="grid">
          {visible.slice(0, limit).map((f) => (
            <FoodCard
              key={f.id}
              food={f}
              onOpen={() => setPanel({ kind: 'detail', food: f })}
              onEdit={() => setPanel({ kind: 'form', food: f })}
              onCopy={() => setPanel({ kind: 'form', copyOf: f })}
              onRemove={() => confirmRemove(f)}
            />
          ))}
        </div>
        {visible.length > limit && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
            <button type="button" className="btn" onClick={() => setLimit((l) => l + PAGE * 2)}>
              Mostrar mais ({visible.length - limit} restantes)
            </button>
          </div>
        )}
        {attributions.map((a) => <p key={a} className="hint" style={{ marginTop: 16 }}>{a}</p>)}
        </>
      )}

      {panel?.kind === 'detail' && (
        <FoodDetail
          food={panel.food}
          onClose={() => setPanel(null)}
          onEdit={() => setPanel(panel.food.origin === 'own' ? { kind: 'form', food: panel.food } : { kind: 'form', copyOf: panel.food })}
        />
      )}
      {panel?.kind === 'form' && (
        <FoodForm
          initial={panel.food}
          copyOf={panel.copyOf}
          groups={groups}
          onCancel={() => setPanel(null)}
          onSave={(f) => { upsert(f); setPanel({ kind: 'detail', food: f }); }}
        />
      )}
    </>
  );
}

function FoodCard({ food, onOpen, onEdit, onCopy, onRemove }: {
  food: AppFood; onOpen: () => void; onEdit: () => void; onCopy: () => void; onRemove: () => void;
}) {
  const c = groupColor(food.group);
  const h = headline(food);
  const own = food.origin === 'own';
  return (
    <article className="card">
      <div className="card-head">
        <button type="button" className="card-title" onClick={onOpen}>{food.name}</button>
        <div className="card-actions">
          {own ? (
            <>
              <button type="button" className="btn btn-icon" aria-label={`Editar ${food.name}`} title="Editar" onClick={onEdit}>
                <Pencil size={16} aria-hidden="true" />
              </button>
              <button type="button" className="btn btn-icon btn-danger" aria-label={`Apagar ${food.name}`} title="Apagar" onClick={onRemove}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-icon" aria-label={`Duplicar ${food.name}`} title="Duplicar para editar" onClick={onCopy}>
              <Copy size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <div className="badges">
        <span className="badge" style={{ background: c.bg, color: c.fg }}>{food.group}</span>
        <span className="badge badge-source">
          {!own && <Lock size={11} aria-hidden="true" />}
          {sourceOf(food)}
        </span>
      </div>
      <div className="stats">
        <div className="stat"><div className="stat-label">MS</div><div className="stat-value">{fmt(h.dm)}%</div></div>
        <div className="stat"><div className="stat-label">PB (MS)</div><div className="stat-value">{fmt(h.proteinDM)}%</div></div>
        <div className="stat"><div className="stat-label">EM/100 g</div><div className="stat-value">{fmt(h.energy, 0)}</div></div>
      </div>
      <div className="rows">
        <div className="row"><span>Preço</span><strong>{food.pricePerKg ? `${fmt(food.pricePerKg, 2)} €/kg` : '— €/kg'}</strong></div>
        <div className="row"><span>Nutrientes</span><strong>{nutrientCount(food)} registados</strong></div>
      </div>
      {food.reference && <div className="biblio"><strong>Bibliografia:</strong> {food.reference}</div>}
    </article>
  );
}
