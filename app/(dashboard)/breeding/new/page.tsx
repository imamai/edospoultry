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
  mating_type:    z.string().min(1, "Select mating type"),
  mating_date:    z.string().min(1, "Date required"),
  farmer_id:      z.string().optional().transform(v => v || undefined),
  sire_flock_id:  z.string().optional().transform(v => v || undefined),
  dam_flock_id:   z.string().optional().transform(v => v || undefined),
  hens_mated:     z.coerce.number().int().nonnegative().optional(),
  cocks_used:     z.coerce.number().int().nonnegative().optional(),
  eggs_collected: z.coerce.number().int().nonnegative().optional(),
  eggs_set:       z.coerce.number().int().nonnegative().optional(),
  fertile_eggs:   z.coerce.number().int().nonnegative().optional(),
  sire_breed:     z.string().optional(),
  dam_breed:      z.string().optional(),
  target_breed:   z.string().optional(),
  notes:          z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// Matches mating_type enum in migration
const MATING_TYPES = ["natural","artificial_insemination","pen_mating"];

export default function NewBreedingPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [farmers, setFarmers] = useState<{ id: string; full_name: string }[]>([]);
  const [flocks,  setFlocks]  = useState<{ id: string; flock_code: string }[]>([]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { mating_date: new Date().toISOString().split("T")[0] },
  });
  const farmerId = watch("farmer_id");

  useEffect(() => { fetch("/api/farmers").then(r => r.json()).then(d => setFarmers(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  useEffect(() => {
    if (!farmerId) { setFlocks([]); return; }
    fetch(`/api/flocks?farmer_id=${farmerId}`).then(r => r.json()).then(d => setFlocks(Array.isArray(d) ? d : [])).catch(() => {});
  }, [farmerId]);

  async function onSubmit(data: FormData) {
    setSaving(true);
    const res = await fetch("/api/breeding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (!res.ok) { toast.error((await res.json()).error ?? "Failed"); return; }
    toast.success("Breeding record saved!");
    router.push("/breeding");
  }

  const field = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
  const label = "block text-sm font-medium mb-1.5";
  const err   = "mt-1 text-xs text-destructive";

  return (
    <div className="page-enter max-w-2xl">
      <PageHeader
        title="New Breeding Record"
        actions={
          <Link href="/breeding" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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
            <label className={label}>Mating Type *</label>
            <select {...register("mating_type")} className={field}>
              <option value="">— Select —</option>
              {MATING_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
            {errors.mating_type && <p className={err}>{errors.mating_type.message}</p>}
          </div>
          <div>
            <label className={label}>Date *</label>
            <input type="date" {...register("mating_date")} className={field} />
            {errors.mating_date && <p className={err}>{errors.mating_date.message}</p>}
          </div>
        </div>

        <div>
          <label className={label}>Farmer</label>
          <select {...register("farmer_id")} className={field}>
            <option value="">— Select —</option>
            {farmers.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Sire Flock (Male)</label>
            <select {...register("sire_flock_id")} className={field} disabled={!farmerId || !flocks.length}>
              <option value="">— Select —</option>
              {flocks.map(f => <option key={f.id} value={f.id}>{f.flock_code}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Dam Flock (Female)</label>
            <select {...register("dam_flock_id")} className={field} disabled={!farmerId || !flocks.length}>
              <option value="">— Select —</option>
              {flocks.map(f => <option key={f.id} value={f.id}>{f.flock_code}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Dam Breed (Female)</label>
            <input placeholder="e.g. Rhode Island Red" {...register("dam_breed")} className={field} />
          </div>
          <div>
            <label className={label}>Sire Breed (Male)</label>
            <input placeholder="e.g. Kuroiler" {...register("sire_breed")} className={field} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Hens Mated</label>
            <input type="number" min="0" placeholder="0" {...register("hens_mated")} className={field} />
          </div>
          <div>
            <label className={label}>Cocks Used</label>
            <input type="number" min="0" placeholder="0" {...register("cocks_used")} className={field} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={label}>Eggs Collected</label>
            <input type="number" min="0" placeholder="0" {...register("eggs_collected")} className={field} />
          </div>
          <div>
            <label className={label}>Eggs Set</label>
            <input type="number" min="0" placeholder="0" {...register("eggs_set")} className={field} />
          </div>
          <div>
            <label className={label}>Fertile Eggs</label>
            <input type="number" min="0" placeholder="0" {...register("fertile_eggs")} className={field} />
          </div>
        </div>

        <div>
          <label className={label}>Target Breed</label>
          <input placeholder="e.g. F1 crossbreed" {...register("target_breed")} className={field} />
        </div>

        <div>
          <label className={label}>Notes</label>
          <textarea rows={2} placeholder="Optional notes…" {...register("notes")} className={field} />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/breeding" className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors">Cancel</Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : "Save Record"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
