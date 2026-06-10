import Link from "next/link";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ExportToolbar } from "@/components/shared/ExportToolbar";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { formatDate, formatNumber, formatCurrency } from "@/lib/utils";
import { Plus, Pencil, AlertTriangle } from "lucide-react";

export const metadata = { title: "Inventory" };

type Tab = "chicks" | "eggs" | "feed" | "vaccines";

const TABS: { key: Tab; label: string }[] = [
  { key: "chicks",   label: "Chick Batches" },
  { key: "eggs",     label: "Egg Stock" },
  { key: "feed",     label: "Feed" },
  { key: "vaccines", label: "Vaccines" },
];

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = (searchParams.tab ?? "chicks") as Tab;
  const { orgId, userId } = await getOrgContext();
  const supabase = createServiceClient();

  // Get user's depot
  const { data: profile } = orgId
    ? await supabase.from("profiles").select("depot_id, depots(name)").eq("id", userId ?? "").single()
    : { data: null };
  const depotId   = (profile as { depot_id: string | null } | null)?.depot_id;
  const depotName = (profile as { depot_id: string | null; depots?: { name: string } | null } | null)?.depots?.name ?? "";

  // ── Fetch data for active tab ──────────────────────────────
  let chicks: Record<string, unknown>[]   = [];
  let eggs:   Record<string, unknown>[]   = [];
  let feed:   Record<string, unknown>[]   = [];
  let vaccines: Record<string, unknown>[] = [];

  if (orgId && depotId) {
    if (tab === "chicks") {
      const { data } = await supabase
        .from("chick_batches")
        .select("id, batch_code, hatchery_name, bird_category, breed, hatch_date, initial_count, available_count, price_per_chick, is_active")
        .eq("organization_id", orgId).eq("depot_id", depotId)
        .order("hatch_date", { ascending: false });
      chicks = (data ?? []) as Record<string, unknown>[];
    }
    if (tab === "eggs") {
      const { data } = await supabase
        .from("egg_inventory")
        .select("id, grade, quantity_trays, quantity_singles, unit_price_per_tray, batch_ref, expiry_date")
        .eq("organization_id", orgId).eq("depot_id", depotId)
        .order("grade");
      eggs = (data ?? []) as Record<string, unknown>[];
    }
    if (tab === "feed") {
      const { data } = await supabase
        .from("feed_inventory")
        .select("id, product_name, feed_type, supplier, quantity_kg, unit_price_per_kg, expiry_date, minimum_stock_kg")
        .eq("organization_id", orgId).eq("depot_id", depotId)
        .order("product_name");
      feed = (data ?? []) as Record<string, unknown>[];
    }
    if (tab === "vaccines") {
      const { data } = await supabase
        .from("vaccine_inventory")
        .select("id, vaccine_name, disease_target, supplier, quantity_doses, unit_price, expiry_date, minimum_stock")
        .eq("organization_id", orgId).eq("depot_id", depotId)
        .order("vaccine_name");
      vaccines = (data ?? []) as Record<string, unknown>[];
    }
  }

  // ── Export columns per tab ─────────────────────────────────
  const exportCols = {
    chicks:   [
      { key: "batch_code", header: "Batch Code" }, { key: "bird_category", header: "Category" },
      { key: "breed", header: "Breed" }, { key: "hatch_date", header: "Hatch Date" },
      { key: "initial_count", header: "Initial" }, { key: "available_count", header: "Available" },
      { key: "price_per_chick", header: "Price/Chick" },
    ],
    eggs:     [
      { key: "grade", header: "Grade" }, { key: "quantity_trays", header: "Trays" },
      { key: "quantity_singles", header: "Singles" }, { key: "unit_price_per_tray", header: "Price/Tray" },
      { key: "expiry_date", header: "Expiry" },
    ],
    feed:     [
      { key: "product_name", header: "Product" }, { key: "feed_type", header: "Type" },
      { key: "supplier", header: "Supplier" }, { key: "quantity_kg", header: "Qty (kg)" },
      { key: "unit_price_per_kg", header: "Price/kg" }, { key: "expiry_date", header: "Expiry" },
    ],
    vaccines: [
      { key: "vaccine_name", header: "Vaccine" }, { key: "disease_target", header: "Disease" },
      { key: "supplier", header: "Supplier" }, { key: "quantity_doses", header: "Doses" },
      { key: "unit_price", header: "Unit Price" }, { key: "expiry_date", header: "Expiry" },
    ],
  };

  const addLinks = {
    chicks:   "/depot/inventory/chicks/new",
    eggs:     "/depot/inventory/eggs/new",
    feed:     "/depot/inventory/feed/new",
    vaccines: "/depot/inventory/vaccines/new",
  };

  const activeData    = { chicks, eggs, feed, vaccines }[tab] as Record<string, unknown>[];
  const activeCols    = exportCols[tab];
  const activeAddLink = addLinks[tab];

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Inventory"
        subtitle={depotName ? `${depotName}` : "Depot stock levels"}
        actions={
          <div className="flex items-center gap-2">
            <ExportToolbar
              data={activeData}
              columns={activeCols}
              filename={`inventory-${tab}-${new Date().toISOString().slice(0, 10)}`}
              title={`${TABS.find(t => t.key === tab)?.label} Inventory`}
            />
            <Link
              href={activeAddLink}
              className="flex items-center gap-2 px-4 py-2 bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus size={16} /> Add {TABS.find(t => t.key === tab)?.label.replace(" Batches", "").replace(" Stock", "")}
            </Link>
          </div>
        }
      />

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <Link
            key={t.key}
            href={`/depot/inventory?tab=${t.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {!depotId && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          <AlertTriangle size={16} className="shrink-0" />
          No depot assigned to your account. Run the depot setup SQL in Supabase to continue.
        </div>
      )}

      {/* ── Chick Batches ─────────────────────────────────── */}
      {tab === "chicks" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Batch Code","Category","Breed","Hatch Date","Initial","Available","Price/Chick","Status",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!chicks.length ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    No chick batches. <Link href="/depot/inventory/chicks/new" className="text-edos-600 hover:underline">Add first batch</Link>
                  </td></tr>
                ) : chicks.map(c => (
                  <tr key={c.id as string} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-edos-700">{c.batch_code as string}</td>
                    <td className="px-4 py-3 capitalize">{(c.bird_category as string)?.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">{c.breed as string || "—"}</td>
                    <td className="px-4 py-3">{c.hatch_date ? formatDate(c.hatch_date as string) : "—"}</td>
                    <td className="px-4 py-3 font-mono">{formatNumber(c.initial_count as number)}</td>
                    <td className="px-4 py-3 font-mono font-medium text-edos-700">{formatNumber(c.available_count as number)}</td>
                    <td className="px-4 py-3">{c.price_per_chick ? formatCurrency(c.price_per_chick as number) : "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.is_active ? "active" : "inactive"} dot /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/depot/inventory/chicks/${c.id}/edit`} className="p-1.5 rounded-lg text-muted-foreground hover:text-edos-600 hover:bg-edos-50 transition-colors"><Pencil size={14} /></Link>
                        <DeleteButton id={c.id as string} apiPath="/api/inventory/chicks" label="batch" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Egg Stock ─────────────────────────────────────── */}
      {tab === "eggs" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Grade","Trays","Singles","Price / Tray","Batch Ref","Expiry",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!eggs.length ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No egg stock. <Link href="/depot/inventory/eggs/new" className="text-edos-600 hover:underline">Add stock</Link>
                  </td></tr>
                ) : eggs.map(e => (
                  <tr key={e.id as string} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">Grade {e.grade as string}</td>
                    <td className="px-4 py-3 font-mono">{formatNumber(Number(e.quantity_trays))}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{formatNumber(e.quantity_singles as number)}</td>
                    <td className="px-4 py-3">{e.unit_price_per_tray ? formatCurrency(e.unit_price_per_tray as number) : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.batch_ref as string || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.expiry_date ? formatDate(e.expiry_date as string) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/depot/inventory/eggs/${e.id}/edit`} className="p-1.5 rounded-lg text-muted-foreground hover:text-edos-600 hover:bg-edos-50 transition-colors"><Pencil size={14} /></Link>
                        <DeleteButton id={e.id as string} apiPath="/api/inventory/eggs" label="egg stock" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Feed ──────────────────────────────────────────── */}
      {tab === "feed" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Product","Type","Supplier","Qty (kg)","Bags (50kg)","Price / kg","Expiry",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!feed.length ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No feed inventory. <Link href="/depot/inventory/feed/new" className="text-edos-600 hover:underline">Add feed</Link>
                  </td></tr>
                ) : feed.map(f => (
                  <tr key={f.id as string} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{f.product_name as string}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{(f.feed_type as string)?.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.supplier as string || "—"}</td>
                    <td className="px-4 py-3 font-mono">{formatNumber(Number(f.quantity_kg))} kg</td>
                    <td className="px-4 py-3 font-mono text-edos-700">{Math.floor(Number(f.quantity_kg) / 50)} bags</td>
                    <td className="px-4 py-3">{f.unit_price_per_kg ? formatCurrency(f.unit_price_per_kg as number) : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.expiry_date ? formatDate(f.expiry_date as string) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/depot/inventory/feed/${f.id}/edit`} className="p-1.5 rounded-lg text-muted-foreground hover:text-edos-600 hover:bg-edos-50 transition-colors"><Pencil size={14} /></Link>
                        <DeleteButton id={f.id as string} apiPath="/api/inventory/feed" label="feed" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Vaccines ──────────────────────────────────────── */}
      {tab === "vaccines" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Vaccine","Disease Target","Supplier","Doses","Unit Price","Expiry",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!vaccines.length ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No vaccine inventory. <Link href="/depot/inventory/vaccines/new" className="text-edos-600 hover:underline">Add vaccines</Link>
                  </td></tr>
                ) : vaccines.map(v => (
                  <tr key={v.id as string} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{v.vaccine_name as string}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.disease_target as string}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.supplier as string || "—"}</td>
                    <td className="px-4 py-3 font-mono">{formatNumber(v.quantity_doses as number)}</td>
                    <td className="px-4 py-3">{v.unit_price ? formatCurrency(v.unit_price as number) : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.expiry_date ? formatDate(v.expiry_date as string) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/depot/inventory/vaccines/${v.id}/edit`} className="p-1.5 rounded-lg text-muted-foreground hover:text-edos-600 hover:bg-edos-50 transition-colors"><Pencil size={14} /></Link>
                        <DeleteButton id={v.id as string} apiPath="/api/inventory/vaccines" label="vaccine" />
                      </div>
                    </td>
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
