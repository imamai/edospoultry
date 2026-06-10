"use client";
import { Document, Page, Text, View, StyleSheet, Image as PDFImage } from "@react-pdf/renderer";

/* ── shared types ── */
interface ProductLine { name: string; category: string; qty: number; price: number; unit: string; }
interface Overrides {
  billToName: string; billToPhone: string; notes: string;
  lines: ProductLine[];
}
interface Order {
  id: string; order_number: string; order_date: string; status: string;
  subtotal: number; discount_amount: number; total_amount: number;
  amount_paid: number; balance_due: number; notes: string | null; created_at: string;
  farmer: { full_name: string; phone_number: string; id_number: string | null } | null;
  agent: { full_name: string } | null;
  depot: { name: string; phone: string | null } | null;
  organization: { name: string; address: string | null; phone: string | null; email: string | null; logo_url: string | null; currency: string } | null;
}

export interface PDFProps { order: Order; ov: Overrides; docType: "invoice" | "receipt" | "quotation"; }

const COLORS = {
  invoice:   { main: "#1e3a5f", bg: "#eff6ff" },
  receipt:   { main: "#14532d", bg: "#f0fdf4" },
  quotation: { main: "#7c2d12", bg: "#fff7ed" },
};
const LABELS = { invoice: "INVOICE", receipt: "RECEIPT", quotation: "QUOTATION" };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}
function addDays(iso: string, days: number) {
  const d = new Date(iso); d.setDate(d.getDate() + days); return fmtDate(d.toISOString());
}
function fmt(n: number, currency = "KES") {
  return `${currency} ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function makeStyles(main: string, bg: string) {
  return StyleSheet.create({
    page: { paddingHorizontal: 40, paddingVertical: 36, fontSize: 9, color: "#333" },

    /* header */
    header: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
      paddingBottom: 12, marginBottom: 14,
      borderBottomWidth: 2.5, borderBottomColor: main, borderBottomStyle: "solid",
    },
    logo: { height: 32, marginBottom: 4 },
    companyName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: main, marginBottom: 2 },
    companyLine: { fontSize: 8, color: "#666", marginBottom: 1 },
    badge: {
      backgroundColor: main, color: "#fff", fontSize: 13,
      fontFamily: "Helvetica-Bold", paddingHorizontal: 12, paddingVertical: 5,
      borderRadius: 4, marginBottom: 8, textAlign: "center", letterSpacing: 1.5,
    },
    metaRow: { flexDirection: "row", marginBottom: 2 },
    metaLabel: { fontSize: 8, color: "#999", width: 60, textAlign: "right", marginRight: 8 },
    metaVal:   { fontSize: 8, color: "#333" },
    metaValBold:  { fontSize: 8, color: "#333", fontFamily: "Helvetica-Bold" },
    metaValGreen: { fontSize: 8, color: "#16a34a", fontFamily: "Helvetica-Bold" },

    /* bill-to */
    billSection: {
      flexDirection: "row", backgroundColor: "#f9fafb",
      paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
    },
    billCol: { flex: 1 },
    secLabel: { fontSize: 7, color: "#999", fontFamily: "Helvetica-Bold", marginBottom: 5, letterSpacing: 0.8 },
    billName:   { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111", marginBottom: 2 },
    billDetail: { fontSize: 8, color: "#555", marginBottom: 1 },
    billItalic: { fontSize: 8, color: "#999" },

    /* table */
    tHead: { flexDirection: "row", backgroundColor: main, paddingHorizontal: 8, paddingVertical: 6 },
    thText: { color: "#fff", fontSize: 8, fontFamily: "Helvetica-Bold" },
    tRow: {
      flexDirection: "row", paddingHorizontal: 8, paddingVertical: 5,
      borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0", borderBottomStyle: "solid",
      backgroundColor: "#fff",
    },
    tRowAlt: {
      flexDirection: "row", paddingHorizontal: 8, paddingVertical: 5,
      borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0", borderBottomStyle: "solid",
      backgroundColor: "#fafafa",
    },
    cNum:   { width: 18 },
    cDesc:  { flex: 1 },
    cQty:   { width: 36, textAlign: "center" },
    cUnit:  { width: 44, textAlign: "center" },
    cPrice: { width: 68, textAlign: "right" },
    cAmt:   { width: 80, textAlign: "right" },
    tdText: { fontSize: 8, color: "#333" },
    tdBold: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#111" },
    tdGray: { fontSize: 7, color: "#999" },

    /* totals */
    totalsWrap: { alignItems: "flex-end", marginTop: 10, marginBottom: 14 },
    totalsBox: {
      width: 200, borderWidth: 0.5, borderColor: "#e5e7eb",
      borderStyle: "solid", borderRadius: 4,
    },
    tRowSub: {
      flexDirection: "row", justifyContent: "space-between",
      paddingHorizontal: 10, paddingVertical: 4,
      borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0", borderBottomStyle: "solid",
    },
    tSubLabel: { fontSize: 8, color: "#666" },
    tSubValue: { fontSize: 8, color: "#333" },
    tRowGrand: {
      flexDirection: "row", justifyContent: "space-between",
      paddingHorizontal: 10, paddingVertical: 6, backgroundColor: bg,
    },
    tGrandLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: main },
    tGrandValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: main },
    tRowPaid: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 4 },
    tPaidLabel: { fontSize: 8, color: "#16a34a" },
    tPaidValue: { fontSize: 8, color: "#16a34a" },
    tRowBal: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 4 },
    tBalLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#dc2626" },
    tBalValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#dc2626" },

    /* paid stamp */
    stampWrap: { alignItems: "center", marginBottom: 10 },
    stampText: {
      fontSize: 26, fontFamily: "Helvetica-Bold", color: "#16a34a", opacity: 0.3,
      borderWidth: 3, borderColor: "#16a34a", borderStyle: "solid",
      paddingHorizontal: 18, paddingVertical: 4, borderRadius: 8, letterSpacing: 8,
    },

    /* notes */
    notesBox: {
      backgroundColor: "#fffbeb", borderWidth: 0.5, borderColor: "#fde68a",
      borderStyle: "solid", borderRadius: 4, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12,
    },
    notesBold: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#92400e" },
    notesText: { fontSize: 8, color: "#92400e" },

    /* footer */
    footerBox: {
      backgroundColor: bg, paddingHorizontal: 12, paddingVertical: 10,
      borderRadius: 4, alignItems: "center",
    },
    footerMain:   { fontSize: 8, fontFamily: "Helvetica-Bold", color: main, marginBottom: 3, textAlign: "center" },
    footerDetail: { fontSize: 7, color: "#666", textAlign: "center", marginBottom: 1 },
  });
}

export function OrderPDFDoc({ order, ov, docType }: PDFProps) {
  const c      = COLORS[docType];
  const label  = LABELS[docType];
  const s      = makeStyles(c.main, c.bg);
  const org    = order.organization;
  const cur    = org?.currency ?? "KES";

  const sub    = ov.lines.reduce((acc, l) => acc + l.qty * l.price, 0);
  const total  = sub - (order.discount_amount ?? 0);
  const dateRef = order.order_date ?? order.created_at;

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            {org?.logo_url && <PDFImage src={org.logo_url} style={s.logo} />}
            <Text style={s.companyName}>{org?.name ?? "EdosHatch"}</Text>
            {org?.address && <Text style={s.companyLine}>{org.address}</Text>}
            {org?.phone   && <Text style={s.companyLine}>{org.phone}</Text>}
            {org?.email   && <Text style={s.companyLine}>{org.email}</Text>}
            {order.depot  && <Text style={s.companyLine}>Depot: {order.depot.name}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.badge}>{label}</Text>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Number</Text>
              <Text style={s.metaValBold}>{order.order_number}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Date</Text>
              <Text style={s.metaVal}>{fmtDate(dateRef)}</Text>
            </View>
            {docType === "invoice" && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Due</Text>
                <Text style={s.metaVal}>{addDays(dateRef, 7)}</Text>
              </View>
            )}
            {docType === "quotation" && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Valid Until</Text>
                <Text style={s.metaVal}>{addDays(dateRef, 30)}</Text>
              </View>
            )}
            {docType === "receipt" && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Paid On</Text>
                <Text style={s.metaValGreen}>{fmtDate(dateRef)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Bill To / Served By ── */}
        <View style={s.billSection}>
          <View style={s.billCol}>
            <Text style={s.secLabel}>{docType === "quotation" ? "QUOTED TO" : "BILL TO"}</Text>
            {ov.billToName ? (
              <>
                <Text style={s.billName}>{ov.billToName}</Text>
                {ov.billToPhone && <Text style={s.billDetail}>{ov.billToPhone}</Text>}
                {order.farmer?.id_number && <Text style={s.billDetail}>ID: {order.farmer.id_number}</Text>}
              </>
            ) : (
              <Text style={s.billItalic}>Walk-in customer</Text>
            )}
          </View>
          <View style={s.billCol}>
            <Text style={s.secLabel}>SERVED BY</Text>
            {order.agent?.full_name && <Text style={s.billName}>{order.agent.full_name}</Text>}
            {order.depot?.name  && <Text style={s.billDetail}>{order.depot.name}</Text>}
            {order.depot?.phone && <Text style={s.billDetail}>{order.depot.phone}</Text>}
          </View>
        </View>

        {/* ── Line Items Table ── */}
        <View>
          <View style={s.tHead}>
            <Text style={[s.thText, s.cNum]}>#</Text>
            <Text style={[s.thText, s.cDesc]}>Description</Text>
            <Text style={[s.thText, s.cQty]}>Qty</Text>
            <Text style={[s.thText, s.cUnit]}>Unit</Text>
            <Text style={[s.thText, s.cPrice]}>Unit Price</Text>
            <Text style={[s.thText, s.cAmt]}>Amount</Text>
          </View>
          {ov.lines.map((line, i) => (
            <View key={i} style={i % 2 === 0 ? s.tRow : s.tRowAlt}>
              <Text style={[s.tdGray, s.cNum]}>{i + 1}</Text>
              <View style={s.cDesc}>
                <Text style={s.tdBold}>{line.name}</Text>
                {line.category ? <Text style={s.tdGray}>{line.category}</Text> : null}
              </View>
              <Text style={[s.tdText, s.cQty]}>{line.qty}</Text>
              <Text style={[s.tdGray, s.cUnit]}>{line.unit}</Text>
              <Text style={[s.tdText, s.cPrice]}>{fmt(line.price, cur)}</Text>
              <Text style={[s.tdBold, s.cAmt]}>{fmt(line.price * line.qty, cur)}</Text>
            </View>
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={s.totalsWrap}>
          <View style={s.totalsBox}>
            <View style={s.tRowSub}>
              <Text style={s.tSubLabel}>Subtotal</Text>
              <Text style={s.tSubValue}>{fmt(sub, cur)}</Text>
            </View>
            {order.discount_amount > 0 && (
              <View style={s.tRowSub}>
                <Text style={[s.tSubLabel, { color: "#dc2626" }]}>Discount</Text>
                <Text style={[s.tSubValue, { color: "#dc2626" }]}>− {fmt(order.discount_amount, cur)}</Text>
              </View>
            )}
            <View style={s.tRowGrand}>
              <Text style={s.tGrandLabel}>TOTAL</Text>
              <Text style={s.tGrandValue}>{fmt(total, cur)}</Text>
            </View>
            {(docType === "receipt" || (docType === "invoice" && order.amount_paid > 0)) && (
              <View style={s.tRowPaid}>
                <Text style={s.tPaidLabel}>Amount Paid</Text>
                <Text style={s.tPaidValue}>{fmt(order.amount_paid, cur)}</Text>
              </View>
            )}
            {(docType === "receipt" || docType === "invoice") && order.balance_due > 0 && (
              <View style={s.tRowBal}>
                <Text style={s.tBalLabel}>Balance Due</Text>
                <Text style={s.tBalValue}>{fmt(order.balance_due, cur)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── PAID stamp ── */}
        {docType === "receipt" && order.amount_paid >= order.total_amount && (
          <View style={s.stampWrap}>
            <Text style={s.stampText}>PAID</Text>
          </View>
        )}

        {/* ── Notes ── */}
        {ov.notes ? (
          <View style={s.notesBox}>
            <Text><Text style={s.notesBold}>Notes: </Text><Text style={s.notesText}>{ov.notes}</Text></Text>
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={s.footerBox}>
          {docType === "invoice" && (
            <Text style={s.footerMain}>Payment is due within 7 days of invoice date.</Text>
          )}
          {docType === "quotation" && (
            <Text style={s.footerMain}>This quotation is valid for 30 days. Prices are subject to change without notice.</Text>
          )}
          {docType === "receipt" && (
            <Text style={s.footerMain}>Thank you for your purchase! Goods sold are not returnable unless defective.</Text>
          )}
          <Text style={s.footerDetail}>
            {org?.name ?? ""}
            {org?.phone ? ` · ${org.phone}` : ""}
            {org?.email ? ` · ${org.email}` : ""}
          </Text>
          {org?.address && <Text style={s.footerDetail}>{org.address}</Text>}
        </View>

      </Page>
    </Document>
  );
}
