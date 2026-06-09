import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateEtimsInvoice } from "@/lib/etims/kra";
import { z } from "zod";

const schema = z.object({
  order_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  invoice_number: z.string().min(1),
  buyer_name: z.string().min(1),
  buyer_pin: z.string().optional(),
  total_amount: z.number().positive(),
  items: z.array(z.object({
    name: z.string(),
    qty: z.number().positive(),
    unit_price: z.number().positive(),
    tax_code: z.string().default("A"),
  })).min(1),
});

export async function POST(req: NextRequest) {
  const supabase = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { order_id, organization_id, invoice_number, buyer_name, buyer_pin, total_amount, items } = parsed.data;

  // Only generate for orders >= KES 5,000
  if (total_amount < 5000) {
    return NextResponse.json({ skipped: true, reason: "Amount below KES 5,000 threshold" });
  }

  try {
    const result = await generateEtimsInvoice({
      orderId: order_id,
      organizationId: organization_id,
      invoiceNumber: invoice_number,
      buyerName: buyer_name,
      buyerPin: buyer_pin,
      totalAmount: total_amount,
      items: items.map(i => ({ name: i.name, qty: i.qty, unitPrice: i.unit_price, taxCode: i.tax_code })),
    });
    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "eTIMS generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Retry endpoint — called by cron job
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data: pending } = await supabase
    .from("etims_failed_queue")
    .select(`
      id, invoice_id,
      etims_invoices(
        id, order_id, organization_id, invoice_number,
        request_payload,
        sales_orders(total_amount,
          farmers(full_name)
        )
      )
    `)
    .lte("scheduled_at", now)
    .is("processed_at", null)
    .limit(10);

  if (!pending?.length) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;
  for (const item of pending) {
    try {
      const invoice = item.etims_invoices as {
        id: string; order_id: string; organization_id: string; invoice_number: string;
        request_payload: Record<string, unknown>;
        sales_orders?: { total_amount: number; farmers?: { full_name: string } | null } | null;
      } | null;
      if (!invoice) continue;

      await generateEtimsInvoice({
        orderId: invoice.order_id,
        organizationId: invoice.organization_id,
        invoiceNumber: invoice.invoice_number,
        buyerName: invoice.sales_orders?.farmers?.full_name ?? "Unknown",
        totalAmount: invoice.sales_orders?.total_amount ?? 0,
        items: [{ name: "Poultry Products", qty: 1, unitPrice: invoice.sales_orders?.total_amount ?? 0, taxCode: "A" }],
      });

      await supabase
        .from("etims_failed_queue")
        .update({ processed_at: now })
        .eq("id", item.id);
      processed++;
    } catch {}
  }

  return NextResponse.json({ processed });
}
