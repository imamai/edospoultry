"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Plus, Minus, Trash2, Wifi, WifiOff, CheckCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useOfflineSync } from "@/lib/hooks/useOfflineSync";
import { ConfettiBlast } from "@/components/shared/ConfettiBlast";
import { formatCurrency, formatNumber, sanitizePhone } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  category: "chick" | "egg_tray" | "feed" | "vaccine";
  price: number;
  stock: number;
  unit: string;
}

interface CartItem extends Product {
  qty: number;
}

const DEMO_PRODUCTS: Product[] = [
  { id: "p1", name: "Day-old Chicks (Broiler)", category: "chick", price: 80, stock: 500, unit: "chick" },
  { id: "p2", name: "Day-old Chicks (Layer)", category: "chick", price: 90, stock: 300, unit: "chick" },
  { id: "p3", name: "KARI Kienyeji Chicks", category: "chick", price: 120, stock: 200, unit: "chick" },
  { id: "p4", name: "Eggs — Grade A (tray)", category: "egg_tray", price: 450, stock: 150, unit: "tray" },
  { id: "p5", name: "Eggs — Grade B (tray)", category: "egg_tray", price: 380, stock: 80, unit: "tray" },
  { id: "p6", name: "Broiler Starter (50kg)", category: "feed", price: 3200, stock: 40, unit: "bag" },
  { id: "p7", name: "Layer Mash (50kg)", category: "feed", price: 2900, stock: 60, unit: "bag" },
  { id: "p8", name: "Newcastle Vaccine (100 doses)", category: "vaccine", price: 350, stock: 30, unit: "vial" },
];

const catColors: Record<string, string> = {
  chick: "bg-yellow-100 text-yellow-800",
  egg_tray: "bg-amber-100 text-amber-800",
  feed: "bg-green-100 text-green-800",
  vaccine: "bg-blue-100 text-blue-800",
};

export default function DepotPOSPage() {
  const supabase = createClient();
  const { isOnline, queueRecord, pendingCount } = useOfflineSync();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [farmerPhone, setFarmerPhone] = useState("");
  const [farmerName, setFarmerName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [products] = useState<Product[]>(DEMO_PRODUCTS);

  const totalAmount = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
      .filter(i => i.qty > 0)
    );
  }, []);

  async function lookupFarmer() {
    if (!farmerPhone) return;
    const phone = sanitizePhone(farmerPhone);
    const { data } = await supabase
      .from("farmers")
      .select("full_name")
      .eq("phone_number", phone)
      .single();
    if (data) setFarmerName(data.full_name);
    else setFarmerName("Unknown Farmer");
  }

  async function checkout() {
    if (cart.length === 0) return toast.error("Cart is empty");
    if (!farmerPhone) return toast.error("Enter farmer phone number");

    setProcessing(true);
    const orderPayload = {
      organization_id: "00000000-0000-0000-0000-000000000001",
      order_type: "mixed",
      status: "confirmed",
      total_amount: totalAmount,
      notes: `POS sale — ${farmerName || farmerPhone}`,
      farmer_phone: sanitizePhone(farmerPhone),
    };

    if (isOnline) {
      const { error } = await supabase.from("sales_orders").insert(orderPayload);
      if (error) { setProcessing(false); return toast.error(error.message); }
    } else {
      await queueRecord("sales_orders", "insert", orderPayload);
    }

    setProcessing(false);
    setSuccess(true);
    setCart([]);
    setFarmerPhone("");
    setFarmerName("");
    toast.success(`Sale of ${formatCurrency(totalAmount)} ${isOnline ? "recorded" : "queued for sync"}!`);
    setTimeout(() => setSuccess(false), 3000);
  }

  const filtered = filter === "all" ? products : products.filter(p => p.category === filter);

  return (
    <div className="page-enter">
      <ConfettiBlast trigger={success} type="basic" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Depot POS</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Point-of-sale — works offline</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${isOnline ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
          {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
          {isOnline ? "Online" : `Offline — ${pendingCount} pending`}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products */}
        <div className="lg:col-span-2 space-y-4">
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            {["all", "chick", "egg_tray", "feed", "vaccine"].map(c => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === c ? "bg-edos-600 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                {c === "all" ? "All" : c.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map(product => (
              <motion.button
                key={product.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => addToCart(product)}
                className="bg-card border border-border rounded-2xl p-4 text-left hover:border-edos-300 hover:shadow-card-hover transition-all"
              >
                <span className={`status-pill ${catColors[product.category]} mb-2 inline-block`}>
                  {product.category.replace(/_/g, " ")}
                </span>
                <p className="font-medium text-sm leading-tight">{product.name}</p>
                <p className="text-lg font-bold text-edos-700 mt-1">{formatCurrency(product.price)}</p>
                <p className="text-xs text-muted-foreground">Stock: {formatNumber(product.stock)} {product.unit}s</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col h-fit sticky top-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={18} className="text-edos-600" />
            <h3 className="font-semibold">Cart</h3>
            {cart.length > 0 && (
              <span className="ml-auto bg-edos-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {cart.reduce((s, i) => s + i.qty, 0)}
              </span>
            )}
          </div>

          {/* Farmer */}
          <div className="mb-4 space-y-2">
            <input
              type="tel"
              placeholder="Farmer phone (0712…)"
              value={farmerPhone}
              onChange={e => setFarmerPhone(e.target.value)}
              onBlur={lookupFarmer}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {farmerName && <p className="text-xs text-edos-700 font-medium">{farmerName}</p>}
          </div>

          {/* Items */}
          <div className="flex-1 space-y-2 min-h-[80px]">
            <AnimatePresence>
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Tap products to add to cart
                </p>
              ) : (
                cart.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    className="flex items-center gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} × {item.qty}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center hover:bg-edos-100 transition-colors">
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-xs font-bold">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center hover:bg-edos-100 transition-colors">
                        <Plus size={12} />
                      </button>
                    </div>
                    <p className="text-xs font-semibold w-16 text-right">{formatCurrency(item.price * item.qty)}</p>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Total */}
          {cart.length > 0 && (
            <div className="border-t border-border mt-4 pt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Items</span>
                <span>{cart.reduce((s, i) => s + i.qty, 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-edos-700">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          )}

          <button
            onClick={checkout}
            disabled={processing || cart.length === 0}
            className="mt-4 w-full py-3 rounded-xl bg-edos-600 hover:bg-edos-700 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {processing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            {processing ? "Processing…" : isOnline ? "Complete Sale" : "Queue Sale (Offline)"}
          </button>
        </div>
      </div>
    </div>
  );
}
