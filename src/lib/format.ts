export const rp = (n: number) => "Rp " + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(n));
export const rpShort = (n: number) =>
  n >= 1e9 ? `Rp ${(n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M` :
  n >= 1e6 ? `Rp ${(n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt` :
  n >= 1e3 ? `Rp ${Math.round(n / 1e3)} rb` : rp(n);
export const num = (n: number) => new Intl.NumberFormat("id-ID").format(n);
export const pct = (n: number, d = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(d).replace(".", ",")}%`;
export const dateShort = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" });
export const dateTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
export const timeAgo = (iso: string, now: Date) => {
  const m = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};
