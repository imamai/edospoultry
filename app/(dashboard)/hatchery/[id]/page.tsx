import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { formatDate, formatNumber } from "@/lib/utils";
import { ArrowLeft, Pencil, Egg, CheckSquare2 } from "lucide-react";

export async function generateMetadata() {
  return { title: "Hatchery Batch" };
}

export default async function HatcheryDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const supabase = createServiceClient();
  const { orgId } = await getOrgContext();
  const tab = searchParams.tab ?? "overview";

  const { data: batch } = await supabase
    .from("hatchery_batches")
    .select("*, depots(name)")
    .eq("id", params.id)
    .single();

  if (!batch) notFound();

  const depot = batch.depots as { name: string } | null;

  const [eggsRes, hatchesRes] = await Promise.all([
    supabase.from("hatchery_eggs")
      .select("id, set_date, tray_number, eggs_loaded, candle1_fertile, candle1_infertile, candle1_cracked, transferred_to_hatcher")
      .eq("batch_id", params.id)
      .order("set_date", { ascending: false })
      .limit(100),
    supabase.from("hatchery_hatches")
      .select("id, hatch_date, eggs_transferred, chicks_hatched, saleable_chicks, hatch_rate_pct")
      .eq("batch_id", params.id)
      .order("hatch_date", { ascending: false })
      .limit(100),
  ]);

  const eggs    = eggsRes.data ?? [];
  const hatches = hatchesRes.data ?? [];

  const daysLeft = batch.expected_hatch_date
    ? Math.ceil((new Date(batch.expected_hatch_date).getTime() - Date.now()) / 86400_000)
    : null;

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "eggs",     label: "Eggs",    count: eggs.length,    icon: Egg },
    { key: "hatches",  label: "Hatches", count: hatches.length, icon: CheckSquare2 },
  ];

  return (
    <div className="page-enter max-w-4xl space-y-6">
      <PageHeader
        title={batch.batch_code ?? batch.id.slice(0, 8)}
        subtitle={`Hatchery Batch — ${depot?.name ?? ""}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/hatchery/${params.id}/edit`} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-xl hover:bg-muted transition-colors">
              <Pencil size={14} /> Edit
            </Link>
            <Link href="/hatchery" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft size={16} /> All Batches
            </Link>
          </div>
        }
      />

      {/* Tab bar */}
      <div className="flex gap-2">
        {TABS.map(({ key, label, count, icon: Icon }) => (
          <Link
            key={key}
            href={`/hatchery/${params.id}${key !== "overview" ? `?tab=${key}` : ""}`}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === key ? "bg-edos-600 text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {Icon && <Icon size={14} />}
            {label}
            {count !== undefined && <span className="text-xs opacity-70 ml-1">{count}</span>}
          </Link>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Main info */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-mono font-bold text-edos-700">{batch.batch_code}</p>
              <StatusBadge status={batch.status ?? "setting"} dot />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Set Date",       batch.set_date ? formatDate(batch.set_date) : "—"],
                ["Expected Hatch", batch.expected_hatch_date ? formatDate(batch.expected_hatch_date) : "—"],
                ["Eggs Set",       formatNumber(batch.eggs_set ?? 0)],
                ["Depot",          depot?.name ?? "—"],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="font-medium">{v as string}</p>
                </div>
              ))}
            </div>
            {daysLeft !== null && ["setting","candling","lockdown"].includes(batch.status ?? "") && (
              <div className={`px-3 py-2 rounded-xl text-sm font-medium ${daysLeft <= 3 ? "bg-amber-50 text-amber-700" : "bg-edos-50 text-edos-700"}`}>
                {daysLeft > 0 ? `${daysLeft} days until expected hatch` : "Expected hatch date reached"}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hatch Results</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Hatched",     batch.chicks_hatched != null ? formatNumber(batch.chicks_hatched) : "—"],
                ["Culled",      batch.chicks_culled  != null ? formatNumber(batch.chicks_culled)  : "—"],
                ["Saleable",    batch.chicks_saleable != null ? formatNumber(batch.chicks_saleable) : "—"],
                ["Fertility",   batch.fertility_rate_pct != null ? `${batch.fertility_rate_pct.toFixed(1)}%` : "—"],
                ["Hatch Rate",  batch.hatch_rate_pct != null ? `${batch.hatch_rate_pct.toFixed(1)}%` : "—"],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="font-bold text-lg">{v as string}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "eggs" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold">Egg Records</h3>
            <Link href={`/hatchery/${params.id}/eggs/new`} className="text-xs text-edos-600 hover:underline">+ Record Eggs</Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{["Set Date","Tray","Loaded","C1 Fertile","C1 Infertile","C1 Cracked","Transferred",""].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!eggs.length ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No egg tray records yet.</td></tr>
              ) : eggs.map(e => (
                  <tr key={e.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(e.set_date)}</td>
                    <td className="px-4 py-3 font-mono">{e.tray_number}</td>
                    <td className="px-4 py-3 font-mono font-medium">{formatNumber(e.eggs_loaded)}</td>
                    <td className="px-4 py-3 font-mono text-green-600">{e.candle1_fertile != null ? formatNumber(e.candle1_fertile) : "—"}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{e.candle1_infertile != null ? formatNumber(e.candle1_infertile) : "—"}</td>
                    <td className="px-4 py-3 font-mono text-red-500">{e.candle1_cracked != null ? formatNumber(e.candle1_cracked) : "—"}</td>
                    <td className="px-4 py-3">{e.transferred_to_hatcher ? <span className="text-green-600 text-xs font-medium">Yes</span> : <span className="text-muted-foreground text-xs">No</span>}</td>
                    <td className="px-4 py-3"><DeleteButton id={e.id} apiPath="/api/hatchery-eggs" label="egg tray" /></td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "hatches" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold">Hatch Records</h3>
            <Link href={`/hatchery/${params.id}/hatches/new`} className="text-xs text-edos-600 hover:underline">+ Record Hatch</Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{["Date","Eggs Transferred","Hatched","Saleable","Hatch Rate",""].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!hatches.length ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No hatch records yet.</td></tr>
              ) : hatches.map(h => (
                  <tr key={h.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(h.hatch_date)}</td>
                    <td className="px-4 py-3 font-mono">{h.eggs_transferred != null ? formatNumber(h.eggs_transferred) : "—"}</td>
                    <td className="px-4 py-3 font-mono">{h.chicks_hatched != null ? formatNumber(h.chicks_hatched) : "—"}</td>
                    <td className="px-4 py-3 font-mono font-medium text-green-600">{h.saleable_chicks != null ? formatNumber(h.saleable_chicks) : "—"}</td>
                    <td className="px-4 py-3 font-medium">{h.hatch_rate_pct != null ? `${Number(h.hatch_rate_pct).toFixed(1)}%` : "—"}</td>
                    <td className="px-4 py-3"><DeleteButton id={h.id} apiPath="/api/hatchery-hatches" label="hatch record" /></td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
