import { useEffect, useState } from 'react';
import { Copy, Pencil, X } from 'lucide-react';
import { NUTRIENTS, nutrientDM, energyPer100g, type EnergyModel, type NutrientCategory } from '@erinacia/core';
import { fmt, groupColor, sourceOf, type AppFood } from '../data/foods';

const CATEGORY_LABEL: Record<NutrientCategory, string> = {
  proximate: 'Composição centesimal',
  macromineral: 'Macrominerais',
  micromineral: 'Microminerais',
  vitamin: 'Vitaminas',
  amino_acid: 'Aminoácidos',
  fatty_acid: 'Ácidos gordos',
  fibre: 'Fibras',
  carbohydrate: 'Hidratos de carbono',
  other: 'Outros',
};

const ENERGY_LABEL: Record<EnergyModel, string> = {
  atwater: 'Atwater (4/9/4)',
  carnivore: 'Carnívoro',
  ruminant: 'Ruminante',
  herbivore_monogastric: 'Herbívoro monogástrico',
  primate: 'Primata',
  primate_fermenter: 'Primata com fermentação',
};

export function FoodDetail({ food, onClose, onEdit }: { food: AppFood; onClose: () => void; onEdit: () => void }) {
  const [basis, setBasis] = useState<'asFed' | 'DM'>('asFed');
  useEscape(onClose);
  const c = groupColor(food.group);

  const rows = NUTRIENTS.filter((n) => food.nutrients[n.key] !== undefined && n.key !== 'moisture');
  const byCategory = new Map<NutrientCategory, typeof rows>();
  rows.forEach((n) => byCategory.set(n.category, [...(byCategory.get(n.category) ?? []), n]));

  return (
    <div className="overlay" onClick={onClose}>
      <aside className="panel" role="dialog" aria-modal="true" aria-labelledby="food-title" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2 id="food-title" className="panel-title">{food.name}</h2>
          <button type="button" className="btn" onClick={onEdit}>
            {food.origin === 'own' ? <><Pencil size={16} aria-hidden="true" /> Editar</> : <><Copy size={16} aria-hidden="true" /> Duplicar</>}
          </button>
          <button type="button" className="btn btn-icon" aria-label="Fechar" onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </div>
        <div className="badges">
          <span className="badge" style={{ background: c.bg, color: c.fg }}>{food.group}</span>
          <span className="badge badge-source">{sourceOf(food)}</span>
          {food.sampleCount ? <span className="badge badge-source">{food.sampleCount} dados de origem</span> : null}
        </div>

        <section>
          <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Energia metabolizável (kcal/100 g MN)</h3>
          <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {(Object.keys(ENERGY_LABEL) as EnergyModel[]).map((m) => (
              <div className="stat" key={m}>
                <div className="stat-label">{ENERGY_LABEL[m]}</div>
                <div className="stat-value">{fmt(energyPer100g(food, m), 0)}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Composição · MS {fmt(food.dryMatter)}%</h3>
            <div className="seg" role="group" aria-label="Base">
              <button type="button" aria-pressed={basis === 'asFed'} onClick={() => setBasis('asFed')}>Matéria natural</button>
              <button type="button" aria-pressed={basis === 'DM'} onClick={() => setBasis('DM')}>Matéria seca</button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nutriente</th><th style={{ textAlign: 'right' }}>Valor</th><th>Unidade</th></tr></thead>
              <tbody>
                {[...byCategory.entries()].map(([cat, list]) => (
                  <Group key={cat} label={CATEGORY_LABEL[cat]}>
                    {list.map((n) => {
                      const v = basis === 'DM' ? nutrientDM(food, n.key) : food.nutrients[n.key];
                      return (
                        <tr key={n.key}>
                          <td>{n.label.pt}</td>
                          <td className="num">{fmt(v, 3)}</td>
                          <td>{n.unit}</td>
                        </tr>
                      );
                    })}
                  </Group>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {food.reference && (
          <section>
            <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>Bibliografia</h3>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--texto-2)', whiteSpace: 'pre-line' }}>{food.reference}</p>
          </section>
        )}
      </aside>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <tr className="group"><td colSpan={3}>{label}</td></tr>
      {children}
    </>
  );
}

export function useEscape(fn: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && fn();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [fn]);
}
