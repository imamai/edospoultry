"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";

const today = new Date().toISOString().slice(0, 10);

const schema = z.object({
  production_date:    z.string().min(1, "Required").refine(v => v <= today, "Cannot be in the future"),
  hen_count:          z.coerce.number().int().min(1, "Enter hen count"),
  grade_a_count:      z.coerce.number().int().min(0),
  grade_b_count:      z.coerce.number().int().min(0),
  grade_c_count:      z.coerce.number().int().min(0),
  hatching_eggs:      z.coerce.number().int().min(0),
  cracked_eggs:       z.coerce.number().int().min(0),
  dirty_eggs:         z.coerce.number().int().min(0),
  feed_consumption_kg: z.coerce.number().min(0),
});
type FormData = z.infer<typeof schema>;

export default function EditEggRecordPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    fetch(`/api/eggs/${id}`)
      .then(r => r.json())
      .then(data => {
        reset({
          production_date:     data.production_date ?? today,
          hen_count:           data.hen_count ?? 1,
          grade_a_count:       data.grade_a_count ?? 0,
          grade_b_count:       data.grade_b_count ?? 0,
          grade_c_count:       data.grade_c_count ?? 0,
          hatching_eggs:       data.hatching_eggs ?? 0,
          cracked_eggs:        data.cracked_eggs ?? 0,
          dirty_eggs:          data.dirty_eggs ?? 0,
          feed_consumption_kg: data.feed_consumption_kg ?? 0,
        });
        setLoading(false);
      })
      .catch(() => { toast.error("Failed to load record"); router.push("/eggs"); });
  }, [id, reset, router]);

  const values    = watch();
  const totalEggs = Number(values.grade_a_count || 0) + Number(values.grade_b_count || 0) +
    Number(values.grade_c_count || 0) + Number(values.hatching_eggs || 0) +
    Number(values.cracked_eggs  || 0) + Number(values.dirty_eggs    || 0);
  const henCount  = Number(values.hen_count || 0);
  const hdp       = henCount > 0 ? ((totalEggs / henCount) * 100).toFixed(1) : null;

  async function onSubmit(data: FormData) {
    setSaving(true);
    const saleableEggs      = Number(data.grade_a_count) + Number(data.grade_b_count) + Number(data.grade_c_count) + Number(data.hatching_eggs);
    const henDayProduction  = data.hen_count > 0 ? (totalEggs / data.hen_count) * 100 : 0;
    const res = await fetch(`/api/eggs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        production_date:    data.production_date,
        hen_count:          data.hen_count,
        grade_a_count:      data.grade_a_count,
        grade_b_count:      data.grade_b_count,
        grade_c_count:      data.grade_c_count,
        hatching_eggs:      data.hatching_eggs,
        cracked_eggs:       data.cracked_eggs,
        dirty_eggs:         data.dirty_eggs,
        feed_consumption_kg: data.feed_consumption_kg || null,
        total_eggs_laid:    totalEggs,
        saleable_eggs:      saleableEggs,
        hen_day_production: henDayProduction,
        morning_collection: totalEggs,
      }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Record updated"); router.push("/eggs"); }
    else        { const b = await res.json(); toast.error(b.error ?? "Update failed"); }
  }

  const f   = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
  const lbl = "block text-sm font-medium mb-1.5";

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={24} className="animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="page-enter max-w-2xl">
      <PageHeader
        title="Edit Egg Record"
        actions={
          <Link href="/eggs" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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
            <label className={lbl}>Production Date *</label>
            <input type="date" max={today} {...register("production_date")} className={f} />
            {errors.production_date && <p className="mt-1 text-xs text-destructive">{errors.production_date.message}</p>}
          </div>
          <div>
            <label className={lbl}>Hen Count *</label>
            <input type="number" min="1" {...register("hen_count")} className={f} />
            {errors.hen_count && <p className="mt-1 text-xs text-destructive">{errors.hen_count.message}</p>}
          </div>
          <div>
            <label className={lbl}>Feed Consumed (kg)</label>
            <input type="number" step="0.1" min="0" {...register("feed_consumption_kg")} className={f} />
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Egg Grading</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { name: "grade_a_count"  as const, label: "Grade A",  color: "text-green-700" },
              { name: "grade_b_count"  as const, label: "Grade B",  color: "text-amber-700" },
              { name: "grade_c_count"  as const, label: "Grade C",  color: "text-orange-700" },
              { name: "hatching_eggs"  as const, label: "Hatching", color: "text-blue-700" },
              { name: "cracked_eggs"   as const, label: "Cracked",  color: "text-red-600" },
              { name: "dirty_eggs"     as const, label: "Dirty",    color: "text-gray-600" },
            ].map(({ name, label: lbl2, color }) => (
              <div key={name}>
                <label className={`${lbl} ${color}`}>{lbl2}</label>
                <input type="number" min="0" {...register(name)} className={f} />
              </div>
            ))}
          </div>
        </div>

        {totalEggs > 0 && (
          <div className="bg-edos-50 border border-edos-200 rounded-xl p-4 flex items-center justify-between">
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
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link href="/eggs" className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors">
            Cancel
          </Link>
          <button
            type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
