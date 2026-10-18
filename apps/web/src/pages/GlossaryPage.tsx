import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

interface Term { term: string; def: string }

const SECTIONS: { title: string; terms: Term[] }[] = [
  {
    title: 'Bases de expressão',
    terms: [
      { term: 'MN — matéria natural', def: 'O alimento tal como é oferecido, com a sua água. As tabelas de composição e as quantidades da ficha alimentar estão em MN.' },
      { term: 'MS — matéria seca', def: 'O que resta depois de retirar a água. As exigências nutricionais comparam-se em MS, porque a humidade dos alimentos varia muito.' },
      { term: 'Conversão MN → MS', def: 'Valor em MS = valor em MN × 100 ÷ % de MS do alimento.' },
      { term: 'PV — peso vivo', def: 'Peso do animal. Nas fórmulas alométricas eleva-se a um expoente (p. ex. PV^0,75, o "peso metabólico").' },
    ],
  },
  {
    title: 'Energia',
    terms: [
      { term: 'EB — energia bruta', def: 'Energia total libertada pela combustão completa do alimento, sem considerar o que o animal consegue aproveitar.' },
      { term: 'ED — energia digestível', def: 'EB menos a energia perdida nas fezes.' },
      { term: 'EM — energia metabolizável', def: 'ED menos as perdas na urina e nos gases. É a base habitual para formular dietas de animais selvagens.' },
      { term: 'EMAn (AMEn)', def: 'Energia metabolizável aparente corrigida para o balanço de azoto; sistema usado em aves. Pode vir em MJ/kg ou kcal/kg (1 MJ = 239 kcal).' },
      { term: 'EL — energia líquida', def: 'EM menos o incremento calórico; usada sobretudo em ruminantes e suínos de produção.' },
      { term: 'Fatores de Atwater', def: 'Estimativa da EM: 4 kcal/g de proteína, 9 kcal/g de gordura e 4 kcal/g de hidratos de carbono (gerais), ou 3,5 / 8,5 / 3,5 (modificados, para rações).' },
      { term: 'TMB — taxa metabólica basal', def: 'Gasto energético em repouso, em jejum e em termoneutralidade.' },
      { term: 'TMR / RMR — taxa metabólica de repouso', def: 'Gasto em repouso sem as condições estritas da TMB (p. ex. não em jejum).' },
      { term: 'NEM — necessidade energética de manutenção', def: 'Energia para manter o peso com atividade normal; em cativeiro, tipicamente 1,5–2 × TMB.' },
      { term: 'TMC / FMR — taxa metabólica de campo', def: 'Gasto diário de um animal em vida livre, incluindo procura de alimento e termorregulação.' },
      { term: 'Sistemas para ruminantes (NDT, UFL, VEM…)', def: 'Unidades de energia de sistemas nacionais de produção animal (NRC, INRA, CVB). Convertem-se com cuidado para EM.' },
    ],
  },
  {
    title: 'Fibras',
    terms: [
      { term: 'FB — fibra bruta', def: 'Método antigo (Weende); subestima a fibra porque parte da hemicelulose e da lenhina se dissolve na análise.' },
      { term: 'FDN — fibra em detergente neutro', def: 'Parede celular total: celulose, hemicelulose e lenhina. Relaciona-se com o volume e a ingestão.' },
      { term: 'FDA — fibra em detergente ácido', def: 'Celulose e lenhina. Quanto maior, menor a digestibilidade da forragem.' },
      { term: 'Lenhina', def: 'Fração indigestível da parede celular; limita o aproveitamento das fibras.' },
      { term: 'Fibra de origem animal', def: 'Pelo, penas, quitina dos insetos e tecido conjuntivo: funcionam como fibra para carnívoros e insetívoros, embora não sejam fibra vegetal.' },
    ],
  },
  {
    title: 'Proteína e aminoácidos',
    terms: [
      { term: 'PB — proteína bruta', def: 'Azoto total × 6,25. Em insetos sobrestima a proteína disponível, porque inclui o azoto da quitina.' },
      { term: 'Aminoácidos essenciais', def: 'Os que o animal não sintetiza e tem de receber na dieta. Os felinos precisam ainda de taurina e de arginina em quantidade elevada.' },
      { term: 'Digestibilidade ileal padronizada', def: 'Fração do aminoácido absorvida até ao fim do intestino delgado, corrigida para as perdas endógenas; disponível sobretudo para suínos e aves.' },
    ],
  },
  {
    title: 'Gordura e ácidos gordos',
    terms: [
      { term: 'EE — extrato etéreo', def: 'Gordura bruta extraída com éter.' },
      { term: 'Notação Cx:y', def: 'x = número de carbonos, y = número de duplas ligações. C16:0 palmítico, C18:1 oleico, C18:2 linoleico, C18:3 linolénico, C20:4 araquidónico.' },
      { term: 'Ómega-3 e ómega-6', def: 'Famílias de ácidos gordos polinsaturados essenciais. Os felinos precisam de ácido araquidónico pré-formado.' },
    ],
  },
  {
    title: 'Minerais e vitaminas',
    terms: [
      { term: 'MM — matéria mineral (cinzas)', def: 'Resíduo após incineração: estima os minerais totais.' },
      { term: 'Relação Ca:P', def: 'Proporção entre cálcio e fósforo. Em geral 1:1 a 2:1; insetos e carne sem osso têm relação invertida e precisam de correção.' },
      { term: 'ppm', def: 'Partes por milhão; equivale a mg/kg.' },
      { term: 'UI — unidade internacional', def: 'Unidade de atividade das vitaminas A, D e E. 1 UI/g = 1000 UI/kg.' },
      { term: 'Tiaminase', def: 'Enzima de alguns peixes crus que destrói a tiamina; obriga a suplementar vitamina B1.' },
      { term: 'Oxalato', def: 'Composto de algumas verduras que se liga ao cálcio e reduz a sua absorção.' },
    ],
  },
];

export function GlossaryPage() {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLocaleLowerCase('pt');
    return SECTIONS.map((sec) => ({ ...sec, terms: sec.terms.filter((t) => !s || `${t.term} ${t.def}`.toLocaleLowerCase('pt').includes(s)) })).filter((sec) => sec.terms.length);
  }, [q]);

  return (
    <>
      <header className="page-head"><h1 className="page-title">Glossário</h1></header>
      <p className="result-count" style={{ marginTop: -8 }}>Os conceitos usados na formulação de dietas, em linguagem simples.</p>
      <label className="field" style={{ display: 'block', maxWidth: 520, marginBottom: 20 }}>
        <Search size={18} aria-hidden="true" />
        <input className="input" type="search" aria-label="Pesquisar no glossário" placeholder="Pesquisar um termo…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div style={{ display: 'grid', gap: 16 }}>
        {filtered.map((sec) => (
          <section key={sec.title} className="card" aria-labelledby={`g-${sec.title}`}>
            <h2 id={`g-${sec.title}`} style={{ margin: 0, fontSize: 18, color: 'var(--folha)' }}>{sec.title}</h2>
            <dl style={{ margin: 0, display: 'grid', gap: 10 }}>
              {sec.terms.map((t) => (
                <div key={t.term}>
                  <dt style={{ fontWeight: 600 }}>{t.term}</dt>
                  <dd style={{ margin: '2px 0 0', color: 'var(--texto-2)' }}>{t.def}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        {filtered.length === 0 && <div className="empty">Nenhum termo encontrado.</div>}
      </div>
    </>
  );
}
