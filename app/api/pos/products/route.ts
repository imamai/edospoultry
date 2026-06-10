import { NextResponse } from "next/server";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";

export async function GET() {
  const { orgId, userId } = await getOrgContext();
  if (!orgId || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  // Get user's assigned depot (if any)
  const { data: profile } = await supabase
    .from("profiles")
    .select("depot_id")
    .eq("id", userId)
    .single();

  const userDepotId = (profile as { depot_id: string | null } | null)?.depot_id;

  // Get depots for this org (or just the user's depot if assigned)
  let depotQuery = supabase
    .from("depots")
    .select("id, name")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  if (userDepotId) depotQuery = depotQuery.eq("id", userDepotId);

  const { data: depots } = await depotQuery;
  const depotIds = (depots ?? []).map(d => d.id);
  const depotMap = Object.fromEntries((depots ?? []).map(d => [d.id, d.name]));

  if (!depotIds.length) {
    return NextResponse.json({ products: [], depotId: null, depotName: null });
  }

  // Fetch all inventory tables in parallel
  const [chicks, eggs, feed, vaccines] = await Promise.all([
    supabase
      .from("chick_batches")
      .select("id, batch_code, bird_category, breed, price_per_chick, available_count, depot_id")
      .in("depot_id", depotIds)
      .eq("is_active", true)
      .gt("available_count", 0),
    supabase
      .from("egg_inventory")
      .select("id, grade, quantity_trays, unit_price_per_tray, depot_id")
      .in("depot_id", depotIds)
      .gt("quantity_trays", 0),
    supabase
      .from("feed_inventory")
      .select("id, product_name, quantity_kg, unit_price_per_kg, depot_id")
      .in("depot_id", depotIds)
      .gt("quantity_kg", 0),
    supabase
      .from("vaccine_inventory")
      .select("id, vaccine_name, disease_target, quantity_doses, unit_price, depot_id")
      .in("depot_id", depotIds)
      .gt("quantity_doses", 0),
  ]);

  const products = [
    ...(chicks.data ?? []).map(c => ({
      id: c.id,
      name: `${(c.bird_category as string).replace(/_/g, " ")} Chicks${c.breed ? ` — ${c.breed}` : ""} (${c.batch_code})`,
      category: "chick" as const,
      price: Number(c.price_per_chick ?? 0),
      stock: c.available_count ?? 0,
      unit: "chick",
      depotId: c.depot_id,
      depotName: depotMap[c.depot_id] ?? "",
      inventoryTable: "chick_batches",
    })),
    ...(eggs.data ?? []).map(e => ({
      id: e.id,
      name: `Eggs — Grade ${e.grade} (tray)`,
      category: "egg_tray" as const,
      price: Number(e.unit_price_per_tray ?? 0),
      stock: Math.floor(Number(e.quantity_trays ?? 0)),
      unit: "tray",
      depotId: e.depot_id,
      depotName: depotMap[e.depot_id] ?? "",
      inventoryTable: "egg_inventory",
    })),
    ...(feed.data ?? []).map(f => ({
      id: f.id,
      name: `${f.product_name} (50 kg bag)`,
      category: "feed" as const,
      price: Number(f.unit_price_per_kg ?? 0) * 50,
      stock: Math.floor(Number(f.quantity_kg ?? 0) / 50),
      unit: "bag",
      depotId: f.depot_id,
      depotName: depotMap[f.depot_id] ?? "",
      inventoryTable: "feed_inventory",
    })),
    ...(vaccines.data ?? []).map(v => ({
      id: v.id,
      name: `${v.vaccine_name} — ${v.disease_target}`,
      category: "vaccine" as const,
      price: Number(v.unit_price ?? 0),
      stock: v.quantity_doses ?? 0,
      unit: "vial",
      depotId: v.depot_id,
      depotName: depotMap[v.depot_id] ?? "",
      inventoryTable: "vaccine_inventory",
    })),
  ];

  return NextResponse.json({
    products,
    depotId: userDepotId ?? depotIds[0] ?? null,
    depotName: userDepotId ? depotMap[userDepotId] : (depots?.[0]?.name ?? ""),
  });
}
