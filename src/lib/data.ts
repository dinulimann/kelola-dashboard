// Deterministic sample data for a fictional coffee chain. Same seed, same data, every load.

export type Channel = "In-store" | "Delivery app" | "Website" | "WhatsApp";
export type OrderStatus = "Pending" | "Preparing" | "Shipped" | "Delivered" | "Cancelled" | "Refunded";
export type Branch = "Kemang" | "Senopati" | "Bandung" | "Yogyakarta";

export interface Product { id: string; name: string; category: "Coffee" | "Non-coffee" | "Pastry" | "Beans" | "Merch"; price: number; cost: number; stock: number; active: boolean; }
export interface Customer { id: string; name: string; email: string; city: string; joined: string; segment: "New" | "Regular" | "VIP" | "At risk"; }
export interface OrderLine { productId: string; qty: number; price: number; }
export interface OrderEvent { at: string; label: string; }
export interface Order { id: string; customerId: string; branch: Branch; channel: Channel; status: OrderStatus; createdAt: string; lines: OrderLine[]; total: number; events: OrderEvent[]; }
export interface Dataset { products: Product[]; customers: Customer[]; orders: Order[]; }

// mulberry32: tiny seeded PRNG
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRODUCTS: [string, Product["category"], number][] = [
  ["Kopi Susu Senja", "Coffee", 28000], ["Americano", "Coffee", 25000], ["Caffè Latte", "Coffee", 32000], ["Cappuccino", "Coffee", 32000],
  ["Flat White", "Coffee", 34000], ["Es Kopi Aren", "Coffee", 29000], ["Espresso", "Coffee", 22000], ["Mocha", "Coffee", 36000],
  ["Vietnamese Drip", "Coffee", 27000], ["Cold Brew", "Coffee", 33000], ["Affogato", "Coffee", 38000], ["Pandan Latte", "Coffee", 35000],
  ["Matcha Latte", "Non-coffee", 36000], ["Chocolate", "Non-coffee", 32000], ["Teh Tarik", "Non-coffee", 24000], ["Lemon Tea", "Non-coffee", 22000],
  ["Red Velvet Latte", "Non-coffee", 34000], ["Taro Latte", "Non-coffee", 34000], ["Croissant", "Pastry", 26000], ["Pain au Chocolat", "Pastry", 30000],
  ["Banana Bread", "Pastry", 28000], ["Cinnamon Roll", "Pastry", 32000], ["Bolu Pandan", "Pastry", 24000], ["Almond Croissant", "Pastry", 36000],
  ["Cheese Danish", "Pastry", 32000], ["Gayo Beans 250g", "Beans", 120000], ["Toraja Beans 250g", "Beans", 135000], ["Kintamani Beans 250g", "Beans", 125000],
  ["Flores Bajawa 250g", "Beans", 130000], ["House Blend 1kg", "Beans", 380000], ["Decaf 250g", "Beans", 140000], ["Java Preanger 250g", "Beans", 128000],
  ["Tote Bag", "Merch", 85000], ["Tumbler 500ml", "Merch", 175000], ["Ceramic Mug", "Merch", 95000], ["V60 Dripper", "Merch", 145000],
  ["Paper Filters", "Merch", 45000], ["Enamel Cup", "Merch", 110000], ["Gift Card 100k", "Merch", 100000], ["Sticker Pack", "Merch", 25000],
];
const FIRST = ["Nadia", "Raka", "Sinta", "Bimo", "Dewi", "Arif", "Laras", "Yoga", "Putri", "Dimas", "Ayu", "Bagus", "Citra", "Fajar", "Gita", "Hendra", "Indah", "Joko", "Kirana", "Lukas", "Maya", "Nanda", "Oki", "Rani", "Sekar", "Tegar", "Wulan", "Yusuf", "Zahra", "Reza"];
const LAST = ["Putri", "Pratama", "Wijaya", "Santoso", "Lestari", "Hidayat", "Saputra", "Anggraini", "Kusuma", "Nugroho", "Rahma", "Setiawan", "Halim", "Siregar", "Wibowo"];
const CITIES = ["Jakarta", "Jakarta", "Jakarta", "Bandung", "Yogyakarta", "Surabaya", "Depok", "Tangerang", "Bekasi", "Bogor"];
const BRANCHES: Branch[] = ["Kemang", "Senopati", "Bandung", "Yogyakarta"];
const CHANNELS: [Channel, number][] = [["In-store", 0.46], ["Delivery app", 0.3], ["Website", 0.14], ["WhatsApp", 0.1]];

export const TODAY = new Date("2026-10-30T17:00:00+07:00");
const DAY = 86_400_000;

