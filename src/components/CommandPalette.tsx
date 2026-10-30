import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Boxes, CornerDownLeft, Moon, Plus, ReceiptText, Search, User } from "lucide-react";
import { go } from "../lib/router";
import { useStore } from "../lib/store";
import { rp } from "../lib/format";
import { NAV } from "./Shell";

interface Item { id: string; group: string; label: string; hint?: string; icon: React.ReactNode; run: () => void; }

/** ⌘K palette: pages, actions and live search across orders, products and customers. */
export default function CommandPalette({ open, onClose, toggleTheme }: { open: boolean; onClose: () => void; toggleTheme: () => void }) {
  const { data } = useStore();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => { if (open) { setQ(""); setIndex(0); } }, [open]);

  const items = useMemo<Item[]>(() => {
    const term = q.trim().toLowerCase();
    const pages: Item[] = NAV.map((n) => ({ id: `page-${n.route}`, group: "Pages", label: n.label, hint: `g ${n.key}`, icon: <n.icon size={16} />, run: () => go(n.route) }));
    const actions: Item[] = [
      { id: "act-product", group: "Actions", label: "Add product", icon: <Plus size={16} />, run: () => { window.location.hash = "/products?new=1"; } },
      { id: "act-pending", group: "Actions", label: "Show pending orders", icon: <ReceiptText size={16} />, run: () => { window.location.hash = "/orders?status=Pending"; } },
      { id: "act-theme", group: "Actions", label: "Toggle dark mode", icon: <Moon size={16} />, run: toggleTheme },
    ];
    const base = [...pages, ...actions].filter((i) => !term || i.label.toLowerCase().includes(term));
    if (term.length < 2) return base;
    const customers = new Map(data.customers.map((c) => [c.id, c]));
    const orders: Item[] = data.orders.filter((o) => o.id.toLowerCase().includes(term) || customers.get(o.customerId)?.name.toLowerCase().includes(term)).slice(0, 5)
      .map((o) => ({ id: o.id, group: "Orders", label: `${o.id} · ${customers.get(o.customerId)?.name}`, hint: rp(o.total), icon: <ReceiptText size={16} />, run: () => { window.location.hash = `/orders?open=${o.id}`; } }));
    const products: Item[] = data.products.filter((p) => p.name.toLowerCase().includes(term)).slice(0, 4)
      .map((p) => ({ id: p.id, group: "Products", label: p.name, hint: rp(p.price), icon: <Boxes size={16} />, run: () => { window.location.hash = `/products?q=${encodeURIComponent(p.name)}`; } }));
    const people: Item[] = data.customers.filter((c) => c.name.toLowerCase().includes(term) || c.email.includes(term)).slice(0, 4)
      .map((c) => ({ id: c.id, group: "Customers", label: c.name, hint: c.city, icon: <User size={16} />, run: () => { window.location.hash = `/customers?open=${c.id}`; } }));
    return [...base, ...orders, ...products, ...people];
  }, [q, data, toggleTheme]);

  useEffect(() => { setIndex(0); }, [q]);
  useEffect(() => { listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" }); }, [index]);

  const run = (i: Item | undefined) => { if (!i) return; onClose(); i.run(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); run(items[index]); }
    else if (e.key === "Escape") onClose();
  };

  let last = "";
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div role="dialog" aria-modal="true" aria-label="Command palette" initial={{ opacity: 0, scale: 0.97, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={18} className="text-muted" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Type a command or search…" aria-label="Command" className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={items[index] ? `pi-${index}` : undefined} />
            </div>
            <ul ref={listRef} id="palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
              {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">No results for “{q}”</li>}
              {items.map((it, i) => {
                const header = it.group !== last ? it.group : null; last = it.group;
                return (
                  <li key={it.id} role="presentation">
                    {header && <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted">{header}</p>}
                    <div id={`pi-${i}`} data-index={i} role="option" aria-selected={i === index} onMouseMove={() => setIndex(i)} onClick={() => run(it)}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${i === index ? "bg-panel-2" : ""}`}>
                      <span className="text-muted">{it.icon}</span><span className="flex-1 truncate">{it.label}</span>
                      {it.hint && <span className="tnum text-xs text-muted">{it.hint}</span>}
                      {i === index && <ArrowRight size={14} className="text-muted" />}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-xs text-muted">
              <span className="flex items-center gap-1"><CornerDownLeft size={12} /> select</span><span>↑↓ move</span><span>esc close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
