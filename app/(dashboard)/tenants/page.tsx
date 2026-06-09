import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { Plus, Building2 } from "lucide-react";
import { TenantsTable } from "./TenantsTable";

export const metadata = { title: "Tenants — EdosHatch" };

export default async function TenantsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  if (callerProfile?.role !== "super_admin") redirect("/dashboard");

  const [{ data: orgs }, { data: allProfiles }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, country, currency, phone, email, is_active, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("organization_id"),
  ]);

  const countByOrg = (allProfiles ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.organization_id] = (acc[p.organization_id] ?? 0) + 1;
    return acc;
  }, {});

  const stats = [
    { label: "Total Tenants", value: orgs?.length ?? 0 },
    { label: "Active",        value: orgs?.filter(o => o.is_active).length ?? 0 },
    { label: "Countries",     value: new Set(orgs?.map(o => o.country)).size },
  ];

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Tenants"
        subtitle="Organizations operating on EdosHatch"
        actions={
          <Link
            href="/tenants/new"
            className="flex items-center gap-2 px-4 py-2 bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} /> Add Tenant
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {!orgs?.length ? (
        <div className="bg-card border border-border rounded-2xl p-14 text-center text-muted-foreground">
          <Building2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tenants yet.</p>
          <Link href="/tenants/new" className="text-edos-600 hover:underline text-sm mt-1 inline-block">
            Create the first one →
          </Link>
        </div>
      ) : (
        <TenantsTable orgs={orgs} countByOrg={countByOrg} />
      )}
    </div>
  );
}
