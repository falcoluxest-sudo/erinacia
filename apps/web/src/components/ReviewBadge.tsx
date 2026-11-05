import { CircleCheck, CircleHelp, TriangleAlert } from 'lucide-react';
import type { Review, ValueOrigin } from '@erinacia/core';

const REVIEW = {
  pending: { label: 'Por rever', title: 'Transcrição ainda não conferida com a fonte pelo fundador.', bg: '#fff3c4', fg: '#5c4410', Icon: CircleHelp },
  reviewed: { label: 'Revisto', title: 'Conferido com a fonte pelo fundador.', bg: '#dcefdc', fg: '#1f5b33', Icon: CircleCheck },
  reservations: { label: 'Revisto com reservas', title: 'Conferido, mas com reservas (ver nota).', bg: '#fde2dc', fg: '#8a2b17', Icon: TriangleAlert },
} as const;

/** Review state of reference data; absent review means pending. */
export function ReviewBadge({ review }: { review?: Review }) {
  const r = REVIEW[review?.status ?? 'pending'];
  const title = [r.title, review?.date && `Data: ${review.date}.`, review?.note].filter(Boolean).join(' ');
  return (
    <span className="badge" style={{ background: r.bg, color: r.fg }} title={title}>
      <r.Icon size={13} aria-hidden="true" /> {r.label}
    </span>
  );
}

export const ORIGIN_LABEL: Record<ValueOrigin, string> = {
  measured: 'medido',
  calculated: 'calculado',
  estimated: 'estimado',
};

const ORIGIN_STYLE: Record<ValueOrigin, { bg: string; fg: string }> = {
  measured: { bg: '#e3e7f6', fg: '#2c3a73' },
  calculated: { bg: '#dcebf2', fg: '#1e5368' },
  estimated: { bg: '#fff3c4', fg: '#5c4410' },
};

export function OriginTag({ origin, note }: { origin: ValueOrigin; note?: string }) {
  const s = ORIGIN_STYLE[origin];
  return (
    <span className="badge" style={{ background: s.bg, color: s.fg, fontSize: 11, padding: '1px 7px' }} title={note}>
      {ORIGIN_LABEL[origin]}
    </span>
  );
}
