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

const schema = z.object({
  flock_code:       z.string().min(2, "Minimum 2 characters"),
  bird_category:    z.enum(["broiler","layer","dual_purpose","indigenous","breeder","turkey","duck","quail","guinea_fowl"]),
  purpose:          z.enum(["meat","eggs","breeding","replacement","dual_purpose"]),
  current_quantity: z.coerce.number().int().min(0),
  status:           z.enum(["active","closed","sold","culled","deceased"]),
  notes:            z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function EditFlockPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [farmer,  setFarmer]  = useState<{ full_name: string; id_number?: string | null } | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    fetch(`/api/flocks/${id}`)
      .then(r => r.json())
      .then(d => {
        setFarmer((d.farmers as { full_name: string; id_number?: string | null } | null) ?? null);
        reset({
          flock_code:       d.flock_code ?? "",
          bird_category:    d.bird_category ?? "layer",
          purpose:          d.purpose ?? "eggs",
          current_quantity: d.current_quantity ?? 0,
          status:           d.status ?? "active",
          notes:            d.notes ?? "",
        });
        setLoading(false);
      })
      .catch(() => { toast.error("Failed to load flock"); router.push("/flocks"); });
  }, [id, reset, router]);

  async function onSubmit(data: FormData) {
    setSaving(true);
    const res = await fetch(`/api/flocks/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (res.ok) { toast.success("Flock updated"); router.push("/flocks"); }
    else        { const b = await res.json(); toast.error(b.error ?? "Update failed"); }
  }

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
        title="Edit Flock"
        actions={
          <Link href="/flocks" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Back
          </Link>
        }
      />
      {farmer && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-muted/50 text-sm">
          <span className="text-muted-foreground">Farmer: </span>
          <span className="font-medium">{farmer.full_name}</span>
          {farmer.id_number && <span className="text-muted-foreground ml-2">ID: {farmer.id_number}</span>}
        </div>
      )}
      <motion.form
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card border border-border rounded-2xl p-6 space-y-5"
      >
        <div>
          <label className={lbl}>Flock Code / Name *</label>
          <input {...register("flock_code")} className={f} />
          {errors.flock_code && <p className={err}>{errors.flock_code.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Bird Category *</label>
            <select {...register("bird_category")} className={f}>
              {["broiler","layer","dual_purpose","indigenous","breeder","turkey","duck","quail","guinea_fowl"].map(c => (
                <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Purpose *</label>
            <select {...register("purpose")} className={f}>
              <option value="eggs">Eggs</option>
              <option value="meat">Meat</option>
              <option value="breeding">Breeding</option>
              <option value="replacement">Replacement</option>
              <option value="dual_purpose">Dual Purpose</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Current Bird Count *</label>
            <input type="number" min="0" {...register("current_quantity")} className={f} />
            {errors.current_quantity && <p className={err}>{errors.current_quantity.message}</p>}
          </div>
          <div>
            <label className={lbl}>Status *</label>
            <select {...register("status")} className={f}>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="sold">Sold</option>
              <option value="culled">Culled</option>
              <option value="deceased">Deceased</option>
            </select>
          </div>
        </div>

        <div>
          <label className={lbl}>Notes</label>
          <textarea rows={3} {...register("notes")} className={f} />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/flocks" className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors">
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
