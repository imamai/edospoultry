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

const schema = z.object({
  farmer_id: z.string().uuid("Select a farmer"),
  flock_code: z.string().min(2, "Minimum 2 characters"),
  bird_category: z.enum(["broiler", "layer", "dual_purpose", "indigenous", "breeder", "turkey", "duck", "quail", "guinea_fowl"]),
  purpose: z.enum(["meat", "eggs", "breeding", "replacement", "dual_purpose"]),
  initial_quantity: z.coerce.number().int().min(1, "Must be at least 1"),
  placement_date: z.string().min(1, "Placement date required"),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function NewFlockPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [saving, setSaving] = useState(false);
  const [farmers, setFarmers] = useState<{ id: string; full_name: string; phone_number: string; id_number: string | null }[]>([]);
  const [farmerQuery, setFarmerQuery] = useState("");
  const [selectedFarmer, setSelectedFarmer] = useState<{ id: string; full_name: string; phone_number: string; id_number: string | null } | null>(null);
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
  }, [supabase]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { bird_category: "layer", purpose: "eggs", placement_date: new Date().toISOString().split("T")[0] },
  });

  async function searchFarmers(q: string) {
    setFarmerQuery(q);
    setSelectedFarmer(null);
    setValue("farmer_id", "");
    if (q.length < 3) { setFarmers([]); return; }
    const res = await fetch(`/api/farmers/search?q=${encodeURIComponent(q)}`);
    if (res.ok) setFarmers(await res.json());
  }

  async function onSubmit(data: FormData) {
    if (!profile) { toast.error("Profile not loaded — please refresh"); return; }
    setSaving(true);
    const { error } = await supabase.from("farmer_flocks").insert({
      organization_id: profile.organization_id,
      farmer_id: data.farmer_id,
      flock_code: data.flock_code,
      bird_category: data.bird_category,
      purpose: data.purpose,
      initial_quantity: data.initial_quantity,
      current_quantity: data.initial_quantity,
      placement_date: data.placement_date,
      vaccination_status: {},
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
            placeholder="Search by ID number, name, or phone…"
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
                  onClick={() => {
                    setFarmerQuery(f.full_name);
                    setFarmers([]);
                    setSelectedFarmer(f);
                    setValue("farmer_id", f.id, { shouldValidate: true });
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium">{f.full_name}</span>
                  <span className="text-muted-foreground text-xs">
                    {f.id_number ? `ID: ${f.id_number}` : f.phone_number}
                  </span>
                </button>
              ))}
            </div>
          )}
          {selectedFarmer && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-edos-50 border border-edos-200 text-sm">
              <span className="font-medium text-edos-800">{selectedFarmer.full_name}</span>
              {selectedFarmer.id_number
                ? <span className="text-edos-600 text-xs">ID: {selectedFarmer.id_number}</span>
                : <span className="text-edos-600 text-xs">{selectedFarmer.phone_number}</span>
              }
            </div>
          )}
          <input type="hidden" {...register("farmer_id")} />
          {errors.farmer_id && <p className={err}>{errors.farmer_id.message}</p>}
        </div>

        <div>
          <label className={label}>Flock Code / Name *</label>
          <input placeholder="e.g. Batch A — Broilers 2024" {...register("flock_code")} className={field} />
          {errors.flock_code && <p className={err}>{errors.flock_code.message}</p>}
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
            <select {...register("purpose")} className={field}>
              <option value="eggs">Eggs</option>
              <option value="meat">Meat</option>
              <option value="breeding">Breeding</option>
              <option value="replacement">Replacement</option>
              <option value="dual_purpose">Dual Purpose</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Initial Quantity *</label>
            <input type="number" min="1" placeholder="500" {...register("initial_quantity")} className={field} />
            {errors.initial_quantity && <p className={err}>{errors.initial_quantity.message}</p>}
          </div>
          <div>
            <label className={label}>Placement Date *</label>
            <input type="date" {...register("placement_date")} className={field} />
            {errors.placement_date && <p className={err}>{errors.placement_date.message}</p>}
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
            disabled={saving || !profile}
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
