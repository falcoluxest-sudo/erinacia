import { useRef, useState } from 'react';
import { Download, ShieldAlert, Upload } from 'lucide-react';
import {
  BACKUP_KEYS,
  currentCounts,
  downloadBackup,
  lastExport,
  parseBackup,
  restoreBackup,
  type BackupFile,
  type BackupKey,
} from '../data/backup';

const KEYS = Object.keys(BACKUP_KEYS) as BackupKey[];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function CountsTable({ counts, caption }: { counts: Record<BackupKey, number>; caption: string }) {
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead><tr><th>Dados</th><th style={{ textAlign: 'right' }}>Registos</th></tr></thead>
        <tbody>
          {KEYS.map((k) => (
            <tr key={k}><td>{BACKUP_KEYS[k]}</td><td className="num">{counts[k]}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BackupPage() {
  const [counts, setCounts] = useState(currentCounts);
  const [last, setLast] = useState(lastExport);
  const [pending, setPending] = useState<{ name: string; backup: BackupFile; counts: Record<BackupKey, number> }>();
  const [error, setError] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  const total = KEYS.reduce((s, k) => s + counts[k], 0);
  const stale = last === undefined ? total > 0 : daysSince(last) >= 7;

  const onExport = () => {
    downloadBackup();
    setLast(lastExport());
    setCounts(currentCounts());
  };

  const onFile = async (file: File | undefined) => {
    setError(undefined);
    setPending(undefined);
    if (!file) return;
    const r = parseBackup(await file.text());
    if (r.ok) setPending({ name: file.name, backup: r.backup, counts: r.counts });
    else setError(r.error);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onRestore = () => {
    if (!pending) return;
    try {
      restoreBackup(pending.backup);
    } catch {
      setError('Não foi possível gravar os dados neste browser (espaço cheio ou armazenamento bloqueado).');
      return;
    }
    window.location.reload();
  };

  return (
    <>
      <header className="page-head"><h1 className="page-title">Cópia de segurança</h1></header>

      <div className="page-intro" style={{ marginBottom: 16 }}>
        <ShieldAlert size={20} aria-hidden="true" style={{ flex: 'none' }} />
        <span>
          Nesta versão de testes, os seus animais, dietas, alimentos e curvas ficam guardados <strong>só neste browser, neste
          dispositivo</strong>. Limpar os dados do browser apaga-os. Exporte uma cópia com regularidade e guarde o ficheiro
          noutro sítio (ex.: Google Drive, email). As tabelas de referência (INSA, USDA, guias) vêm com a app e não entram na cópia.
        </span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', alignItems: 'start' }}>
        <section className="card" aria-labelledby="exp-title">
          <h2 id="exp-title" style={{ margin: 0, fontSize: 18 }}>Exportar</h2>
          <CountsTable counts={counts} caption="Dados guardados neste browser" />
          <p className="hint" style={{ margin: 0 }}>
            {last ? `Última cópia exportada a ${fmtDate(last)}.` : 'Ainda não exportou nenhuma cópia neste browser.'}
          </p>
          {stale && total > 0 && <p className="note" style={{ margin: 0 }}>Recomendamos exportar uma cópia agora.</p>}
          <div>
            <button type="button" className="btn btn-primary" onClick={onExport}>
              <Download size={18} aria-hidden="true" /> Descarregar cópia
            </button>
          </div>
        </section>

        <section className="card" aria-labelledby="imp-title">
          <h2 id="imp-title" style={{ margin: 0, fontSize: 18 }}>Importar</h2>
          <p style={{ margin: 0, fontSize: 14 }}>
            Repõe uma cópia exportada antes. <strong>Substitui tudo</strong> o que está neste browser pelo conteúdo do ficheiro.
          </p>
          <div>
            <label className="btn">
              <Upload size={18} aria-hidden="true" /> Escolher ficheiro…
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </label>
          </div>
          {error && <p className="error" role="alert" style={{ margin: 0 }}>{error}</p>}
          {pending && (
            <div style={{ display: 'grid', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 14 }}>
                <strong>{pending.name}</strong>, exportado a {fmtDate(pending.backup.exportedAt)}, contém:
              </p>
              <CountsTable counts={pending.counts} caption="Conteúdo do ficheiro" />
              <p className="note" style={{ margin: 0 }}>
                Os dados atuais deste browser serão apagados. Se quiser mantê-los, descarregue primeiro uma cópia ao lado.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" className="btn btn-danger" onClick={onRestore}>Substituir e repor</button>
                <button type="button" className="btn" onClick={() => setPending(undefined)}>Cancelar</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
