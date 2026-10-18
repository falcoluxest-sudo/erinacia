import { useMemo, useRef, useState } from 'react';
import type { CurvePoint } from '@erinacia/core';
import { formatWeight } from '../data/animals';

// Two series: observed (solid line + dots) and reference (dashed). Colours
// validated with the dataviz palette checker against the light surface.
const OBS = '#1F7AA6';
const REF = '#C2643B';
const W = 720;
const H = 320;
const M = { top: 16, right: 24, bottom: 40, left: 64 };

export interface ObservedPoint extends CurvePoint {
  date: string;
}

function niceTicks(max: number, count = 5): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw) ?? raw;
  // Always end on a tick at or above the maximum so every point fits.
  const ticks: number[] = [0];
  while (ticks[ticks.length - 1]! < max - 1e-9) ticks.push(ticks.length * step);
  return ticks;
}

export function GrowthChart({ observed, reference, xLabel, referenceName }: {
  observed: ObservedPoint[];
  reference?: CurvePoint[];
  xLabel: string;
  referenceName?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { x, y, xTicks, yTicks, refPts } = useMemo(() => {
    // With weighings, show the reference only a little past the last one.
    const maxX = observed.length ? Math.max(1, ...observed.map((p) => p.ageDays)) : Math.max(1, ...(reference ?? []).map((p) => p.ageDays));
    const refPts = (reference ?? []).filter((p) => p.ageDays <= maxX * 1.15 + 1);
    const xMax = Math.max(maxX, ...refPts.map((p) => p.ageDays));
    const yMax = Math.max(1, ...observed.map((p) => p.grams), ...refPts.map((p) => p.grams)) * 1.08;
    const xTicks = niceTicks(xMax);
    const yTicks = niceTicks(yMax);
    const xTop = xTicks[xTicks.length - 1]!;
    const yTop = yTicks[yTicks.length - 1]!;
    return {
      x: (v: number) => M.left + (v / xTop) * (W - M.left - M.right),
      y: (v: number) => H - M.bottom - (v / yTop) * (H - M.top - M.bottom),
      xTicks, yTicks, refPts,
    };
  }, [observed, reference]);

  const path = (pts: CurvePoint[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.ageDays).toFixed(1)} ${y(p.grams).toFixed(1)}`).join('');
  const last = observed[observed.length - 1];
  const lastRef = refPts[refPts.length - 1];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || !observed.length) return;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    observed.forEach((p, i) => { if (Math.abs(x(p.ageDays) - px) < Math.abs(x(observed[best]!.ageDays) - px)) best = i; });
    setHover(best);
  };
  const hp = hover !== null ? observed[hover] : undefined;

  return (
    <figure style={{ margin: 0 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, marginBottom: 6 }} aria-hidden="true">
        {observed.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="22" height="10"><line x1="1" y1="5" x2="21" y2="5" stroke={OBS} strokeWidth="2" /><circle cx="11" cy="5" r="3.5" fill={OBS} /></svg> Pesagens
          </span>
        )}
        {refPts.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="22" height="10"><line x1="1" y1="5" x2="21" y2="5" stroke={REF} strokeWidth="2" strokeDasharray="5 4" /></svg> {referenceName ?? 'Referência'}
          </span>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
          aria-label={`Curva de crescimento: ${observed.length} pesagens${refPts.length ? ' com curva de referência' : ''}`}
          onPointerMove={onMove} onPointerLeave={() => setHover(null)} style={{ display: 'block', touchAction: 'pan-y' }}>
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="#E3E9E1" strokeWidth="1" />
              <text x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#4A5A50">{formatWeight(t)}</text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={`x${t}`} x={x(t)} y={H - M.bottom + 18} textAnchor="middle" fontSize="11" fill="#4A5A50">{t}</text>
          ))}
          <line x1={M.left} x2={W - M.right} y1={H - M.bottom} y2={H - M.bottom} stroke="#A9B9AE" strokeWidth="1" />
          <text x={(M.left + W - M.right) / 2} y={H - 6} textAnchor="middle" fontSize="12" fill="#4A5A50">{xLabel}</text>

          {refPts.length > 1 && <path d={path(refPts)} fill="none" stroke={REF} strokeWidth="2" strokeDasharray="6 5" strokeLinecap="round" />}
          {observed.length > 1 && <path d={path(observed)} fill="none" stroke={OBS} strokeWidth="2" strokeLinejoin="round" />}
          {hp && <line x1={x(hp.ageDays)} x2={x(hp.ageDays)} y1={M.top} y2={H - M.bottom} stroke="#A9B9AE" strokeDasharray="3 3" />}
          {observed.map((p, i) => (
            <circle key={p.date + i} cx={x(p.ageDays)} cy={y(p.grams)} r={hover === i ? 6 : 4.5} fill={OBS} stroke="#fff" strokeWidth="2" />
          ))}
          {last && <text x={Math.min(x(last.ageDays) + 8, W - M.right)} y={y(last.grams) - 10} fontSize="11.5" fontWeight="600" fill="#14372C" textAnchor={x(last.ageDays) > W - 120 ? 'end' : 'start'}>{formatWeight(last.grams)}</text>}
          {lastRef && refPts.length > 1 && <text x={x(lastRef.ageDays) - 4} y={y(lastRef.grams) + 16} fontSize="11.5" fill="#4A5A50" textAnchor="end">ref. {formatWeight(lastRef.grams)}</text>}
        </svg>
        {hp && (
          <div role="status" style={{
            position: 'absolute', pointerEvents: 'none', top: 8, left: `${(x(hp.ageDays) / W) * 100}%`,
            transform: x(hp.ageDays) > W * 0.6 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
            background: '#fff', border: '1px solid #DDE5DA', borderRadius: 8, padding: '6px 10px', fontSize: 12.5, boxShadow: '0 4px 12px rgb(20 55 44 / 12%)', whiteSpace: 'nowrap',
          }}>
            <div style={{ color: '#4A5A50' }}>{new Date(hp.date).toLocaleDateString('pt-PT')} · {xLabel.split(' (')[0]} {hp.ageDays}</div>
            <div style={{ fontWeight: 600 }}>{formatWeight(hp.grams)}</div>
          </div>
        )}
      </div>
    </figure>
  );
}
