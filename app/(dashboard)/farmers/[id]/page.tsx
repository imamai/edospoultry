import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, formatNumber, formatPhone, getBirdCategoryColor } from "@/lib/utils";
import {
  ArrowLeft, MapPin, Phone, User, Wifi, Bird, Baby,
  ShoppingCart, AlertTriangle, Egg, Syringe, CheckCircle2,
} from "lucide-react";

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: "Farmer Profile" };
}

type WardRow = {
  name: string;
  subcounties?: { name: string; counties?: { name: string } | null } | null;
};

export default async function FarmerDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient();

  const { data: farmer } = await supabase
    .from("farmers")
    .select(`
      id, full_name, phone_number, id_number, is_active,
      preferred_language, preferred_channel, created_at, notes,
      wards(name,
        subcounties(name,
          counties(name)
        )
      )
    `)
    .eq("id", params.id)
    .single();

  if (!farmer) notFound();

  const [flocksRes, ordersRes, claimsRes, vaccsRes, eggsRes] = await Promise.all([
    supabase
      .from("farmer_flocks")
      .select("id, flock_code, bird_category, purpose, current_quantity, status")
      .eq("farmer_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("sales_orders")
      .select("id, order_number, order_type, total_amount, amount_paid, balance_due, status, created_at")
      .eq("farmer_id", params.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("mortality_claims")
      .select("id, claimed_deaths, actual_deaths, status, created_at")
      .eq("farmer_id", params.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("vaccination_schedules")
      .select("id, vaccine_type, scheduled_date, completed_date")
      .eq("farmer_id", params.id)
      .order("scheduled_date", { ascending: false })
      .limit(10),
    supabase
      .from("egg_production_records")
      .select("id, production_date, total_eggs_laid, saleable_eggs, hen_day_production")
      .eq("farmer_id", params.id)
      .order("production_date", { ascending: false })
      .limit(7),
  ]);

  const flocks = flocksRes.data ?? [];
  const orders = ordersRes.data ?? [];
  const claims = claimsRes.data ?? [];
  const vaccinations = vaccsRes.data ?? [];
  const eggs = eggsRes.data ?? [];

  const ward = farmer.wards as WardRow | null;
  const activeFlocks = flocks.filter(f => f.status === "active").length;
  const totalBirds = flocks.reduce((s, f) => s + (f.current_quantity ?? 0), 0);
  const pendingClaims = claims.filter(c => c.status === "submitted" || c.status === "under_review").length;

  const stats = [
    { label: "Active Flocks",   value: activeFlocks,    icon: Bird,          color: "text-edos-600",  bg: "bg-edos-50" },
    { label: "Total Birds",     value: totalBirds,      icon: Baby,          color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Orders",          value: orders.length,   icon: ShoppingCart,  color: "text-blue-600",  bg: "bg-blue-50" },
    { label: "Pending Claims",  value: pendingClaims,   icon: AlertTriangle, color: "text-red-600",   bg: "bg-red-50" },
  ];

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title={farmer.full_name}
        subtitle={formatPhone(farmer.phone_number)}
        actions={
          <Link href="/farmers" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> All Farmers
          </Link>
        }
      />

      {/* Profile card + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-edos-100 flex items-center justify-center shrink-0">
              <User size={22} className="text-edos-700" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{farmer.full_name}</p>
              <p className="text-sm text-muted-foreground">{formatPhone(farmer.phone_number)}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {farmer.id_number && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User size={13} className="shrink-0" />
                <span>ID: {farmer.id_number}</span>
              </div>
            )}
            {farmer.phone_number && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone size={13} className="shrink-0" />
                <span>{formatPhone(farmer.phone_number)}</span>
              </div>
            )}
            {ward && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin size={13} className="shrink-0 mt-0.5" />
                <span>
                  {ward.name}, {ward.subcounties?.name},{" "}
                  {ward.subcounties?.counties?.name}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wifi size={13} className="shrink-0" />
              <span className="capitalize">
                {farmer.preferred_channel?.replace(/_/g, " ")} &middot; {farmer.preferred_language?.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span
              className={`status-pill ${
                farmer.is_active
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {farmer.is_active ? (
                <span className="flex items-center gap-1"><CheckCircle2 size={11} /> Active</span>
              ) : "Inactive"}
            </span>
            <span className="text-xs text-muted-foreground">{formatDate(farmer.created_at)}</span>
          </div>

          {farmer.notes && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">{farmer.notes}</p>
          )}
        </div>

        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-5">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-2xl font-bold">{formatNumber(value)}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Flocks */}
        <ServiceSection
          title="Flocks"
          icon={<Bird size={15} className="text-edos-600" />}
          count={flocks.length}
          emptyText="No flocks registered yet"
          topLink={flocks.length > 5 ? { href: "/flocks", label: "View all" } : undefined}
        >
          {flocks.slice(0, 5).map(flock => (
            <div key={flock.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <div className="min-w-0">
                <Link
                  href={`/flocks/${flock.id}`}
                  className="text-sm font-medium text-edos-700 hover:underline truncate block"
                >
                  {flock.flock_code ?? flock.id.slice(0, 8)}
                </Link>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">
                  <span className={`status-pill text-[10px] py-0 ${getBirdCategoryColor(flock.bird_category)}`}>
                    {flock.bird_category?.replace(/_/g, " ")}
                  </span>
                  {flock.purpose && (
                    <span className="ml-1">&middot; {flock.purpose.replace(/_/g, " ")}</span>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0 ml-3 space-y-1">
                <p className="text-sm font-mono font-semibold">{formatNumber(flock.current_quantity ?? 0)} birds</p>
                <StatusBadge status={flock.status ?? "active"} />
              </div>
            </div>
          ))}
        </ServiceSection>

        {/* Orders */}
        <ServiceSection
          title="Purchase Orders"
          icon={<ShoppingCart size={15} className="text-blue-600" />}
          count={orders.length}
          emptyText="No orders placed yet"
        >
          {orders.slice(0, 5).map(order => (
            <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium">{order.order_number}</p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">
                  {order.order_type?.replace(/_/g, " ")} &middot; {formatDate(order.created_at)}
                </p>
              </div>
              <div className="text-right shrink-0 ml-3 space-y-1">
                <p className="text-sm font-semibold">KES {formatNumber(order.total_amount ?? 0)}</p>
                {(order.balance_due ?? 0) > 0 && (
                  <p className="text-xs text-red-600 font-medium">Bal: {formatNumber(order.balance_due ?? 0)}</p>
                )}
                <StatusBadge status={order.status ?? "pending"} />
              </div>
            </div>
          ))}
        </ServiceSection>

        {/* Mortality claims */}
        <ServiceSection
          title="Mortality Claims"
          icon={<AlertTriangle size={15} className="text-red-600" />}
          count={claims.length}
          emptyText="No claims filed"
        >
          {claims.slice(0, 5).map(claim => (
            <div key={claim.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium">{formatDate(claim.created_at)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reported: {formatNumber(claim.claimed_deaths ?? 0)} birds
                  {claim.actual_deaths
                    ? ` · Approved: ${formatNumber(claim.actual_deaths)}`
                    : ""}
                </p>
              </div>
              <StatusBadge status={claim.status ?? "submitted"} />
            </div>
          ))}
        </ServiceSection>

        {/* Vaccinations */}
        <ServiceSection
          title="Vaccination Schedule"
          icon={<Syringe size={15} className="text-purple-600" />}
          count={vaccinations.length}
          emptyText="No vaccinations recorded"
        >
          {vaccinations.slice(0, 5).map((v, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium">{v.vaccine_type}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Scheduled: {formatDate(v.scheduled_date)}
                  {v.completed_date
                    ? ` · Done: ${formatDate(v.completed_date)}`
                    : ""}
                </p>
              </div>
              <StatusBadge status={v.completed_date ? "completed" : "scheduled"} />
            </div>
          ))}
        </ServiceSection>
      </div>

      {/* Egg production */}
      {eggs.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Egg size={15} className="text-amber-600" />
            <h3 className="text-sm font-semibold">Egg Production — Last 7 Days</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Date", "Total Eggs", "Saleable", "HDP %"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {eggs.map(r => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">{formatDate(r.production_date)}</td>
                    <td className="px-4 py-3 font-mono">{formatNumber(r.total_eggs_laid ?? 0)}</td>
                    <td className="px-4 py-3 font-mono text-green-700">{formatNumber(r.saleable_eggs ?? 0)}</td>
                    <td className="px-4 py-3 font-mono">{r.hen_day_production?.toFixed(1) ?? "—"}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceSection({
  title,
  icon,
  count,
  emptyText,
  children,
  topLink,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  emptyText: string;
  children?: React.ReactNode;
  topLink?: { href: string; label: string };
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{count} total</span>
          {topLink && (
            <Link href={topLink.href} className="text-xs text-edos-600 hover:underline">
              {topLink.label}
            </Link>
          )}
        </div>
      </div>
      <div className="px-5 py-1">
        {count === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
