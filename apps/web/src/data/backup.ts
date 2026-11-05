/**
 * Backup and restore of everything the user created in this browser.
 *
 * Until the app has a server and login, user data lives only in localStorage.
 * A backup is a JSON file with every user-data key, so it can be saved
 * elsewhere and restored on this or another device.
 */

/** User-data keys and what they hold. Reference tables are not included: they ship with the app. */
export const BACKUP_KEYS = {
  'erinacia.animals.v1': 'Animais',
  'erinacia.diets.v1': 'Dietas',
  'erinacia.foods.v1': 'Alimentos próprios',
  'erinacia.curves.v1': 'Curvas de crescimento próprias',
} as const;

export type BackupKey = keyof typeof BACKUP_KEYS;
const KEYS = Object.keys(BACKUP_KEYS) as BackupKey[];

/** When the last backup was exported. Kept outside the backup itself. */
const LAST_EXPORT_KEY = 'erinacia.meta.lastBackup';

export interface BackupFile {
  app: 'erinacia';
  format: 1;
  exportedAt: string;
  data: Partial<Record<BackupKey, unknown[]>>;
}

function readList(key: string): unknown[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Number of records per data type currently stored in this browser. */
export function currentCounts(): Record<BackupKey, number> {
  return Object.fromEntries(KEYS.map((k) => [k, readList(k).length])) as Record<BackupKey, number>;
}

export function buildBackup(now = new Date()): BackupFile {
  return {
    app: 'erinacia',
    format: 1,
    exportedAt: now.toISOString(),
    data: Object.fromEntries(KEYS.map((k) => [k, readList(k)])),
  };
}

/** Builds the backup and makes the browser download it as a file. */
export function downloadBackup(): void {
  const backup = buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `erinacia-copia-${backup.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  try {
    localStorage.setItem(LAST_EXPORT_KEY, backup.exportedAt);
  } catch {
    // Storage unavailable: the date is just not remembered.
  }
}

export function lastExport(): string | undefined {
  try {
    return localStorage.getItem(LAST_EXPORT_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export type ParseResult =
  | { ok: true; backup: BackupFile; counts: Record<BackupKey, number> }
  | { ok: false; error: string };

/** Checks that a file's text is an Erinacia backup before anything is overwritten. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'O ficheiro não é um JSON válido.' };
  }
  const b = raw as Partial<BackupFile> | null;
  if (!b || typeof b !== 'object' || b.app !== 'erinacia' || !b.data || typeof b.data !== 'object') {
    return { ok: false, error: 'Este ficheiro não é uma cópia de segurança do Erinacia.' };
  }
  if (b.format !== 1) {
    return { ok: false, error: `Formato de cópia desconhecido (${String(b.format)}). Atualize a app e tente de novo.` };
  }
  for (const [k, v] of Object.entries(b.data)) {
    if (!(k in BACKUP_KEYS)) return { ok: false, error: `A cópia contém dados desconhecidos ("${k}").` };
    if (!Array.isArray(v)) return { ok: false, error: `Os dados de "${BACKUP_KEYS[k as BackupKey]}" estão corrompidos.` };
  }
  const data = b.data as BackupFile['data'];
  const counts = Object.fromEntries(KEYS.map((k) => [k, data[k]?.length ?? 0])) as Record<BackupKey, number>;
  return { ok: true, backup: b as BackupFile, counts };
}

/**
 * Replaces all user data in this browser with the backup's contents.
 * Types missing from the backup are emptied. The page must reload afterwards,
 * because the in-memory stores were read at start-up.
 */
export function restoreBackup(backup: BackupFile): void {
  for (const k of KEYS) {
    const list = backup.data[k];
    if (list && list.length) localStorage.setItem(k, JSON.stringify(list));
    else localStorage.removeItem(k);
  }
}
