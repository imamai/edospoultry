import { createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { DispatchClient } from "./DispatchClient";

export const metadata = { title: "Dispatch & Delivery" };

export default async function DispatchPage() {
  const { orgId } = await getOrgContext();
  const supabase = createServiceClient();

  const { data: deliveries, error: deliveriesError } = orgId
    ? await supabase
        .from("deliveries")
        .select(`
          id, status, current_lat, current_lng,
          estimated_arrival, delivery_time, route_description, notes,
          sales_orders(
            order_number, total_amount,
            farmers(full_name, phone_number,
              wards(name,
                subcounties(name,
                  counties(name)
                )
              )
            )
          )
        `)
        .eq("organization_id", orgId)
        .in("status", ["pending", "in_transit", "delivered"])
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [], error: null };

  if (deliveriesError) console.error("Deliveries query error:", deliveriesError.message);

  return <DispatchClient deliveries={deliveries ?? []} />;
}
