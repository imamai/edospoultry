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
  vaccine_name:   z.string().min(2, "Required"),
  disease_target: z.string().min(2, "Required"),
  product_code:   z.string().optional(),
  supplier:       z.string().optional(),
  quantity_doses: z.coerce.number().int().min(0, "Required"),
  unit_price:     z.coerce.number().min(0, "Required"),
  batch_number:   z.string().optional(),
  expiry_date:    z.string().optional(),
  storage_temp_c: z.coerce.number().optional(),
  minimum_stock:  z.coerce.number().int().min(0).optional(),
});
type FormData = z.infer<typeof schema>;

const f = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
const lbl = "block text-sm font-medium mb-1.5";
const err = "mt-1 text-xs text-destructive";

export default function NewVaccinePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { minimum_stock: 100 },
  });

  async function onSubmit(data: FormData) {
    setSaving(true);
    const res = await fetch("/api/inventory/vaccines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (res.ok) { toast.success("Vaccine added"); router.push("/depot/inventory?tab=vaccines"); }
    else { const b = await res.json(); toast.error(b.error ?? "Failed to save"); }
  }

  return (
    <div className="page-enter max-w-2xl">
      <PageHeader
        title="Add Vaccine"
        actions={
          <Link href="/depot/inventory?tab=vaccines" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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
            <label className={lbl}>Vaccine Name *</label>
            <input {...register("vaccine_name")} placeholder="e.g. Newcastle LaSota" className={f} />
            {errors.vaccine_name && <p className={err}>{errors.vaccine_name.message}</p>}
          </div>
          <div>
            <label className={lbl}>Disease Target *</label>
            <input {...register("disease_target")} placeholder="e.g. Newcastle Disease" className={f} />
            {errors.disease_target && <p className={err}>{errors.disease_target.message}</p>}
          </div>
          <div>
            <label className={lbl}>Product Code</label>
            <input {...register("product_code")} placeholder="Optional SKU" className={f} />
          </div>
          <div>
            <label className={lbl}>Supplier</label>
            <input {...register("supplier")} placeholder="Optional" className={f} />
          </div>
          <div>
            <label className={lbl}>Batch Number</label>
            <input {...register("batch_number")} placeholder="Optional" className={f} />
          </div>
          <div>
            <label className={lbl}>Storage Temp (°C)</label>
            <input type="number" step="0.1" {...register("storage_temp_c")} placeholder="e.g. 2 – 8" className={f} />
          </div>
          <div>
            <label className={lbl}>Quantity (doses) *</label>
            <input type="number" min="0" {...register("quantity_doses")} className={f} />
            {errors.quantity_doses && <p className={err}>{errors.quantity_doses.message}</p>}
          </div>
          <div>
            <label className={lbl}>Unit Price (KES) *</label>
            <input type="number" min="0" step="0.01" {...register("unit_price")} className={f} />
            {errors.unit_price && <p className={err}>{errors.unit_price.message}</p>}
          </div>
          <div>
            <label className={lbl}>Minimum Stock Alert</label>
            <input type="number" min="0" {...register("minimum_stock")} className={f} />
          </div>
          <div>
            <label className={lbl}>Expiry Date</label>
            <input type="date" {...register("expiry_date")} className={f} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/depot/inventory?tab=vaccines" className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors">
            Cancel
          </Link>
          <button
            type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : "Add Vaccine"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
