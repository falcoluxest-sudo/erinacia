// Growth monitoring for juveniles in rehabilitation.

export interface WeightRecord {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  grams: number;
}

export interface CurvePoint {
  ageDays: number;
  grams: number;
}

const DAY_MS = 86_400_000;

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);
}

/** Average daily gain between consecutive weighings, g/day. */
export function dailyGains(records: WeightRecord[]): { from: string; to: string; gramsPerDay: number }[] {
  const sorted = [...records].sort((x, y) => x.date.localeCompare(y.date));
  const out: { from: string; to: string; gramsPerDay: number }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1]!;
    const b = sorted[i]!;
    const d = daysBetween(a.date, b.date);
    if (d > 0) out.push({ from: a.date, to: b.date, gramsPerDay: (b.grams - a.grams) / d });
  }
  return out;
}

/** Least-squares slope of weight over time, g/day. */
export function overallDailyGain(records: WeightRecord[]): number | undefined {
  if (records.length < 2) return undefined;
  const t0 = Math.min(...records.map((r) => Date.parse(r.date)));
  const xs = records.map((r) => (Date.parse(r.date) - t0) / DAY_MS);
  const ys = records.map((r) => r.grams);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * ((ys[i] ?? 0) - my);
    den += (x - mx) ** 2;
  });
  return den === 0 ? undefined : num / den;
}

/** Gompertz curve W(t) = A · exp(−b · exp(−k · t)). */
export interface GompertzParams {
  asymptoteGrams: number;
  b: number;
  k: number;
}

export function gompertz(p: GompertzParams, ageDays: number): number {
  return p.asymptoteGrams * Math.exp(-p.b * Math.exp(-p.k * ageDays));
}

/** Linear interpolation on a reference curve (points sorted by age). */
export function expectedWeight(curve: CurvePoint[], ageDays: number): number | undefined {
  if (curve.length === 0) return undefined;
  const first = curve[0]!;
  const last = curve[curve.length - 1]!;
  if (ageDays <= first.ageDays) return first.grams;
  if (ageDays >= last.ageDays) return last.grams;
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1]!;
    const b = curve[i]!;
    if (ageDays <= b.ageDays) {
      const t = (ageDays - a.ageDays) / (b.ageDays - a.ageDays);
      return a.grams + t * (b.grams - a.grams);
    }
  }
  return undefined;
}

/** Observed weight as a fraction of the reference (1 = on curve). */
export function percentOfExpected(observedGrams: number, curve: CurvePoint[], ageDays: number): number | undefined {
  const e = expectedWeight(curve, ageDays);
  return e ? observedGrams / e : undefined;
}
