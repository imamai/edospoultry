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
  metric:           z.string().min(1, "Select metric"),
  forecast_date:    z.string().min(1, "Date required"),
  forecast_start:   z.string().min(1, "Start date required"),
  forecast_end:     z.string().min(1, "End date required"),
  forecasted_value: z.coerce.number().nonnegative("Must be positive"),
  unit:             z.string().min(1, "Unit required"),
  actual_value:     z.coerce.number().nonnegative().optional(),
  farmer_id:        z.string().optional().transform(v => v || undefined),
  flock_id:         z.string().optional().transform(v => v || undefined),
  notes:            z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// Matches forecast_metric enum in migration
const METRICS = [
  { value: "eggs_daily",          label: "Eggs Daily" },
  { value: "chicks_weekly",       label: "Chicks Weekly" },
  { value: "live_weight_kg",      label: "Live Weight (kg)" },
  { value: "feed_consumption_kg", label: "Feed Consumption (kg)" },
  { value: "revenue",             label: "Revenue (KES)" },
  { value: "mortality_rate",      label: "Mortality Rate" },
];
const UNIT_HINTS: Record<string, string> = {
  eggs_daily: "eggs", chicks_weekly: "chicks", live_weight_kg: "kg",
  feed_consumption_kg: "kg", revenue: "KES", mortality_rate: "%",
};

export default function NewForecastPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [farmers, setFarmers] = useState<{ id: string; full_name: string }[]>([]);
  const [flocks,  setFlocks]  = useState<{ id: string; flock_code: string }[]>([]);

  const today = new Date().toISOString().split("T")[0];
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { forecast_date: today },
  });
  const farmerId = watch("farmer_id");
  const metric   = watch("metric");

  useEffect(() => { fetch("/api/farmers").then(r => r.json()).then(d => setFarmers(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  useEffect(() => {
    if (!farmerId) { setFlocks([]); return; }
    fetch(`/api/flocks?farmer_id=${farmerId}`).then(r => r.json()).then(d => setFlocks(Array.isArray(d) ? d : [])).catch(() => {});
  }, [farmerId]);
  useEffect(() => {
    if (metric && UNIT_HINTS[metric]) setValue("unit", UNIT_HINTS[metric]);
  }, [metric, setValue]);

  async function onSubmit(data: FormData) {
    setSaving(true);
    const res = await fetch("/api/production/forecasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (!res.ok) { toast.error((await res.json()).error ?? "Failed"); return; }
    toast.success("Forecast saved!");
    router.push("/production?tab=forecasts");
  }

  const field = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
  const label = "block text-sm font-medium mb-1.5";
  const err   = "mt-1 text-xs text-destructive";

  return (
    <div className="page-enter max-w-2xl">
      <PageHeader
        title="New Production Forecast"
        actions={
          <Link href="/production?tab=forecasts" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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
            <label className={label}>Metric *</label>
            <select {...register("metric")} className={field}>
              <option value="">— Select —</option>
              {METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            {errors.metric && <p className={err}>{errors.metric.message}</p>}
          </div>
          <div>
            <label className={label}>Forecast Date *</label>
            <input type="date" {...register("forecast_date")} className={field} />
            {errors.forecast_date && <p className={err}>{errors.forecast_date.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Forecast Start *</label>
            <input type="date" {...register("forecast_start")} className={field} />
            {errors.forecast_start && <p className={err}>{errors.forecast_start.message}</p>}
          </div>
          <div>
            <label className={label}>Forecast End *</label>
            <input type="date" {...register("forecast_end")} className={field} />
            {errors.forecast_end && <p className={err}>{errors.forecast_end.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Forecasted Value *</label>
            <input type="number" min="0" step="0.0001" {...register("forecasted_value")} className={field} />
            {errors.forecasted_value && <p className={err}>{errors.forecasted_value.message}</p>}
          </div>
          <div>
            <label className={label}>Unit *</label>
            <input placeholder="e.g. eggs, kg, KES" {...register("unit")} className={field} />
            {errors.unit && <p className={err}>{errors.unit.message}</p>}
          </div>
        </div>

        <div>
          <label className={label}>Actual Value (if already known)</label>
          <input type="number" min="0" step="0.0001" {...register("actual_value")} className={field} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Farmer</label>
            <select {...register("farmer_id")} className={field}>
              <option value="">— Organization-wide —</option>
              {farmers.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Flock</label>
            <select {...register("flock_id")} className={field} disabled={!farmerId || !flocks.length}>
              <option value="">— All flocks —</option>
              {flocks.map(f => <option key={f.id} value={f.id}>{f.flock_code}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={label}>Notes</label>
          <textarea rows={2} {...register("notes")} className={field} />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/production?tab=forecasts" className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors">Cancel</Link>
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : "Save Forecast"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
