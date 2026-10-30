import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronLeft, ChevronRight, Columns3, Download, Filter, PackageCheck, ReceiptText, Rows3, Search, Trash2, Truck, X } from "lucide-react";
import { useStore, usePref } from "../lib/store";
import { useHashParams } from "../lib/router";
import { ALL_BRANCHES, ALL_CHANNELS, ALL_STATUSES, TODAY, type Order, type OrderStatus } from "../lib/data";
import { dateTime, num, rp } from "../lib/format";
import { downloadCsv } from "../lib/csv";
import { Button, Card, Drawer, Empty, Popover, StatusBadge } from "../components/ui";

type SortKey = "id" | "customer" | "total" | "createdAt" | "status";
const COLUMNS = ["Customer", "Branch", "Channel", "Status", "Items", "Total", "Date"] as const;
type Column = (typeof COLUMNS)[number];

function MultiFilter({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <Popover label={`${label} filter`} align="left" trigger={() => (
      <Button size="sm" className={value.length ? "border-accent/50 text-accent" : ""}>
        <Filter size={14} /> {label}{value.length > 0 && <span className="tnum rounded bg-accent-soft px-1 text-xs">{value.length}</span>}
      </Button>
    )}>
      {() => (
        <div className="w-52">
          {options.map((o) => {
            const on = value.includes(o);
            return (
              <button key={o} role="menuitemcheckbox" aria-checked={on} onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-panel-2">
                <span className={`grid size-4 place-items-center rounded border ${on ? "border-accent bg-accent text-white" : "border-line"}`}>{on && <Check size={12} strokeWidth={3} />}</span>{o}
              </button>
            );
          })}
          {value.length > 0 && <button onClick={() => onChange([])} className="mt-1 w-full rounded-lg border-t border-line px-2.5 py-1.5 text-left text-[13px] text-muted hover:text-fg">Clear</button>}
        </div>
      )}
    </Popover>
  );
}

