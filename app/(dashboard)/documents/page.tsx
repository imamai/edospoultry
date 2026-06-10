import Link from "next/link";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { formatDate } from "@/lib/utils";
import { Plus, Pencil, FileText, AlertTriangle, Clock } from "lucide-react";

export const metadata = { title: "Documents" };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { document_type?: string; status?: string };
}) {
  const { orgId } = await getOrgContext();
  const supabase  = createServiceClient();

  let q = supabase
    .from("farm_documents")
    .select("id, document_type, title, status, issue_date, expiry_date, issued_by, farmers(full_name)")
    .eq("organization_id", orgId ?? "")
    .order("expiry_date", { ascending: true })
    .limit(500);

  if (searchParams.document_type) q = q.eq("document_type", searchParams.document_type);
  if (searchParams.status)        q = q.eq("status",        searchParams.status);

  const { data: docs } = orgId ? await q : { data: [] };

  const today    = new Date().toISOString().split("T")[0];
  const in30     = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  const active   = (docs ?? []).filter(d => d.status === "active").length;
  const expired  = (docs ?? []).filter(d => d.status === "expired").length;
  const expiringSoon = (docs ?? []).filter(d => d.expiry_date && d.expiry_date >= today && d.expiry_date <= in30).length;

  // Matches document_type enum; document_status enum in migration
  const DOC_TYPES = ["veterinary_certificate","trading_license","movement_permit","feed_analysis_report","vaccination_certificate","insurance_policy","contract","lab_result","import_permit","other"];
  const DOC_STATUSES = ["active","expired","pending","revoked"];

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Farm Documents"
        subtitle={`${docs?.length ?? 0} records`}
        actions={
          <Link
            href="/documents/new"
            className="flex items-center gap-2 px-4 py-2 bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} /> Add Document
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active",        value: active,       icon: FileText,       color: "text-green-600" },
          { label: "Expiring (30d)",value: expiringSoon, icon: Clock,          color: "text-orange-500" },
          { label: "Expired",       value: expired,      icon: AlertTriangle,  color: "text-red-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <Icon size={20} className={color} />
            <div>
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter strip */}
      <div className="flex gap-2 flex-wrap items-center">
        <Link href="/documents" className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${!searchParams.document_type && !searchParams.status ? "bg-edos-600 text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>All</Link>
        {DOC_STATUSES.map(s => (
          <Link key={s} href={`/documents?status=${s}`} className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors ${searchParams.status === s ? "bg-edos-600 text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
            {s}
          </Link>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Title","Type","Farmer","Issued By","Issue Date","Expiry","Status",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!docs?.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No documents found.{" "}
                    <Link href="/documents/new" className="text-edos-600 hover:underline">Add one</Link>
                  </td>
                </tr>
              ) : (
                docs.map(doc => {
                  const farmer = doc.farmers as { full_name: string } | null;
                  const isExpiringSoon = doc.expiry_date && doc.expiry_date >= today && doc.expiry_date <= in30;
                  return (
                    <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">{doc.title}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{doc.document_type?.replace(/_/g, " ") ?? "—"}</td>
                      <td className="px-4 py-3">{farmer?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{doc.issued_by ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{doc.issue_date ? formatDate(doc.issue_date) : "—"}</td>
                      <td className="px-4 py-3">
                        {doc.expiry_date
                          ? <span className={isExpiringSoon ? "text-orange-600 font-medium" : "text-muted-foreground"}>{formatDate(doc.expiry_date)}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={doc.status ?? "active"} dot /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/documents/${doc.id}/edit`} className="p-1.5 rounded-lg text-muted-foreground hover:text-edos-600 hover:bg-edos-50 transition-colors">
                            <Pencil size={14} />
                          </Link>
                          <DeleteButton id={doc.id} apiPath="/api/documents" label="document" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
