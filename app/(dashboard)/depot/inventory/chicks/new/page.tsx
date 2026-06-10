"use client";
import { useState } from "react";
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
  batch_code:    z.string().min(2, "Required"),
  hatchery_name: z.string().optional(),
  bird_category: z.enum(["broiler","layer","dual_purpose","indigenous","breeder","turkey","duck","quail","guinea_fowl"]),
  breed:         z.string().min(1, "Required"),
  hatch_date:    z.string().min(1, "Required"),
  initial_count: z.coerce.number().int().min(1, "Must be at least 1"),
  available_count: z.coerce.number().int().min(0),
  price_per_chick: z.coerce.number().min(0, "Required"),
  notes:         z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const f = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
const lbl = "block text-sm font-medium mb-1.5";
const err = "mt-1 text-xs text-destructive";

export default function NewChickBatchPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { bird_category: "broiler" },
  });

  async function onSubmit(data: FormData) {
    setSaving(true);
    const res = await fetch("/api/inventory/chicks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, is_active: true }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Chick batch added"); router.push("/depot/inventory?tab=chicks"); }
    else { const b = await res.json(); toast.error(b.error ?? "Failed to save"); }
  }

  return (
    <div className="page-enter max-w-2xl">
      <PageHeader
        title="Add Chick Batch"
        actions={
          <Link href="/depot/inventory?tab=chicks" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Back
          </Link>
        }
      />
      <motion.form
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card border border-border rounded-2xl p-6 space-y-5"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Batch Code *</label>
            <input {...register("batch_code")} placeholder="e.g. BR-2026-01" className={f} />
            {errors.batch_code && <p className={err}>{errors.batch_code.message}</p>}
          </div>
          <div>
            <label className={lbl}>Hatchery Name</label>
            <input {...register("hatchery_name")} placeholder="Optional" className={f} />
          </div>
          <div>
            <label className={lbl}>Bird Category *</label>
            <select {...register("bird_category")} className={f}>
              {["broiler","layer","dual_purpose","indigenous","breeder","turkey","duck","quail","guinea_fowl"].map(c => (
                <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Breed *</label>
            <input {...register("breed")} placeholder="e.g. Ross 308" className={f} />
            {errors.breed && <p className={err}>{errors.breed.message}</p>}
          </div>
          <div>
            <label className={lbl}>Hatch Date *</label>
            <input type="date" {...register("hatch_date")} className={f} />
            {errors.hatch_date && <p className={err}>{errors.hatch_date.message}</p>}
          </div>
          <div>
            <label className={lbl}>Initial Count *</label>
            <input type="number" min="1" {...register("initial_count")} className={f} />
            {errors.initial_count && <p className={err}>{errors.initial_count.message}</p>}
          </div>
          <div>
            <label className={lbl}>Available Count *</label>
            <input type="number" min="0" {...register("available_count")} placeholder="Same as initial if all available" className={f} />
            {errors.available_count && <p className={err}>{errors.available_count.message}</p>}
          </div>
          <div>
            <label className={lbl}>Price per Chick (KES) *</label>
            <input type="number" min="0" step="0.01" {...register("price_per_chick")} className={f} />
            {errors.price_per_chick && <p className={err}>{errors.price_per_chick.message}</p>}
          </div>
          <div className="col-span-2">
            <label className={lbl}>Notes</label>
            <textarea rows={3} {...register("notes")} className={f} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/depot/inventory?tab=chicks" className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors">
            Cancel
          </Link>
          <button
            type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : "Add Batch"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
