"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Plus, Minus, X, Search, Loader2,
  CheckCircle2, FileText, Quote, Receipt, Trash2, UserCircle, User,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";

/* ─────────────────────────── Types ─────────────────────────── */

interface Product {
  id: string; name: string; category: string;
  price: number; stock: number; unit: string; depotName: string;
}

interface CartItem {
  id: string;             // product id OR generated uuid for manual items
  name: string; category: string; qty: number; price: number;
  unit: string; stock: number | null; isManual: boolean;
}

interface FarmerResult {
  id: string; full_name: string; phone_number: string; id_number: string | null;
}

type CheckoutType = "cash_sale" | "invoice" | "quotation";
type CustomerMode = "walkin" | "farmer";

const CAT_COLORS: Record<string, string> = {
  chick:    "bg-yellow-100 text-yellow-800",
  egg_tray: "bg-amber-100 text-amber-800",
  feed:     "bg-green-100 text-green-800",
  vaccine:  "bg-blue-100 text-blue-800",
};

const UNITS = ["piece", "chick", "tray", "bag (50 kg)", "dose", "kg", "litre", "box", "carton"];

const CHECKOUT_OPTIONS: Array<{ type: CheckoutType; label: string; sub: string; color: string; icon: React.ElementType }> = [
  { type: "cash_sale",  label: "Cash Sale",  sub: "Paid now · Receipt",  color: "bg-green-600 hover:bg-green-700",  icon: Receipt  },
  { type: "invoice",    label: "Invoice",    sub: "Credit · Pay later",  color: "bg-blue-700  hover:bg-blue-800",   icon: FileText },
  { type: "quotation",  label: "Quotation",  sub: "Price quote · Draft", color: "bg-orange-700 hover:bg-orange-800", icon: Quote   },
];

/* ─────────────────────────── Component ─────────────────────── */

