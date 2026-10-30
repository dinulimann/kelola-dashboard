import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BarChart3, Bell, Boxes, ChevronsLeft, ChevronsRight, Coffee, Command, Keyboard, LayoutDashboard, LogOut, Menu, Moon, ReceiptText, Search, Settings, Sun, Users, X } from "lucide-react";
import { go, type Route } from "../lib/router";
import { useStore, usePref } from "../lib/store";
import { TODAY } from "../lib/data";
import { timeAgo } from "../lib/format";
import { Kbd, Modal, Popover, useTheme } from "./ui";
import CommandPalette from "./CommandPalette";

export const NAV: { route: Route; label: string; icon: typeof LayoutDashboard; key: string }[] = [
  { route: "overview", label: "Overview", icon: LayoutDashboard, key: "h" },
  { route: "orders", label: "Orders", icon: ReceiptText, key: "o" },
  { route: "products", label: "Products", icon: Boxes, key: "p" },
  { route: "customers", label: "Customers", icon: Users, key: "c" },
  { route: "analytics", label: "Analytics", icon: BarChart3, key: "a" },
  { route: "settings", label: "Settings", icon: Settings, key: "s" },
];

function NavList({ route, collapsed, onNavigate, pending }: { route: Route; collapsed: boolean; onNavigate?: () => void; pending: number }) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {NAV.map((n) => {
        const active = n.route === route;
        return (
          <a key={n.route} href={`#/${n.route}`} onClick={onNavigate} aria-current={active ? "page" : undefined} title={collapsed ? n.label : undefined}
            className={`group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors ${active ? "bg-panel-2 text-fg" : "text-muted hover:bg-panel-2/60 hover:text-fg"}`}>
            {active && <motion.span layoutId="nav-active" className="absolute inset-y-1.5 -left-3 w-1 rounded-r-full bg-accent" />}
            <n.icon size={18} className="shrink-0" />
            {!collapsed && <span className="flex-1">{n.label}</span>}
            {!collapsed && n.route === "orders" && pending > 0 && <span className="tnum rounded-md bg-accent-soft px-1.5 text-xs text-accent">{pending}</span>}
          </a>
        );
      })}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-white"><Coffee size={17} /></span>
      {!collapsed && <div className="leading-tight"><p className="text-sm font-semibold">Senja Coffee</p><p className="text-xs text-muted">Kelola console</p></div>}
    </div>
  );
}

