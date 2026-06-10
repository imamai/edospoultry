import Link from "next/link";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { ExportToolbar } from "@/components/shared/ExportToolbar";
import { formatDate, formatCurrency, formatNumber } from "@/lib/utils";
import {
  Plus, Pencil, Wheat, Pill, Syringe, Users, Zap,
  Wrench, Truck, BedDouble, MoreHorizontal, Receipt,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const metadata = { title: "Expenses" };

const CATEGORIES: {
  key: string;
  label: string;
  color: string;
  bgCard: string;
  icon: LucideIcon;
}[] = [
  { key: "feed",       label: "Feed",        color: "bg-amber-100 text-amber-800",   bgCard: "border-amber-200 bg-amber-50",   icon: Wheat         },
  { key: "medication", label: "Medication",  color: "bg-blue-100 text-blue-800",     bgCard: "border-blue-200 bg-blue-50",     icon: Pill          },
  { key: "vaccine",    label: "Vaccine",     color: "bg-green-100 text-green-800",   bgCard: "border-green-200 bg-green-50",   icon: Syringe       },
  { key: "labor",      label: "Labor",       color: "bg-purple-100 text-purple-800", bgCard: "border-purple-200 bg-purple-50", icon: Users         },
  { key: "utilities",  label: "Utilities",   color: "bg-gray-100 text-gray-800",     bgCard: "border-gray-200 bg-gray-50",     icon: Zap           },
  { key: "equipment",  label: "Equipment",   color: "bg-orange-100 text-orange-800", bgCard: "border-orange-200 bg-orange-50", icon: Wrench        },
  { key: "transport",  label: "Transport",   color: "bg-cyan-100 text-cyan-800",     bgCard: "border-cyan-200 bg-cyan-50",     icon: Truck         },
  { key: "bedding",    label: "Bedding",     color: "bg-yellow-100 text-yellow-800", bgCard: "border-yellow-200 bg-yellow-50", icon: BedDouble     },
  { key: "other",      label: "Other",       color: "bg-slate-100 text-slate-700",   bgCard: "border-slate-200 bg-slate-50",   icon: MoreHorizontal},
];

const PERIODS = [
  { key: "week",    label: "This Week"  },
  { key: "month",   label: "This Month" },
  { key: "quarter", label: "Quarter"    },
  { key: "year",    label: "This Year"  },
  { key: "all",     label: "All Time"   },
];

function getPeriodRange(period: string): { start: string; end: string } {
  const now   = new Date();
  const today = now.toISOString().split("T")[0];
  switch (period) {
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { start: d.toISOString().split("T")[0], end: today };
    }
    case "quarter": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 2);
      d.setDate(1);
      return { start: d.toISOString().split("T")[0], end: today };
    }
    case "year": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return { start: d.toISOString().split("T")[0], end: today };
    }
    case "all":
      return { start: "2020-01-01", end: today };
    default: {
      const d = new Date(now);
      d.setDate(1);
      return { start: d.toISOString().split("T")[0], end: today };
    }
  }
}

const catMap = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

