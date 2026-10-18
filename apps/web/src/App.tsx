import { Navigate, Route, Routes } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { FoodsPage } from './pages/FoodsPage';
import { LibraryPage } from './pages/LibraryPage';
import { SoonPage } from './pages/SoonPage';
import { FormulasPage } from './pages/FormulasPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { DietPage } from './pages/DietPage';
import { AnimalsPage } from './pages/AnimalsPage';
import { AnimalDetailPage } from './pages/AnimalDetailPage';
import { CurvesPage } from './pages/CurvesPage';

const SOON: [string, string][] = [
  ['/painel', 'Painel'], ['/nutrientes', 'Nutrientes'], ['/stock', 'Stock'],
  ['/importar', 'Importar'],
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
          <Route path="/dietas" element={<DietPage />} />
          <Route path="/animais" element={<AnimalsPage />} />
          <Route path="/animais/:id" element={<AnimalDetailPage />} />
          <Route path="/crescimento" element={<CurvesPage />} />
          {SOON.map(([path, title]) => <Route key={path} path={path} element={<SoonPage title={title} />} />)}
          <Route path="*" element={<Navigate to="/alimentos" replace />} />
        </Routes>
      </main>
    </div>
  );
}
