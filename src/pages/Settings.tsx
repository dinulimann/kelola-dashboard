import { useState, type FormEvent } from "react";
import { Bell, RotateCcw, Shield, Store as StoreIcon, Users } from "lucide-react";
import { useStore, usePref } from "../lib/store";
import { Badge, Button, Card, Modal } from "../components/ui";

const TABS = [
  { id: "store", label: "Store", icon: StoreIcon },
  { id: "team", label: "Team", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "data", label: "Demo data", icon: Shield },
] as const;
type Tab = (typeof TABS)[number]["id"];

const TEAM = [
  { name: "Admin", email: "admin@senja.example", role: "Owner" },
  { name: "Raka Pratama", email: "raka@senja.example", role: "Manager" },
  { name: "Sinta Lestari", email: "sinta@senja.example", role: "Barista" },
  { name: "Bimo Santoso", email: "bimo@senja.example", role: "Barista" },
  { name: "Laras Kusuma", email: "laras@senja.example", role: "Finance" },
];
const ROLES = ["Owner", "Manager", "Barista", "Finance"];

export default function Settings() {
  const { dispatch, toast } = useStore();
  const [tab, setTab] = usePref<Tab>("settings-tab", "store");
  const [store, setStore] = usePref("store-profile", { name: "Senja Coffee", email: "hello@senja.example", tax: "11", currency: "IDR" });
  const [draft, setDraft] = useState(store);
  const [team, setTeam] = usePref("team", TEAM);
  const [notify, setNotify] = usePref("notify", { newOrder: true, lowStock: true, refund: true, weekly: false });
  const [confirm, setConfirm] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(store);
  const taxOk = Number(draft.tax) >= 0 && Number(draft.tax) <= 100 && draft.tax !== "";

  const save = (e: FormEvent) => { e.preventDefault(); if (!taxOk) return; setStore(draft); toast({ title: "Store settings saved", tone: "good" }); };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div><h1 className="text-2xl font-semibold tracking-tight">Settings</h1><p className="mt-1 text-sm text-muted">Settings are kept in this browser only.</p></div>
      <div className="grid gap-5 md:grid-cols-[200px_1fr]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col" role="tablist" aria-label="Settings sections">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm ${tab === t.id ? "bg-panel-2 font-medium" : "text-muted hover:text-fg"}`}><t.icon size={16} />{t.label}</button>
          ))}
        </nav>

        <Card className="p-6">
          {tab === "store" && (
            <form onSubmit={save} className="max-w-md space-y-4">
              {([["name", "Store name"], ["email", "Contact email"]] as const).map(([k, l]) => (
                <label key={k} className="block"><span className="text-[13px] font-medium">{l}</span><input value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} className="mt-1.5 h-9 w-full rounded-lg border border-line bg-panel px-3 text-sm outline-none focus:border-accent" /></label>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-[13px] font-medium">Tax (PPN %)</span><input value={draft.tax} inputMode="decimal" onChange={(e) => setDraft({ ...draft, tax: e.target.value })} aria-invalid={!taxOk} className={`mt-1.5 h-9 w-full rounded-lg border bg-panel px-3 text-sm outline-none focus:border-accent ${taxOk ? "border-line" : "border-bad"}`} />{!taxOk && <span className="mt-1 block text-xs text-bad">0 to 100.</span>}</label>
                <label className="block"><span className="text-[13px] font-medium">Currency</span><select value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} className="mt-1.5 h-9 w-full rounded-lg border border-line bg-panel px-2.5 text-sm"><option>IDR</option></select></label>
              </div>
              <div className="flex gap-2 pt-2"><Button type="submit" variant="primary" disabled={!dirty || !taxOk}>Save changes</Button>{dirty && <Button type="button" variant="ghost" onClick={() => setDraft(store)}>Discard</Button>}</div>
            </form>
          )}

          {tab === "team" && (
            <div>
              <p className="text-sm text-muted">Who can sign in to this console, and what they can do.</p>
              <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
                {team.map((m, i) => (
                  <li key={m.email} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div><p className="text-sm font-medium">{m.name} {i === 0 && <Badge tone="accent">you</Badge>}</p><p className="text-xs text-muted">{m.email}</p></div>
                    <select value={m.role} disabled={i === 0} aria-label={`Role for ${m.name}`} onChange={(e) => { setTeam(team.map((x) => (x.email === m.email ? { ...x, role: e.target.value } : x))); toast({ title: `${m.name} is now ${e.target.value}` }); }} className="h-8 rounded-lg border border-line bg-panel px-2 text-sm disabled:opacity-60">
                      {ROLES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "notifications" && (
            <div className="divide-y divide-line">
              {([["newOrder", "New orders", "A sound and a badge for every new order."], ["lowStock", "Low stock", "When a product drops to 10 or fewer."], ["refund", "Refunds", "When a refund is issued."], ["weekly", "Weekly summary", "Monday morning recap by email."]] as const).map(([k, l, d]) => (
                <label key={k} className="flex cursor-pointer items-center justify-between gap-4 py-3.5 first:pt-0">
                  <span><span className="block text-sm font-medium">{l}</span><span className="text-[13px] text-muted">{d}</span></span>
                  <input type="checkbox" role="switch" checked={notify[k]} onChange={() => setNotify({ ...notify, [k]: !notify[k] })} className="size-4 accent-[var(--accent)]" />
                </label>
              ))}
            </div>
          )}

          {tab === "data" && (
            <div className="max-w-lg">
              <p className="text-sm">All orders, products and customers here are generated sample data for a fictional coffee chain. Changes you make are saved in this browser.</p>
              <div className="mt-5 rounded-xl border border-bad/30 bg-bad-soft p-4">
                <p className="text-sm font-medium text-bad">Reset demo data</p>
                <p className="mt-1 text-[13px] text-muted">Brings back the original orders, products and customers. Your changes will be lost.</p>
                <Button variant="danger" size="sm" className="mt-3" onClick={() => setConfirm(true)}><RotateCcw size={14} /> Reset data</Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Reset demo data?">
        <div className="p-5">
          <p className="text-sm text-muted">This replaces every order, product and customer with the original sample data.</p>
          <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" onClick={() => { dispatch({ type: "reset" }); setConfirm(false); toast({ title: "Demo data restored", tone: "good" }); }}>Reset</Button></div>
        </div>
      </Modal>
    </div>
  );
}