export default function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const { data } = useStore();
  const [collapsed, setCollapsed] = usePref("sidebar-collapsed", false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [dark, toggleTheme] = useTheme();
  const gPressed = useRef(0);
  const pending = useMemo(() => data.orders.filter((o) => o.status === "Pending" || o.status === "Preparing").length, [data.orders]);
  const notifications = useMemo(() => {
    const low = data.products.filter((p) => p.active && p.stock < 10 && p.stock !== 999).slice(0, 2).map((p) => ({ title: `${p.name} is low on stock`, body: `${p.stock} left`, at: TODAY.toISOString() }));
    const refunds = data.orders.filter((o) => o.status === "Refunded").slice(0, 2).map((o) => ({ title: `${o.id} was refunded`, body: o.branch, at: o.createdAt }));
    const fresh = data.orders.filter((o) => o.status === "Pending").slice(0, 2).map((o) => ({ title: `New order ${o.id}`, body: `${o.channel} · ${o.branch}`, at: o.createdAt }));
    return [...fresh, ...low, ...refunds];
  }, [data]);

  // Global shortcuts: ⌘K palette, g+letter navigation, ? help
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((o) => !o); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") { e.preventDefault(); setPaletteOpen(true); return; }
      if (e.key === "?") { setHelpOpen(true); return; }
      if (e.key === "g") { gPressed.current = Date.now(); return; }
      if (Date.now() - gPressed.current < 900) {
        const n = NAV.find((x) => x.key === e.key);
        if (n) { go(n.route); gPressed.current = 0; }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen">
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-panel transition-[width] duration-200 md:flex ${collapsed ? "w-[68px]" : "w-60"}`}>
        <div className="flex h-14 items-center px-3.5"><Brand collapsed={collapsed} /></div>
        <div className="flex-1 overflow-y-auto px-3.5 pt-2"><NavList route={route} collapsed={collapsed} pending={pending} /></div>
        <div className="border-t border-line p-3.5">
          <button onClick={() => setCollapsed(!collapsed)} className="flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm text-muted hover:bg-panel-2 hover:text-fg" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <ChevronsRight size={18} /> : <><ChevronsLeft size={18} /> Collapse</>}
          </button>
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 30, stiffness: 320 }} className="absolute inset-y-0 left-0 w-72 border-r border-line bg-panel p-3.5" aria-label="Mobile navigation">
              <div className="flex h-11 items-center justify-between"><Brand collapsed={false} /><button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="rounded-md p-1.5 text-muted"><X size={18} /></button></div>
              <div className="mt-4"><NavList route={route} collapsed={false} pending={pending} onNavigate={() => setMobileOpen(false)} /></div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur sm:px-6">
          <button className="rounded-md p-1.5 text-muted md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <button onClick={() => setPaletteOpen(true)} className="flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm text-muted hover:border-muted/50" aria-label="Search or run a command">
            <Search size={16} /><span className="flex-1 text-left">Search orders, products…</span><span className="hidden items-center gap-1 sm:flex"><Kbd><Command size={10} className="inline" />K</Kbd></span>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setHelpOpen(true)} className="hidden rounded-lg p-2 text-muted hover:bg-panel-2 hover:text-fg sm:block" aria-label="Keyboard shortcuts"><Keyboard size={18} /></button>
            <button onClick={toggleTheme} className="rounded-lg p-2 text-muted hover:bg-panel-2 hover:text-fg" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <Popover label="Notifications" trigger={() => (
              <button className="relative rounded-lg p-2 text-muted hover:bg-panel-2 hover:text-fg" aria-label="Notifications"><Bell size={18} />{notifications.length > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-accent ring-2 ring-bg" />}</button>
            )}>
              {() => (
                <div className="w-80">
                  <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted">Notifications</p>
                  {notifications.map((n, i) => (
                    <div key={i} className="rounded-lg px-3 py-2 hover:bg-panel-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted">{n.body} · {timeAgo(n.at, TODAY)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Popover>
            <Popover label="Account" trigger={() => (
              <button className="ml-1 grid size-8 place-items-center rounded-full bg-gradient-to-br from-accent to-amber-400 text-sm font-semibold text-white" aria-label="Account menu">D</button>
            )}>
              {(close) => (
                <div className="w-56">
                  <div className="px-3 py-2"><p className="text-sm font-medium">Dinul Iman</p><p className="text-xs text-muted">Owner · admin@senja.example</p></div>
                  <div className="my-1 h-px bg-line" />
                  <a href="#/settings" onClick={close} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-panel-2"><Settings size={15} /> Settings</a>
                  <button onClick={close} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-panel-2"><LogOut size={15} /> Sign out</button>
                </div>
              )}
            </Popover>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} toggleTheme={toggleTheme} />
      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Keyboard shortcuts" width="max-w-md">
        <ul className="divide-y divide-line px-5 py-2 text-sm">
          {[["Open command palette", ["⌘", "K"]], ["Search", ["/"]], ...NAV.map((n) => [`Go to ${n.label}`, ["g", n.key]] as [string, string[]]), ["Show shortcuts", ["?"]]].map(([label, keys]) => (
            <li key={label as string} className="flex items-center justify-between py-2.5"><span>{label as string}</span><span className="flex gap-1">{(keys as string[]).map((k) => <Kbd key={k}>{k}</Kbd>)}</span></li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
