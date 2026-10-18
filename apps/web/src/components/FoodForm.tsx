import { useState } from 'react';
import { X } from 'lucide-react';
import { NUTRIENTS } from '@erinacia/core';
import { newFoodId, type AppFood } from '../data/foods';
import { useEscape } from './FoodDetail';

const MAIN = ['crude_protein', 'ether_extract', 'crude_fibre', 'nfe', 'ash', 'calcium', 'phosphorus'];
const PROXIMATE = ['crude_protein', 'ether_extract', 'nfe'];

type Draft = { name: string; group: string; dryMatter: string; price: string; reference: string; nutrients: Record<string, string> };

function toDraft(f?: AppFood, copy = false): Draft {
  return {
    name: f ? (copy ? `${f.name} (cópia)` : f.name) : '',
    group: f?.group ?? '',
    dryMatter: f ? String(f.dryMatter) : '',
    price: f?.pricePerKg ? String(f.pricePerKg) : '',
    reference: f?.reference ?? '',
    nutrients: Object.fromEntries(Object.entries(f?.nutrients ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])),
  };
}

const parse = (s: string) => {
  const v = Number(s.replace(',', '.'));
  return s.trim() === '' || Number.isNaN(v) ? undefined : v;
};

export function FoodForm({ initial, copyOf, groups, onCancel, onSave }: {
  initial?: AppFood; copyOf?: AppFood; groups: string[]; onCancel: () => void; onSave: (f: AppFood) => void;
}) {
  const base = initial ?? copyOf;
  const [draft, setDraft] = useState<Draft>(() => toDraft(base, !!copyOf));
  const [showAll, setShowAll] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  useEscape(onCancel);

  const set = (k: keyof Omit<Draft, 'nutrients'>) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [k]: e.target.value });
  const setN = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, nutrients: { ...draft.nutrients, [k]: e.target.value } });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problems: string[] = [];
    const dm = parse(draft.dryMatter);
    if (!draft.name.trim()) problems.push('Indique o nome do alimento.');
    if (!draft.group.trim()) problems.push('Indique a categoria.');
    if (dm === undefined || dm <= 0 || dm > 100) problems.push('A matéria seca tem de estar entre 0 e 100 %.');
    const nutrients: Record<string, number> = {};
    for (const [k, s] of Object.entries(draft.nutrients)) {
      const v = parse(s);
      if (s.trim() !== '' && (v === undefined || v < 0)) problems.push(`Valor inválido em ${NUTRIENTS.find((n) => n.key === k)?.label.pt ?? k}.`);
      else if (v !== undefined) nutrients[k] = v;
    }
    setErrors(problems);
    if (problems.length || dm === undefined) return;

    // Keep the source's species ME values only while protein, fat and NFE are unchanged.
    const proximateUnchanged = !!base && PROXIMATE.every((k) => base.nutrients[k] === nutrients[k]);
    onSave({
      id: initial?.id ?? newFoodId(),
      origin: 'own',
      name: draft.name.trim(),
      group: draft.group.trim(),
      dryMatter: dm,
      nutrients: { ...nutrients, moisture: 100 - dm },
      energy: proximateUnchanged ? { ...base!.energy } : {},
      sources: [{ source: 'Meus alimentos' }],
      reference: draft.reference.trim() || (copyOf ? `Baseado em: ${copyOf.name} (${copyOf.sources[0]?.source ?? ''})` : undefined),
      pricePerKg: parse(draft.price),
      createdAt: initial?.createdAt,
    });
  };

  const list = NUTRIENTS.filter((n) => n.key !== 'moisture' && n.key !== 'dry_matter' && (showAll || MAIN.includes(n.key)));

  return (
    <div className="overlay" onClick={onCancel}>
      <aside className="panel" role="dialog" aria-modal="true" aria-labelledby="form-title" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={submit} style={{ display: 'grid', gap: 18 }} noValidate>
          <div className="panel-head">
            <h2 id="form-title" className="panel-title">{initial ? 'Editar alimento' : copyOf ? 'Duplicar alimento' : 'Novo alimento'}</h2>
            <button type="button" className="btn btn-icon" aria-label="Fechar" onClick={onCancel}><X size={18} aria-hidden="true" /></button>
          </div>

          {errors.length > 0 && (
            <div className="note" role="alert" style={{ background: 'var(--perigo-claro)', borderColor: '#f1b9b3', color: 'var(--perigo)' }}>
              {errors.map((er) => <div key={er}>{er}</div>)}
            </div>
          )}

          <div className="form-grid">
            <label className="lbl full">Nome<input className="input" value={draft.name} onChange={set('name')} required /></label>
            <label className="lbl">Categoria
              <input className="input" list="groups" value={draft.group} onChange={set('group')} required />
              <datalist id="groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
            </label>
            <label className="lbl">Matéria seca (%)<input className="input" inputMode="decimal" value={draft.dryMatter} onChange={set('dryMatter')} required /></label>
            <label className="lbl">Preço (€/kg)<input className="input" inputMode="decimal" value={draft.price} onChange={set('price')} /></label>
            <label className="lbl full">Bibliografia / origem dos dados<input className="input" value={draft.reference} onChange={set('reference')} /></label>
          </div>

          <section style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Nutrientes (matéria natural)</h3>
              <button type="button" className="btn" onClick={() => setShowAll(!showAll)}>{showAll ? 'Só os principais' : 'Todos os nutrientes'}</button>
            </div>
            <p className="hint" style={{ margin: 0 }}>Valores como oferecidos. Deixe em branco o que não foi analisado. A energia é calculada por Atwater quando PB, EE ou ENN mudam.</p>
            <div className="form-grid">
              {list.map((n) => (
                <label key={n.key} className="lbl">{n.label.pt} ({n.unit})
                  <input className="input" inputMode="decimal" value={draft.nutrients[n.key] ?? ''} onChange={setN(n.key)} />
                </label>
              ))}
            </div>
          </section>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onCancel}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar</button>
          </div>
        </form>
      </aside>
    </div>
  );
}
