"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2, ArrowLeft, Building2, User, CheckCircle2,
  ChevronRight, ChevronLeft, Mail,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfettiBlast } from "@/components/shared/ConfettiBlast";
import { createTenantAction } from "@/app/actions/tenants";

// ── Schemas ──────────────────────────────────────────────────────────────────

const orgSchema = z.object({
  orgName:  z.string().min(2, "Organization name required"),
  slug:     z.string().min(2, "Slug required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  country:  z.enum(["KE", "RW", "UG"]),
  currency: z.string().length(3, "3-letter currency code"),
  orgPhone: z.string().optional(),
  orgEmail: z.string().email("Valid email").optional().or(z.literal("")),
});
type OrgForm = z.infer<typeof orgSchema>;

const ownerSchema = z.object({
  ownerName:  z.string().min(2, "Owner name required"),
  ownerEmail: z.string().email("Valid email required"),
  ownerPhone: z.string().optional(),
});
type OwnerForm = z.infer<typeof ownerSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const CURRENCIES: Record<string, string> = { KE: "KES", RW: "RWF", UG: "UGX" };
const COUNTRY_LABELS: Record<string, string> = { KE: "Kenya 🇰🇪", RW: "Rwanda 🇷🇼", UG: "Uganda 🇺🇬" };
const STEPS = ["Organization", "Owner / Admin", "Review & Create"];

const toSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewTenantPage() {
  const [step, setStep]   = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone]   = useState(false);

  const orgForm = useForm<OrgForm>({
    resolver: zodResolver(orgSchema),
    defaultValues: { country: "KE", currency: "KES" },
  });

  const ownerForm = useForm<OwnerForm>({
    resolver: zodResolver(ownerSchema),
  });

  // Auto-slug when org name changes (only if slug hasn't been manually edited)
  const handleOrgNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    orgForm.setValue("orgName", name);
    const currentSlug = orgForm.getValues("slug");
    const prevSlug = toSlug(orgForm.getValues("orgName"));
    if (!currentSlug || currentSlug === prevSlug) {
      orgForm.setValue("slug", toSlug(name), { shouldValidate: false });
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const c = e.target.value as "KE" | "RW" | "UG";
    orgForm.setValue("country", c);
    orgForm.setValue("currency", CURRENCIES[c] ?? "KES");
  };

  async function handleCreate() {
    const org   = orgForm.getValues();
    const owner = ownerForm.getValues();
    setSaving(true);
    const result = await createTenantAction({
      ...org,
      orgPhone: org.orgPhone ?? "",
      orgEmail: org.orgEmail ?? "",
      ...owner,
      ownerPhone: owner.ownerPhone ?? "",
    });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      setDone(true);
    }
  }

  const f   = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
  const lbl = "block text-sm font-medium mb-1.5";
  const err = "mt-1 text-xs text-destructive";

  // ── Success screen ────────────────────────────────────────────────────────

  if (done) {
    const orgName = orgForm.getValues("orgName");
    const ownerEmail = ownerForm.getValues("ownerEmail");
    return (
      <div className="page-enter max-w-lg mx-auto">
        <ConfettiBlast trigger={done} type="fireworks" />
        <div className="bg-card border border-border rounded-2xl p-10 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Tenant Created!</h2>
            <p className="text-muted-foreground text-sm mt-2">
              <strong>{orgName}</strong> is now live on EdosHatch.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-left">
            <div className="flex items-start gap-2.5">
              <Mail size={15} className="text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-800">
                Invite email sent to <strong>{ownerEmail}</strong>. They set their password on first login and can immediately start managing their hatchery.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <Link
              href="/tenants"
              className="py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium text-center transition-colors"
            >
              Back to Tenants
            </Link>
            <button
              onClick={() => {
                setDone(false);
                setStep(0);
                orgForm.reset({ country: "KE", currency: "KES" });
                ownerForm.reset();
              }}
              className="py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Add Another Tenant
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Wizard ────────────────────────────────────────────────────────────────

  return (
    <div className="page-enter max-w-2xl">
      <PageHeader
        title="Add Tenant"
        actions={
          <Link href="/tenants" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Tenants
          </Link>
        }
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={[
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all",
              i < step  ? "bg-edos-600 text-white" :
              i === step ? "bg-edos-600 text-white ring-4 ring-edos-100" :
              "bg-muted text-muted-foreground",
            ].join(" ")}>
              {i < step ? <CheckCircle2 size={13} /> : i + 1}
            </div>
            <span className={`text-xs whitespace-nowrap ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight size={14} className="text-muted-foreground ml-1" />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Organization ─────────────────────────────────────────── */}
      <form
        onSubmit={orgForm.handleSubmit(() => setStep(1))}
        className={step === 0 ? "bg-card border border-border rounded-2xl p-6 space-y-5" : "hidden"}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-edos-100 flex items-center justify-center shrink-0">
            <Building2 size={16} className="text-edos-700" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Organization Details</h3>
            <p className="text-xs text-muted-foreground">The poultry business registering on EdosHatch</p>
          </div>
        </div>

        <div>
          <label className={lbl}>Organization Name *</label>
          <input
            placeholder="e.g. Kuku Farm Ltd"
            {...orgForm.register("orgName")}
            onChange={handleOrgNameChange}
            className={f}
          />
          {orgForm.formState.errors.orgName && <p className={err}>{orgForm.formState.errors.orgName.message}</p>}
        </div>

        <div>
          <label className={lbl}>URL Slug *</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              edoshatch.com/
            </span>
            <input
              placeholder="kuku-farm-ltd"
              {...orgForm.register("slug")}
              className={`${f} pl-[130px]`}
            />
          </div>
          {orgForm.formState.errors.slug && <p className={err}>{orgForm.formState.errors.slug.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Country *</label>
            <select
              {...orgForm.register("country")}
              onChange={handleCountryChange}
              className={f}
            >
              {Object.entries(COUNTRY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Currency *</label>
            <input
              maxLength={3}
              placeholder="KES"
              {...orgForm.register("currency")}
              className={f}
            />
            {orgForm.formState.errors.currency && <p className={err}>{orgForm.formState.errors.currency.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Phone</label>
            <input type="tel" placeholder="+254 700 000 000" {...orgForm.register("orgPhone")} className={f} />
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input type="email" placeholder="info@kukufarm.co.ke" {...orgForm.register("orgEmail")} className={f} />
            {orgForm.formState.errors.orgEmail && <p className={err}>{orgForm.formState.errors.orgEmail.message}</p>}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors"
          >
            Next: Owner Details <ChevronRight size={15} />
          </button>
        </div>
      </form>

      {/* ── Step 2: Owner / Admin ────────────────────────────────────────── */}
      <form
        onSubmit={ownerForm.handleSubmit(() => setStep(2))}
        className={step === 1 ? "bg-card border border-border rounded-2xl p-6 space-y-5" : "hidden"}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <User size={16} className="text-blue-700" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Owner / Admin</h3>
            <p className="text-xs text-muted-foreground">
              Manages <strong>{orgForm.watch("orgName") || "the organization"}</strong> — gets <span className="font-mono text-[11px]">country_admin</span> role
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Mail size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">
            An invite email will be sent. The owner clicks the link, sets their password, and immediately starts managing their hatchery — no manual setup required.
          </p>
        </div>

        <div>
          <label className={lbl}>Full Name *</label>
          <input placeholder="e.g. Jane Muthoni" {...ownerForm.register("ownerName")} className={f} />
          {ownerForm.formState.errors.ownerName && <p className={err}>{ownerForm.formState.errors.ownerName.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Email *</label>
            <input type="email" placeholder="jane@kukufarm.co.ke" {...ownerForm.register("ownerEmail")} className={f} />
            {ownerForm.formState.errors.ownerEmail && <p className={err}>{ownerForm.formState.errors.ownerEmail.message}</p>}
          </div>
          <div>
            <label className={lbl}>Phone</label>
            <input type="tel" placeholder="+254 712 345 678" {...ownerForm.register("ownerPhone")} className={f} />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => setStep(0)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <ChevronLeft size={15} /> Back
          </button>
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors"
          >
            Review <ChevronRight size={15} />
          </button>
        </div>
      </form>

      {/* ── Step 3: Review & Create ──────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Org summary card */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={15} className="text-edos-600" />
              <h3 className="font-semibold text-sm">Organization</h3>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="ml-auto text-xs text-edos-600 hover:underline"
              >
                Edit
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{orgForm.getValues("orgName")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Slug</p>
                <p className="font-mono text-xs">{orgForm.getValues("slug")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Country</p>
                <p>{COUNTRY_LABELS[orgForm.getValues("country")]}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Currency</p>
                <p>{orgForm.getValues("currency")}</p>
              </div>
              {orgForm.getValues("orgEmail") && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p>{orgForm.getValues("orgEmail")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Owner summary card */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <User size={15} className="text-blue-600" />
              <h3 className="font-semibold text-sm">Owner / Admin</h3>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="ml-auto text-xs text-edos-600 hover:underline"
              >
                Edit
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{ownerForm.getValues("ownerName")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="font-mono text-xs bg-muted inline-block px-2 py-0.5 rounded">country_admin</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Invite will be sent to</p>
                <p className="font-medium">{ownerForm.getValues("ownerEmail")}</p>
              </div>
              {ownerForm.getValues("ownerPhone") && (
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p>{ownerForm.getValues("ownerPhone")}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              <ChevronLeft size={15} /> Back
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleCreate}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors disabled:opacity-70"
            >
              {saving ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : "Create Tenant & Send Invite"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
