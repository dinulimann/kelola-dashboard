import { useMemo } from "react";
import { Search, Users } from "lucide-react";
import { useStore } from "../lib/store";
import { useHashParams } from "../lib/router";
import { TODAY, type Customer } from "../lib/data";
import { dateTime, num, rp, timeAgo } from "../lib/format";
import { counted } from "../lib/metrics";
import { Badge, Button, Card, Drawer, Empty, StatusBadge } from "../components/ui";

const SEGMENTS: Customer["segment"][] = ["VIP", "Regular", "New", "At risk"];
const TONE = { VIP: "accent", Regular: "neutral", New: "info", "At risk": "warn" } as const;
const PAGE = 20;

const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2);
function Avatar({ name, big }: { name: string; big?: boolean }) {
  const hue = [...name].reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  return <span className={`grid shrink-0 place-items-center rounded-full font-medium text-white ${big ? "size-12 text-base" : "size-8 text-xs"}`} style={{ background: `oklch(0.62 0.12 ${hue})` }}>{initials(name)}</span>;
}

export default function Customers() {
  const { data } = useStore();
  const [params, setParams] = useHashParams();
  const q = params.get("q") ?? "";
  const seg = params.get("segment");
  const page = Number(params.get("page") ?? 1);

  const stats = useMemo(() => {
    const m = new Map<string, { orders: number; spend: number; last: string }>();
    for (const o of data.orders) {
      const s = m.get(o.customerId) ?? { orders: 0, spend: 0, last: "" };
      s.orders++;
      if (counted(o)) s.spend += o.total;
      if (o.createdAt > s.last) s.last = o.createdAt;
      m.set(o.customerId, s);
    }
    return m;
  }, [data.orders]);

  const list = data.customers
    .filter((c) => (!seg || c.segment === seg) && (!q || `${c.name} ${c.email} ${c.city}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (stats.get(b.id)?.spend ?? 0) - (stats.get(a.id)?.spend ?? 0));
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const cur = Math.min(page, pages);
  const open = data.customers.find((c) => c.id === params.get("open"));
  const openOrders = open ? data.orders.filter((o) => o.customerId === open.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div><h1 className="text-2xl font-semibold tracking-tight">Customers</h1><p className="mt-1 text-sm text-muted"><span className="tnum">{num(data.customers.length)}</span> customers, ranked by spend</p></div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SEGMENTS.map((s) => {
          const n = data.customers.filter((c) => c.segment === s).length;
          return (
            <button key={s} onClick={() => setParams({ segment: seg === s ? null : s, page: null })} aria-pressed={seg === s}
              className={`rounded-xl border bg-panel p-4 text-left shadow-card transition-colors ${seg === s ? "border-accent ring-1 ring-accent" : "border-line hover:border-muted/40"}`}>
              <Badge tone={TONE[s]}>{s}</Badge>
              <p className="tnum mt-3 text-2xl font-semibold">{num(n)}</p>
              <p className="tnum text-xs text-muted">{((n / data.customers.length) * 100).toFixed(0)}% of customers</p>
            </button>
          );
        })}
      </div>

      <Card>
        <div className="border-b border-line p-3">
          <label className="relative block sm:max-w-xs">
            <Search size={15} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setParams({ q: e.target.value || null, page: null })} placeholder="Search name, email or city" aria-label="Search customers" className="h-8 w-full rounded-lg border border-line bg-panel pr-3 pl-8 text-sm outline-none focus:border-accent" />
          </label>
        </div>
        {list.length === 0 ? <Empty icon={<Users size={20} />} title="No customers found" text="Try a different name or segment." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Customers">
              <thead className="text-left text-[12px] text-muted"><tr className="border-b border-line"><th className="px-4 py-2.5 font-medium">Customer</th><th className="px-3 font-medium">Segment</th><th className="px-3 font-medium">City</th><th className="px-3 text-right font-medium">Orders</th><th className="px-3 text-right font-medium">Spend</th><th className="px-4 text-right font-medium">Last order</th></tr></thead>
              <tbody>
                {list.slice((cur - 1) * PAGE, cur * PAGE).map((c) => {
                  const s = stats.get(c.id);
                  return (
                    <tr key={c.id} onClick={() => setParams({ open: c.id })} className="cursor-pointer border-b border-line last:border-0 hover:bg-panel-2/60">
                      <td className="px-4 py-2.5"><div className="flex items-center gap-3"><Avatar name={c.name} /><div className="min-w-0"><p className="font-medium">{c.name}</p><p className="truncate text-xs text-muted">{c.email}</p></div></div></td>
                      <td className="px-3"><Badge tone={TONE[c.segment]}>{c.segment}</Badge></td>
                      <td className="px-3 text-muted">{c.city}</td>
                      <td className="tnum px-3 text-right">{s?.orders ?? 0}</td>
                      <td className="tnum px-3 text-right font-medium">{rp(s?.spend ?? 0)}</td>
                      <td className="px-4 text-right whitespace-nowrap text-muted">{s?.last ? timeAgo(s.last, TODAY) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[13px] text-muted">
          <span className="tnum">{num(list.length)} customers</span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" disabled={cur <= 1} onClick={() => setParams({ page: String(cur - 1) })}>Previous</Button>
            <span className="tnum px-1">{cur} / {pages}</span>
            <Button size="sm" variant="ghost" disabled={cur >= pages} onClick={() => setParams({ page: String(cur + 1) })}>Next</Button>
          </div>
        </div>
      </Card>

      <Drawer open={!!open} onClose={() => setParams({ open: null })} label={open?.name ?? "Customer"} title={open?.name ?? ""}>
        {open && (
          <div className="space-y-6 p-5">
            <div className="flex items-center gap-4">
              <Avatar name={open.name} big />
              <div><p className="font-medium">{open.email}</p><p className="text-sm text-muted">{open.city} · customer since {new Date(open.joined).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p><div className="mt-1.5"><Badge tone={TONE[open.segment]}>{open.segment}</Badge></div></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[["Orders", String(stats.get(open.id)?.orders ?? 0)], ["Spend", rp(stats.get(open.id)?.spend ?? 0)], ["Avg. order", rp((stats.get(open.id)?.spend ?? 0) / Math.max(1, openOrders.filter(counted).length))]].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line p-3"><p className="text-xs text-muted">{k}</p><p className="tnum mt-1 text-sm font-semibold">{v}</p></div>
              ))}
            </div>
            <section>
              <p className="text-xs font-medium text-muted uppercase">Order history</p>
              <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                {openOrders.slice(0, 12).map((o) => (
                  <li key={o.id}><a href={`#/orders?open=${o.id}`} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm hover:bg-panel-2/60">
                    <span><span className="font-mono text-[13px]">{o.id}</span><span className="ml-2 text-xs text-muted">{dateTime(o.createdAt)}</span></span>
                    <span className="flex items-center gap-2"><StatusBadge status={o.status} /><span className="tnum w-24 text-right">{rp(o.total)}</span></span>
                  </a></li>
                ))}
                {openOrders.length === 0 && <li className="px-3.5 py-3 text-sm text-muted">No orders yet.</li>}
              </ul>
            </section>
          </div>
        )}
      </Drawer>
    </div>
  );
}
