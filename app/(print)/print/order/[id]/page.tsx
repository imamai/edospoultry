"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2, Pencil, Check, Download, FileDown } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import type { PDFProps } from "./OrderPDFDoc";

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

/* Editable overrides — only what the user has changed locally for printing */
interface Overrides {
  billToName: string;
  billToPhone: string;
  notes: string;
  lines: Array<{ name: string; qty: number; price: number; unit: string; category: string }>;
}

type DocType = "invoice" | "receipt" | "quotation";

const DOC_CONFIG: Record<DocType, { label: string; color: string; bgColor: string }> = {
  invoice:   { label: "INVOICE",   color: "#1e3a5f", bgColor: "#eff6ff" },
  receipt:   { label: "RECEIPT",   color: "#14532d", bgColor: "#f0fdf4" },
  quotation: { label: "QUOTATION", color: "#7c2d12", bgColor: "#fff7ed" },
};

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

/* ── Editable text span ── */
function E({
  value, onChange, editing, placeholder = "—", bold, green, small, className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  editing: boolean;
  placeholder?: string;
  bold?: boolean;
  green?: boolean;
  small?: boolean;
  className?: string;
}) {
  const cls = [
    bold  ? "font-semibold text-gray-800" : "",
    green ? "font-semibold text-green-700" : "",
    small ? "text-sm text-gray-600" : "",
    className,
  ].filter(Boolean).join(" ");

  if (!editing) return <span className={cls}>{value || placeholder}</span>;

  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${cls} border-b border-dashed border-gray-400 bg-transparent focus:outline-none focus:border-edos-500 min-w-[80px]`}
    />
  );
}

/* ───────── Component ───────── */
export default function OrderPrintPage() {
  const { id }      = useParams<{ id: string }>();
  const sp          = useSearchParams();
  const docType: DocType = (sp.get("type") as DocType) ?? "invoice";
  const cfg         = DOC_CONFIG[docType];

  const [order, setOrder]     = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [ov, setOv]           = useState<Overrides | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  /* ── Download real PDF (opens in system PDF reader when saved) ── */
  const downloadPDF = useCallback(async () => {
    if (!order || !ov) return;
    setGenerating(true);
    try {
      const [{ pdf }, { OrderPDFDoc }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./OrderPDFDoc"),
      ]);
      const props: PDFProps = { order: order as PDFProps["order"], ov, docType };
      const blob = await pdf(<OrderPDFDoc {...props} />).toBlob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${docType}-${order.order_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error("PDF generation failed — try Print instead");
    }
    setGenerating(false);
  }, [order, ov, docType]);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then(r => r.ok ? r.json() : r.json().then((b: { error: string }) => Promise.reject(b.error)))
      .then((o: Order) => {
        setOrder(o);
        const lines: Order["product_details"] = Array.isArray(o.product_details) ? o.product_details : [];
        setOv({
          billToName:  o.farmer?.full_name ?? "",
          billToPhone: o.farmer?.phone_number ?? "",
          notes:       o.notes ?? "",
          lines: lines.map(l => ({ ...l })),
        });
      })
      .catch((e: string) => setError(e ?? "Failed to load order"))
      .finally(() => setLoading(false));
  }, [id]);

  /* ── Excel export ── */
  const exportExcel = useCallback(() => {
    if (!order || !ov) return;
    const org   = order.organization;
    const currency = org?.currency ?? "KES";

    const wb = XLSX.utils.book_new();

    /* Header rows */
    const headerRows = [
      [org?.name ?? "EdosHatch"],
      [org?.address ?? ""],
      [org?.phone ?? "", "", org?.email ?? ""],
      [],
      [cfg.label],
      ["Number:", order.order_number,  "", "Date:", fmtDate(order.order_date ?? order.created_at)],
      docType === "invoice"   ? ["Due:",       addDays(order.order_date ?? order.created_at, 7)]   : [],
      docType === "quotation" ? ["Valid Until:", addDays(order.order_date ?? order.created_at, 30)] : [],
      [],
      ["Bill To:"],
      [ov.billToName],
      [ov.billToPhone],
      [],
      ["#", "Description", "Category", "Qty", "Unit", `Unit Price (${currency})`, `Amount (${currency})`],
    ];

    const lineRows = ov.lines.map((l, i) => [
      i + 1,
      l.name,
      l.category,
      l.qty,
      l.unit,
      l.price,
      l.qty * l.price,
    ]);

    const subtotalVal = ov.lines.reduce((s, l) => s + l.qty * l.price, 0);

    const footerRows = [
      [],
      ["", "", "", "", "", "Subtotal",       subtotalVal],
      order.discount_amount > 0
        ? ["", "", "", "", "", "Discount", -order.discount_amount]
        : [],
      ["", "", "", "", "", "TOTAL",          order.total_amount],
      order.amount_paid > 0
        ? ["", "", "", "", "", "Amount Paid", order.amount_paid]
        : [],
      order.balance_due > 0
        ? ["", "", "", "", "", "Balance Due",  order.balance_due]
        : [],
      [],
      ov.notes ? ["Notes:", ov.notes] : [],
    ].filter(r => r.length > 0);

    const wsData = [...headerRows, ...lineRows, ...footerRows];
    const ws     = XLSX.utils.aoa_to_sheet(wsData);

    /* Column widths */
    ws["!cols"] = [
      { wch: 4 }, { wch: 36 }, { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 18 }, { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, cfg.label);

    const fname = `${cfg.label.toLowerCase()}-${order.order_number}.xlsx`;
    XLSX.writeFile(wb, fname);
  }, [order, ov, cfg, docType]);

  /* ── update single line field ── */
  const setLine = (i: number, key: keyof Overrides["lines"][0], val: string | number) =>
    setOv(prev => prev ? {
      ...prev,
      lines: prev.lines.map((l, idx) => idx === i ? { ...l, [key]: val } : l),
    } : prev);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="animate-spin text-gray-400" size={32} />
    </div>
  );

  if (error || !order || !ov) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-gray-500">
      <p>{error ?? "Order not found"}</p>
      <Link href="/depot/orders" className="text-sm underline">Back to Orders</Link>
    </div>
  );

  const org      = order.organization;
  const currency = org?.currency ?? "KES";

  const displaySubtotal = ov.lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);
  const displayTotal    = displaySubtotal - (order.discount_amount ?? 0);

  return (
    <>
      {/* ── Toolbar (hidden on print) ── */}
      <div className="print:hidden sticky top-0 z-10 flex items-center gap-3 px-6 py-3 bg-gray-50 border-b border-gray-200 flex-wrap">
        <Link href="/depot/orders" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={15} /> Back
        </Link>
        <div className="flex-1" />

        {/* Doc type switcher */}
        <div className="flex items-center gap-1.5">
          {(["invoice", "receipt", "quotation"] as DocType[]).map(t => (
            <Link
              key={t}
              href={`/print/order/${id}?type=${t}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                docType === t ? "text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              style={docType === t ? { backgroundColor: cfg.color } : {}}
            >
              {t}
            </Link>
          ))}
        </div>

        {/* Edit toggle */}
        <button
          onClick={() => setEditing(e => !e)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            editing
              ? "bg-edos-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {editing ? <><Check size={14} /> Done Editing</> : <><Pencil size={14} /> Edit</>}
        </button>

        {/* Excel */}
        <button
          onClick={exportExcel}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors"
        >
          <Download size={14} /> Excel
        </button>

        {/* Browser print (secondary) */}
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
        >
          <Printer size={14} /> Print
        </button>

        {/* Download PDF — opens in system PDF reader */}
        <button
          onClick={downloadPDF}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-60"
        >
          {generating
            ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
            : <><FileDown size={15} /> Download PDF</>}
        </button>
      </div>

      {editing && (
        <div className="print:hidden bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-800 flex items-center gap-2">
          <Pencil size={12} />
          Edit mode — changes are for this print only and are not saved to the database.
        </div>
      )}

      {/* ── Document body ── */}
      <div className="flex justify-center py-8 px-4 print:py-0 print:px-0">
        <div
          ref={printRef}
          className="w-full max-w-3xl bg-white shadow-sm print:shadow-none print:max-w-none"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Header */}
          <div
            className="flex items-start justify-between p-8 print:p-6"
            style={{ borderBottom: `3px solid ${cfg.color}` }}
          >
            <div className="space-y-0.5">
              {org?.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={org.logo_url} alt={org.name} className="h-12 mb-2 object-contain" />
              )}
              <h1 className="text-xl font-bold" style={{ color: cfg.color }}>
                {org?.name ?? "EdosHatch"}
              </h1>
              {org?.address && <p className="text-sm text-gray-500">{org.address}</p>}
              {org?.phone   && <p className="text-sm text-gray-500">{org.phone}</p>}
              {org?.email   && <p className="text-sm text-gray-500">{org.email}</p>}
              {order.depot  && <p className="text-xs text-gray-400 pt-1">Depot: {order.depot.name}</p>}
            </div>

            <div className="text-right">
              <div
                className="inline-block px-5 py-1.5 rounded-lg text-white font-bold text-lg tracking-widest mb-3"
                style={{ backgroundColor: cfg.color }}
              >
                {cfg.label}
              </div>
              <div className="space-y-1">
                {[
                  { label: "Number", value: order.order_number, bold: true },
                  { label: "Date",   value: fmtDate(order.order_date ?? order.created_at) },
                  docType === "invoice"   ? { label: "Due",         value: addDays(order.order_date ?? order.created_at, 7) }   : null,
                  docType === "quotation" ? { label: "Valid Until",  value: addDays(order.order_date ?? order.created_at, 30) }  : null,
                  docType === "receipt"   ? { label: "Paid On",      value: fmtDate(order.order_date ?? order.created_at), green: true } : null,
                ].filter(Boolean).map((row, i) => row && (
                  <div key={i} className="flex justify-end gap-8 text-sm">
                    <span className="text-gray-400">{row.label}</span>
                    <span className={row.bold ? "font-semibold text-gray-800" : row.green ? "font-semibold text-green-700" : "text-gray-700"}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bill To / Served By */}
          <div className="grid grid-cols-2 gap-8 px-8 py-5 print:px-6 bg-gray-50">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                {docType === "quotation" ? "Quoted To" : "Bill To"}
              </p>
              <div className="space-y-0.5">
                <E
                  value={ov.billToName}
                  onChange={v => setOv(p => p ? { ...p, billToName: v } : p)}
                  editing={editing}
                  bold
                  placeholder="Walk-in customer"
                />
                {(ov.billToPhone || editing) && (
                  <div>
                    <E
                      value={ov.billToPhone}
                      onChange={v => setOv(p => p ? { ...p, billToPhone: v } : p)}
                      editing={editing}
                      small
                      placeholder="Phone number"
                    />
                  </div>
                )}
                {order.farmer?.id_number && (
                  <p className="text-sm text-gray-500">ID: {order.farmer.id_number}</p>
                )}
                {!ov.billToName && !editing && (
                  <p className="text-sm text-gray-400 italic">Walk-in customer</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Served By</p>
              <div className="space-y-0.5">
                <p className="font-semibold text-gray-800">{order.agent?.full_name ?? "—"}</p>
                {order.depot?.name  && <p className="text-sm text-gray-600">{order.depot.name}</p>}
                {order.depot?.phone && <p className="text-sm text-gray-500">{order.depot.phone}</p>}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="px-8 py-4 print:px-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-white" style={{ backgroundColor: cfg.color }}>
                  <th className="text-left py-2.5 px-3 font-semibold w-8 rounded-tl">#</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Description</th>
                  <th className="text-center py-2.5 px-3 font-semibold w-16">Qty</th>
                  <th className="text-center py-2.5 px-3 font-semibold w-20">Unit</th>
                  <th className="text-right py-2.5 px-3 font-semibold w-32">Unit Price</th>
                  <th className="text-right py-2.5 px-3 font-semibold w-32 rounded-tr">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ov.lines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 italic">No items</td>
                  </tr>
                ) : ov.lines.map((line, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100"
                    style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}
                  >
                    <td className="py-3 px-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="py-3 px-3">
                      {editing ? (
                        <input
                          value={line.name}
                          onChange={e => setLine(i, "name", e.target.value)}
                          className="font-medium text-gray-800 border-b border-dashed border-gray-400 bg-transparent focus:outline-none w-full"
                        />
                      ) : (
                        <>
                          <span className="font-medium text-gray-800">{line.name}</span>
                          {line.category && <span className="ml-2 text-xs text-gray-400 capitalize">{line.category}</span>}
                        </>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {editing ? (
                        <input
                          type="number" min="0.5" step="0.5"
                          value={line.qty}
                          onChange={e => setLine(i, "qty", Number(e.target.value))}
                          className="w-14 text-center text-gray-700 border-b border-dashed border-gray-400 bg-transparent focus:outline-none"
                        />
                      ) : (
                        <span className="text-gray-700">{line.qty}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center text-gray-500 text-xs capitalize">
                      {editing ? (
                        <input
                          value={line.unit}
                          onChange={e => setLine(i, "unit", e.target.value)}
                          className="w-16 text-center text-gray-500 text-xs border-b border-dashed border-gray-400 bg-transparent focus:outline-none"
                        />
                      ) : line.unit}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {editing ? (
                        <input
                          type="number" min="0" step="0.01"
                          value={line.price}
                          onChange={e => setLine(i, "price", Number(e.target.value))}
                          className="w-24 text-right text-gray-700 border-b border-dashed border-gray-400 bg-transparent focus:outline-none"
                        />
                      ) : (
                        <span className="text-gray-700">{fmt(line.price, currency)}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-800">
                      {fmt(line.price * line.qty, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-8 pb-5 print:px-6 flex justify-end">
            <div className="w-72 divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              <div className="flex justify-between px-4 py-2 text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{fmt(displaySubtotal, currency)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between px-4 py-2 text-sm text-red-600">
                  <span>Discount</span>
                  <span>− {fmt(order.discount_amount, currency)}</span>
                </div>
              )}
              <div
                className="flex justify-between px-4 py-2.5 font-bold text-base"
                style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
              >
                <span>TOTAL</span>
                <span>{fmt(displayTotal, currency)}</span>
              </div>
              {(docType === "receipt" || (docType === "invoice" && order.amount_paid > 0)) && (
                <div className="flex justify-between px-4 py-2 text-sm text-green-700">
                  <span>Amount Paid</span>
                  <span>{fmt(order.amount_paid, currency)}</span>
                </div>
              )}
              {(docType === "receipt" || docType === "invoice") && order.balance_due > 0 && (
                <div className="flex justify-between px-4 py-2 text-sm font-semibold text-red-600">
                  <span>Balance Due</span>
                  <span>{fmt(order.balance_due, currency)}</span>
                </div>
              )}
            </div>
          </div>

          {/* PAID stamp */}
          {docType === "receipt" && order.amount_paid >= order.total_amount && (
            <div className="flex justify-center pb-3">
              <div
                className="border-4 rounded-xl px-10 py-2 text-3xl font-black tracking-[0.25em] rotate-[-8deg] opacity-30 select-none"
                style={{ borderColor: "#16a34a", color: "#16a34a" }}
              >
                PAID
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mx-8 mb-4 print:mx-6">
            {editing ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-sm font-semibold text-amber-800">Notes: </span>
                <input
                  value={ov.notes}
                  onChange={e => setOv(p => p ? { ...p, notes: e.target.value } : p)}
                  placeholder="Add notes…"
                  className="text-sm text-amber-800 bg-transparent focus:outline-none border-b border-dashed border-amber-400 w-full mt-1"
                />
              </div>
            ) : ov.notes ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-800">
                <span className="font-semibold">Notes: </span>{ov.notes}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div
            className="mx-8 mb-10 print:mx-6 print:mb-4 rounded-xl p-5 text-center text-xs space-y-1"
            style={{ backgroundColor: cfg.bgColor }}
          >
            {docType === "invoice" && (
              <p className="font-semibold text-sm" style={{ color: cfg.color }}>
                Payment is due within 7 days of invoice date.
              </p>
            )}
            {docType === "quotation" && (
              <p className="font-semibold text-sm" style={{ color: cfg.color }}>
                This quotation is valid for 30 days. Prices are subject to change without notice.
              </p>
            )}
            {docType === "receipt" && (
              <p className="font-semibold text-sm" style={{ color: cfg.color }}>
                Thank you for your purchase! Goods sold are not returnable unless defective.
              </p>
            )}
            <p className="text-gray-500">
              {org?.name}{org?.phone ? ` · ${org.phone}` : ""}{org?.email ? ` · ${org.email}` : ""}
            </p>
            {org?.address && <p className="text-gray-400">{org.address}</p>}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 0.5in; size: A4 portrait; }
          body  { background: white !important; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
}
