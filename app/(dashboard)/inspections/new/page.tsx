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
  inspection_type:    z.string().min(1, "Select type"),
  inspection_date:    z.string().min(1, "Date required"),
  farmer_id:          z.string().min(1, "Farmer required"),
  house_id:           z.string().optional().transform(v => v || undefined),
  total_items:        z.coerce.number().int().nonnegative().optional(),
  passed_items:       z.coerce.number().int().nonnegative().optional(),
  passed:             z.enum(["true","false","none"]).optional(),
  follow_up_required: z.boolean().optional(),
  follow_up_date:     z.string().optional(),
  recommendations:    z.string().optional(),
  notes:              z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// Matches inspection_type enum in migration
const INSP_TYPES = ["biosecurity","welfare","compliance","routine","pre_delivery","post_incident","government"];

export default function NewInspectionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [farmers, setFarmers] = useState<{ id: string; full_name: string }[]>([]);
  const [houses,  setHouses]  = useState<{ id: string; house_name: string }[]>([]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { inspection_date: new Date().toISOString().split("T")[0], passed: "none" },
  });
  const farmerId       = watch("farmer_id");
  const followUpNeeded = watch("follow_up_required");

  useEffect(() => { fetch("/api/farmers").then(r => r.json()).then(d => setFarmers(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  useEffect(() => {
    if (!farmerId) { setHouses([]); return; }
    fetch(`/api/poultry-houses?farmer_id=${farmerId}`).then(r => r.json()).then(d => setHouses(Array.isArray(d) ? d : [])).catch(() => {});
  }, [farmerId]);

  async function onSubmit(data: FormData) {
    setSaving(true);
    const payload = {
      ...data,
      passed: data.passed === "true" ? true : data.passed === "false" ? false : null,
    };
    const res = await fetch("/api/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) { toast.error((await res.json()).error ?? "Failed"); return; }
    toast.success("Inspection saved!");
    router.push("/inspections");
  }

  const field = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
  const label = "block text-sm font-medium mb-1.5";
  const err   = "mt-1 text-xs text-destructive";

  return (
    <div className="page-enter max-w-2xl">
      <PageHeader
        title="Record Inspection"
        actions={
          <Link href="/inspections" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Inspection Type *</label>
            <select {...register("inspection_type")} className={field}>
              <option value="">— Select —</option>
              {INSP_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
            {errors.inspection_type && <p className={err}>{errors.inspection_type.message}</p>}
          </div>
          <div>
            <label className={label}>Date *</label>
            <input type="date" {...register("inspection_date")} className={field} />
            {errors.inspection_date && <p className={err}>{errors.inspection_date.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Farmer *</label>
            <select {...register("farmer_id")} className={field}>
              <option value="">— Select —</option>
              {farmers.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
            </select>
            {errors.farmer_id && <p className={err}>{errors.farmer_id.message}</p>}
          </div>
          <div>
            <label className={label}>Poultry House</label>
            <select {...register("house_id")} className={field} disabled={!farmerId || !houses.length}>
              <option value="">— Select —</option>
              {houses.map(h => <option key={h.id} value={h.id}>{h.house_name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Total Checklist Items</label>
            <input type="number" min="0" placeholder="0" {...register("total_items")} className={field} />
          </div>
          <div>
            <label className={label}>Items Passed</label>
            <input type="number" min="0" placeholder="0" {...register("passed_items")} className={field} />
          </div>
        </div>

        <div>
          <label className={label}>Overall Result</label>
          <select {...register("passed")} className={field}>
            <option value="none">— N/A —</option>
            <option value="true">Pass</option>
            <option value="false">Fail</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="follow_up" {...register("follow_up_required")} className="rounded" />
          <label htmlFor="follow_up" className="text-sm font-medium">Follow-up required</label>
        </div>

        {followUpNeeded && (
          <div>
            <label className={label}>Follow-up Date</label>
            <input type="date" {...register("follow_up_date")} className={field} />
          </div>
        )}

        <div>
          <label className={label}>Recommendations</label>
          <textarea rows={3} placeholder="Corrective actions recommended…" {...register("recommendations")} className={field} />
        </div>

        <div>
          <label className={label}>Notes</label>
          <textarea rows={2} placeholder="Additional observations…" {...register("notes")} className={field} />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/inspections" className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors">Cancel</Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : "Save Inspection"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
