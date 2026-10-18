import { useState } from 'react';
import { X } from 'lucide-react';
import { REARING_LABEL, SEX_LABEL, STAGE_LABEL, today, uid, type Animal, type Rearing, type Sex, type Stage } from '../data/animals';
import { useEscape } from './FoodDetail';

export function AnimalForm({ initial, onCancel, onSave }: { initial?: Animal; onCancel: () => void; onSave: (a: Animal) => void }) {
  const [a, setA] = useState<Animal>(initial ?? {
    id: uid('animal'), name: '', species: '', sex: 'unknown', rearing: 'rehab', stage: 'juvenile',
    admissionDate: today(), weighings: [],
  });
  const [firstWeight, setFirstWeight] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  useEscape(onCancel);
  const set = (patch: Partial<Animal>) => setA((x) => ({ ...x, ...patch }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p: string[] = [];
    if (!a.name.trim()) p.push('Indique a identificação do animal.');
    if (!a.species.trim()) p.push('Indique a espécie.');
    if (a.birthDate && a.birthDate > today()) p.push('A data de nascimento não pode ser futura.');
    const w = Number(firstWeight.replace(',', '.'));
    if (firstWeight.trim() && (!Number.isFinite(w) || w <= 0)) p.push('O peso de entrada tem de ser maior que zero.');
    setErrors(p);
    if (p.length) return;
    const weighings = firstWeight.trim()
      ? [...a.weighings, { id: uid('w'), date: a.admissionDate ?? today(), grams: w, note: 'Peso de entrada' }]
      : a.weighings;
    onSave({ ...a, name: a.name.trim(), species: a.species.trim(), weighings });
  };

  return (
    <div className="overlay" onClick={onCancel}>
      <aside className="panel" role="dialog" aria-modal="true" aria-labelledby="animal-form" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={submit} style={{ display: 'grid', gap: 18 }} noValidate>
          <div className="panel-head">
            <h2 id="animal-form" className="panel-title">{initial ? 'Editar animal' : 'Novo animal'}</h2>
            <button type="button" className="btn btn-icon" aria-label="Fechar" onClick={onCancel}><X size={18} aria-hidden="true" /></button>
          </div>
          {errors.length > 0 && (
            <div className="note" role="alert" style={{ background: 'var(--perigo-claro)', borderColor: '#f1b9b3', color: 'var(--perigo)' }}>
              {errors.map((er) => <div key={er}>{er}</div>)}
            </div>
          )}
          <div className="form-grid">
            <label className="lbl">Identificação / nome<input className="input" placeholder="Ex.: OUR-2026-014 ou Ouri" value={a.name} onChange={(e) => set({ name: e.target.value })} /></label>
            <label className="lbl">Espécie (nome comum)<input className="input" placeholder="Ex.: Ouriço-cacheiro" value={a.species} onChange={(e) => set({ species: e.target.value })} /></label>
            <label className="lbl full">Nome científico<input className="input" placeholder="Ex.: Erinaceus europaeus" value={a.scientificName ?? ''} onChange={(e) => set({ scientificName: e.target.value || undefined })} /></label>
            <label className="lbl">Sexo
              <select className="select" value={a.sex} onChange={(e) => set({ sex: e.target.value as Sex })}>
                {(Object.keys(SEX_LABEL) as Sex[]).map((s) => <option key={s} value={s}>{SEX_LABEL[s]}</option>)}
              </select>
            </label>
            <label className="lbl">Fase
              <select className="select" value={a.stage} onChange={(e) => set({ stage: e.target.value as Stage })}>
                {(Object.keys(STAGE_LABEL) as Stage[]).map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
              </select>
            </label>
            <label className="lbl">Origem / criação
              <select className="select" value={a.rearing} onChange={(e) => set({ rearing: e.target.value as Rearing })}>
                {(Object.keys(REARING_LABEL) as Rearing[]).map((s) => <option key={s} value={s}>{REARING_LABEL[s]}</option>)}
              </select>
            </label>
            <label className="lbl">Recinto / sala<input className="input" value={a.site ?? ''} onChange={(e) => set({ site: e.target.value || undefined })} /></label>
            <label className="lbl">Data de nascimento<input className="input" type="date" max={today()} value={a.birthDate ?? ''} onChange={(e) => set({ birthDate: e.target.value || undefined })} /></label>
            <label className="lbl" style={{ alignSelf: 'end', display: 'flex', gap: 8, alignItems: 'center', minHeight: 44 }}>
              <input type="checkbox" checked={!!a.birthEstimated} onChange={(e) => set({ birthEstimated: e.target.checked })} /> Data estimada
            </label>
            <label className="lbl">Data de entrada<input className="input" type="date" max={today()} value={a.admissionDate ?? ''} onChange={(e) => set({ admissionDate: e.target.value || undefined })} /></label>
            {!initial && <label className="lbl">Peso de entrada (g)<input className="input" inputMode="decimal" value={firstWeight} onChange={(e) => setFirstWeight(e.target.value)} /></label>}
            <label className="lbl full">Notas<input className="input" value={a.notes ?? ''} onChange={(e) => set({ notes: e.target.value || undefined })} /></label>
          </div>
          <p className="hint" style={{ margin: 0 }}>Sem data de nascimento, o gráfico usa os dias desde a primeira pesagem e não compara com curvas de referência. Em juvenis de reabilitação, uma data estimada (p. ex. pelo peso à entrada) é suficiente.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onCancel}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar</button>
          </div>
        </form>
      </aside>
    </div>
  );
}
