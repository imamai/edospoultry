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
  incident_type:      z.string().min(1, "Select incident type"),
  severity:           z.enum(["low","medium","high","critical"]),
  incident_date:      z.string().min(1, "Date required"),
  description:        z.string().min(1, "Description required"),
  affected_birds:     z.coerce.number().int().nonnegative().optional(),
  estimated_loss_kes: z.coerce.number().nonnegative().optional(),
  farmer_id:          z.string().optional().transform(v => v || undefined),
  flock_id:           z.string().optional().transform(v => v || undefined),
  actions_taken:      z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// Matches incident_type enum in migration
const INCIDENT_TYPES = ["disease","injury","theft","fire","weather","equipment_failure","feed_contamination","predator","other"];

export default function NewIncidentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [farmers, setFarmers] = useState<{ id: string; full_name: string }[]>([]);
  const [flocks,  setFlocks]  = useState<{ id: string; flock_code: string }[]>([]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { severity: "medium", incident_date: new Date().toISOString().split("T")[0] },
  });
  const farmerId = watch("farmer_id");

  useEffect(() => { fetch("/api/farmers").then(r => r.json()).then(d => setFarmers(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  useEffect(() => {
    if (!farmerId) { setFlocks([]); return; }
    fetch(`/api/flocks?farmer_id=${farmerId}`).then(r => r.json()).then(d => setFlocks(Array.isArray(d) ? d : [])).catch(() => {});
  }, [farmerId]);

  async function onSubmit(data: FormData) {
    setSaving(true);
    const res = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (!res.ok) { toast.error((await res.json()).error ?? "Failed"); return; }
    toast.success("Incident reported!");
    router.push("/incidents");
  }

  const field = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
  const label = "block text-sm font-medium mb-1.5";
  const err   = "mt-1 text-xs text-destructive";

  return (
    <div className="page-enter max-w-2xl">
      <PageHeader
        title="Report Incident"
        actions={
          <Link href="/incidents" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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
          <input placeholder="e.g. Newcastle disease in House 3" {...register("title")} className={field} />
          {errors.title && <p className={err}>{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Incident Type *</label>
            <select {...register("incident_type")} className={field}>
              <option value="">— Select —</option>
              {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
            {errors.incident_type && <p className={err}>{errors.incident_type.message}</p>}
          </div>
          <div>
            <label className={label}>Severity *</label>
            <select {...register("severity")} className={field}>
              {["low","medium","high","critical"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={label}>Date of Incident *</label>
          <input type="date" {...register("incident_date")} className={field} />
          {errors.incident_date && <p className={err}>{errors.incident_date.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Farmer</label>
            <select {...register("farmer_id")} className={field}>
              <option value="">— Select —</option>
              {farmers.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Flock</label>
            <select {...register("flock_id")} className={field} disabled={!farmerId || !flocks.length}>
              <option value="">— Select —</option>
              {flocks.map(f => <option key={f.id} value={f.id}>{f.flock_code}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Affected Birds</label>
            <input type="number" min="0" placeholder="0" {...register("affected_birds")} className={field} />
          </div>
          <div>
            <label className={label}>Est. Loss (KES)</label>
            <input type="number" min="0" placeholder="0.00" {...register("estimated_loss_kes")} className={field} />
          </div>
        </div>

        <div>
          <label className={label}>Description *</label>
          <textarea rows={3} placeholder="Describe what happened…" {...register("description")} className={field} />
          {errors.description && <p className={err}>{errors.description.message}</p>}
        </div>

        <div>
          <label className={label}>Actions Taken</label>
          <textarea rows={2} placeholder="Immediate actions taken…" {...register("actions_taken")} className={field} />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/incidents" className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : "Report Incident"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
