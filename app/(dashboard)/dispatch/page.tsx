import { createServerClient } from "@/lib/supabase/server";
import { DispatchClient } from "./DispatchClient";

export const metadata = { title: "Dispatch & Delivery" };

export default async function DispatchPage() {
  const supabase = await createServerClient();
  const { data: deliveries } = await supabase
    .from("deliveries")
    .select(`
      id, delivery_status, driver_name, driver_phone,
      gps_lat, gps_lng, estimated_delivery_at, actual_delivery_at, notes,
      sales_orders(
        order_number, total_amount,
        farmers(full_name, phone_number,
          wards(ward_name,
            subcounties(subcounty_name,
              counties(county_name)
            )
          )
        )
      )
    `)
    .in("delivery_status", ["pending", "in_transit", "delivered"])
    .order("created_at", { ascending: false })
    .limit(50);

  return <DispatchClient deliveries={deliveries ?? []} />;
}
