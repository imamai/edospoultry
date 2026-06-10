import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";

interface CartItem {
  id: string;
  name: string;
  category: string;
  price: number;
  qty: number;
  unit: string;
  depotId: string;
  inventoryTable: string;
}

export async function POST(req: NextRequest) {
  const { orgId, userId } = await getOrgContext();
  if (!orgId || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { cartItems, farmerId, farmerPhone }: {
    cartItems: CartItem[];
    farmerId?: string;
    farmerPhone?: string;
  } = body;

  if (!cartItems?.length) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

  const supabase = createServiceClient();

  // Get user's assigned depot from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("depot_id")
    .eq("id", userId)
    .single();

  const depotId = (profile as { depot_id: string | null } | null)?.depot_id
    ?? cartItems[0]?.depotId;

  if (!depotId) {
    return NextResponse.json(
      { error: "No depot assigned to your account. Contact your administrator." },
      { status: 400 }
    );
  }

  // Get org slug for order number generation
  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", orgId)
    .single();

  const { data: orderNum, error: seqError } = await supabase.rpc("fn_generate_order_number", {
    org_slug: (org as { slug: string } | null)?.slug ?? "ORG",
  });

  if (seqError) return NextResponse.json({ error: seqError.message }, { status: 500 });

  const totalAmount = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

  // Create the sales order
  const { data: order, error: orderError } = await supabase
    .from("sales_orders")
    .insert({
      organization_id: orgId,
      order_number: orderNum as string,
      farmer_id: farmerId ?? null,
      agent_id: userId,
      depot_id: depotId,
      order_type: "mixed",
      product_details: cartItems.map(i => ({
        id: i.id,
        name: i.name,
        category: i.category,
        qty: i.qty,
        price: i.price,
        unit: i.unit,
        inventoryTable: i.inventoryTable,
      })),
      subtotal: totalAmount,
      total_amount: totalAmount,
      status: "confirmed",
      channel: "pos",
      notes: farmerPhone ? `POS sale — ${farmerPhone}` : "POS sale",
    })
    .select("id, order_number")
    .single();

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  // Decrement stock for each cart item
  for (const item of cartItems) {
    try {
      if (item.inventoryTable === "chick_batches") {
        const { data: cur } = await supabase
          .from("chick_batches")
          .select("available_count")
          .eq("id", item.id)
          .single();
        const updated = Math.max(0, ((cur as { available_count: number } | null)?.available_count ?? 0) - item.qty);
        await supabase.from("chick_batches").update({ available_count: updated }).eq("id", item.id);

      } else if (item.inventoryTable === "egg_inventory") {
        const { data: cur } = await supabase
          .from("egg_inventory")
          .select("quantity_trays")
          .eq("id", item.id)
          .single();
        const updated = Math.max(0, Number((cur as { quantity_trays: number } | null)?.quantity_trays ?? 0) - item.qty);
        await supabase.from("egg_inventory").update({ quantity_trays: updated }).eq("id", item.id);

      } else if (item.inventoryTable === "feed_inventory") {
        const { data: cur } = await supabase
          .from("feed_inventory")
          .select("quantity_kg")
          .eq("id", item.id)
          .single();
        // Each "bag" unit sold = 50 kg
        const updated = Math.max(0, Number((cur as { quantity_kg: number } | null)?.quantity_kg ?? 0) - item.qty * 50);
        await supabase.from("feed_inventory").update({ quantity_kg: updated }).eq("id", item.id);

      } else if (item.inventoryTable === "vaccine_inventory") {
        const { data: cur } = await supabase
          .from("vaccine_inventory")
          .select("quantity_doses")
          .eq("id", item.id)
          .single();
        const updated = Math.max(0, ((cur as { quantity_doses: number } | null)?.quantity_doses ?? 0) - item.qty);
        await supabase.from("vaccine_inventory").update({ quantity_doses: updated }).eq("id", item.id);
      }
    } catch {
      console.error(`Stock decrement failed for ${item.inventoryTable}:${item.id}`);
    }
  }

  const result = order as { id: string; order_number: string };
  return NextResponse.json({ orderId: result.id, orderNumber: result.order_number });
}
