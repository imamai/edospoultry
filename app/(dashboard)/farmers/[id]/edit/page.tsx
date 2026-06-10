"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { sanitizePhone } from "@/lib/utils";

const schema = z.object({
  full_name:           z.string().min(2, "Full name required"),
  phone_number:        z.string().min(9, "Valid phone required"),
  national_id:         z.string().min(4, "National ID required"),
  preferred_language:  z.enum(["en", "sw", "rw", "lg"]),
  preferred_channel:   z.enum(["whatsapp", "ussd", "sms", "app"]),
  is_active:           z.boolean(),
});
type FormData = z.infer<typeof schema>;

export default function EditFarmerPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [checking, setChecking] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    fetch(`/api/farmers/${id}`)
      .then(r => r.json())
      .then(d => {
        reset({
          full_name:          d.full_name ?? "",
          phone_number:       d.phone_number ?? "",
          national_id:        d.id_number ?? "",
          preferred_language: d.preferred_language ?? "sw",
          preferred_channel:  d.preferred_channel  ?? "ussd",
          is_active:          d.is_active ?? true,
        });
        setLoading(false);
      })
      .catch(() => { toast.error("Failed to load farmer"); router.push("/farmers"); });
  }, [id, reset, router]);

  async function onSubmit(data: FormData) {
    // Check if ID number is taken by a different farmer
    setChecking(true);
    const checkRes = await fetch(`/api/farmers/check-id?id=${encodeURIComponent(data.national_id)}`);
    const { exists, farmer } = await checkRes.json();
    setChecking(false);
    if (exists && farmer?.id !== id) {
      toast.error(`ID ${data.national_id} is already registered to: ${farmer.full_name}`);
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/farmers/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name:          data.full_name,
        phone_number:       sanitizePhone(data.phone_number),
        id_number:          data.national_id,
        preferred_language: data.preferred_language,
        preferred_channel:  data.preferred_channel,
        is_active:          data.is_active,
      }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Farmer updated"); router.push("/farmers"); }
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
        title="Edit Farmer"
        actions={
          <Link href="/farmers" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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
            <label className={lbl}>Full Name *</label>
            <input {...register("full_name")} className={f} />
            {errors.full_name && <p className={err}>{errors.full_name.message}</p>}
          </div>
          <div>
            <label className={lbl}>Phone Number *</label>
            <input type="tel" {...register("phone_number")} className={f} />
            {errors.phone_number && <p className={err}>{errors.phone_number.message}</p>}
          </div>
          <div>
            <label className={lbl}>National ID *</label>
            <input {...register("national_id")} className={f} />
            {errors.national_id && <p className={err}>{errors.national_id.message}</p>}
          </div>
          <div>
            <label className={lbl}>Preferred Language</label>
            <select {...register("preferred_language")} className={f}>
              <option value="sw">Swahili</option>
              <option value="en">English</option>
              <option value="rw">Kinyarwanda</option>
              <option value="lg">Luganda</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Preferred Channel</label>
            <select {...register("preferred_channel")} className={f}>
              <option value="ussd">USSD</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="app">App</option>
            </select>
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <input type="checkbox" id="is_active" {...register("is_active")} className="w-4 h-4 rounded" />
            <label htmlFor="is_active" className="text-sm font-medium">Active farmer</label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/farmers" className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors">
            Cancel
          </Link>
          <button
            type="submit" disabled={saving || checking}
            className="flex-1 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {(saving || checking) && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : checking ? "Checking…" : "Save Changes"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