export default function Orders() {
  const { data, withUndo } = useStore();
  const [params, setParams] = useHashParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = usePref<Column[]>("orders-hidden-cols", ["Items"]);
  const [dense, setDense] = usePref("orders-dense", false);
  const [pageSize, setPageSize] = usePref("orders-page-size", 15);

  const q = params.get("q") ?? "";
  const list = (k: string) => (params.get(k) ?? "").split(",").filter(Boolean);
  const statuses = list("status"), channels = list("channel"), branches = list("branch");
  const [sortKey, sortDir] = ((params.get("sort") ?? "createdAt:desc").split(":") as [SortKey, "asc" | "desc"]);
  const page = Number(params.get("page") ?? 1);
  const openId = params.get("open");

  const customers = useMemo(() => new Map(data.customers.map((c) => [c.id, c])), [data.customers]);
  const products = useMemo(() => new Map(data.products.map((p) => [p.id, p])), [data.products]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = data.orders.filter((o) =>
      (!statuses.length || statuses.includes(o.status)) && (!channels.length || channels.includes(o.channel)) && (!branches.length || branches.includes(o.branch)) &&
      (!term || o.id.toLowerCase().includes(term) || customers.get(o.customerId)?.name.toLowerCase().includes(term)));
    const val = (o: Order): string | number => sortKey === "customer" ? customers.get(o.customerId)?.name ?? "" : sortKey === "total" ? o.total : o[sortKey];
    rows.sort((a, b) => { const x = val(a), y = val(b); const c = typeof x === "number" ? x - (y as number) : String(x).localeCompare(String(y)); return sortDir === "asc" ? c : -c; });
    return rows;
  }, [data.orders, q, statuses.join(), channels.join(), branches.join(), sortKey, sortDir, customers]); // eslint-disable-line react-hooks/exhaustive-deps

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * pageSize, cur * pageSize);
  const revenue = filtered.filter((o) => o.status !== "Cancelled" && o.status !== "Refunded").reduce((s, o) => s + o.total, 0);
  useEffect(() => { setSelected(new Set()); }, [q, statuses.join(), channels.join(), branches.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortBy = (k: SortKey) => setParams({ sort: `${k}:${sortKey === k && sortDir === "desc" ? "asc" : "desc"}` });
  const SortIcon = ({ k }: { k: SortKey }) => sortKey !== k ? <ArrowUpDown size={13} className="opacity-40" /> : sortDir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />;
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected((s) => { const n = new Set(s); rows.forEach((r) => (allOnPage ? n.delete(r.id) : n.add(r.id))); return n; });
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const show = (c: Column) => !hidden.includes(c);
  const setStatus = (ids: string[], status: OrderStatus) => {
    withUndo({ type: "setStatus", ids, status, at: TODAY.toISOString() }, `${ids.length} order${ids.length > 1 ? "s" : ""} marked ${status.toLowerCase()}`);
    setSelected(new Set());
  };
  const exportCsv = (os: Order[]) => downloadCsv(`orders-${TODAY.toISOString().slice(0, 10)}.csv`, [
    ["Order", "Customer", "Branch", "Channel", "Status", "Items", "Total", "Created"],
    ...os.map((o) => [o.id, customers.get(o.customerId)?.name ?? "", o.branch, o.channel, o.status, o.lines.reduce((s, l) => s + l.qty, 0), o.total, o.createdAt]),
  ]);
  const open = openId ? data.orders.find((o) => o.id === openId) : undefined;
  const py = dense ? "py-1.5" : "py-3";
  const filtersOn = statuses.length + channels.length + branches.length > 0 || q;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Orders</h1><p className="mt-1 text-sm text-muted"><span className="tnum">{num(filtered.length)}</span> orders · <span className="tnum">{rp(revenue)}</span> revenue</p></div>
        <Button onClick={() => exportCsv(filtered)}><Download size={15} /> Export CSV</Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <label className="relative w-full sm:w-auto sm:max-w-xs sm:flex-1">
            <Search size={15} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setParams({ q: e.target.value, page: null })} placeholder="Search order or customer" aria-label="Search orders" className="h-8 w-full rounded-lg border border-line bg-panel pr-3 pl-8 text-sm outline-none focus:border-accent" />
          </label>
          <MultiFilter label="Status" options={ALL_STATUSES} value={statuses} onChange={(v) => setParams({ status: v.join(","), page: null })} />
          <MultiFilter label="Channel" options={ALL_CHANNELS} value={channels} onChange={(v) => setParams({ channel: v.join(","), page: null })} />
          <MultiFilter label="Branch" options={ALL_BRANCHES} value={branches} onChange={(v) => setParams({ branch: v.join(","), page: null })} />
          {filtersOn && <Button size="sm" variant="ghost" onClick={() => setParams({ q: null, status: null, channel: null, branch: null, page: null })}><X size={14} /> Reset</Button>}
          <div className="ml-auto flex items-center gap-1">
            <Popover label="Columns" trigger={() => <Button size="sm" variant="ghost" aria-label="Columns"><Columns3 size={15} /></Button>}>
              {() => (
                <div className="w-44">
                  {COLUMNS.map((c) => (
                    <button key={c} role="menuitemcheckbox" aria-checked={show(c)} onClick={() => setHidden(show(c) ? [...hidden, c] : hidden.filter((h) => h !== c))} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-panel-2">
                      <span className={`grid size-4 place-items-center rounded border ${show(c) ? "border-accent bg-accent text-white" : "border-line"}`}>{show(c) && <Check size={12} strokeWidth={3} />}</span>{c}
                    </button>
                  ))}
                </div>
              )}
            </Popover>
            <Button size="sm" variant="ghost" onClick={() => setDense(!dense)} aria-label="Toggle density" aria-pressed={dense}><Rows3 size={15} /></Button>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-accent-soft/60 px-3 py-2 text-sm" role="toolbar" aria-label="Bulk actions">
            <span className="mr-2 font-medium"><span className="tnum">{selected.size}</span> selected</span>
            <Button size="sm" onClick={() => setStatus([...selected], "Shipped")}><Truck size={14} /> Mark shipped</Button>
            <Button size="sm" onClick={() => setStatus([...selected], "Delivered")}><PackageCheck size={14} /> Mark delivered</Button>
            <Button size="sm" onClick={() => exportCsv(data.orders.filter((o) => selected.has(o.id)))}><Download size={14} /> Export</Button>
            <Button size="sm" variant="danger" onClick={() => { const ids = [...selected]; withUndo({ type: "deleteOrders", ids }, `${ids.length} order${ids.length > 1 ? "s" : ""} deleted`); setSelected(new Set()); }}><Trash2 size={14} /> Delete</Button>
            <button onClick={() => setSelected(new Set())} className="ml-auto text-[13px] text-muted hover:text-fg">Clear selection</button>
          </div>
        )}

        {rows.length === 0 ? (
          <Empty icon={<ReceiptText size={20} />} title="No orders match" text="Try another search or remove a filter." action={<Button size="sm" onClick={() => setParams({ q: null, status: null, channel: null, branch: null })}>Reset filters</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Orders">
              <thead className="text-left text-[12px] text-muted">
                <tr className="border-b border-line">
                  <th className="w-10 px-3 py-2.5"><input type="checkbox" aria-label="Select all on page" checked={allOnPage} onChange={toggleAll} className="size-4 accent-[var(--accent)]" /></th>
                  <th className="px-3 font-medium"><button onClick={() => sortBy("id")} className="flex items-center gap-1 hover:text-fg">Order <SortIcon k="id" /></button></th>
                  {show("Customer") && <th className="px-3 font-medium"><button onClick={() => sortBy("customer")} className="flex items-center gap-1 hover:text-fg">Customer <SortIcon k="customer" /></button></th>}
                  {show("Branch") && <th className="px-3 font-medium">Branch</th>}
                  {show("Channel") && <th className="px-3 font-medium">Channel</th>}
                  {show("Status") && <th className="px-3 font-medium"><button onClick={() => sortBy("status")} className="flex items-center gap-1 hover:text-fg">Status <SortIcon k="status" /></button></th>}
                  {show("Items") && <th className="px-3 text-right font-medium">Items</th>}
                  {show("Total") && <th className="px-3 text-right font-medium"><button onClick={() => sortBy("total")} className="ml-auto flex items-center gap-1 hover:text-fg">Total <SortIcon k="total" /></button></th>}
                  {show("Date") && <th className="px-3 text-right font-medium"><button onClick={() => sortBy("createdAt")} className="ml-auto flex items-center gap-1 hover:text-fg">Date <SortIcon k="createdAt" /></button></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} onClick={() => setParams({ open: o.id })} className={`cursor-pointer border-b border-line last:border-0 hover:bg-panel-2/60 ${selected.has(o.id) ? "bg-accent-soft/40" : ""}`}>
                    <td className={`px-3 ${py}`} onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${o.id}`} checked={selected.has(o.id)} onChange={() => toggle(o.id)} className="size-4 accent-[var(--accent)]" /></td>
                    <td className={`px-3 ${py} font-mono text-[13px] whitespace-nowrap`}>{o.id}</td>
                    {show("Customer") && <td className={`px-3 ${py} whitespace-nowrap`}><span className="font-medium">{customers.get(o.customerId)?.name}</span></td>}
                    {show("Branch") && <td className={`px-3 ${py} text-muted`}>{o.branch}</td>}
                    {show("Channel") && <td className={`px-3 ${py} whitespace-nowrap text-muted`}>{o.channel}</td>}
                    {show("Status") && <td className={`px-3 ${py}`}><StatusBadge status={o.status} /></td>}
                    {show("Items") && <td className={`tnum px-3 ${py} text-right`}>{o.lines.reduce((s, l) => s + l.qty, 0)}</td>}
                    {show("Total") && <td className={`tnum px-3 ${py} text-right font-medium`}>{rp(o.total)}</td>}
                    {show("Date") && <td className={`px-3 ${py} text-right whitespace-nowrap text-muted`}>{dateTime(o.createdAt)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-3 py-2.5 text-[13px] text-muted">
          <label className="flex items-center gap-2">Rows
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setParams({ page: null }); }} className="h-7 rounded-md border border-line bg-panel px-1.5 text-fg">
              {[10, 15, 25, 50].map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
          <span className="tnum">{filtered.length ? `${(cur - 1) * pageSize + 1}–${Math.min(cur * pageSize, filtered.length)} of ${num(filtered.length)}` : "0"}</span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" disabled={cur <= 1} onClick={() => setParams({ page: String(cur - 1) })} aria-label="Previous page"><ChevronLeft size={16} /></Button>
            <span className="tnum px-1">Page {cur} / {pages}</span>
            <Button size="sm" variant="ghost" disabled={cur >= pages} onClick={() => setParams({ page: String(cur + 1) })} aria-label="Next page"><ChevronRight size={16} /></Button>
          </div>
        </div>
      </Card>

      <Drawer open={!!open} onClose={() => setParams({ open: null })} label={`Order ${open?.id ?? ""}`} title={open ? <span className="flex items-center gap-2"><span className="font-mono">{open.id}</span><StatusBadge status={open.status} /></span> : ""}>
        {open && (
          <div className="space-y-6 p-5">
            <section>
              <p className="text-xs font-medium text-muted uppercase">Customer</p>
              <p className="mt-1.5 font-medium">{customers.get(open.customerId)?.name}</p>
              <p className="text-sm text-muted">{customers.get(open.customerId)?.email} · {customers.get(open.customerId)?.city}</p>
              <p className="mt-1 text-sm text-muted">{open.channel} at {open.branch}</p>
            </section>
            <section>
              <p className="text-xs font-medium text-muted uppercase">Items</p>
              <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                {open.lines.map((l) => (
                  <li key={l.productId} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
                    <span><span className="tnum text-muted">{l.qty}×</span> {products.get(l.productId)?.name}</span><span className="tnum">{rp(l.qty * l.price)}</span>
                  </li>
                ))}
                <li className="flex justify-between px-3.5 py-2.5 text-sm font-semibold"><span>Total</span><span className="tnum">{rp(open.total)}</span></li>
              </ul>
            </section>
            <section>
              <p className="text-xs font-medium text-muted uppercase">Timeline</p>
              <ol className="relative mt-3 ml-1.5 space-y-4 border-l border-line pl-5">
                {open.events.map((e, i) => (
                  <li key={i} className="relative">
                    <span className={`absolute top-1 -left-[25px] size-2.5 rounded-full ring-4 ring-panel ${i === open.events.length - 1 ? "bg-accent" : "bg-muted/50"}`} />
                    <p className="text-sm">{e.label}</p><p className="text-xs text-muted">{dateTime(e.at)}</p>
                  </li>
                ))}
              </ol>
            </section>
            {!["Delivered", "Cancelled", "Refunded"].includes(open.status) && (
              <div className="flex gap-2">
                {open.status !== "Shipped" && open.channel !== "In-store" && <Button onClick={() => setStatus([open.id], "Shipped")}><Truck size={15} /> Mark shipped</Button>}
                <Button variant="primary" onClick={() => setStatus([open.id], "Delivered")}><PackageCheck size={15} /> Mark delivered</Button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
