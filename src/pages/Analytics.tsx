import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { ALL_BRANCHES, ALL_CHANNELS, CHANNEL_COLORS as MIX, type Branch } from "../lib/data";
import { num, rp, rpShort } from "../lib/format";
import { counted, inWindow } from "../lib/metrics";
import { Card, CardHeader } from "../components/ui";
import { Heatmap } from "../components/charts";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // shop hours 08:00–19:59 WIB
const wib = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3_600_000);

export default function Analytics() {
  const { data } = useStore();
  const [days, setDays] = useState(30);
  const orders = useMemo(() => inWindow(data.orders, days, 0), [data.orders, days]);
  const ok = orders.filter(counted);

  const heat = useMemo(() => {
    const g = DAYS.map(() => HOURS.map(() => 0));
    for (const o of ok) { const d = wib(o.createdAt); const h = d.getUTCHours() - 8; if (h >= 0 && h < 12) g[(d.getUTCDay() + 6) % 7][h] += o.total; }
    return g;
  }, [ok]);
  const peak = useMemo(() => {
    let best = [0, 0, 0];
    heat.forEach((row, r) => row.forEach((v, c) => { if (v > best[0]) best = [v, r, c]; }));
    return `${DAYS[best[1]]} ${String(HOURS[best[2]]).padStart(2, "0")}:00`;
  }, [heat]);

  const funnel = [
    { label: "Placed", n: orders.length },
    { label: "Paid", n: orders.filter((o) => o.status !== "Pending" && o.status !== "Cancelled").length },
    { label: "Prepared", n: orders.filter((o) => !["Pending", "Preparing", "Cancelled"].includes(o.status)).length },
    { label: "Completed", n: orders.filter((o) => o.status === "Delivered").length },
  ];

  const branches = ALL_BRANCHES.map((b: Branch) => {
    const all = orders.filter((o) => o.branch === b), good = all.filter(counted);
    const rev = good.reduce((s, o) => s + o.total, 0);
    const mix = ALL_CHANNELS.map((c) => good.filter((o) => o.channel === c).length);
    return { b, rev, n: good.length, aov: good.length ? rev / good.length : 0, lost: all.length ? ((all.length - good.length) / all.length) * 100 : 0, mix };
  });
  const maxRev = Math.max(1, ...branches.map((x) => x.rev));

  const categories = useMemo(() => {
    const prod = new Map(data.products.map((p) => [p.id, p]));
    const m = new Map<string, { rev: number; profit: number }>();
    for (const o of ok) for (const l of o.lines) {
      const p = prod.get(l.productId); if (!p) continue;
      const s = m.get(p.category) ?? { rev: 0, profit: 0 };
      s.rev += l.qty * l.price; s.profit += l.qty * (l.price - p.cost); m.set(p.category, s);
    }
    return [...m].sort((a, b) => b[1].rev - a[1].rev);
  }, [ok, data.products]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Analytics</h1><p className="mt-1 text-sm text-muted">When people buy, where orders drop off, and how branches compare.</p></div>
        <div className="flex rounded-lg border border-line bg-panel p-0.5 text-[13px]" role="tablist" aria-label="Period">
          {[30, 60, 90].map((d) => <button key={d} role="tab" aria-selected={days === d} onClick={() => setDays(d)} className={`rounded-md px-3 py-1 ${days === d ? "bg-panel-2 font-medium" : "text-muted"}`}>{d} days</button>)}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue by day and hour" sub={`Busiest slot: ${peak} (WIB)`} />
          <div className="p-4 pt-3" data-testid="heatmap"><Heatmap grid={heat} rows={DAYS} cols={HOURS.map((h) => String(h).padStart(2, "0"))} format={rp} /></div>
        </Card>
        <Card>
          <CardHeader title="Order funnel" sub="Share of orders reaching each step" />
          <div className="space-y-3.5 p-5">
            {funnel.map((f, i) => {
              const p = funnel[0].n ? (f.n / funnel[0].n) * 100 : 0;
              return (
                <div key={f.label}>
                  <div className="flex justify-between text-sm"><span>{f.label}</span><span className="tnum text-muted">{num(f.n)} · {p.toFixed(1)}%</span></div>
                  <div className="mt-1.5 h-7 rounded-md bg-panel-2"><div className="h-full rounded-md" style={{ width: `${p}%`, background: `color-mix(in oklab, var(--accent) ${100 - i * 18}%, transparent)` }} /></div>
                </div>
              );
            })}
            <p className="pt-1 text-xs text-muted">Orders still being prepared or delivered count as not yet completed.</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Branches" sub={`Last ${days} days`} right={
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">{ALL_CHANNELS.map((c, i) => <span key={c} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: MIX[i] }} />{c}</span>)}</div>
        } />
        <div className="overflow-x-auto p-2">
          <table className="w-full text-sm" aria-label="Branch comparison">
            <thead className="text-left text-[12px] text-muted"><tr><th className="px-3 py-2 font-medium">Branch</th><th className="px-3 font-medium">Revenue</th><th className="px-3 text-right font-medium">Orders</th><th className="px-3 text-right font-medium">Avg. order</th><th className="px-3 text-right font-medium">Cancelled / refunded</th><th className="w-48 px-3 font-medium">Channel mix</th></tr></thead>
            <tbody>
              {branches.map((x) => (
                <tr key={x.b} className="border-t border-line">
                  <td className="px-3 py-3 font-medium">{x.b}</td>
                  <td className="px-3"><div className="flex items-center gap-3"><div className="h-2 w-28 rounded-full bg-panel-2"><div className="h-full rounded-full bg-accent" style={{ width: `${(x.rev / maxRev) * 100}%` }} /></div><span className="tnum">{rpShort(x.rev)}</span></div></td>
                  <td className="tnum px-3 text-right">{num(x.n)}</td>
                  <td className="tnum px-3 text-right">{rp(x.aov)}</td>
                  <td className={`tnum px-3 text-right ${x.lost > 6 ? "text-bad" : ""}`}>{x.lost.toFixed(1)}%</td>
                  <td className="px-3"><div className="flex h-2 overflow-hidden rounded-full" title={ALL_CHANNELS.map((c, i) => `${c}: ${x.mix[i]}`).join(", ")}>{x.mix.map((m, i) => <span key={i} style={{ flex: m, background: MIX[i] }} />)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Category profit" sub="Revenue and gross profit (price minus cost)" />
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map(([c, s]) => (
            <div key={c} className="rounded-xl border border-line p-4">
              <p className="text-sm text-muted">{c}</p>
              <p className="tnum mt-2 text-lg font-semibold">{rpShort(s.rev)}</p>
              <p className="tnum text-xs text-good">{rpShort(s.profit)} profit · {((s.profit / s.rev) * 100).toFixed(0)}%</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
