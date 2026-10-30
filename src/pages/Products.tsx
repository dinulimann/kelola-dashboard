import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, LayoutGrid, List, PackageOpen, Plus, Search } from "lucide-react";
import { useStore, usePref } from "../lib/store";
import { useHashParams } from "../lib/router";
import { type Product } from "../lib/data";
import { num, rp } from "../lib/format";
import { counted } from "../lib/metrics";
import { Badge, Button, Card, Empty, Modal } from "../components/ui";

const CATEGORIES: Product["category"][] = ["Coffee", "Non-coffee", "Pastry", "Beans", "Merch"];
const LOW = 10;
const tracked = (p: Product) => p.category !== "Coffee" && p.category !== "Non-coffee";

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onChange} className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-good" : "bg-line"}`}>
      <span className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : ""}`} />
    </button>
  );
}

function StockInput({ p }: { p: Product }) {
  const { dispatch, toast } = useStore();
  const [v, setV] = useState(String(p.stock));
  const commit = () => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) { setV(String(p.stock)); toast({ title: "Stock must be a whole number", tone: "bad" }); return; }
    if (n !== p.stock) { dispatch({ type: "updateProduct", id: p.id, patch: { stock: n } }); toast({ title: `${p.name}: stock set to ${n}`, tone: "good" }); }
  };
  return (
    <input value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} inputMode="numeric" aria-label={`Stock for ${p.name}`}
      className={`tnum h-7 w-16 rounded-md border bg-panel px-2 text-right text-sm outline-none focus:border-accent ${p.stock <= LOW ? "border-warn/60 text-warn" : "border-line"}`} />
  );
}

function AddProduct({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, dispatch, toast } = useStore();
  const [f, setF] = useState({ name: "", category: "Pastry" as Product["category"], price: "", cost: "", stock: "20" });
  const [touched, setTouched] = useState(false);
  const errors: Partial<Record<keyof typeof f, string>> = {};
  if (f.name.trim().length < 3) errors.name = "At least 3 characters.";
  else if (data.products.some((p) => p.name.toLowerCase() === f.name.trim().toLowerCase())) errors.name = "A product with this name exists.";
  if (!(Number(f.price) >= 1000)) errors.price = "At least Rp 1.000.";
  if (f.cost === "" || !(Number(f.cost) >= 0)) errors.cost = "Enter a cost.";
  else if (Number(f.cost) >= Number(f.price)) errors.cost = "Cost must be below price.";
  if (!Number.isInteger(Number(f.stock)) || Number(f.stock) < 0) errors.stock = "Whole number, 0 or more.";
  const margin = Number(f.price) > 0 && Number(f.cost) >= 0 ? (1 - Number(f.cost) / Number(f.price)) * 100 : null;

  const submit = (e: FormEvent) => {
    e.preventDefault(); setTouched(true);
    if (Object.keys(errors).length) return;
    const id = `P-${String(Math.max(...data.products.map((p) => Number(p.id.slice(2)))) + 1).padStart(3, "0")}`;
    dispatch({ type: "addProduct", product: { id, name: f.name.trim(), category: f.category, price: Number(f.price), cost: Number(f.cost), stock: tracked({ category: f.category } as Product) ? Number(f.stock) : 999, active: true } });
    toast({ title: `${f.name.trim()} added`, body: id, tone: "good" });
    setF({ name: "", category: "Pastry", price: "", cost: "", stock: "20" }); setTouched(false); onClose();
  };
  const field = (k: keyof typeof f, label: string, props: Record<string, string> = {}) => (
    <label className="block">
      <span className="text-[13px] font-medium">{label}</span>
      <input {...props} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} aria-invalid={touched && !!errors[k]}
        className={`mt-1.5 h-9 w-full rounded-lg border bg-panel px-3 text-sm outline-none focus:border-accent ${touched && errors[k] ? "border-bad" : "border-line"}`} />
      {touched && errors[k] && <span className="mt-1 block text-xs text-bad">{errors[k]}</span>}
    </label>
  );
  return (
    <Modal open={open} onClose={onClose} title="Add product">
      <form onSubmit={submit} noValidate className="space-y-4 p-5">
        {field("name", "Name", { placeholder: "e.g. Kouign-amann" })}
        <label className="block">
          <span className="text-[13px] font-medium">Category</span>
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Product["category"] })} className="mt-1.5 h-9 w-full rounded-lg border border-line bg-panel px-2.5 text-sm">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">{field("price", "Price (Rp)", { inputMode: "numeric" })}{field("cost", "Cost (Rp)", { inputMode: "numeric" })}</div>
        {tracked({ category: f.category } as Product) ? field("stock", "Opening stock", { inputMode: "numeric" }) : <p className="text-[13px] text-muted">Drinks are made to order, so stock is not tracked.</p>}
        <p className="text-[13px] text-muted">Margin: <span className="tnum font-medium text-fg">{margin === null || !isFinite(margin) ? "—" : `${margin.toFixed(0)}%`}</span></p>
        <div className="flex justify-end gap-2 border-t border-line pt-4"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">Add product</Button></div>
      </form>
    </Modal>
  );
}

export default function Products() {
  const { data, dispatch } = useStore();
  const [params, setParams] = useHashParams();
  const [view, setView] = usePref<"grid" | "list">("products-view", "grid");
  const q = params.get("q") ?? "";
  const cat = params.get("cat");
  const lowOnly = params.get("low") === "1";

  const sold = useMemo(() => {
    const m = new Map<string, number>();
    data.orders.filter(counted).forEach((o) => o.lines.forEach((l) => m.set(l.productId, (m.get(l.productId) ?? 0) + l.qty)));
    return m;
  }, [data.orders]);
  const low = data.products.filter((p) => tracked(p) && p.active && p.stock <= LOW);
  const list = data.products.filter((p) => (!cat || p.category === cat) && (!lowOnly || low.includes(p)) && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
  const chip = (label: string, active: boolean, onClick: () => void, count?: number) => (
    <button onClick={onClick} aria-pressed={active} className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${active ? "border-fg bg-fg text-bg" : "border-line text-muted hover:text-fg"}`}>
      {label}{count !== undefined && <span className="tnum ml-1.5 opacity-60">{count}</span>}
    </button>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Products</h1><p className="mt-1 text-sm text-muted"><span className="tnum">{data.products.length}</span> products · <span className="tnum">{data.products.filter((p) => p.active).length}</span> on the menu</p></div>
        <Button variant="primary" onClick={() => setParams({ new: "1" })}><Plus size={15} /> Add product</Button>
      </div>

      {low.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm">
          <AlertTriangle size={16} className="text-warn" />
          <span><b className="tnum">{low.length}</b> {low.length === 1 ? "product is" : "products are"} at {LOW} or fewer in stock: {low.slice(0, 3).map((p) => p.name).join(", ")}{low.length > 3 ? "…" : ""}</span>
          <button onClick={() => setParams({ low: lowOnly ? null : "1" })} className="ml-auto text-[13px] font-medium text-warn underline-offset-2 hover:underline">{lowOnly ? "Show all" : "Show only these"}</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative w-full sm:w-64">
          <Search size={15} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setParams({ q: e.target.value || null })} placeholder="Search products" aria-label="Search products" className="h-8 w-full rounded-lg border border-line bg-panel pr-3 pl-8 text-sm outline-none focus:border-accent" />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {chip("All", !cat, () => setParams({ cat: null }))}
          {CATEGORIES.map((c) => chip(c, cat === c, () => setParams({ cat: cat === c ? null : c }), data.products.filter((p) => p.category === c).length))}
        </div>
        <div className="ml-auto flex rounded-lg border border-line p-0.5" role="group" aria-label="View">
          {(["grid", "list"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} aria-pressed={view === v} aria-label={`${v} view`} className={`grid size-7 place-items-center rounded-md ${view === v ? "bg-panel-2 text-fg" : "text-muted"}`}>{v === "grid" ? <LayoutGrid size={15} /> : <List size={15} />}</button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <Card><Empty icon={<PackageOpen size={20} />} title="No products found" text="Nothing matches this search and category." action={<Button size="sm" onClick={() => setParams({ q: null, cat: null, low: null })}>Clear filters</Button>} /></Card>
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="product-grid">
          {list.map((p) => (
            <Card key={p.id} className={`p-4 transition-opacity ${p.active ? "" : "opacity-55"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="truncate font-medium">{p.name}</p><p className="mt-0.5 font-mono text-xs text-muted">{p.id}</p></div>
                <Toggle on={p.active} label={`${p.name} on menu`} onChange={() => dispatch({ type: "updateProduct", id: p.id, patch: { active: !p.active } })} />
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div><p className="tnum text-lg font-semibold">{rp(p.price)}</p><p className="tnum text-xs text-muted">{((1 - p.cost / p.price) * 100).toFixed(0)}% margin · {num(sold.get(p.id) ?? 0)} sold</p></div>
                {tracked(p) ? <StockInput key={p.stock} p={p} /> : <Badge>made to order</Badge>}
              </div>
              <div className="mt-3"><Badge tone={p.category === "Beans" ? "accent" : p.category === "Merch" ? "info" : "neutral"}>{p.category}</Badge></div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Products">
            <thead className="text-left text-[12px] text-muted"><tr className="border-b border-line"><th className="px-4 py-2.5 font-medium">Product</th><th className="px-3 font-medium">Category</th><th className="px-3 text-right font-medium">Price</th><th className="px-3 text-right font-medium">Margin</th><th className="px-3 text-right font-medium">Sold</th><th className="px-3 text-right font-medium">Stock</th><th className="px-4 text-right font-medium">On menu</th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className={`border-b border-line last:border-0 ${p.active ? "" : "opacity-55"}`}>
                  <td className="px-4 py-2.5"><p className="font-medium">{p.name}</p><p className="font-mono text-xs text-muted">{p.id}</p></td>
                  <td className="px-3 text-muted">{p.category}</td>
                  <td className="tnum px-3 text-right">{rp(p.price)}</td>
                  <td className="tnum px-3 text-right">{((1 - p.cost / p.price) * 100).toFixed(0)}%</td>
                  <td className="tnum px-3 text-right">{num(sold.get(p.id) ?? 0)}</td>
                  <td className="px-3 text-right">{tracked(p) ? <StockInput key={p.stock} p={p} /> : <span className="text-xs text-muted">—</span>}</td>
                  <td className="px-4"><div className="flex justify-end"><Toggle on={p.active} label={`${p.name} on menu`} onChange={() => dispatch({ type: "updateProduct", id: p.id, patch: { active: !p.active } })} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <AddProduct open={params.get("new") === "1"} onClose={() => setParams({ new: null })} />
    </div>
  );
}
