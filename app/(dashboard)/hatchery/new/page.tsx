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
  depot_id:      z.string().uuid("Select a depot"),
  batch_code:    z.string().min(2),
  batch_name:    z.string().min(2, "Batch name required"),
  bird_category: z.enum(["broiler","layer","dual_purpose","indigenous","breeder","turkey","duck","quail","guinea_fowl"]),
  breed:         z.string().optional(),
  egg_source:    z.enum(["own_farm","purchased"]),
  eggs_set:      z.coerce.number().int().min(1),
  set_date:      z.string().min(1, "Set date required"),
  notes:         z.string().optional(),
});

function genBatchCode() {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HB-${yy}${mm}-${rand}`;
}

const BREEDS_BY_CATEGORY: Record<string, string[]> = {
  broiler:       ["Cobb 500", "Ross 308", "Hubbard Classic", "Arbor Acres Plus", "Ross 708"],
  layer:         ["Isa Brown", "Lohmann Brown", "HyLine Brown", "Bovans Brown", "Dekalb White", "Hy-Line W-36"],
  dual_purpose:  ["Kenbro", "Kari Improved Kienyeji", "Rainbow Rooster", "Sasso T451"],
  indigenous:    ["KARI Kienyeji", "Kuroiler", "Sasso", "Local Kienyeji"],
  breeder:       ["Cobb 500 Parent", "Ross 308 Parent", "Lohmann Parent"],
  turkey:        ["Broad Breasted White", "Broad Breasted Bronze", "Slate Turkey", "Bourbon Red"],
  duck:          ["Pekin", "Muscovy", "Khaki Campbell", "Indian Runner"],
  quail:         ["Japanese Quail", "Jumbo Coturnix", "Pharaoh Quail"],
  guinea_fowl:   ["Helmeted Guinea Fowl", "Pearl Guinea Fowl", "White Guinea Fowl"],
};

type FormData = z.infer<typeof schema>;

export default function NewHatcheryBatchPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [saving, setSaving] = useState(false);
  const [depots, setDepots] = useState<{ id: string; name: string }[]>([]);
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

    supabase
      .from("depots")
      .select("id, name")
      .order("name")
      .then(({ data }) => setDepots(data ?? []));
  }, [supabase]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { set_date: new Date().toISOString().slice(0, 10), bird_category: "broiler", egg_source: "own_farm", batch_code: genBatchCode() },
  });

  const setDate      = watch("set_date");
  const birdCategory = watch("bird_category");
  const breedOptions = BREEDS_BY_CATEGORY[birdCategory] ?? [];

  useEffect(() => { setValue("breed", ""); }, [birdCategory, setValue]);

  const expectedHatch = setDate
    ? new Date(new Date(setDate).getTime() + 21 * 86400_000).toISOString().slice(0, 10)
    : null;

  async function onSubmit(data: FormData) {
    if (!profile) { toast.error("Profile not loaded — please refresh"); return; }
    setSaving(true);
    const { error } = await supabase.from("hatchery_batches").insert({
      organization_id: profile.organization_id,
      depot_id: data.depot_id,
      batch_code: data.batch_code,
      batch_name: data.batch_name,
      bird_category: data.bird_category,
      breed: data.breed,
      egg_source: data.egg_source,
      eggs_set: data.eggs_set,
      set_date: data.set_date,
      notes: data.notes,
      status: "setting",
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
            {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {errors.depot_id && <p className="mt-1 text-xs text-destructive">{errors.depot_id.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Batch Code <span className="text-xs text-muted-foreground font-normal">(auto-generated)</span></label>
            <div className="flex gap-2">
              <input {...register("batch_code")} readOnly className={`${f} bg-muted/40 font-mono`} />
              <button
                type="button"
                onClick={() => setValue("batch_code", genBatchCode())}
                className="px-3 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap"
              >
                Regenerate
              </button>
            </div>
            {errors.batch_code && <p className="mt-1 text-xs text-destructive">{errors.batch_code.message}</p>}
          </div>
          <div>
            <label className={lbl}>Batch Name *</label>
            <input placeholder="e.g. March Layer Batch" {...register("batch_name")} className={f} />
            {errors.batch_name && <p className="mt-1 text-xs text-destructive">{errors.batch_name.message}</p>}
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
            <label className={lbl}>Breed</label>
            <select {...register("breed")} className={f}>
              <option value="">— Select breed —</option>
              {breedOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={lbl}>Egg Source *</label>
            <select {...register("egg_source")} className={f}>
              <option value="own_farm">Own Farm</option>
              <option value="purchased">Purchased</option>
            </select>
            {errors.egg_source && <p className="mt-1 text-xs text-destructive">{errors.egg_source.message}</p>}
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
          <div className="col-span-2">
            <label className={lbl}>Expected Hatch Date</label>
            <input type="date" value={expectedHatch ?? ""} readOnly className={`${f} bg-muted/40 cursor-not-allowed`} />
          </div>
        </div>

        <div>
          <label className={lbl}>Notes</label>
          <textarea rows={3} placeholder="Optional notes…" {...register("notes")} className={f} />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/hatchery" className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !profile}
            className="flex-1 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : "Create Batch"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
