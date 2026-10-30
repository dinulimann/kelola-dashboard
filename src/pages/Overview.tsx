import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Printer } from "lucide-react";
import { useStore } from "../lib/store";
import { ALL_CHANNELS, CHANNEL_COLORS, TODAY } from "../lib/data";
import { counted, dailySeries, inWindow, kpis } from "../lib/metrics";
import { dateShort, num, pct, rp, rpShort, timeAgo } from "../lib/format";
import { AreaChart, BarList, Donut, Sparkline } from "../components/charts";
import { Button, Card, CardHeader, StatusBadge } from "../components/ui";

const RANGES = [7, 30, 90] as const;

export default function Overview() {
  const { data } = useStore();
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const k = useMemo(() => kpis(data, range), [data, range]);
  const series = useMemo(() => {
    const cur = dailySeries(data.orders, range), prev = dailySeries(data.orders, range, range);
    return cur.map((d, i) => ({ x: dateShort(d.day + "T12:00:00+07:00"), y: d.revenue, y2: prev[i]?.revenue ?? 0, orders: d.orders }));
  }, [data, range]);
  const current = useMemo(() => inWindow(data.orders, range, 0).filter(counted), [data, range]);
  const channels = ALL_CHANNELS.map((c, i) => ({ label: c, value: current.filter((o) => o.channel === c).length, color: CHANNEL_COLORS[i] }));
  const products = new Map(data.products.map((p) => [p.id, p]));
  const top = useMemo(() => {
    const m = new Map<string, { qty: number; rev: number }>();
    for (const o of current) for (const l of o.lines) { const s = m.get(l.productId) ?? { qty: 0, rev: 0 }; s.qty += l.qty; s.rev += l.qty * l.price; m.set(l.productId, s); }
    return [...m.entries()].sort((a, b) => b[1].rev - a[1].rev).slice(0, 5).map(([id, s]) => ({ label: products.get(id)?.name ?? id, value: s.rev, sub: `${num(s.qty)} sold` }));
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps
  const customers = new Map(data.customers.map((c) => [c.id, c]));
  const cards = [
    { label: "Revenue", value: rpShort(k.revenue.value), d: k.revenue.delta, spark: series.map((s) => s.y) },
    { label: "Orders", value: num(k.orders.value), d: k.orders.delta, spark: series.map((s) => s.orders) },
    { label: "Avg. order value", value: rp(k.aov.value), d: k.aov.delta, spark: series.map((s) => (s.orders ? s.y / s.orders : 0)) },
    { label: "Customers", value: num(k.customers.value), d: k.customers.delta, spark: series.map((s) => s.orders) },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold tracking-tight">Good afternoon, Dinul</h1><p className="mt-1 text-sm text-muted">Here is how Senja Coffee is doing across 4 branches.</p></div>
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="Date range" className="inline-flex rounded-lg border border-line bg-panel p-0.5">
            {RANGES.map((r) => (
              <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)} className={`h-8 rounded-md px-3 text-[13px] font-medium ${range === r ? "bg-panel-2 text-fg" : "text-muted hover:text-fg"}`}>{r}d</button>
            ))}
          </div>
          <Button onClick={() => window.print()}><Printer size={15} /> Print</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <p className="text-[13px] text-muted">{c.label}</p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div>
                <p className="tnum text-2xl font-semibold tracking-tight whitespace-nowrap" data-testid={`kpi-${c.label}`}>{c.value}</p>
                <p className={`mt-1 flex items-center gap-0.5 text-xs font-medium ${c.d >= 0 ? "text-good" : "text-bad"}`}>
                  {c.d >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{pct(c.d)} <span className="ml-1 font-normal text-muted">vs prev. {range}d</span>
                </p>
              </div>
              <Sparkline values={c.spark} tone={c.d >= 0 ? "good" : "bad"} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Revenue" sub={`Daily, last ${range} days · dashed line is the previous ${range} days`} />
          <div className="px-3 pt-2 pb-3"><AreaChart data={series} format={rp} label={`Daily revenue for the last ${range} days`} /></div>
        </Card>
        <Card>
          <CardHeader title="Sales channels" sub="Share of orders" />
          <div className="p-5"><Donut parts={channels} center={{ value: num(current.length), label: "orders" }} /></div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Top products" sub="By revenue" />
          <div className="p-5"><BarList items={top} format={rpShort} /></div>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Latest orders" right={<a href="#/orders" className="text-[13px] font-medium text-accent hover:underline">View all</a>} />
          <ul className="mt-2 divide-y divide-line">
            {data.orders.slice(0, 6).map((o) => (
              <li key={o.id}>
                <a href={`#/orders?open=${o.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-panel-2/60">
                  <span className="grid size-8 place-items-center rounded-full bg-panel-2 text-xs font-semibold">{customers.get(o.customerId)?.name[0]}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{customers.get(o.customerId)?.name}</p><p className="text-xs text-muted">{o.id} · {o.channel} · {o.branch}</p></div>
                  <StatusBadge status={o.status} />
                  <p className="tnum hidden w-28 text-right text-sm font-medium sm:block">{rp(o.total)}</p>
                  <p className="hidden w-16 text-right text-xs text-muted md:block">{timeAgo(o.createdAt, TODAY)}</p>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
