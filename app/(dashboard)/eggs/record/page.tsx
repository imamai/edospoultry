"use client";
import { useState, useEffect, useMemo } from "react";
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

const today = new Date().toISOString().slice(0, 10);

const schema = z.object({
  flock_id: z.string().uuid("Select a flock"),
  production_date: z.string()
    .min(1, "Production date is required")
    .refine(v => v <= today, "Date cannot be in the future"),
  hen_count: z.coerce.number().int().min(1, "Enter hen count"),
  grade_a_count: z.coerce.number().int().min(0, "Cannot be negative"),
  grade_b_count: z.coerce.number().int().min(0, "Cannot be negative"),
  grade_c_count: z.coerce.number().int().min(0, "Cannot be negative"),
  hatching_eggs: z.coerce.number().int().min(0, "Cannot be negative"),
  cracked_eggs: z.coerce.number().int().min(0, "Cannot be negative"),
  dirty_eggs: z.coerce.number().int().min(0, "Cannot be negative"),
  feed_consumption_kg: z.coerce.number().min(0),
});
type FormData = z.infer<typeof schema>;

interface FlockOption {
  id: string;
  flock_code: string | null;
  farmer_id: string;
  current_quantity: number;
  farmers: { full_name: string } | null;
}

export default function RecordEggsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [saving, setSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [flocks, setFlocks] = useState<FlockOption[]>([]);
  const [profile, setProfile] = useState<{ id: string; organization_id: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, organization_id")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data as { id: string; organization_id: string });
    });

    fetch("/api/flocks/options")
      .then(r => r.json())
      .then(data => setFlocks((data ?? []) as FlockOption[]));
  }, [supabase]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      production_date: today,
      grade_a_count: 0, grade_b_count: 0, grade_c_count: 0,
      hatching_eggs: 0, cracked_eggs: 0, dirty_eggs: 0, feed_consumption_kg: 0,
    },
  });

  const values = watch();
  const totalEggs = Number(values.grade_a_count || 0) + Number(values.grade_b_count || 0) +
    Number(values.grade_c_count || 0) + Number(values.hatching_eggs || 0) +
    Number(values.cracked_eggs || 0) + Number(values.dirty_eggs || 0);

  const henCount = Number(values.hen_count || 0);
  const hdp = henCount > 0 ? ((totalEggs / henCount) * 100).toFixed(1) : null;

  async function onSubmit(data: FormData) {
    if (!profile) { toast.error("Session not ready — please refresh"); return; }
    const selectedFlock = flocks.find(f => f.id === data.flock_id);
    if (!selectedFlock) { toast.error("Select a valid flock"); return; }
    if (totalEggs === 0) { toast.error("Enter at least one egg count before saving"); return; }

    // Check for duplicate record (same flock + date)
    const dupRes = await fetch(`/api/eggs/check-duplicate?flock_id=${data.flock_id}&date=${data.production_date}`);
    const { exists } = await dupRes.json();
    if (exists) {
      toast.error(`A record for this flock on ${data.production_date} already exists`);
      return;
    }

    const saleableEggs = Number(data.grade_a_count) + Number(data.grade_b_count) +
      Number(data.grade_c_count) + Number(data.hatching_eggs);
    const henDayProduction = data.hen_count > 0
      ? (totalEggs / data.hen_count) * 100
      : 0;

    setSaving(true);
    const { error } = await supabase.from("egg_production_records").insert({
      organization_id: profile.organization_id,
      flock_id: data.flock_id,
      farmer_id: selectedFlock.farmer_id,
      production_date: data.production_date,
      morning_collection: totalEggs,
      afternoon_collection: 0,
      total_eggs_laid: totalEggs,
      saleable_eggs: saleableEggs,
      hen_day_production: henDayProduction,
      hen_count: data.hen_count,
      grade_a_count: data.grade_a_count,
      grade_b_count: data.grade_b_count,
      grade_c_count: data.grade_c_count,
      hatching_eggs: data.hatching_eggs,
      cracked_eggs: data.cracked_eggs,
      dirty_eggs: data.dirty_eggs,
      feed_consumption_kg: data.feed_consumption_kg || null,
      mortality_count: 0,
      recorded_by: profile.id,
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
            <label className={label}>Layer / Dual-Purpose Flock *</label>
            <select {...register("flock_id")} className={field}>
              <option value="">Select flock…</option>
              {flocks.map(f => (
                <option key={f.id} value={f.id}>
                  {f.flock_code ?? f.id.slice(0, 8)} — {(f.farmers as { full_name: string } | null)?.full_name ?? "Unknown"}
                </option>
              ))}
            </select>
            {errors.flock_id && <p className="mt-1 text-xs text-destructive">{errors.flock_id.message}</p>}
          </div>

          <div>
            <label className={label}>Production Date *</label>
            <input type="date" max={today} {...register("production_date")} className={field} />
            {errors.production_date && <p className="mt-1 text-xs text-destructive">{errors.production_date.message}</p>}
          </div>

          <div>
            <label className={label}>Hen Count *</label>
            <input type="number" min="1" placeholder="e.g. 500" {...register("hen_count")} className={field} />
            {errors.hen_count && <p className="mt-1 text-xs text-destructive">{errors.hen_count.message}</p>}
          </div>

          <div>
            <label className={label}>Feed Consumed (kg)</label>
            <input type="number" step="0.1" min="0" {...register("feed_consumption_kg")} className={field} />
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Egg Grading</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { name: "grade_a_count" as const, label: "Grade A", color: "text-green-700" },
              { name: "grade_b_count" as const, label: "Grade B", color: "text-amber-700" },
              { name: "grade_c_count" as const, label: "Grade C", color: "text-orange-700" },
              { name: "hatching_eggs" as const, label: "Hatching", color: "text-blue-700" },
              { name: "cracked_eggs" as const, label: "Cracked", color: "text-red-600" },
              { name: "dirty_eggs" as const, label: "Dirty", color: "text-gray-600" },
            ].map(({ name, label: lbl, color }) => (
              <div key={name}>
                <label className={`${label} ${color}`}>{lbl}</label>
                <input type="number" min="0" {...register(name)} className={field} />
                {errors[name] && <p className="mt-1 text-xs text-destructive">{errors[name]?.message}</p>}
              </div>
            ))}
          </div>
        </div>

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
            disabled={saving || !profile}
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
