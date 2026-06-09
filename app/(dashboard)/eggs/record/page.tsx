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
import { ConfettiBlast } from "@/components/shared/ConfettiBlast";

const schema = z.object({
  layer_flock_id: z.string().uuid("Select a layer flock"),
  record_date: z.string(),
  grade_a_count: z.coerce.number().int().min(0),
  grade_b_count: z.coerce.number().int().min(0),
  grade_c_count: z.coerce.number().int().min(0),
  hatching_count: z.coerce.number().int().min(0),
  cracked_count: z.coerce.number().int().min(0),
  dirty_count: z.coerce.number().int().min(0),
  feed_consumed_kg: z.coerce.number().min(0),
});
type FormData = z.infer<typeof schema>;

export default function RecordEggsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [flocks, setFlocks] = useState<{ id: string; flock_name: string; active_hen_count: number }[]>([]);

  useEffect(() => {
    supabase
      .from("layer_flocks")
      .select("id, flock_name, active_hen_count")
      .eq("status", "active")
      .then(({ data }) => setFlocks(data ?? []));
  }, [supabase]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      record_date: new Date().toISOString().slice(0, 10),
      grade_a_count: 0, grade_b_count: 0, grade_c_count: 0,
      hatching_count: 0, cracked_count: 0, dirty_count: 0, feed_consumed_kg: 0,
    },
  });

  const values = watch();
  const totalEggs = (values.grade_a_count || 0) + (values.grade_b_count || 0) +
    (values.grade_c_count || 0) + (values.hatching_count || 0) +
    (values.cracked_count || 0) + (values.dirty_count || 0);

  const selectedFlock = flocks.find(f => f.id === values.layer_flock_id);
  const hdp = selectedFlock?.active_hen_count
    ? ((totalEggs / selectedFlock.active_hen_count) * 100).toFixed(1)
    : null;

  async function onSubmit(data: FormData) {
    setSaving(true);
    const { error } = await supabase.from("egg_production_records").insert({
      layer_flock_id: data.layer_flock_id,
      record_date: data.record_date,
      grade_a_count: data.grade_a_count,
      grade_b_count: data.grade_b_count,
      grade_c_count: data.grade_c_count,
      hatching_count: data.hatching_count,
      cracked_count: data.cracked_count,
      dirty_count: data.dirty_count,
      feed_consumed_kg: data.feed_consumed_kg,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      setShowConfetti(true);
      toast.success(`Recorded ${totalEggs.toLocaleString()} eggs!`);
      setTimeout(() => router.push("/eggs"), 1500);
    }
  }

  const field = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
  const label = "block text-sm font-medium mb-1.5";

  return (
    <div className="page-enter max-w-2xl">
      <ConfettiBlast trigger={showConfetti} type="stars" />
      <PageHeader
        title="Record Egg Production"
        actions={
          <Link href="/eggs" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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
          <div className="col-span-2">
            <label className={label}>Layer Flock *</label>
            <select {...register("layer_flock_id")} className={field}>
              <option value="">Select flock…</option>
              {flocks.map(f => (
                <option key={f.id} value={f.id}>{f.flock_name} ({f.active_hen_count} hens)</option>
              ))}
            </select>
            {errors.layer_flock_id && <p className="mt-1 text-xs text-destructive">{errors.layer_flock_id.message}</p>}
          </div>

          <div>
            <label className={label}>Record Date *</label>
            <input type="date" {...register("record_date")} className={field} />
          </div>

          <div>
            <label className={label}>Feed Consumed (kg)</label>
            <input type="number" step="0.1" min="0" {...register("feed_consumed_kg")} className={field} />
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Egg Grading</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { name: "grade_a_count" as const, label: "Grade A", color: "text-green-700" },
              { name: "grade_b_count" as const, label: "Grade B", color: "text-amber-700" },
              { name: "grade_c_count" as const, label: "Grade C", color: "text-orange-700" },
              { name: "hatching_count" as const, label: "Hatching", color: "text-blue-700" },
              { name: "cracked_count" as const, label: "Cracked", color: "text-red-600" },
              { name: "dirty_count" as const, label: "Dirty", color: "text-gray-600" },
            ].map(({ name, label: lbl, color }) => (
              <div key={name}>
                <label className={`${label} ${color}`}>{lbl}</label>
                <input type="number" min="0" {...register(name)} className={field} />
              </div>
            ))}
          </div>
        </div>

        {/* Live preview */}
        {totalEggs > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-edos-50 border border-edos-200 rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs text-muted-foreground">Total Eggs</p>
              <p className="text-2xl font-bold text-edos-700">{totalEggs.toLocaleString()}</p>
            </div>
            {hdp && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Hen Day Production</p>
                <p className="text-2xl font-bold text-edos-700">{hdp}%</p>
              </div>
            )}
          </motion.div>
        )}

        <div className="flex gap-3 pt-2">
          <Link href="/eggs" className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors">
            Cancel
          </Link>
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
