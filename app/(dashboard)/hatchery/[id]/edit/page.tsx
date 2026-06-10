"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/shared/PageHeader";

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

const schema = z.object({
  batch_code:         z.string().min(2),
  batch_name:         z.string().min(2),
  bird_category:      z.enum(["broiler","layer","dual_purpose","indigenous","breeder","turkey","duck","quail","guinea_fowl"]),
  breed:              z.string().min(1),
  egg_source:         z.enum(["own_farm","purchased"]),
  eggs_set:           z.coerce.number().int().min(1),
  set_date:           z.string().min(1),
  eggs_candled:       z.coerce.number().int().min(0),
  fertile_eggs:       z.coerce.number().int().min(0),
  eggs_transferred:   z.coerce.number().int().min(0),
  chicks_hatched:     z.coerce.number().int().min(0),
  chicks_culled:      z.coerce.number().int().min(0),
  status:             z.enum(["setting","candling","lockdown","hatching","complete","failed"]),
  notes:              z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function EditHatcheryPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    fetch(`/api/hatchery/${id}`)
      .then(r => r.json())
      .then(d => {
        reset({
          batch_code:       d.batch_code ?? "",
          batch_name:       d.batch_name ?? "",
          bird_category:    d.bird_category ?? "broiler",
          breed:            d.breed ?? "",
          egg_source:       (d.egg_source === "purchased" ? "purchased" : "own_farm") as "own_farm" | "purchased",
          eggs_set:         d.eggs_set ?? 1,
          set_date:         d.set_date ?? "",
          eggs_candled:     d.eggs_candled ?? 0,
          fertile_eggs:     d.fertile_eggs ?? 0,
          eggs_transferred: d.eggs_transferred ?? 0,
          chicks_hatched:   d.chicks_hatched ?? 0,
          chicks_culled:    d.chicks_culled ?? 0,
          status:           d.status ?? "setting",
          notes:            d.notes ?? "",
        });
        setLoading(false);
      })
      .catch(() => { toast.error("Failed to load batch"); router.push("/hatchery"); });
  }, [id, reset, router]);

  async function onSubmit(data: FormData) {
    setSaving(true);
    const res = await fetch(`/api/hatchery/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (res.ok) { toast.success("Batch updated"); router.push("/hatchery"); }
    else        { const b = await res.json(); toast.error(b.error ?? "Update failed"); }
  }

  const birdCategory = watch("bird_category");
  const breedOptions = BREEDS_BY_CATEGORY[birdCategory] ?? [];

  const f   = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
  const lbl = "block text-sm font-medium mb-1.5";
  const err = "mt-1 text-xs text-destructive";

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={24} className="animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="page-enter max-w-2xl">
      <PageHeader
        title="Edit Hatchery Batch"
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Batch Code *</label>
            <input {...register("batch_code")} className={f} />
            {errors.batch_code && <p className={err}>{errors.batch_code.message}</p>}
          </div>
          <div>
            <label className={lbl}>Batch Name *</label>
            <input {...register("batch_name")} className={f} />
            {errors.batch_name && <p className={err}>{errors.batch_name.message}</p>}
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
            {errors.egg_source && <p className={err}>{errors.egg_source.message}</p>}
          </div>
          <div>
            <label className={lbl}>Eggs Set *</label>
            <input type="number" min="1" {...register("eggs_set")} className={f} />
            {errors.eggs_set && <p className={err}>{errors.eggs_set.message}</p>}
          </div>
          <div>
            <label className={lbl}>Set Date *</label>
            <input type="date" {...register("set_date")} className={f} />
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Incubation Results</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { name: "eggs_candled"     as const, label: "Eggs Candled" },
              { name: "fertile_eggs"     as const, label: "Fertile Eggs" },
              { name: "eggs_transferred" as const, label: "Transferred" },
              { name: "chicks_hatched"   as const, label: "Chicks Hatched" },
              { name: "chicks_culled"    as const, label: "Chicks Culled" },
            ].map(({ name, label: lbl2 }) => (
              <div key={name}>
                <label className={lbl}>{lbl2}</label>
                <input type="number" min="0" {...register(name)} className={f} />
              </div>
            ))}
            <div>
              <label className={lbl}>Status *</label>
              <select {...register("status")} className={f}>
                <option value="setting">Setting</option>
                <option value="candling">Candling</option>
                <option value="lockdown">Lockdown</option>
                <option value="hatching">Hatching</option>
                <option value="complete">Complete</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className={lbl}>Notes</label>
          <textarea rows={3} {...register("notes")} className={f} />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/hatchery" className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors">
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
