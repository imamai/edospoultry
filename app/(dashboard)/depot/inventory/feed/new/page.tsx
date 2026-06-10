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
  product_name:     z.string().min(2, "Required"),
  product_code:     z.string().optional(),
  feed_type:        z.enum(["starter","grower","finisher","layer_mash","layer_pellet","broiler_concentrate","kienyeji","breeder","supplement"]),
  supplier:         z.string().optional(),
  quantity_kg:      z.coerce.number().min(0, "Required"),
  unit_price_per_kg:z.coerce.number().min(0, "Required"),
  batch_number:     z.string().optional(),
  expiry_date:      z.string().optional(),
  minimum_stock_kg: z.coerce.number().min(0).optional(),
});
type FormData = z.infer<typeof schema>;

const f = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
const lbl = "block text-sm font-medium mb-1.5";
const err = "mt-1 text-xs text-destructive";

export default function NewFeedPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { feed_type: "starter", minimum_stock_kg: 500 },
  });

  async function onSubmit(data: FormData) {
    setSaving(true);
    const res = await fetch("/api/inventory/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (res.ok) { toast.success("Feed added"); router.push("/depot/inventory?tab=feed"); }
    else { const b = await res.json(); toast.error(b.error ?? "Failed to save"); }
  }

  return (
    <div className="page-enter max-w-2xl">
      <PageHeader
        title="Add Feed"
        actions={
          <Link href="/depot/inventory?tab=feed" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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
          <div className="col-span-2">
            <label className={lbl}>Product Name *</label>
            <input {...register("product_name")} placeholder="e.g. Unga Broiler Starter" className={f} />
            {errors.product_name && <p className={err}>{errors.product_name.message}</p>}
          </div>
          <div>
            <label className={lbl}>Product Code</label>
            <input {...register("product_code")} placeholder="Optional SKU" className={f} />
          </div>
          <div>
            <label className={lbl}>Feed Type *</label>
            <select {...register("feed_type")} className={f}>
              {["starter","grower","finisher","layer_mash","layer_pellet","broiler_concentrate","kienyeji","breeder","supplement"].map(t => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
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
            <label className={lbl}>Quantity (kg) *</label>
            <input type="number" min="0" step="0.001" {...register("quantity_kg")} className={f} />
            {errors.quantity_kg && <p className={err}>{errors.quantity_kg.message}</p>}
          </div>
          <div>
            <label className={lbl}>Price per kg (KES) *</label>
            <input type="number" min="0" step="0.01" {...register("unit_price_per_kg")} className={f} />
            {errors.unit_price_per_kg && <p className={err}>{errors.unit_price_per_kg.message}</p>}
          </div>
          <div>
            <label className={lbl}>Minimum Stock Alert (kg)</label>
            <input type="number" min="0" {...register("minimum_stock_kg")} className={f} />
          </div>
          <div>
            <label className={lbl}>Expiry Date</label>
            <input type="date" {...register("expiry_date")} className={f} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/depot/inventory?tab=feed" className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors">
            Cancel
          </Link>
          <button
            type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : "Add Feed"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
