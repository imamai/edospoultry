"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Truck, MapPin, Phone } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface Delivery {
  id: string;
  delivery_status: string;
  driver_name?: string | null;
  driver_phone?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  estimated_delivery_at?: string | null;
  actual_delivery_at?: string | null;
  notes?: string | null;
  sales_orders?: {
    order_number: string;
    total_amount: number;
    farmers?: {
      full_name: string;
      phone_number: string;
      wards?: {
        ward_name: string;
        subcounties?: {
          subcounty_name: string;
          counties?: { county_name: string } | null;
        } | null;
      } | null;
    } | null;
  } | null;
}

interface Props { deliveries: Delivery[]; }

export function DispatchClient({ deliveries }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Delivery | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Lazy-load Leaflet on client only
    const initMap = async () => {
      if (!mapRef.current || mapLoaded) return;
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css" as never);

      const map = L.map(mapRef.current).setView([-1.286389, 36.817223], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      const icon = L.divIcon({
        html: `<div style="background:#16a34a;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>`,
        className: "",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      deliveries.forEach(d => {
        if (!d.gps_lat || !d.gps_lng) return;
        const farmer = d.sales_orders?.farmers;
        L.marker([d.gps_lat, d.gps_lng], { icon })
          .bindPopup(`<b>${farmer?.full_name ?? "Unknown"}</b><br/>${d.delivery_status}`)
          .addTo(map);
      });

      setMapLoaded(true);
    };
    initMap();
  }, [deliveries, mapLoaded]);

  const inTransit = deliveries.filter(d => d.delivery_status === "in_transit");
  const pending = deliveries.filter(d => d.delivery_status === "pending");
  const delivered = deliveries.filter(d => d.delivery_status === "delivered");

  return (
    <div className="page-enter space-y-6">
      <PageHeader title="Dispatch & Delivery" subtitle={`${deliveries.length} active deliveries`} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "In Transit", value: inTransit.length, color: "text-purple-700" },
          { label: "Pending Dispatch", value: pending.length, color: "text-amber-700" },
          { label: "Delivered Today", value: delivered.length, color: "text-green-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MapPin size={16} className="text-edos-600" /> Live Delivery Map
            </h3>
          </div>
          <div ref={mapRef} className="h-80" style={{ zIndex: 0 }}>
            {!mapLoaded && (
              <div className="h-full flex items-center justify-center bg-muted/30 text-sm text-muted-foreground">
                Loading map…
              </div>
            )}
          </div>
        </div>

        {/* Delivery list */}
        <div className="space-y-3">
          {deliveries.slice(0, 10).map(d => {
            const order = d.sales_orders;
            const farmer = order?.farmers;
            const ward = farmer?.wards;
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelected(selected?.id === d.id ? null : d)}
                className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-edos-300 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-edos-600 shrink-0" />
                      <span className="font-medium text-sm">{farmer?.full_name ?? "—"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ward?.ward_name}, {ward?.subcounties?.subcounty_name}
                    </p>
                  </div>
                  <StatusBadge status={d.delivery_status} dot />
                </div>

                {selected?.id === d.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 pt-3 border-t border-border space-y-1.5 text-sm"
                  >
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order</span>
                      <span className="font-mono text-xs">{order?.order_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-semibold">{formatCurrency(order?.total_amount ?? 0)}</span>
                    </div>
                    {d.driver_name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Driver</span>
                        <div className="flex items-center gap-1">
                          <span>{d.driver_name}</span>
                          {d.driver_phone && <a href={`tel:${d.driver_phone}`} className="text-edos-600"><Phone size={12} /></a>}
                        </div>
                      </div>
                    )}
                    {d.estimated_delivery_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ETA</span>
                        <span>{formatDateTime(d.estimated_delivery_at)}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
          {deliveries.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
              No active deliveries
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
