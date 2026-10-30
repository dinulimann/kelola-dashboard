import { useEffect, useState } from "react";

export type Route = "overview" | "orders" | "products" | "customers" | "analytics" | "settings";
export const ROUTES: Route[] = ["overview", "orders", "products", "customers", "analytics", "settings"];

const parse = (): Route => {
  const r = window.location.hash.replace(/^#\/?/, "").split("?")[0] as Route;
  return ROUTES.includes(r) ? r : "overview";
};

/** Minimal hash router: #/orders, #/products ... */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export const go = (r: Route) => { window.location.hash = `/${r}`; };

/** Query string after the hash route, e.g. #/orders?status=Pending. Re-renders on hash change. */
export function useHashParams(): [URLSearchParams, (next: Record<string, string | null>) => void] {
  const read = () => new URLSearchParams(window.location.hash.split("?")[1] ?? "");
  const [params, setParams] = useState(read);
  useEffect(() => {
    const on = () => setParams(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const update = (next: Record<string, string | null>) => {
    const p = read();
    for (const [k, v] of Object.entries(next)) { if (v === null || v === "") p.delete(k); else p.set(k, v); }
    const base = window.location.hash.split("?")[0] || "#/overview";
    const qs = p.toString();
    history.replaceState(null, "", qs ? `${base}?${qs}` : base);
    setParams(p);
  };
  return [params, update];
}
