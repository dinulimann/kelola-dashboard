import { DAY_MS, TODAY, type Dataset, type Order } from "./data";

export const counted = (o: Order) => o.status !== "Cancelled" && o.status !== "Refunded";

/** Orders in [start, end) days back from TODAY, e.g. window(0, 30) = last 30 days. */
export function inWindow(orders: Order[], fromDaysAgo: number, toDaysAgo: number) {
  const hi = TODAY.getTime() - toDaysAgo * DAY_MS, lo = TODAY.getTime() - fromDaysAgo * DAY_MS;
  return orders.filter((o) => { const t = new Date(o.createdAt).getTime(); return t > lo && t <= hi; });
}

export function dailySeries(orders: Order[], days: number, offset = 0) {
  const out: { day: string; revenue: number; orders: number }[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const end = TODAY.getTime() - (d + offset) * DAY_MS;
    const dayKey = new Date(end + 7 * 3_600_000).toISOString().slice(0, 10);
    out.push({ day: dayKey, revenue: 0, orders: 0 });
  }
  const idx = new Map(out.map((o, i) => [o.day, i]));
  for (const o of orders) {
    if (!counted(o)) continue;
    const key = new Date(new Date(o.createdAt).getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
    const i = idx.get(key);
    if (i !== undefined) { out[i].revenue += o.total; out[i].orders++; }
  }
  return out;
}

export function kpis(data: Dataset, days: number) {
  const cur = inWindow(data.orders, days, 0), prev = inWindow(data.orders, days * 2, days);
  const sum = (os: Order[]) => os.filter(counted).reduce((s, o) => s + o.total, 0);
  const rev = sum(cur), prevRev = sum(prev);
  const n = cur.filter(counted).length, prevN = prev.filter(counted).length;
  const aov = n ? rev / n : 0, prevAov = prevN ? prevRev / prevN : 0;
  const buyers = new Set(cur.map((o) => o.customerId)).size, prevBuyers = new Set(prev.map((o) => o.customerId)).size;
  const delta = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
  return {
    revenue: { value: rev, delta: delta(rev, prevRev) },
    orders: { value: n, delta: delta(n, prevN) },
    aov: { value: aov, delta: delta(aov, prevAov) },
    customers: { value: buyers, delta: delta(buyers, prevBuyers) },
  };
}
