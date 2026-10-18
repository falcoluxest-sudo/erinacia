import { Navigate, Route, Routes } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { FoodsPage } from './pages/FoodsPage';
import { LibraryPage } from './pages/LibraryPage';
import { SoonPage } from './pages/SoonPage';
import { FormulasPage } from './pages/FormulasPage';
import { GlossaryPage } from './pages/GlossaryPage';

const SOON: [string, string][] = [
  ['/painel', 'Painel'], ['/dietas', 'Dietas'], ['/nutrientes', 'Nutrientes'], ['/stock', 'Stock'],
  ['/importar', 'Importar'], ['/animais', 'Animais'], ['/crescimento', 'Crescimento'],
];

export function App() {
  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/alimentos" replace />} />
          <Route path="/alimentos" element={<FoodsPage />} />
          <Route path="/biblioteca" element={<LibraryPage />} />
          <Route path="/formulas" element={<FormulasPage />} />
          <Route path="/glossario" element={<GlossaryPage />} />
          {SOON.map(([path, title]) => <Route key={path} path={path} element={<SoonPage title={title} />} />)}
          <Route path="*" element={<Navigate to="/alimentos" replace />} />
        </Routes>
      </main>
    </div>
  );
}
