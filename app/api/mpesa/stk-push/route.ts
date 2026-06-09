import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { initiateStkPush } from "@/lib/mpesa/daraja";
import { sanitizePhone } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  phone_number: z.string().min(9),
  amount: z.number().positive(),
  order_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  description: z.string().optional(),
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

  const { phone_number, amount, order_id, organization_id, description } = parsed.data;

  try {
    const result = await initiateStkPush({
      phoneNumber: sanitizePhone(phone_number),
      amount,
      orderId: order_id,
      organizationId: organization_id,
      description,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "STK Push failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
