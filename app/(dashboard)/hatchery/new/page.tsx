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
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";

const schema = z.object({
  depot_id: z.string().uuid("Select a depot"),
  batch_code: z.string().min(2),
  eggs_set: z.coerce.number().int().min(1),
  set_date: z.string(),
  breed: z.string().min(1, "Enter breed"),
  source_flock_id: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function NewHatcheryBatchPage() {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [depots, setDepots] = useState<{ id: string; depot_name: string }[]>([]);

  useEffect(() => {
    supabase.from("depots").select("id, depot_name").then(({ data }) => setDepots(data ?? []));
  }, [supabase]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { set_date: new Date().toISOString().slice(0, 10) },
  });

  const setDate = watch("set_date");
  const expectedHatch = setDate
    ? new Date(new Date(setDate).getTime() + 21 * 86400_000).toISOString().slice(0, 10)
    : null;

  async function onSubmit(data: FormData) {
    setSaving(true);
    const { error } = await supabase.from("hatchery_batches").insert({
      depot_id: data.depot_id,
      batch_code: data.batch_code,
      eggs_set: data.eggs_set,
      set_date: data.set_date,
      breed: data.breed,
      source_flock_id: data.source_flock_id || null,
      notes: data.notes,
      status: "incubating",
    });
    setSaving(false);
    if (error) { toast.error(error.message); }
    else { toast.success("Batch created!"); router.push("/hatchery"); }
  }

  const f = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
  const lbl = "block text-sm font-medium mb-1.5";

  return (
    <div className="page-enter max-w-2xl">
      <PageHeader
        title="New Hatchery Batch"
        actions={
          <Link href="/hatchery" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Back
          </Link>
        }
      />
      <motion.form
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card border border-border rounded-2xl p-6 space-y-5"
      >
        <div>
          <label className={lbl}>Depot *</label>
          <select {...register("depot_id")} className={f}>
            <option value="">Select depot…</option>
            {depots.map(d => <option key={d.id} value={d.id}>{d.depot_name}</option>)}
          </select>
          {errors.depot_id && <p className="mt-1 text-xs text-destructive">{errors.depot_id.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Batch Code *</label>
            <input placeholder="e.g. HB-2024-001" {...register("batch_code")} className={f} />
            {errors.batch_code && <p className="mt-1 text-xs text-destructive">{errors.batch_code.message}</p>}
          </div>
          <div>
            <label className={lbl}>Eggs Set *</label>
            <input type="number" min="1" placeholder="5000" {...register("eggs_set")} className={f} />
            {errors.eggs_set && <p className="mt-1 text-xs text-destructive">{errors.eggs_set.message}</p>}
          </div>
          <div>
            <label className={lbl}>Set Date *</label>
            <input type="date" {...register("set_date")} className={f} />
          </div>
          <div>
            <label className={lbl}>Expected Hatch Date</label>
            <input type="date" value={expectedHatch ?? ""} readOnly className={`${f} bg-muted/40 cursor-not-allowed`} />
          </div>
        </div>

        <div>
          <label className={lbl}>Breed *</label>
          <input placeholder="e.g. Cobb 500, KARI Improved Kienyeji" {...register("breed")} className={f} />
          {errors.breed && <p className="mt-1 text-xs text-destructive">{errors.breed.message}</p>}
        </div>

        <div>
          <label className={lbl}>Notes</label>
          <textarea rows={3} placeholder="Optional notes…" {...register("notes")} className={f} />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/hatchery" className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors">Cancel</Link>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : "Create Batch"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
