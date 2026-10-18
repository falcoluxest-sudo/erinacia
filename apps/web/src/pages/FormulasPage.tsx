import { useMemo, useState } from 'react';
import { Bird, CircleCheck, CircleHelp, Fish, PawPrint, Search, Turtle } from 'lucide-react';
import { evaluate, FORMULAS, num, STATUS_LABEL, TAXON_LABEL, TYPE_LABEL, type FormulaRef, type Status, type Taxon } from '../data/formulas';

const TAXON_ICON: Record<Taxon, typeof Fish> = { mammal: PawPrint, bird: Bird, reptile: Turtle, aquatic: Fish };
const TAXON_COLOR: Record<Taxon, string> = { mammal: '#6b3fa0', bird: '#2f6b49', reptile: '#7a5a14', aquatic: '#1e5f9e' };
const ORDER: Taxon[] = ['mammal', 'bird', 'reptile', 'aquatic'];

const STATUS_STYLE: Record<Status, { bg: string; fg: string }> = {
  verified: { bg: '#dcefdc', fg: '#1f5b33' },
  to_verify: { bg: '#fff3c4', fg: '#5c4410' },
  author: { bg: '#e3e7f6', fg: '#2c3a73' },
  guide: { bg: '#dcebf2', fg: '#1e5368' },
};

export function FormulasPage() {
  const [weight, setWeight] = useState('2');
  const [unit, setUnit] = useState<'kg' | 'g'>('kg');
  const [query, setQuery] = useState('');
  const [taxon, setTaxon] = useState<Taxon | ''>('');
  const [onlyVerified, setOnlyVerified] = useState(false);

  const w = Number(weight.replace(',', '.'));
  const weightKg = Number.isFinite(w) && w > 0 ? (unit === 'g' ? w / 1000 : w) : undefined;

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('pt');
    return FORMULAS.filter((f) => !q || `${f.name} ${f.description ?? ''} ${f.citation}`.toLocaleLowerCase('pt').includes(q))
      .filter((f) => !taxon || f.taxon === taxon)
      .filter((f) => !onlyVerified || f.status !== 'to_verify');
  }, [query, taxon, onlyVerified]);

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Fórmulas metabólicas</h1>
      </header>
      <p className="result-count" style={{ marginTop: -8 }}>Equações alométricas (coeficiente × PV^expoente) por grupo taxonómico, com a fonte de cada uma.</p>

      <section className="card" style={{ marginBottom: 16 }} aria-labelledby="calc-title">
        <h2 id="calc-title" style={{ margin: 0, fontSize: 17 }}>Calcular para um animal</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <label className="lbl" style={{ width: 160 }}>Peso vivo
            <input className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} aria-invalid={weightKg === undefined} />
          </label>
          <div className="seg" role="group" aria-label="Unidade de peso">
            <button type="button" aria-pressed={unit === 'kg'} onClick={() => setUnit('kg')}>kg</button>
            <button type="button" aria-pressed={unit === 'g'} onClick={() => setUnit('g')}>g</button>
          </div>
          <span className="hint">{weightKg === undefined ? 'Indique um peso maior que zero.' : `Cada cartão mostra o resultado para ${num(weightKg, 3)} kg.`}</span>
        </div>
      </section>

      <div className="toolbar" style={{ gridTemplateColumns: 'minmax(0, 1fr) 220px auto' }}>
        <label className="field">
          <Search size={18} aria-hidden="true" />
          <input className="input" type="search" aria-label="Pesquisar fórmulas" placeholder="Pesquisar por grupo, espécie ou autor…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <select className="select" aria-label="Grupo" value={taxon} onChange={(e) => setTaxon(e.target.value as Taxon | '')}>
          <option value="">Todos os grupos</option>
          {ORDER.map((t) => <option key={t} value={t}>{TAXON_LABEL[t]}</option>)}
        </select>
        <label className="btn" style={{ fontWeight: 500 }}>
          <input type="checkbox" checked={onlyVerified} onChange={(e) => setOnlyVerified(e.target.checked)} /> Esconder "a verificar"
        </label>
      </div>

      {ORDER.map((t) => {
        const list = visible.filter((f) => f.taxon === t);
        if (!list.length) return null;
        const Icon = TAXON_ICON[t];
        return (
          <section key={t} style={{ marginBottom: 28 }} aria-labelledby={`sec-${t}`}>
            <h2 id={`sec-${t}`} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--display)', fontSize: 24, margin: '8px 0 14px' }}>
              <Icon size={22} aria-hidden="true" style={{ color: TAXON_COLOR[t] }} /> {TAXON_LABEL[t]}
              <span className="hint" style={{ fontFamily: 'var(--sans)', fontWeight: 400 }}>{list.length}</span>
            </h2>
            <div className="grid">
              {list.map((f) => <FormulaCard key={f.id} f={f} weightKg={weightKg} />)}
            </div>
          </section>
        );
      })}
      {visible.length === 0 && <div className="empty">Nenhuma fórmula encontrada.</div>}

      <HowTo />
    </>
  );
}

