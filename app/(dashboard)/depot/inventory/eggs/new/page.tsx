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
import { PageHeader } from "@/components/shared/PageHeader";

const schema = z.object({
  grade:               z.enum(["A","B","C","hatching","cracked","dirty"]),
  quantity_trays:      z.coerce.number().min(0, "Required"),
  unit_price_per_tray: z.coerce.number().min(0, "Required"),
  batch_ref:           z.string().optional(),
  expiry_date:         z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const f = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
const lbl = "block text-sm font-medium mb-1.5";
const err = "mt-1 text-xs text-destructive";

export default function NewEggStockPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { grade: "A" },
  });

  async function onSubmit(data: FormData) {
    setSaving(true);
    const res = await fetch("/api/inventory/eggs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (res.ok) { toast.success("Egg stock saved"); router.push("/depot/inventory?tab=eggs"); }
    else { const b = await res.json(); toast.error(b.error ?? "Failed to save"); }
  }

  return (
    <div className="page-enter max-w-xl">
      <PageHeader
        title="Add Egg Stock"
        actions={
          <Link href="/depot/inventory?tab=eggs" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Back
          </Link>
        }
      />
      <p className="text-sm text-muted-foreground mb-4 -mt-2">
        If stock for this grade already exists, the quantity will be updated.
      </p>
      <motion.form
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card border border-border rounded-2xl p-6 space-y-5"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Grade *</label>
            <select {...register("grade")} className={f}>
              {["A","B","C","hatching","cracked","dirty"].map(g => (
                <option key={g} value={g}>{g === "A" || g === "B" || g === "C" ? `Grade ${g}` : g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Quantity (trays) *</label>
            <input type="number" min="0" step="0.5" {...register("quantity_trays")} className={f} />
            {errors.quantity_trays && <p className={err}>{errors.quantity_trays.message}</p>}
          </div>
          <div>
            <label className={lbl}>Price per Tray (KES) *</label>
            <input type="number" min="0" step="0.01" {...register("unit_price_per_tray")} className={f} />
            {errors.unit_price_per_tray && <p className={err}>{errors.unit_price_per_tray.message}</p>}
          </div>
          <div>
            <label className={lbl}>Batch Reference</label>
            <input {...register("batch_ref")} placeholder="Optional" className={f} />
          </div>
          <div>
            <label className={lbl}>Expiry Date</label>
            <input type="date" {...register("expiry_date")} className={f} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/depot/inventory?tab=eggs" className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors">
            Cancel
          </Link>
          <button
            type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : "Save Stock"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
