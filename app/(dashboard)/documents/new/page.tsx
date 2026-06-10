"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/shared/PageHeader";

const schema = z.object({
  title:              z.string().min(2, "Title required"),
  document_type:      z.string().min(1, "Select type"),
  farmer_id:          z.string().optional().transform(v => v || undefined),
  issue_date:         z.string().optional(),
  expiry_date:        z.string().optional(),
  issued_by:          z.string().optional(),
  document_number:    z.string().optional(),
  status:             z.enum(["active","expired","pending","revoked"]),
  file_url:           z.string().url("Must be a valid URL").optional().or(z.literal("")),
  notes:              z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// Matches document_type enum in migration
const DOC_TYPES = ["veterinary_certificate","trading_license","movement_permit","feed_analysis_report","vaccination_certificate","insurance_policy","contract","lab_result","import_permit","other"];

export default function NewDocumentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [farmers, setFarmers] = useState<{ id: string; full_name: string }[]>([]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "active", issue_date: new Date().toISOString().split("T")[0] },
  });

  useEffect(() => { fetch("/api/farmers").then(r => r.json()).then(d => setFarmers(Array.isArray(d) ? d : [])).catch(() => {}); }, []);

  async function onSubmit(data: FormData) {
    setSaving(true);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, file_url: data.file_url || null }),
    });
    setSaving(false);
    if (!res.ok) { toast.error((await res.json()).error ?? "Failed"); return; }
    toast.success("Document saved!");
    router.push("/documents");
  }

  const field = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
  const label = "block text-sm font-medium mb-1.5";
  const err   = "mt-1 text-xs text-destructive";

  return (
    <div className="page-enter max-w-2xl">
      <PageHeader
        title="Add Document"
        actions={
          <Link href="/documents" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Back
          </Link>
        }
      />
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card border border-border rounded-2xl p-6 space-y-5"
      >
        <div>
          <label className={label}>Title *</label>
          <input placeholder="e.g. Operating License 2024" {...register("title")} className={field} />
          {errors.title && <p className={err}>{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Document Type *</label>
            <select {...register("document_type")} className={field}>
              <option value="">— Select —</option>
              {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
            {errors.document_type && <p className={err}>{errors.document_type.message}</p>}
          </div>
          <div>
            <label className={label}>Status</label>
            <select {...register("status")} className={field}>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </div>

        <div>
          <label className={label}>Farmer (optional)</label>
          <select {...register("farmer_id")} className={field}>
            <option value="">— Organization-wide —</option>
            {farmers.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Issue Date</label>
            <input type="date" {...register("issue_date")} className={field} />
          </div>
          <div>
            <label className={label}>Expiry Date</label>
            <input type="date" {...register("expiry_date")} className={field} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Issuing Authority</label>
            <input placeholder="e.g. Kenya Veterinary Authority" {...register("issued_by")} className={field} />
          </div>
          <div>
            <label className={label}>Document Number</label>
            <input placeholder="License / ref number" {...register("document_number")} className={field} />
          </div>
        </div>

        <div>
          <label className={label}>File URL (optional)</label>
          <input type="url" placeholder="https://..." {...register("file_url")} className={field} />
          {errors.file_url && <p className={err}>{errors.file_url.message}</p>}
        </div>

        <div>
          <label className={label}>Notes</label>
          <textarea rows={2} placeholder="Additional notes…" {...register("notes")} className={field} />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/documents" className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors">Cancel</Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : "Save Document"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
