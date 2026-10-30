import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { generate, type Dataset, type OrderStatus, type Product } from "./data";

type Action =
  | { type: "setStatus"; ids: string[]; status: OrderStatus; at: string }
  | { type: "deleteOrders"; ids: string[] }
  | { type: "restore"; data: Dataset }
  | { type: "updateProduct"; id: string; patch: Partial<Product> }
  | { type: "addProduct"; product: Product }
  | { type: "reset" };

function reducer(state: Dataset, a: Action): Dataset {
  switch (a.type) {
    case "setStatus":
      return { ...state, orders: state.orders.map((o) => a.ids.includes(o.id) && o.status !== a.status
        ? { ...o, status: a.status, events: [...o.events, { at: a.at, label: `Marked ${a.status.toLowerCase()} by Admin` }] } : o) };
    case "deleteOrders":
      return { ...state, orders: state.orders.filter((o) => !a.ids.includes(o.id)) };
    case "restore":
      return a.data;
    case "updateProduct":
      return { ...state, products: state.products.map((p) => (p.id === a.id ? { ...p, ...a.patch } : p)) };
    case "addProduct":
      return { ...state, products: [a.product, ...state.products] };
    case "reset":
      return generate();
  }
}

const KEY = "kelola:data:v1";
function load(): Dataset {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Dataset;
  } catch { /* fall through to fresh data */ }
  return generate();
}

export interface Toast { id: number; title: string; body?: string; undo?: () => void; tone?: "default" | "good" | "bad"; }

interface Store {
  data: Dataset;
  dispatch: (a: Action) => void;
  /** Applies an action and offers an undo toast that restores the previous data. */
  withUndo: (a: Action, title: string, body?: string) => void;
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, load);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage full or blocked: keep working in memory */ }
  }, [data]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = ++idRef.current;
    setToasts((all) => [...all.slice(-3), { ...t, id }]);
    setTimeout(() => dismiss(id), 6000);
  }, [dismiss]);
  const withUndo = useCallback((a: Action, title: string, body?: string) => {
    const before = dataRef.current;
    dispatch(a);
    toast({ title, body, undo: () => dispatch({ type: "restore", data: before }) });
  }, [toast]);

  const value = useMemo(() => ({ data, dispatch, withUndo, toasts, toast, dismiss }), [data, withUndo, toasts, toast, dismiss]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

/** Persisted UI preference (theme, sidebar, table density...). */
export function usePref<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try { const raw = localStorage.getItem(`kelola:${key}`); return raw === null ? initial : (JSON.parse(raw) as T); } catch { return initial; }
  });
  const set = useCallback((nv: T) => {
    setV(nv);
    try { localStorage.setItem(`kelola:${key}`, JSON.stringify(nv)); } catch { /* ignore */ }
  }, [key]);
  return [v, set];
}