function FormulaCard({ f, weightKg }: { f: FormulaRef; weightKg?: number }) {
  const Icon = TAXON_ICON[f.taxon];
  const s = STATUS_STYLE[f.status];
  const coef = f.coefficientRange ? `${num(f.coefficientRange[0])}–${num(f.coefficientRange[1])}` : num(f.coefficient);
  const r = weightKg ? evaluate(f, weightKg) : undefined;
  return (
    <article className="card">
      <div className="card-head">
        <h3 className="card-title" style={{ cursor: 'default' }}>{f.name}</h3>
        <Icon size={20} aria-hidden="true" style={{ color: TAXON_COLOR[f.taxon], flex: 'none' }} />
      </div>
      <div className="badges">
        <span className="badge" style={{ background: s.bg, color: s.fg }}>
          {f.status === 'to_verify' ? <CircleHelp size={12} aria-hidden="true" /> : <CircleCheck size={12} aria-hidden="true" />}
          {STATUS_LABEL[f.status]}
        </span>
        <span className="badge badge-source" title={TYPE_LABEL[f.type]}>{f.type}</span>
      </div>
      {f.description && <p className="hint" style={{ margin: 0 }}>{f.description}</p>}
      <div style={{ background: 'var(--nevoa)', borderRadius: 10, padding: '12px 14px', fontFamily: 'var(--mono)', fontSize: 15 }}>
        {f.type} = {coef} × PV<sub>{f.weightUnit}</sub><sup>{num(f.exponent, 3)}</sup> <span style={{ color: 'var(--texto-2)' }}>{f.energyUnit}/dia</span>
      </div>
      {r && (
        <div className="rows">
          <div className="row">
            <span>Resultado</span>
            <strong style={{ fontFamily: 'var(--mono)' }}>
              {f.coefficientRange ? `${num(r.low, 0)}–${num(r.high, 0)} (média ${num(r.mid, 0)})` : num(r.mid, 1)} kcal/dia
            </strong>
          </div>
          {f.type === 'TMB' && (
            <div className="row"><span>Manutenção estimada (× 1,5–2,0)</span><strong style={{ fontFamily: 'var(--mono)' }}>{num(r.mid * 1.5, 0)}–{num(r.mid * 2, 0)} kcal</strong></div>
          )}
        </div>
      )}
      {f.note && <div className="note">{f.note}</div>}
      <div className="biblio" title={f.citation}><strong>Fonte:</strong> {f.citation || '—'}</div>
    </article>
  );
}

function HowTo() {
  return (
    <section className="page-intro" style={{ display: 'block', marginTop: 8 }} aria-labelledby="howto">
      <h2 id="howto" style={{ margin: '0 0 8px', fontSize: 18 }}>Como usar</h2>
      <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
        <li><strong>PV</strong>: peso vivo, na unidade indicada em cada fórmula (a calculadora converte automaticamente).</li>
        <li><strong>TMB</strong> (taxa metabólica basal): gasto em repouso, em jejum e em termoneutralidade. Não é a necessidade diária: para manutenção em cativeiro multiplica-se habitualmente por 1,5–2,0, consoante a atividade.</li>
        <li><strong>NEM</strong> (necessidade energética de manutenção): já inclui a atividade normal; usa-se diretamente na formulação.</li>
        <li><strong>TMC</strong> (taxa metabólica de campo): gasto de um animal em vida livre; serve de teto, não de alvo, em cativeiro.</li>
        <li>Fórmulas com faixa (mín–máx) mostram o intervalo e a média; na formulação usa-se a média, salvo indicação sua.</li>
        <li>Em <strong>ectotérmicos</strong> (répteis, peixes, invertebrados) o resultado depende muito da temperatura; registe a temperatura de referência.</li>
        <li>As fórmulas <strong>"a verificar"</strong> ainda não têm a fonte primária confirmada e não devem ser usadas sem revisão.</li>
      </ul>
    </section>
  );
}
