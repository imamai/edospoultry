"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { updateTenantAction } from "@/app/actions/tenants";

const schema = z.object({
  name:      z.string().min(2, "Required"),
  slug:      z.string().min(2).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  country:   z.enum(["KE", "RW", "UG"]),
  currency:  z.string().length(3, "3-letter code"),
  phone:     z.string().optional(),
  email:     z.string().email("Valid email").optional().or(z.literal("")),
  is_active: z.boolean(),
});
type FormData = z.infer<typeof schema>;

const CURRENCIES: Record<string, string> = { KE: "KES", RW: "RWF", UG: "UGX" };
const COUNTRY_LABELS: Record<string, string> = { KE: "Kenya 🇰🇪", RW: "Rwanda 🇷🇼", UG: "Uganda 🇺🇬" };

const f   = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
const lbl = "block text-sm font-medium mb-1.5";
const err = "mt-1 text-xs text-destructive";

export default function EditTenantPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState("");

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    supabase
      .from("organizations")
      .select("id, name, slug, country, currency, phone, email, is_active")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { toast.error("Tenant not found"); router.push("/tenants"); return; }
        setOrgName(data.name);
        reset({
          name:      data.name,
          slug:      data.slug,
          country:   data.country as "KE" | "RW" | "UG",
          currency:  data.currency,
          phone:     data.phone ?? "",
          email:     data.email ?? "",
          is_active: data.is_active,
        });
        setLoading(false);
      });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(data: FormData) {
    setSaving(true);
    const result = await updateTenantAction(id, data);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Tenant updated");
      router.push("/tenants");
      router.refresh();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="page-enter max-w-2xl">
      <PageHeader
        title={`Edit: ${orgName}`}
        subtitle="Update organization details"
        actions={
          <Link href="/tenants" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Tenants
          </Link>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="bg-card border border-border rounded-2xl p-6 space-y-5">
        {/* Name */}
        <div>
          <label className={lbl}>Organization Name *</label>
          <input {...register("name")} className={f} />
          {errors.name && <p className={err}>{errors.name.message}</p>}
        </div>

        {/* Slug */}
        <div>
          <label className={lbl}>URL Slug *</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              edoshatch.com/
            </span>
            <input {...register("slug")} className={`${f} pl-[130px]`} />
          </div>
          {errors.slug && <p className={err}>{errors.slug.message}</p>}
        </div>

        {/* Country + Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Country *</label>
            <select
              {...register("country")}
              onChange={e => {
                const c = e.target.value as "KE" | "RW" | "UG";
                setValue("country", c);
                setValue("currency", CURRENCIES[c] ?? "KES");
              }}
              className={f}
            >
              {Object.entries(COUNTRY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Currency *</label>
            <input maxLength={3} {...register("currency")} className={f} />
            {errors.currency && <p className={err}>{errors.currency.message}</p>}
          </div>
        </div>

        {/* Phone + Email */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Phone</label>
            <input type="tel" {...register("phone")} className={f} />
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input type="email" {...register("email")} className={f} />
            {errors.email && <p className={err}>{errors.email.message}</p>}
          </div>
        </div>

        {/* Status toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
          <div>
            <p className="text-sm font-medium">Tenant Status</p>
            <p className="text-xs text-muted-foreground mt-0.5">Suspended tenants cannot log in</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" {...register("is_active")} className="sr-only peer" />
            <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:bg-edos-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Link
            href="/tenants"
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors disabled:opacity-70"
          >
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}
