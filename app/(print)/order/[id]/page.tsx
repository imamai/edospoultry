"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Printer, Download, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

/* ───────── Types ───────── */
interface ProductLine {
  name: string;
  category: string;
  qty: number;
  price: number;
  unit: string;
}

interface Order {
  id: string;
  order_number: string;
  order_date: string;
  order_type: string;
  status: string;
  channel: string;
  product_details: ProductLine[];
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  created_at: string;
  farmer: { id: string; full_name: string; phone_number: string; id_number: string | null } | null;
  agent: { id: string; full_name: string; phone_number: string | null } | null;
  depot: { id: string; name: string; code: string; address: string | null; phone: string | null } | null;
  organization: { id: string; name: string; address: string | null; phone: string | null; email: string | null; logo_url: string | null; currency: string } | null;
}

type DocType = "invoice" | "receipt" | "quotation";

function fmt(n: number, currency = "KES") {
  return `${currency} ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return fmtDate(d.toISOString());
}

/* ───────── Document header config ───────── */
const DOC_CONFIG: Record<DocType, { label: string; color: string; bgColor: string }> = {
  invoice:   { label: "INVOICE",    color: "#1e3a5f", bgColor: "#eff6ff" },
  receipt:   { label: "RECEIPT",    color: "#14532d", bgColor: "#f0fdf4" },
  quotation: { label: "QUOTATION",  color: "#7c2d12", bgColor: "#fff7ed" },
};

/* ───────── Main Component ───────── */
export default function OrderPrintPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const docType: DocType = (searchParams.get("type") as DocType) ?? "invoice";
  const cfg = DOC_CONFIG[docType];

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then(r => r.ok ? r.json() : r.json().then((b: { error: string }) => Promise.reject(b.error)))
      .then(setOrder)
      .catch((e: string) => setError(e ?? "Failed to load order"))
      .finally(() => setLoading(false));
  }, [id]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-gray-500">
        <p>{error ?? "Order not found"}</p>
        <Link href="/depot/orders" className="text-sm underline">Back to Orders</Link>
      </div>
    );
  }

  const org = order.organization;
  const currency = org?.currency ?? "KES";
  const lines: ProductLine[] = Array.isArray(order.product_details) ? order.product_details : [];

  return (
    <>
      {/* ── Toolbar (hidden on print) ── */}
      <div className="print:hidden sticky top-0 z-10 flex items-center gap-3 px-6 py-3 bg-gray-50 border-b border-gray-200">
        <Link
          href="/depot/orders"
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={15} /> Back
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Link
            href={`/print/order/${id}?type=invoice`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${docType === "invoice" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            Invoice
          </Link>
          <Link
            href={`/print/order/${id}?type=receipt`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${docType === "receipt" ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            Receipt
          </Link>
          <Link
            href={`/print/order/${id}?type=quotation`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${docType === "quotation" ? "bg-orange-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            Quotation
          </Link>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <Printer size={15} />
          Print / Save PDF
        </button>
      </div>

      {/* ── Document (printed area) ── */}
      <div className="flex justify-center py-8 px-4 print:py-0 print:px-0">
        <div
          ref={printRef}
          className="w-full max-w-3xl bg-white print:max-w-none"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* ─ Header ─ */}
          <div
            className="flex items-start justify-between p-8 print:p-6"
            style={{ borderBottom: `3px solid ${cfg.color}` }}
          >
            {/* Company info */}
            <div className="space-y-0.5">
              {org?.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={org.logo_url} alt={org.name} className="h-12 mb-2 object-contain" />
              )}
              <h1 className="text-xl font-bold" style={{ color: cfg.color }}>
                {org?.name ?? "EdosHatch"}
              </h1>
              {org?.address && <p className="text-sm text-gray-500">{org.address}</p>}
              {org?.phone  && <p className="text-sm text-gray-500">{org.phone}</p>}
              {org?.email  && <p className="text-sm text-gray-500">{org.email}</p>}
              {order.depot && (
                <p className="text-xs text-gray-400 mt-1">Depot: {order.depot.name}</p>
              )}
            </div>

            {/* Document type badge + meta */}
            <div className="text-right">
              <div
                className="inline-block px-4 py-1.5 rounded-lg text-white font-bold text-lg tracking-widest mb-3"
                style={{ backgroundColor: cfg.color }}
              >
                {cfg.label}
              </div>
              <div className="space-y-1">
                <div className="flex justify-end gap-6 text-sm">
                  <span className="text-gray-400">Number</span>
                  <span className="font-semibold text-gray-800">{order.order_number}</span>
                </div>
                <div className="flex justify-end gap-6 text-sm">
                  <span className="text-gray-400">Date</span>
                  <span className="text-gray-700">{fmtDate(order.order_date ?? order.created_at)}</span>
                </div>
                {docType === "invoice" && (
                  <div className="flex justify-end gap-6 text-sm">
                    <span className="text-gray-400">Due</span>
                    <span className="text-gray-700">{addDays(order.order_date ?? order.created_at, 7)}</span>
                  </div>
                )}
                {docType === "quotation" && (
                  <div className="flex justify-end gap-6 text-sm">
                    <span className="text-gray-400">Valid Until</span>
                    <span className="text-gray-700">{addDays(order.order_date ?? order.created_at, 30)}</span>
                  </div>
                )}
                {docType === "receipt" && (
                  <div className="flex justify-end gap-6 text-sm">
                    <span className="text-gray-400">Paid</span>
                    <span className="font-semibold text-green-700">{fmtDate(order.order_date ?? order.created_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─ Bill To / Sold By ─ */}
          <div className="grid grid-cols-2 gap-8 px-8 py-5 print:px-6 bg-gray-50/50">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                {docType === "quotation" ? "Quoted To" : "Bill To"}
              </p>
              {order.farmer ? (
                <div className="space-y-0.5">
                  <p className="font-semibold text-gray-800">{order.farmer.full_name}</p>
                  <p className="text-sm text-gray-600">{order.farmer.phone_number}</p>
                  {order.farmer.id_number && (
                    <p className="text-sm text-gray-500">ID: {order.farmer.id_number}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Walk-in customer</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Served By</p>
              <div className="space-y-0.5">
                <p className="font-semibold text-gray-800">{order.agent?.full_name ?? "—"}</p>
                {order.depot && (
                  <p className="text-sm text-gray-600">{order.depot.name}</p>
                )}
                {order.depot?.phone && (
                  <p className="text-sm text-gray-500">{order.depot.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* ─ Line Items Table ─ */}
          <div className="px-8 py-4 print:px-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ backgroundColor: cfg.color }} className="text-white">
                  <th className="text-left py-2.5 px-3 font-semibold rounded-tl-md w-8">#</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Description</th>
                  <th className="text-center py-2.5 px-3 font-semibold w-20">Qty</th>
                  <th className="text-center py-2.5 px-3 font-semibold w-16">Unit</th>
                  <th className="text-right py-2.5 px-3 font-semibold w-28">Unit Price</th>
                  <th className="text-right py-2.5 px-3 font-semibold rounded-tr-md w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400 italic text-sm">
                      No line items
                    </td>
                  </tr>
                ) : (
                  lines.map((line, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100"
                      style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#fafafa" }}
                    >
                      <td className="py-3 px-3 text-gray-400">{i + 1}</td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-gray-800">{line.name}</span>
                        {line.category && (
                          <span className="ml-2 text-xs text-gray-400 capitalize">{line.category}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-gray-700">{line.qty}</td>
                      <td className="py-3 px-3 text-center text-gray-500 capitalize text-xs">{line.unit}</td>
                      <td className="py-3 px-3 text-right text-gray-700">
                        {fmt(line.price, currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-gray-800">
                        {fmt(line.price * line.qty, currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ─ Totals ─ */}
          <div className="px-8 pb-6 print:px-6 flex justify-end">
            <div className="w-72 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600 py-1">
                <span>Subtotal</span>
                <span>{fmt(order.subtotal, currency)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-red-600 py-1">
                  <span>Discount</span>
                  <span>− {fmt(order.discount_amount, currency)}</span>
                </div>
              )}
              <div
                className="flex justify-between font-bold text-base py-2 px-3 rounded-lg mt-2"
                style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
              >
                <span>TOTAL</span>
                <span>{fmt(order.total_amount, currency)}</span>
              </div>
              {docType === "receipt" && (
                <>
                  <div className="flex justify-between text-sm text-green-700 py-1">
                    <span>Amount Paid</span>
                    <span>{fmt(order.amount_paid, currency)}</span>
                  </div>
                  {order.balance_due > 0 && (
                    <div className="flex justify-between text-sm text-red-600 font-medium py-1">
                      <span>Balance Due</span>
                      <span>{fmt(order.balance_due, currency)}</span>
                    </div>
                  )}
                </>
              )}
              {docType === "invoice" && order.amount_paid > 0 && (
                <>
                  <div className="flex justify-between text-sm text-green-700 py-1">
                    <span>Amount Paid</span>
                    <span>{fmt(order.amount_paid, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium py-1" style={{ color: cfg.color }}>
                    <span>Balance Due</span>
                    <span>{fmt(order.balance_due, currency)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ─ PAID Stamp (receipt only) ─ */}
          {docType === "receipt" && order.amount_paid >= order.total_amount && (
            <div className="flex justify-center pb-2">
              <div
                className="border-4 rounded-xl px-10 py-2 text-3xl font-black tracking-widest rotate-[-8deg] opacity-40"
                style={{ borderColor: "#16a34a", color: "#16a34a" }}
              >
                PAID
              </div>
            </div>
          )}

          {/* ─ Notes ─ */}
          {order.notes && (
            <div className="mx-8 mb-4 print:mx-6 p-4 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-800">
              <span className="font-semibold">Notes: </span>{order.notes}
            </div>
          )}

          {/* ─ Footer ─ */}
          <div
            className="mx-8 mb-8 print:mx-6 print:mb-4 rounded-xl p-5 text-center text-xs text-gray-400 space-y-1"
            style={{ backgroundColor: cfg.bgColor }}
          >
            {docType === "invoice" && (
              <p className="font-medium" style={{ color: cfg.color }}>
                Payment is due within 7 days of invoice date.
              </p>
            )}
            {docType === "quotation" && (
              <p className="font-medium" style={{ color: cfg.color }}>
                This quotation is valid for 30 days from the date of issue. Prices subject to change.
              </p>
            )}
            {docType === "receipt" && (
              <p className="font-medium" style={{ color: cfg.color }}>
                Thank you for your purchase! Goods sold are not returnable unless defective.
              </p>
            )}
            <p>{org?.name} · {org?.phone ?? ""} · {org?.email ?? ""}</p>
            {org?.address && <p>{org.address}</p>}
          </div>

          {/* ─ Print page break hint ─ */}
          <div className="hidden print:block" style={{ pageBreakAfter: "always" }} />
        </div>
      </div>

      {/* Global print styles */}
      <style jsx global>{`
        @media print {
          @page { margin: 0.5in; size: A4; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  );
}
