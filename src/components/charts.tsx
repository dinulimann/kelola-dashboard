import { useId, useMemo, useState } from "react";

/** Area chart with a hover crosshair and tooltip. Pure SVG, scales to its container. */
export function AreaChart({ data, format, height = 240, label }: { data: { x: string; y: number; y2?: number }[]; format: (n: number) => string; height?: number; label: string }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = height, pad = { l: 8, r: 8, t: 16, b: 26 };
  const max = Math.max(1, ...data.map((d) => Math.max(d.y, d.y2 ?? 0))) * 1.12;
  const x = (i: number) => pad.l + (i / Math.max(1, data.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const line = (key: "y" | "y2") => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[key] ?? 0).toFixed(1)}`).join(" ");
  const area = `${line("y")} L${x(data.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`;
  const ticks = [0.25, 0.5, 0.75, 1].map((t) => max * t / 1.12);
  const labelEvery = Math.ceil(data.length / 6);
  const h = hover !== null ? data[hover] : null;
  return (
    <div className="relative" role="img" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1)))));
        }}>
        <defs>
          <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => <line key={t} x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray="3 4" />)}
        <path d={area} fill={`url(#g${id})`} />
        {data.some((d) => d.y2 !== undefined) && <path d={line("y2")} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />}
        <path d={line("y")} fill="none" stroke="var(--accent)" strokeWidth="2.25" strokeLinejoin="round" />
        {data.map((d, i) => i % labelEvery === 0 && <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">{d.x}</text>)}
        {h && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--muted)" strokeOpacity="0.4" />
            <circle cx={x(hover)} cy={y(h.y)} r="4.5" fill="var(--panel)" stroke="var(--accent)" strokeWidth="2.5" />
          </g>
        )}
      </svg>
      {h && hover !== null && (
        <div className="pointer-events-none absolute top-1 rounded-lg border border-line bg-panel px-3 py-2 text-xs shadow-card"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > data.length / 2 ? "-105%" : "5%"})` }}>
          <p className="text-muted">{h.x}</p>
          <p className="tnum mt-0.5 font-semibold">{format(h.y)}</p>
          {h.y2 !== undefined && <p className="tnum text-muted">prev {format(h.y2)}</p>}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ values, tone = "accent" }: { values: number[]; tone?: "accent" | "good" | "bad" }) {
  const W = 120, H = 36, max = Math.max(...values, 1), min = Math.min(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - 3 - ((v - min) / Math.max(1, max - min)) * (H - 6)}`).join(" ");
  return <svg viewBox={`0 0 ${W} ${H}`} className="h-9 min-w-0 max-w-28 flex-1" preserveAspectRatio="none" aria-hidden><polyline points={pts} fill="none" stroke={`var(--${tone})`} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

export function Donut({ parts, center }: { parts: { label: string; value: number; color: string }[]; center: { value: string; label: string } }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const r = 42, c = 2 * Math.PI * r;
  let acc = 0;
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="flex items-center gap-6">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--panel-2)" strokeWidth="12" />
          {parts.map((p, i) => {
            const len = (p.value / total) * c; const off = acc; acc += len;
            return <circle key={p.label} cx="50" cy="50" r={r} fill="none" stroke={p.color} strokeWidth={hover === i ? 15 : 12}
              strokeDasharray={`${Math.max(0, len - 1.2)} ${c}`} strokeDashoffset={-off} className="transition-[stroke-width]" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div><p className="tnum text-lg font-semibold">{hover !== null ? `${Math.round((parts[hover].value / total) * 100)}%` : center.value}</p><p className="text-[11px] text-muted">{hover !== null ? parts[hover].label : center.label}</p></div>
        </div>
      </div>
      <ul className="flex-1 space-y-2 text-sm">
        {parts.map((p, i) => (
          <li key={p.label} className="flex items-center gap-2" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className="size-2.5 rounded-sm" style={{ background: p.color }} />
            <span className="flex-1 text-muted">{p.label}</span>
            <span className="tnum font-medium">{Math.round((p.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarList({ items, format }: { items: { label: string; value: number; sub?: string }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm"><span className="truncate">{i.label}</span><span className="tnum shrink-0 font-medium">{format(i.value)}</span></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel-2"><div className="h-full rounded-full bg-accent" style={{ width: `${(i.value / max) * 100}%` }} /></div>
          {i.sub && <p className="mt-1 text-xs text-muted">{i.sub}</p>}
        </li>
      ))}
    </ul>
  );
}

/** Weekday x hour heatmap. */
export function Heatmap({ grid, rows, cols, format }: { grid: number[][]; rows: string[]; cols: string[]; format: (n: number) => string }) {
  const max = useMemo(() => Math.max(1, ...grid.flat()), [grid]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-[11px]">
        <thead><tr><th />{cols.map((c) => <th key={c} className="font-normal text-muted">{c}</th>)}</tr></thead>
        <tbody>
          {grid.map((row, r) => (
            <tr key={rows[r]}>
              <th className="pr-2 text-left font-normal whitespace-nowrap text-muted">{rows[r]}</th>
              {row.map((v, c) => (
                <td key={c} title={`${rows[r]} ${cols[c]}: ${format(v)}`} className="h-7 min-w-7 rounded-md" style={{ background: v ? `color-mix(in oklab, var(--accent) ${Math.round(12 + (v / max) * 88)}%, transparent)` : "var(--panel-2)" }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