export default function SalesTerminalPage() {
  /* products */
  const [products, setProducts]       = useState<Product[]>([]);
  const [depotName, setDepotName]     = useState("");
  const [loadingProds, setLoadingProds] = useState(true);
  const [catFilter, setCatFilter]     = useState("all");
  const [search, setSearch]           = useState("");

  /* cart */
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [showManual, setShowManual]   = useState(false);
  const [manual, setManual]           = useState({ name: "", category: "", qty: 1, price: 0, unit: "piece" });

  /* customer */
  const [custMode, setCustMode]       = useState<CustomerMode>("walkin");
  const [walkInName, setWalkInName]   = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [farmerQuery, setFarmerQuery] = useState("");
  const [farmerResults, setFarmerResults] = useState<FarmerResult[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerResult | null>(null);
  const [farmerSearching, setFarmerSearching] = useState(false);
  const [showFarmerDrop, setShowFarmerDrop] = useState(false);
  const [notes, setNotes]             = useState("");

  /* checkout state */
  const [processing, setProcessing]   = useState(false);
  const [lastOrder, setLastOrder]     = useState<{ id: string; number: string; type: CheckoutType } | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  /* ── load products ── */
  const loadProducts = useCallback(() => {
    setLoadingProds(true);
    fetch("/api/pos/products")
      .then(r => r.json())
      .then(d => { setProducts(d.products ?? []); setDepotName(d.depotName ?? ""); })
      .catch(() => toast.error("Could not load inventory"))
      .finally(() => setLoadingProds(false));
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  /* ── farmer search ── */
  useEffect(() => {
    if (farmerQuery.length < 3) { setFarmerResults([]); setShowFarmerDrop(false); return; }
    const t = setTimeout(async () => {
      setFarmerSearching(true);
      try {
        const data = await fetch(`/api/farmers/search?q=${encodeURIComponent(farmerQuery)}`).then(r => r.json());
        setFarmerResults(data);
        setShowFarmerDrop(data.length > 0);
      } catch { /* ignore */ }
      setFarmerSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [farmerQuery]);

  function selectFarmer(f: FarmerResult) {
    setSelectedFarmer(f); setFarmerQuery(f.full_name); setShowFarmerDrop(false);
  }
  function clearFarmer() {
    setSelectedFarmer(null); setFarmerQuery(""); setFarmerResults([]);
  }

  /* ── cart helpers ── */
  const addFromCatalog = useCallback((p: Product) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.id === p.id);
      if (idx >= 0) {
        const item = prev[idx];
        if (item.stock !== null && item.qty >= item.stock) {
          toast.error("Max stock reached"); return prev;
        }
        return prev.map((c, i) => i === idx ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, {
        id: p.id, name: p.name, category: p.category.replace(/_/g, " "),
        qty: 1, price: p.price, unit: p.unit, stock: p.stock, isManual: false,
      }];
    });
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    setCart(prev =>
      prev.map(c => c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c)
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setCart(prev => prev.filter(c => c.id !== id));
  }, []);

  function addManualItem() {
    if (!manual.name.trim()) { toast.error("Item name required"); return; }
    if (manual.qty <= 0)     { toast.error("Qty must be > 0"); return; }
    if (manual.price < 0)    { toast.error("Price cannot be negative"); return; }
    const id = `manual-${Date.now()}`;
    setCart(prev => [...prev, {
      id, name: manual.name.trim(), category: manual.category.trim(),
      qty: manual.qty, price: manual.price, unit: manual.unit,
      stock: null, isManual: true,
    }]);
    setManual({ name: "", category: "", qty: 1, price: 0, unit: "piece" });
    setShowManual(false);
  }

  /* ── totals ── */
  const subtotal = cart.reduce((s, c) => s + c.qty * c.price, 0);

  /* ── checkout ── */
  async function checkout(type: CheckoutType) {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    setProcessing(true);

    const isCashSale  = type === "cash_sale";
    const isQuotation = type === "quotation";

    const noteParts = [
      custMode === "walkin" && walkInName  ? `Customer: ${walkInName}`  : "",
      custMode === "walkin" && walkInPhone ? `Phone: ${walkInPhone}`    : "",
      notes,
    ].filter(Boolean);

    const payload = {
      order_type:      "mixed",
      channel:         "pos",
      status:          isCashSale ? "delivered" : isQuotation ? "draft" : "confirmed",
      amount_paid:     isCashSale ? subtotal : 0,
      subtotal,
      discount_amount: 0,
      total_amount:    subtotal,
      farmer_id:       custMode === "farmer" && selectedFarmer ? selectedFarmer.id : null,
      product_details: cart.map(c => ({
        name: c.name, category: c.category, qty: c.qty, price: c.price, unit: c.unit,
      })),
      notes: noteParts.join(" | ") || null,
    };

    const res = await fetch("/api/orders", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    setProcessing(false);

    if (!res.ok) {
      const b = await res.json();
      toast.error(b.error ?? "Order failed");
      return;
    }

    const { id, order_number } = await res.json();
    const printType = isCashSale ? "receipt" : isQuotation ? "quotation" : "invoice";

    setLastOrder({ id, number: order_number, type });
    window.open(`/print/order/${id}?type=${printType}`, "_blank");
    loadProducts(); // refresh stock counts
  }

  function newSale() {
    setCart([]); setLastOrder(null); setWalkInName(""); setWalkInPhone("");
    setNotes(""); clearFarmer(); setCustMode("walkin");
    searchRef.current?.focus();
  }

  /* ── filtered products ── */
  const visible = products.filter(p => {
    const matchCat  = catFilter === "all" || p.category === catFilter;
    const matchText = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchText;
  });

  const categories = ["all", ...Array.from(new Set(products.map(p => p.category)))];

  /* ── render ── */
  return (
    <div className="page-enter h-full">
      {/* Page title */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Sales Terminal</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {depotName ? `${depotName}` : "Build a cart, then choose Cash Sale, Invoice, or Quotation"}
          </p>
        </div>
        <Link
          href="/depot/orders"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <FileText size={14} /> View Orders
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-5 items-start">

        {/* ══════════════ LEFT: product catalog ══════════════ */}
        <div className="space-y-4">
          {/* Search + filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products…"
                className="pl-9 pr-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setCatFilter(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    catFilter === c ? "bg-edos-600 text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c === "all" ? "All" : c.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          {loadingProds ? (
            <div className="flex items-center justify-center h-52">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 bg-card border border-border rounded-2xl text-muted-foreground text-sm gap-2">
              <p className="font-medium">{products.length === 0 ? "No stock in depot" : "No products match"}</p>
              {products.length === 0 && (
                <p className="text-xs text-center max-w-xs">
                  Add stock via Inventory → Chicks / Eggs / Feed / Vaccines
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {visible.map(p => {
                const inCart = cart.find(c => c.id === p.id);
                return (
                  <motion.button
                    key={p.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => addFromCatalog(p)}
                    className={`text-left rounded-2xl border p-3.5 transition-all hover:shadow-sm ${
                      inCart
                        ? "border-edos-400 bg-edos-50 shadow-sm"
                        : "border-border bg-card hover:border-edos-300"
                    }`}
                  >
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${CAT_COLORS[p.category] ?? "bg-gray-100 text-gray-600"}`}>
                      {p.category.replace(/_/g, " ")}
                    </span>
                    <p className="text-xs font-medium mt-2 leading-tight line-clamp-2">{p.name}</p>
                    <p className="text-sm font-bold text-edos-700 mt-1">{formatCurrency(p.price)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {inCart
                        ? <span className="text-edos-600 font-semibold">× {inCart.qty} in cart</span>
                        : `${p.stock} ${p.unit}s`}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* ══════════════ RIGHT: cart + customer + checkout ══════════════ */}
        <div className="lg:sticky lg:top-6 space-y-4">

          {/* ── Cart ── */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <ShoppingCart size={16} className="text-edos-600" />
              <h2 className="font-semibold text-sm">Cart</h2>
              {cart.length > 0 && (
                <span className="ml-auto bg-edos-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                  {cart.reduce((s, c) => s + c.qty, 0)}
                </span>
              )}
            </div>

            {/* Items */}
            <div className="max-h-[280px] overflow-y-auto divide-y divide-border">
              <AnimatePresence>
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 px-4">
                    Tap products to add to cart
                  </p>
                ) : cart.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    className="flex items-center gap-2 px-4 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatCurrency(item.price)} × {item.qty} {item.unit}
                        {item.isManual && <span className="ml-1 text-edos-500">(custom)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => updateQty(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center rounded-md bg-muted hover:bg-edos-100 transition-colors">
                        <Minus size={11} />
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{item.qty}</span>
                      <button
                        onClick={() => {
                          if (!item.isManual && item.stock !== null && item.qty >= item.stock) {
                            toast.error("Max stock"); return;
                          }
                          updateQty(item.id, 1);
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-md bg-muted hover:bg-edos-100 transition-colors">
                        <Plus size={11} />
                      </button>
                    </div>
                    <p className="text-xs font-semibold w-16 text-right shrink-0">
                      {formatCurrency(item.price * item.qty)}
                    </p>
                    <button onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-1">
                      <X size={13} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Manual item */}
            <div className="border-t border-border">
              {!showManual ? (
                <button
                  onClick={() => setShowManual(true)}
                  className="w-full flex items-center gap-1.5 px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Plus size={12} /> Add custom item
                </button>
              ) : (
                <div className="p-3 space-y-2 bg-muted/20">
                  <input
                    autoFocus
                    value={manual.name}
                    onChange={e => setManual(p => ({ ...p, name: e.target.value }))}
                    placeholder="Item name *"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <div className="grid grid-cols-3 gap-1.5">
                    <input
                      type="number" min="0.5" step="0.5"
                      value={manual.qty}
                      onChange={e => setManual(p => ({ ...p, qty: Number(e.target.value) }))}
                      placeholder="Qty"
                      className="px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <select
                      value={manual.unit}
                      onChange={e => setManual(p => ({ ...p, unit: e.target.value }))}
                      className="px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                    <input
                      type="number" min="0" step="0.01"
                      value={manual.price}
                      onChange={e => setManual(p => ({ ...p, price: Number(e.target.value) }))}
                      placeholder="Price"
                      className="px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={addManualItem}
                      className="flex-1 py-1.5 rounded-lg bg-edos-600 text-white text-xs font-medium hover:bg-edos-700 transition-colors">
                      Add
                    </button>
                    <button onClick={() => { setShowManual(false); setManual({ name: "", category: "", qty: 1, price: 0, unit: "piece" }); }}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Subtotal */}
            {cart.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                <span className="text-sm text-muted-foreground">{cart.reduce((s, c) => s + c.qty, 0)} items</span>
                <span className="font-bold text-base">{formatCurrency(subtotal)}</span>
              </div>
            )}
          </div>

          {/* ── Customer ── */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <UserCircle size={15} className="text-edos-600" />
              <h2 className="font-semibold text-sm">Customer</h2>
            </div>
            <div className="p-4 space-y-3">
              {/* Mode tabs */}
              <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
                <button
                  onClick={() => setCustMode("walkin")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    custMode === "walkin" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <User size={12} /> Walk-in
                </button>
                <button
                  onClick={() => setCustMode("farmer")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    custMode === "farmer" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <UserCircle size={12} /> Farmer
                </button>
              </div>

              {custMode === "walkin" ? (
                <div className="space-y-2">
                  <input
                    value={walkInName}
                    onChange={e => setWalkInName(e.target.value)}
                    placeholder="Customer name (optional)"
                    className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    value={walkInPhone}
                    onChange={e => setWalkInPhone(e.target.value)}
                    placeholder="Phone (optional)"
                    className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ) : (
                <div className="relative">
                  <div className="flex gap-1">
                    <input
                      value={farmerQuery}
                      onChange={e => { setFarmerQuery(e.target.value); if (!e.target.value) clearFarmer(); }}
                      placeholder="Name, ID, or phone…"
                      className="flex-1 px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {farmerQuery ? (
                      <button onClick={clearFarmer} className="px-2 rounded-xl border border-border hover:bg-muted">
                        <X size={14} />
                      </button>
                    ) : (
                      <span className="px-2 flex items-center text-muted-foreground">
                        {farmerSearching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                      </span>
                    )}
                  </div>
                  {showFarmerDrop && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
                      {farmerResults.map(f => (
                        <button key={f.id} onClick={() => selectFarmer(f)}
                          className="w-full px-3 py-2.5 text-left hover:bg-muted border-b border-border last:border-0">
                          <p className="text-sm font-medium">{f.full_name}</p>
                          <p className="text-xs text-muted-foreground">{f.id_number ? `ID: ${f.id_number}` : f.phone_number}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedFarmer && (
                    <p className="mt-1.5 text-xs font-medium text-edos-700">
                      <CheckCircle2 size={11} className="inline mr-1" />
                      {selectedFarmer.full_name}
                      {selectedFarmer.id_number && <span className="text-muted-foreground"> — {selectedFarmer.id_number}</span>}
                    </p>
                  )}
                </div>
              )}

              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notes (payment ref, special instructions…)"
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

          {/* ── Checkout buttons or Success ── */}
          {lastOrder ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {lastOrder.type === "cash_sale" ? "Cash sale recorded" : lastOrder.type === "invoice" ? "Invoice created" : "Quotation saved"}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">{lastOrder.number}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  {(["invoice", "receipt", "quotation"] as const).map(t => (
                    <a
                      key={t}
                      href={`/print/order/${lastOrder.id}?type=${t}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 rounded-xl border border-border text-xs font-medium text-center hover:bg-muted transition-colors capitalize"
                    >
                      {t}
                    </a>
                  ))}
                </div>
                <button
                  onClick={newSale}
                  className="w-full py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> New Sale
                </button>
                <Link
                  href="/depot/orders"
                  className="w-full py-2 rounded-xl border border-border text-sm text-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  View in Orders
                </Link>
              </div>
            </motion.div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold">Complete as</p>
                <p className="text-xs text-muted-foreground">Choose the transaction type</p>
              </div>
              <div className="p-3 space-y-2">
                {CHECKOUT_OPTIONS.map(({ type, label, sub, color, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => checkout(type)}
                    disabled={processing || cart.length === 0}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-40 ${color}`}
                  >
                    {processing
                      ? <Loader2 size={16} className="animate-spin" />
                      : <Icon size={16} />
                    }
                    <div className="text-left">
                      <p className="font-semibold leading-tight">{label}</p>
                      <p className="text-[11px] opacity-75">{sub}</p>
                    </div>
                    {!processing && cart.length > 0 && (
                      <span className="ml-auto font-bold">{formatCurrency(subtotal)}</span>
                    )}
                  </button>
                ))}

                {cart.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground pt-1">
                    Add items to the cart first
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Clear cart */}
          {cart.length > 0 && !lastOrder && (
            <button
              onClick={() => setCart([])}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors border border-border"
            >
              <Trash2 size={12} /> Clear cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