export function generate(seed = 2026): Dataset {
  const r = rng(seed);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const products: Product[] = PRODUCTS.map(([name, category, price], i) => ({
    id: `P-${String(i + 1).padStart(3, "0")}`, name, category, price,
    cost: Math.round((price * (category === "Merch" ? 0.55 : category === "Beans" ? 0.48 : 0.32)) / 500) * 500,
    stock: category === "Coffee" || category === "Non-coffee" ? 999 : Math.floor(r() * 60) + (i % 7 === 0 ? 2 : 12),
    active: i !== 30,
  }));
  const customers: Customer[] = Array.from({ length: 320 }, (_, i) => {
    const first = pick(FIRST), last = pick(LAST);
    const joined = new Date(TODAY.getTime() - Math.floor(r() * 420) * DAY);
    return { id: `C-${String(i + 1).padStart(4, "0")}`, name: `${first} ${last}`, email: `${first}.${last}${i}`.toLowerCase() + "@mail.example", city: pick(CITIES), joined: joined.toISOString(), segment: "New" };
  });
  const orders: Order[] = [];
  let n = 10450;
  for (let d = 119; d >= 0; d--) {
    const day = new Date(TODAY.getTime() - d * DAY);
    const weekend = [0, 6].includes(day.getDay());
    const growth = 1 + (119 - d) / 240;
    const count = Math.round((3 + r() * 3 + (weekend ? 2 : 0)) * growth);
    for (let k = 0; k < count; k++) {
      const created = new Date(day.getTime() - (16 - 7 - Math.floor(r() * 12)) * 3_600_000 - Math.floor(r() * 60) * 60_000);
      if (created > TODAY) continue;
      let x = r(), channel: Channel = "In-store";
      for (const [c, w] of CHANNELS) { if ((x -= w) <= 0) { channel = c; break; } }
      const lines: OrderLine[] = [];
      const items = 1 + Math.floor(r() * (channel === "In-store" ? 3 : 4));
      for (let j = 0; j < items; j++) {
        const p = r() < 0.72 ? products[Math.floor(r() * 25)] : pick(products);
        const existing = lines.find((l) => l.productId === p.id);
        if (existing) existing.qty++; else lines.push({ productId: p.id, qty: 1 + (r() < 0.2 ? 1 : 0), price: p.price });
      }
      const total = lines.reduce((s, l) => s + l.qty * l.price, 0);
      const ageH = (TODAY.getTime() - created.getTime()) / 3_600_000;
      let status: OrderStatus;
      if (ageH < 1.5) status = r() < 0.5 ? "Pending" : "Preparing";
      else if (ageH < 6 && channel !== "In-store") status = r() < 0.6 ? "Shipped" : "Delivered";
      else { const y = r(); status = y < 0.035 ? "Cancelled" : y < 0.05 ? "Refunded" : "Delivered"; }
      const t = (h: number) => new Date(created.getTime() + h * 60_000).toISOString();
      const events: OrderEvent[] = [{ at: created.toISOString(), label: `Order placed via ${channel}` }];
      if (status !== "Pending" && status !== "Cancelled") events.push({ at: t(3), label: "Payment confirmed" }, { at: t(5), label: "Barista started preparing" });
      if (["Shipped", "Delivered", "Refunded"].includes(status) && channel !== "In-store") events.push({ at: t(18), label: "Picked up by courier" });
      if (status === "Delivered" || status === "Refunded") events.push({ at: t(channel === "In-store" ? 9 : 42), label: channel === "In-store" ? "Served at the counter" : "Delivered to customer" });
      if (status === "Cancelled") events.push({ at: t(4), label: "Cancelled by customer" });
      if (status === "Refunded") events.push({ at: t(120), label: "Refund issued" });
      orders.push({ id: `SC-${n++}`, customerId: customers[Math.floor(Math.pow(r(), 1.6) * customers.length)].id, branch: weightedBranch(r()), channel, status, createdAt: created.toISOString(), lines, total, events });
    }
  }
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // Segments from behaviour
  const stats = new Map<string, { count: number; last: number }>();
  for (const o of orders) {
    const s = stats.get(o.customerId) ?? { count: 0, last: 0 };
    s.count++; s.last = Math.max(s.last, new Date(o.createdAt).getTime()); stats.set(o.customerId, s);
  }
  for (const c of customers) {
    const s = stats.get(c.id);
    c.segment = !s || s.count <= 1 ? "New" : TODAY.getTime() - s.last > 45 * DAY ? "At risk" : s.count >= 6 ? "VIP" : "Regular";
  }
  return { products, customers, orders };
}

function weightedBranch(x: number): Branch {
  return x < 0.36 ? BRANCHES[0] : x < 0.64 ? BRANCHES[1] : x < 0.84 ? BRANCHES[2] : BRANCHES[3];
}

export const ALL_STATUSES: OrderStatus[] = ["Pending", "Preparing", "Shipped", "Delivered", "Cancelled", "Refunded"];
export const ALL_CHANNELS: Channel[] = CHANNELS.map(([c]) => c);
export const ALL_BRANCHES = BRANCHES;
export const DAY_MS = DAY;
export const CHANNEL_COLORS = ["var(--accent)", "#8b5cf6", "#0ea5e9", "#22c55e"];
