import { Logo } from '../components/Logo';

export function SoonPage({ title }: { title: string }) {
  return (
    <>
      <header className="page-head"><h1 className="page-title">{title}</h1></header>
      <div className="empty">
        <div style={{ color: 'var(--folha)' }}><Logo size={56} mono /></div>
        <p>Esta área está em construção. Para já pode explorar os <a href="/alimentos">Alimentos</a> e a <a href="/biblioteca">Biblioteca científica</a>.</p>
      </div>
    </>
  );
}