interface ExpenseRow {
  id:           string;
  expense_date: string;
  category:     string;
  description:  string;
  quantity:     number | null;
  unit:         string | null;
  unit_cost:    number | null;
  total_amount: number;
  vendor:       string | null;
  notes:        string | null;
  farmers:      { full_name: string } | null;
  farmer_flocks:{ flock_code: string } | null;
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: { period?: string; category?: string };
}) {
  const { orgId } = await getOrgContext();
  const supabase  = createServiceClient();
  const period    = searchParams.period   ?? "month";
  const category  = searchParams.category;
  const { start, end } = getPeriodRange(period);

  let q = supabase
    .from("flock_expenses")
    .select(
      "id, expense_date, category, description, quantity, unit, unit_cost, total_amount, vendor, notes, " +
      "farmers(full_name), farmer_flocks(flock_code)"
    )
    .eq("organization_id", orgId ?? "")
    .gte("expense_date", start)
    .lte("expense_date", end)
    .order("expense_date", { ascending: false })
    .limit(1000);

  if (category) q = q.eq("category", category);

  const { data: expenses } = orgId ? await q : { data: [] };
  const rows = (expenses ?? []) as ExpenseRow[];

  // ── KPIs ──
  const total          = rows.reduce((s, e) => s + (e.total_amount ?? 0), 0);
  const count          = rows.length;
  const avgPerExpense  = count > 0 ? total / count : 0;

  // ── Per-category breakdown ──
  const breakdown = CATEGORIES.map(c => ({
    ...c,
    amount: rows.filter(r => r.category === c.key).reduce((s, r) => s + (r.total_amount ?? 0), 0),
    count:  rows.filter(r => r.category === c.key).length,
  })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

  const topCategory = breakdown[0];

  const exportData = rows.map(r => ({
    date:        r.expense_date,
    category:    r.category,
    description: r.description,
    flock:       r.farmer_flocks?.flock_code ?? "",
    farmer:      r.farmers?.full_name ?? "",
    quantity:    r.quantity ?? "",
    unit:        r.unit ?? "",
    unit_cost:   r.unit_cost ?? "",
    amount_kes:  r.total_amount,
    vendor:      r.vendor ?? "",
    notes:       r.notes ?? "",
  }));
  const exportCols = [
    { key: "date",        header: "Date"         },
    { key: "category",    header: "Category"     },
    { key: "description", header: "Description"  },
    { key: "flock",       header: "Flock"        },
    { key: "farmer",      header: "Farmer"       },
    { key: "quantity",    header: "Qty"          },
    { key: "unit",        header: "Unit"         },
    { key: "unit_cost",   header: "Unit Cost"    },
    { key: "amount_kes",  header: "Amount (KES)" },
    { key: "vendor",      header: "Vendor"       },
    { key: "notes",       header: "Notes"        },
  ];

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Expenses"
        subtitle={`${count} records · ${formatCurrency(total)}`}
        actions={
          <div className="flex items-center gap-2">
            <ExportToolbar data={exportData} columns={exportCols} filename="expenses" title="Farm Expenses" />
            <Link
              href="/expenses/new"
              className="flex items-center gap-2 px-4 py-2 bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus size={16} /> Add Expense
            </Link>
          </div>
        }
      />

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
          <p className="text-2xl font-bold">{formatCurrency(total)}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Records</p>
          <p className="text-2xl font-bold">{formatNumber(count)}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Avg per Entry</p>
          <p className="text-2xl font-bold">{formatCurrency(avgPerExpense)}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Highest Category</p>
          <p className="text-2xl font-bold truncate">{topCategory?.label ?? "—"}</p>
          {topCategory && (
            <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(topCategory.amount)}</p>
          )}
        </div>
      </div>

      {/* ── Category breakdown cards ── */}
      {breakdown.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Breakdown by Category
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {breakdown.map(c => {
              const Icon = c.icon;
              const pct  = total > 0 ? (c.amount / total) * 100 : 0;
              return (
                <Link
                  key={c.key}
                  href={`/expenses?period=${period}&category=${c.key}`}
                  className={`border rounded-2xl p-4 transition-all hover:shadow-sm ${c.bgCard} ${category === c.key ? "ring-2 ring-edos-500 ring-offset-1" : ""}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon size={16} className="opacity-60" />
                    <span className="text-xs font-medium opacity-60">{pct.toFixed(1)}%</span>
                  </div>
                  <p className="text-sm font-semibold">{c.label}</p>
                  <p className="text-base font-bold mt-0.5">{formatCurrency(c.amount)}</p>
                  <p className="text-xs opacity-60 mt-0.5">{c.count} record{c.count !== 1 ? "s" : ""}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Period */}
        <div className="flex gap-1.5 flex-wrap">
          {PERIODS.map(p => (
            <Link
              key={p.key}
              href={`/expenses?period=${p.key}${category ? `&category=${category}` : ""}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                period === p.key
                  ? "bg-edos-600 text-white"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>

        <div className="w-px h-5 bg-border hidden sm:block" />

        {/* Category */}
        <div className="flex gap-1.5 flex-wrap">
          <Link
            href={`/expenses?period=${period}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              !category
                ? "bg-edos-600 text-white"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All Categories
          </Link>
          {CATEGORIES.map(c => (
            <Link
              key={c.key}
              href={`/expenses?period=${period}&category=${c.key}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                category === c.key
                  ? "bg-edos-600 text-white"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-muted-foreground" />
            <p className="text-sm font-semibold">
              {category ? `${catMap[category]?.label ?? category} Expenses` : "All Expenses"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">{count} records</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Date", "Category", "Description", "Flock", "Farmer", "Qty / Unit", "Unit Cost", "Amount (KES)", "Vendor", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center">
                    <Receipt size={32} className="mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-muted-foreground text-sm mb-1">No expenses recorded for this period.</p>
                    <Link href="/expenses/new" className="text-edos-600 hover:underline text-sm font-medium">
                      Log the first expense
                    </Link>
                  </td>
                </tr>
              ) : (
                rows.map(e => {
                  const farmer = e.farmers;
                  const flock  = e.farmer_flocks;
                  const cat    = catMap[e.category];
                  return (
                    <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(e.expense_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`status-pill ${cat?.color ?? "bg-slate-100 text-slate-700"}`}>
                          {cat?.label ?? e.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="truncate font-medium">{e.description}</p>
                        {e.notes && <p className="text-xs text-muted-foreground truncate">{e.notes}</p>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-edos-700">{flock?.flock_code ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{farmer?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {e.quantity != null ? `${formatNumber(e.quantity)} ${e.unit ?? ""}`.trim() : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {e.unit_cost != null ? formatCurrency(Number(e.unit_cost)) : "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums whitespace-nowrap">
                        {formatCurrency(e.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{e.vendor ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/expenses/${e.id}/edit`}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-edos-600 hover:bg-edos-50 transition-colors"
                          >
                            <Pencil size={14} />
                          </Link>
                          <DeleteButton id={e.id} apiPath="/api/flock-expenses" label="expense" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div className="px-5 py-3.5 border-t border-border bg-muted/30 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{count} record{count !== 1 ? "s" : ""}</p>
            <p className="text-sm font-bold">Total: {formatCurrency(total)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
