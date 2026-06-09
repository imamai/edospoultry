"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Pencil, Trash2, Loader2, Globe, Users, MailPlus, Copy } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { deleteTenantAction, resendInviteAction } from "@/app/actions/tenants";

type Org = {
  id: string;
  name: string;
  slug: string;
  country: string;
  currency: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
};

const FLAG: Record<string, string> = { KE: "🇰🇪", RW: "🇷🇼", UG: "🇺🇬" };

// Grid template shared between header and rows
const COLS = "grid-cols-[1fr_120px_80px_90px_110px_130px]";

export function TenantsTable({
  orgs,
  countByOrg,
}: {
  orgs: Org[];
  countByOrg: Record<string, number>;
}) {
  const router = useRouter();
  const [confirmId,  setConfirmId]  = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<{ orgId: string; email: string; link: string } | null>(null);

  async function handleDelete(orgId: string) {
    setDeletingId(orgId);
    const result = await deleteTenantAction(orgId);
    setDeletingId(null);
    setConfirmId(null);
    if (result.error) toast.error(result.error);
    else { toast.success("Tenant deleted"); router.refresh(); }
  }

  async function handleResend(orgId: string) {
    setResendingId(orgId);
    const result = await resendInviteAction(orgId);
    setResendingId(null);
    if (result.error) { toast.error(result.error); return; }
    if (result.link && result.email) {
      try {
        await navigator.clipboard.writeText(result.link);
        toast.success(`Invite link copied — share with ${result.email}`);
      } catch {
        // Clipboard blocked — show the link inline
        setLinkData({ orgId, email: result.email, link: result.link });
      }
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className={`grid ${COLS} gap-4 px-5 py-3 border-b border-border bg-muted/40`}>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Organization</span>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Country</span>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Users</span>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</span>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Created</span>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Actions</span>
      </div>

      {orgs.map((org, idx) => (
        <div key={org.id}>
          {/* Row */}
          <div className={[
            `grid ${COLS} gap-4 items-center px-5 py-3.5 transition-colors`,
            idx % 2 !== 0 ? "bg-muted/20" : "",
            confirmId === org.id ? "bg-red-50/60" : "hover:bg-muted/30",
          ].join(" ")}>

            {/* Name + slug */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{FLAG[org.country] ?? "🏢"}</span>
                <span className="font-medium text-sm truncate">{org.name}</span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate pl-7">{org.slug}</p>
            </div>

            {/* Country */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Globe size={11} />
              <span>{org.country} · {org.currency}</span>
            </div>

            {/* Users */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users size={11} />
              <span>{countByOrg[org.id] ?? 0}</span>
            </div>

            {/* Status */}
            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
              org.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
            }`}>
              {org.is_active ? "Active" : "Suspended"}
            </span>

            {/* Created */}
            <span className="text-xs text-muted-foreground">{formatDate(org.created_at)}</span>

            {/* Actions: Resend | Edit | Delete */}
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => handleResend(org.id)}
                disabled={resendingId === org.id}
                title="Resend invite email"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {resendingId === org.id
                  ? <Loader2 size={14} className="animate-spin" />
                  : <MailPlus size={14} />}
              </button>

              <Link
                href={`/tenants/${org.id}/edit`}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Edit tenant"
              >
                <Pencil size={14} />
              </Link>

              <button
                onClick={() => setConfirmId(confirmId === org.id ? null : org.id)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Delete tenant"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Inline invite link strip */}
          {linkData?.orgId === org.id && (
            <div className="px-5 py-3 bg-blue-50 border-t border-blue-100 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-blue-700 mb-1">Invite link for <strong>{linkData.email}</strong> — copy and share:</p>
                <p className="text-[11px] font-mono text-blue-900 truncate">{linkData.link}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(linkData.link);
                    toast.success("Link copied!");
                    setLinkData(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
                >
                  Copy
                </button>
                <button onClick={() => setLinkData(null)} className="px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-medium hover:bg-muted transition-colors">
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Inline delete confirmation strip */}
          {confirmId === org.id && (
            <div className="px-5 py-3 bg-red-50 border-t border-red-100 flex items-center justify-between gap-4">
              <p className="text-sm text-red-800">
                Permanently delete <strong>{org.name}</strong> and all its users? This cannot be undone.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setConfirmId(null)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-white text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(org.id)}
                  disabled={deletingId === org.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-70"
                >
                  {deletingId === org.id && <Loader2 size={13} className="animate-spin" />}
                  Yes, delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
