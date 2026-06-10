"use client";
import { useState, useEffect, useCallback } from "react";
import {
  FileText, Receipt, Quote, RefreshCw, Search,
  CheckCircle2, CreditCard, XCircle, Loader2,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/shared/PageHeader";

/* ─────────────────────────────── Types ─────────────────────────────── */

interface Order {
  id: string;
  order_number: string;
  order_date: string;
  order_type: string;
  status: string;
  channel: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  product_details: Array<{ name: string; qty: number; price: number; unit: string }>;
  created_at: string;
  farmer: { id: string; full_name: string; phone_number: string } | null;
  agent: { id: string; full_name: string } | null;
  depot: { id: string; name: string } | null;
}

interface PaymentModal {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
}

/* ─────────────────────────── Helpers ──────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  draft:      "bg-gray-100 text-gray-600",
  pending:    "bg-yellow-100 text-yellow-700",
  confirmed:  "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  dispatched: "bg-indigo-100 text-indigo-700",
  delivered:  "bg-green-100 text-green-700",
  cancelled:  "bg-red-100 text-red-600",
  refunded:   "bg-orange-100 text-orange-700",
};

/** Default print type based on order status */
function defaultDocType(status: string) {
  if (status === "draft")     return "quotation";
  if (status === "delivered") return "receipt";
  return "invoice";
}

function fmt(n: number) {
  return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

/* ─────────────────────────── Payment Modal ────────────────────────── */

function PaymentModalUI({
  modal,
  onClose,
  onDone,
}: {
  modal: PaymentModal;
  onClose: () => void;
  onDone: (updated: Partial<Order>) => void;
}) {
  const [received, setReceived] = useState(modal.balanceDue);
  const [method, setMethod]     = useState("cash");
  const [saving, setSaving]     = useState(false);

  /* How much actually gets applied to the order (can't exceed balance) */
  const applied  = Math.min(received, modal.balanceDue);
  const change   = received > modal.balanceDue ? received - modal.balanceDue : 0;
  const newPaid  = modal.amountPaid + applied;
  const fullySettled = applied >= modal.balanceDue;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (received <= 0) { toast.error("Enter the amount received"); return; }
    setSaving(true);

    const newStatus = fullySettled ? "delivered" : "confirmed";

    /* balance_due is a DB-generated column (total_amount − amount_paid).
       Never send it in the PATCH — the DB recalculates it automatically. */
    const res = await fetch(`/api/orders/${modal.orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount_paid: newPaid, status: newStatus }),
    });
    setSaving(false);

    if (!res.ok) {
      const b = await res.json();
      toast.error(b.error ?? "Failed to record payment");
      return;
    }

    if (change > 0) toast.success(`Paid — give back change of ${fmt(change)}`);
    else if (fullySettled) toast.success("Fully paid — order marked as Delivered");
    else toast.success(`Payment of ${fmt(applied)} recorded`);

    /* Compute new balance_due locally for optimistic UI update */
    onDone({
      amount_paid: newPaid,
      balance_due: modal.totalAmount - newPaid,
      status: newStatus,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border">
          <p className="font-semibold text-sm">Record Payment</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{modal.orderNumber}</p>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Summary */}
          <div className="bg-muted/40 rounded-xl p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Total</span>
              <span className="font-medium">{fmt(modal.totalAmount)}</span>
            </div>
            {modal.amountPaid > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Already Paid</span>
                <span>{fmt(modal.amountPaid)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t border-border pt-1 text-red-600">
              <span>Balance Due</span>
              <span>{fmt(modal.balanceDue)}</span>
            </div>
          </div>

          {/* Amount received */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Amount Received (KES)</label>
              <button
                type="button"
                onClick={() => setReceived(modal.balanceDue)}
                className="text-xs text-edos-600 hover:underline"
              >
                Exact amount
              </button>
            </div>
            <input
              type="number"
              min="0.01"
              step="0.01"
              /* No max — customer can hand over more (change will be calculated) */
              value={received}
              onChange={e => setReceived(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
              autoFocus
            />
          </div>

          {/* Method */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Payment Method</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="cash">Cash</option>
              <option value="mpesa_stk">M-Pesa</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit">Credit / Account</option>
            </select>
          </div>

          {/* Live feedback */}
          {received > 0 && (
            <div className={`rounded-xl p-3 text-sm space-y-1 ${change > 0 ? "bg-amber-50 border border-amber-200" : fullySettled ? "bg-green-50 border border-green-200" : "bg-blue-50 border border-blue-200"}`}>
              {change > 0 && (
                <div className="flex justify-between font-bold text-amber-800">
                  <span>Give change</span>
                  <span>{fmt(change)}</span>
                </div>
              )}
              {!fullySettled && change === 0 && (
                <div className="flex justify-between text-blue-700">
                  <span>Still owed</span>
                  <span>{fmt(modal.balanceDue - applied)}</span>
                </div>
              )}
              {fullySettled && (
                <p className="text-green-700 font-medium">Order will be marked as Delivered ✓</p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-70 transition-colors">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : change > 0 ? `Confirm (Change: ${fmt(change)})` : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ────────────────────────── Main Page ────────────────────────── */

export default function OrdersPage() {
  const [orders, setOrders]         = useState<Order[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("");
  const [transitioning, setTransit] = useState<string | null>(null);
  const [payModal, setPayModal]     = useState<PaymentModal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (statusFilter) p.set("status", statusFilter);
    const res = await fetch(`/api/orders?${p}`);
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  /* Optimistic status update in local list */
  function patchLocal(id: string, patch: Partial<Order>) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
  }

  /* Confirm draft quotation → confirmed sale */
  async function confirmSale(order: Order) {
    setTransit(order.id);
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "confirmed" }),
    });
    setTransit(null);
    if (!res.ok) { toast.error("Failed to confirm sale"); return; }
    toast.success("Quotation confirmed as sale");
    patchLocal(order.id, { status: "confirmed" });
  }

  /* Cancel order */
  async function cancelOrder(order: Order) {
    if (!confirm(`Cancel order ${order.order_number}?`)) return;
    setTransit(order.id);
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    setTransit(null);
    if (!res.ok) { toast.error("Failed to cancel order"); return; }
    toast.success("Order cancelled");
    patchLocal(order.id, { status: "cancelled" });
  }

  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      (o.farmer?.full_name ?? "").toLowerCase().includes(q) ||
      (o.farmer?.phone_number ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-enter space-y-5">
      {payModal && (
        <PaymentModalUI
          modal={payModal}
          onClose={() => setPayModal(null)}
          onDone={patch => patchLocal(payModal.orderId, patch)}
        />
      )}

      <PageHeader
        title="Orders"
        subtitle="Manage sales, confirm quotations and record payments"
        actions={
          <Link
            href="/depot/quotations/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors"
          >
            <Quote size={15} />
            New Quotation
          </Link>
        }
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-green-600" />
          Confirm Sale — converts a draft quotation into a confirmed order
        </span>
        <span className="flex items-center gap-1.5">
          <CreditCard size={12} className="text-edos-600" />
          Record Payment — marks full or partial payment received
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search order # or farmer…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-input bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-input bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          {["draft","pending","confirmed","processing","dispatched","delivered","cancelled","refunded"].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <button
          onClick={load} disabled={loading}
          className="p-2 rounded-xl border border-input bg-background hover:bg-muted transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={15} className={loading ? "animate-spin text-muted-foreground" : "text-muted-foreground"} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order #</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Items</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total / Paid</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <RefreshCw size={18} className="animate-spin inline mr-2" />Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">No orders found</td>
                </tr>
              ) : (
                filtered.map(order => {
                  const items       = Array.isArray(order.product_details) ? order.product_details : [];
                  const itemSummary = items.slice(0, 2).map(i => `${i.qty}× ${i.name}`).join(", ");
                  const more        = items.length > 2 ? ` +${items.length - 2} more` : "";
                  const isBusy      = transitioning === order.id;
                  const isDraft     = order.status === "draft";
                  const isActive    = ["pending","confirmed","processing"].includes(order.status);
                  const isCancellable = ["draft","pending","confirmed","processing"].includes(order.status);
                  const hasBalance  = order.balance_due > 0;
                  const docType     = defaultDocType(order.status);

                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      {/* Order number */}
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium text-edos-700 text-xs">{order.order_number}</span>
                        {isDraft && (
                          <span className="ml-1.5 text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                            QUOTE
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                        {fmtDate(order.order_date ?? order.created_at)}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3">
                        {order.farmer ? (
                          <div>
                            <p className="font-medium">{order.farmer.full_name}</p>
                            <p className="text-xs text-muted-foreground">{order.farmer.phone_number}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">Walk-in</span>
                        )}
                      </td>

                      {/* Items */}
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[180px] truncate">
                        {itemSummary}{more}
                      </td>

                      {/* Total / paid */}
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold">{fmt(order.total_amount)}</p>
                        {order.amount_paid > 0 && order.status !== "delivered" && (
                          <p className="text-xs text-green-700">{fmt(order.amount_paid)} paid</p>
                        )}
                        {hasBalance && order.status !== "draft" && (
                          <p className="text-xs text-red-600">{fmt(order.balance_due)} due</p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {order.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-end gap-1.5">
                          {/* Status transitions */}
                          <div className="flex items-center gap-1">
                            {isDraft && (
                              <button
                                onClick={() => confirmSale(order)}
                                disabled={isBusy}
                                title="Confirm this quotation as a real sale"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50 whitespace-nowrap"
                              >
                                {isBusy ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                                Confirm Sale
                              </button>
                            )}
                            {(isActive && hasBalance) && (
                              <button
                                onClick={() => setPayModal({
                                  orderId:     order.id,
                                  orderNumber: order.order_number,
                                  totalAmount: order.total_amount,
                                  amountPaid:  order.amount_paid,
                                  balanceDue:  order.balance_due,
                                })}
                                disabled={isBusy}
                                title="Record a payment for this order"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-edos-600 hover:bg-edos-700 text-white transition-colors disabled:opacity-50 whitespace-nowrap"
                              >
                                <CreditCard size={11} />
                                Record Payment
                              </button>
                            )}
                            {isCancellable && (
                              <button
                                onClick={() => cancelOrder(order)}
                                disabled={isBusy}
                                title="Cancel this order"
                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                              >
                                <XCircle size={11} />
                              </button>
                            )}
                          </div>

                          {/* Print documents */}
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/print/order/${order.id}?type=${docType}`}
                              target="_blank"
                              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                                docType === "quotation" ? "bg-orange-50 text-orange-700 hover:bg-orange-100" :
                                docType === "receipt"   ? "bg-green-50 text-green-700 hover:bg-green-100" :
                                "bg-blue-50 text-blue-700 hover:bg-blue-100"
                              }`}
                            >
                              {docType === "invoice"   && <FileText size={11} />}
                              {docType === "receipt"   && <Receipt size={11} />}
                              {docType === "quotation" && <Quote size={11} />}
                              {docType.charAt(0).toUpperCase() + docType.slice(1)}
                            </Link>
                            {/* Secondary print options */}
                            {docType !== "invoice" && (
                              <Link href={`/print/order/${order.id}?type=invoice`} target="_blank"
                                className="px-2 py-1 rounded-md text-[11px] font-medium text-gray-500 hover:bg-gray-100 transition-colors">
                                <FileText size={11} />
                              </Link>
                            )}
                            {docType !== "receipt" && (
                              <Link href={`/print/order/${order.id}?type=receipt`} target="_blank"
                                className="px-2 py-1 rounded-md text-[11px] font-medium text-gray-500 hover:bg-gray-100 transition-colors">
                                <Receipt size={11} />
                              </Link>
                            )}
                            {docType !== "quotation" && (
                              <Link href={`/print/order/${order.id}?type=quotation`} target="_blank"
                                className="px-2 py-1 rounded-md text-[11px] font-medium text-gray-500 hover:bg-gray-100 transition-colors">
                                <Quote size={11} />
                              </Link>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
            {filtered.length} order{filtered.length !== 1 ? "s" : ""}
            {statusFilter && ` · status: ${statusFilter}`}
          </div>
        )}
      </div>
    </div>
  );
}
