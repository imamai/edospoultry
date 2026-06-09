import axios from "axios";
import { createServiceClient } from "@/lib/supabase/server";
import QRCode from "qrcode";

const BASE_URL = process.env.ETIMS_BASE_URL!;
const PIN = process.env.ETIMS_PIN!;
const DEVICE_SN = process.env.ETIMS_DEVICE_SN!;
const BRANCH_ID = process.env.ETIMS_BRANCH_ID!;

interface EtimsInvoiceData {
  orderId: string;
  organizationId: string;
  invoiceNumber: string;
  buyerName: string;
  buyerPin?: string;
  items: { name: string; qty: number; unitPrice: number; taxCode: string }[];
  totalAmount: number;
}

function buildEtimsPayload(data: EtimsInvoiceData) {
  return {
    tpin: PIN,
    bhfId: BRANCH_ID,
    dvcSrNo: DEVICE_SN,
    cisInvcNo: data.invoiceNumber,
    orgInvcNo: data.invoiceNumber,
    custTpin: data.buyerPin ?? "",
    custNm: data.buyerName,
    salesSttsCd: "02",
    cfmDt: new Date().toISOString().replace("T", " ").slice(0, 19),
    salesDt: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    stockRlsDt: "",
    cnclReqDt: "",
    cnclDt: "",
    rfdDt: "",
    pmtTyCd: "01",
    rcptTyCd: "S",
    prchrAcptcYn: "N",
    remark: "EdosHatch Sale",
    saleCtyCd: "1",
    lpoNumber: "",
    currencyTyCd: "KES",
    exchangeRt: "1",
    taxblAmtA: String(data.totalAmount),
    taxblAmtB: "0.00",
    taxblAmtC: "0.00",
    taxblAmtD: "0.00",
    taxblAmtE: "0.00",
    taxRtA: "16.00",
    taxRtB: "8.00",
    taxRtC: "0.00",
    taxRtD: "0.00",
    taxRtE: "0.00",
    taxAmtA: String(Math.round(data.totalAmount * 16 / 116 * 100) / 100),
    taxAmtB: "0.00",
    taxAmtC: "0.00",
    taxAmtD: "0.00",
    taxAmtE: "0.00",
    totItemCnt: data.items.length,
    totTaxblAmt: String(data.totalAmount),
    totTaxAmt: String(Math.round(data.totalAmount * 16 / 116 * 100) / 100),
    totAmt: String(data.totalAmount),
    itemList: data.items.map((item, i) => ({
      itemSeq: i + 1,
      itemCd: `EDOS-${i + 1}`,
      itemClsCd: "51101500",
      itemNm: item.name,
      bcd: "",
      pkgUnitCd: "NT",
      pkg: "1",
      qtyUnitCd: "U",
      qty: String(item.qty),
      prc: String(item.unitPrice),
      splyAmt: String(item.qty * item.unitPrice),
      dcRt: "0",
      dcAmt: "0",
      taxTyCd: item.taxCode,
      taxblAmt: String(item.qty * item.unitPrice),
      taxAmt: String(Math.round(item.qty * item.unitPrice * 16 / 116 * 100) / 100),
      totAmt: String(item.qty * item.unitPrice),
    })),
  };
}

export async function generateEtimsInvoice(data: EtimsInvoiceData) {
  const supabase = createServiceClient();
  const payload = buildEtimsPayload(data);

  // Create invoice record first
  const { data: invoice, error } = await supabase
    .from("etims_invoices")
    .insert({
      organization_id: data.organizationId,
      order_id: data.orderId,
      invoice_number: data.invoiceNumber,
      kra_validation_status: "pending",
      request_payload: payload,
    })
    .select()
    .single();

  if (error || !invoice) throw new Error("Failed to create eTIMS invoice record");

  try {
    const res = await axios.post(
      `${BASE_URL}/trnsSalesOsdc`,
      payload,
      { headers: { "Content-Type": "application/json" }, timeout: 15_000 }
    );

    const kraInvoiceNo = res.data?.data?.rcptSign ?? res.data?.rcptNo ?? "";
    const qrData = `${PIN}|${data.invoiceNumber}|${kraInvoiceNo}|${data.totalAmount}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 200 });

    await supabase
      .from("etims_invoices")
      .update({
        kra_invoice_number: kraInvoiceNo,
        kra_validation_status: "validated",
        qr_code_data: qrData,
        qr_code_url: qrCodeDataUrl,
        response_payload: res.data,
        validated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    return { success: true, invoiceId: invoice.id, kraInvoiceNo, qrCodeDataUrl };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabase
      .from("etims_invoices")
      .update({ kra_validation_status: "error", error_message: message, retry_count: 1 })
      .eq("id", invoice.id);

    // Queue for retry
    await supabase.from("etims_failed_queue").insert({
      invoice_id: invoice.id,
      scheduled_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });

    throw err;
  }
}
