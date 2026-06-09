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
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";

const schema = z.object({
  farmer_id: z.string().uuid("Select a farmer"),
  flock_name: z.string().min(2, "Minimum 2 characters"),
  bird_category: z.enum(["broiler", "layer", "dual_purpose", "indigenous", "breeder", "turkey", "duck", "quail", "guinea_fowl"]),
  flock_purpose: z.enum(["commercial", "subsistence", "both"]),
  initial_count: z.coerce.number().int().min(1, "Must be at least 1"),
  house_type: z.enum(["open_sided", "closed", "deep_litter", "cage", "free_range", "semi_intensive"]),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function NewFlockPage() {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [farmers, setFarmers] = useState<{ id: string; full_name: string; phone_number: string }[]>([]);
  const [farmerQuery, setFarmerQuery] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { bird_category: "layer", flock_purpose: "commercial", house_type: "deep_litter" },
  });

  async function searchFarmers(q: string) {
    setFarmerQuery(q);
    if (q.length < 2) return;
    const { data } = await supabase
      .from("farmers")
      .select("id, full_name, phone_number")
      .ilike("full_name", `%${q}%`)
      .limit(10);
    setFarmers(data ?? []);
  }

  async function onSubmit(data: FormData) {
    setSaving(true);
    const { error } = await supabase.from("farmer_flocks").insert({
      farmer_id: data.farmer_id,
      flock_name: data.flock_name,
      bird_category: data.bird_category,
      flock_purpose: data.flock_purpose,
      initial_count: data.initial_count,
      current_count: data.initial_count,
      house_type: data.house_type,
      notes: data.notes,
      status: "active",
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Flock registered successfully!");
      router.push("/flocks");
    }
  }

  const field = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
  const label = "block text-sm font-medium mb-1.5";
  const err = "mt-1 text-xs text-destructive";

  return (
    <div className="page-enter max-w-2xl">
      <PageHeader
        title="Register New Flock"
        actions={
          <Link href="/flocks" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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
        {/* Farmer search */}
        <div>
          <label className={label}>Farmer *</label>
          <input
            type="text"
            placeholder="Search by name…"
            value={farmerQuery}
            onChange={e => searchFarmers(e.target.value)}
            className={field}
          />
          {farmers.length > 0 && (
            <div className="mt-1 border border-border rounded-xl overflow-hidden shadow-md">
              {farmers.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setFarmerQuery(f.full_name); setFarmers([]); }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium">{f.full_name}</span>
                  <span className="text-muted-foreground text-xs">{f.phone_number}</span>
                </button>
              ))}
            </div>
          )}
          <input type="hidden" {...register("farmer_id")} />
          {errors.farmer_id && <p className={err}>{errors.farmer_id.message}</p>}
        </div>

        <div>
          <label className={label}>Flock Name *</label>
          <input placeholder="e.g. Batch A — Broilers 2024" {...register("flock_name")} className={field} />
          {errors.flock_name && <p className={err}>{errors.flock_name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Bird Category *</label>
            <select {...register("bird_category")} className={field}>
              {["broiler","layer","dual_purpose","indigenous","breeder","turkey","duck","quail","guinea_fowl"].map(c => (
                <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Purpose *</label>
            <select {...register("flock_purpose")} className={field}>
              <option value="commercial">Commercial</option>
              <option value="subsistence">Subsistence</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Initial Count *</label>
            <input type="number" min="1" placeholder="500" {...register("initial_count")} className={field} />
            {errors.initial_count && <p className={err}>{errors.initial_count.message}</p>}
          </div>
          <div>
            <label className={label}>Housing Type *</label>
            <select {...register("house_type")} className={field}>
              {["open_sided","closed","deep_litter","cage","free_range","semi_intensive"].map(h => (
                <option key={h} value={h}>{h.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={label}>Notes</label>
          <textarea rows={3} placeholder="Optional notes…" {...register("notes")} className={field} />
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href="/flocks"
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : "Register Flock"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
