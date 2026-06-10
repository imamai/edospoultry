"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfettiBlast } from "@/components/shared/ConfettiBlast";
import { sanitizePhone } from "@/lib/utils";

// DB uses integer PKs for geography tables; store as strings in the form
// (HTML select values are always strings) and convert on insert.
// subcounty_id and ward_id are nullable in the DB — not all counties have data seeded.
const schema = z.object({
  full_name:        z.string().min(2, "Full name required"),
  phone_number:     z.string().min(9, "Valid phone number required"),
  national_id:      z.string().min(4, "National ID is required"),
  county_id:        z.string().min(1, "Select a county"),
  subcounty_id:     z.string().optional(),
  ward_id:          z.string().optional(),
  gps_latitude:     z.coerce.number().optional(),
  gps_longitude:    z.coerce.number().optional(),
  preferred_language: z.enum(["en", "sw", "rw", "lg"]).default("sw"),
  preferred_channel:  z.enum(["whatsapp", "ussd", "sms", "app"]).default("ussd"),
});
type FormData = z.infer<typeof schema>;

// DB column is "name", not "county_name" / "subcounty_name" / "ward_name"
interface County    { id: number; name: string; }
interface Subcounty { id: number; name: string; county_id: number; }
interface Ward      { id: number; name: string; subcounty_id: number; }

export default function RegisterFarmerPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [saving,            setSaving]            = useState(false);
  const [gpsLoading,        setGpsLoading]        = useState(false);
  const [success,           setSuccess]           = useState(false);
  const [counties,          setCounties]          = useState<County[]>([]);
  const [subcounties,       setSubcounties]       = useState<Subcounty[]>([]);
  const [wards,             setWards]             = useState<Ward[]>([]);
  const [countySelected,    setCountySelected]    = useState(false);
  const [subcountySelected, setSubcountySelected] = useState(false);
  const [profileLoading,    setProfileLoading]    = useState(true);
  const [profile,           setProfile]           = useState<{ id: string; organization_id: string } | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { preferred_language: "sw", preferred_channel: "ussd" },
  });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setProfileLoading(false); toast.error("Not signed in — please log in again"); return; }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, organization_id")
        .eq("id", user.id)
        .single();
      setProfileLoading(false);
      if (error || !data) {
        toast.error("Could not load your profile — please refresh or log in again");
        return;
      }
      setProfile(data as { id: string; organization_id: string });
    });

    supabase
      .from("counties")
      .select("id, name")
      .order("name")
      .then(({ data, error }) => {
        if (error) toast.error("Failed to load counties: " + error.message);
        setCounties((data ?? []) as County[]);
      });
  }, [supabase]);

  // Merge RHF's onChange with cascade fetch
  const { onChange: rhfCountyChange,    ...countyRest    } = register("county_id");
  const { onChange: rhfSubcountyChange, ...subcountyRest } = register("subcounty_id");

  async function handleCountyChange(e: React.ChangeEvent<HTMLSelectElement>) {
    rhfCountyChange(e);
    const countyId = e.target.value;
    setValue("subcounty_id", "");
    setValue("ward_id",      "");
    setSubcounties([]);
    setWards([]);
    setCountySelected(false);
    setSubcountySelected(false);
    if (!countyId) return;
    const { data, error } = await supabase
      .from("subcounties")
      .select("id, name, county_id")
      .eq("county_id", countyId)
      .order("name");
    if (error) toast.error("Failed to load subcounties: " + error.message);
    setSubcounties((data ?? []) as Subcounty[]);
    setCountySelected(true);
  }

  async function handleSubcountyChange(e: React.ChangeEvent<HTMLSelectElement>) {
    rhfSubcountyChange(e);
    const subcountyId = e.target.value;
    setValue("ward_id", "");
    setWards([]);
    setSubcountySelected(false);
    if (!subcountyId) return;
    const { data, error } = await supabase
      .from("wards")
      .select("id, name, subcounty_id")
      .eq("subcounty_id", subcountyId)
      .order("name");
    if (error) toast.error("Failed to load wards: " + error.message);
    setWards((data ?? []) as Ward[]);
    setSubcountySelected(true);
  }

  async function captureGPS() {
    if (!navigator.geolocation) return toast.error("GPS not supported");
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setValue("gps_latitude",  lat);
        setValue("gps_longitude", lng);
        setGpsLoading(false);
        toast.success(`GPS captured: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);

        const { data } = await supabase.rpc("fn_find_ward_for_point", { lat, lng });
        if (data?.ward_id) {
          if (data.county_id) {
            setValue("county_id", String(data.county_id));
            const { data: subs } = await supabase
              .from("subcounties").select("id, name, county_id")
              .eq("county_id", data.county_id).order("name");
            setSubcounties((subs ?? []) as Subcounty[]);
            setCountySelected(true);
          }
          if (data.subcounty_id) {
            setValue("subcounty_id", String(data.subcounty_id));
            const { data: wardList } = await supabase
              .from("wards").select("id, name, subcounty_id")
              .eq("subcounty_id", data.subcounty_id).order("name");
            setWards((wardList ?? []) as Ward[]);
            setSubcountySelected(true);
          }
          setValue("ward_id", String(data.ward_id));
          toast.success("Ward auto-detected from GPS!");
        }
      },
      () => { setGpsLoading(false); toast.error("Could not get GPS location"); }
    );
  }

  async function onSubmit(data: FormData) {
    if (!profile) { toast.error("Session not ready — please wait"); return; }
    setSaving(true);

    // Check for duplicate ID number before inserting
    const checkRes = await fetch(`/api/farmers/check-id?id=${encodeURIComponent(data.national_id)}`);
    const { exists, farmer } = await checkRes.json();
    if (exists) {
      setSaving(false);
      toast.error(`ID ${data.national_id} is already registered to: ${farmer.full_name}`);
      return;
    }

    const phone = sanitizePhone(data.phone_number);

    const insertPayload: Record<string, unknown> = {
      full_name:           data.full_name,
      phone_number:        phone,
      id_number:           data.national_id || null,
      county_id:           data.county_id    ? parseInt(data.county_id)    : null,
      subcounty_id:        data.subcounty_id ? parseInt(data.subcounty_id) : null,
      ward_id:             data.ward_id      ? parseInt(data.ward_id)      : null,
      organization_id:     profile.organization_id,
      registered_by:       profile.id,
      preferred_language:  data.preferred_language,
      preferred_channel:   data.preferred_channel,
      is_active:           true,
      whatsapp_opted_in:   false,
    };

    // DB stores GPS as PostGIS geometry — use EWKT format
    if (data.gps_latitude && data.gps_longitude) {
      insertPayload.gps_coordinates =
        `SRID=4326;POINT(${data.gps_longitude} ${data.gps_latitude})`;
    }

    const { error } = await supabase.from("farmers").insert(insertPayload);
    setSaving(false);
    if (error) {
      if (error.code === "23505") {
        toast.error(`Duplicate record — a farmer with this ID number or phone is already registered`);
      } else {
        toast.error(error.message);
      }
    } else {
      setSuccess(true);
      toast.success(`${data.full_name} registered successfully!`);
      setTimeout(() => router.push("/farmers"), 2000);
    }
  }

  const f      = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
  const lbl    = "block text-sm font-medium mb-1.5";
  const errCls = "mt-1 text-xs text-destructive";

  return (
    <div className="page-enter max-w-2xl">
      <ConfettiBlast trigger={success} type="fireworks" />
      <PageHeader
        title="Register Farmer"
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
        {/* Personal details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={lbl}>Full Name *</label>
            <input placeholder="e.g. Jane Muthoni Kamau" {...register("full_name")} className={f} />
            {errors.full_name && <p className={errCls}>{errors.full_name.message}</p>}
          </div>
          <div>
            <label className={lbl}>Phone Number *</label>
            <input type="tel" placeholder="0712 345 678" {...register("phone_number")} className={f} />
            {errors.phone_number && <p className={errCls}>{errors.phone_number.message}</p>}
          </div>
          <div>
            <label className={lbl}>National ID *</label>
            <input placeholder="12345678" {...register("national_id")} className={f} />
            {errors.national_id && <p className={errCls}>{errors.national_id.message}</p>}
          </div>
        </div>

        {/* Geography */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Location</p>
            <button
              type="button"
              onClick={captureGPS}
              disabled={gpsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-edos-50 text-edos-700 text-xs font-medium hover:bg-edos-100 transition-colors disabled:opacity-60"
            >
              {gpsLoading ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
              Capture GPS
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>County *</label>
              <select {...countyRest} onChange={handleCountyChange} className={f}>
                <option value="">Select county…</option>
                {counties.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
              {errors.county_id && <p className={errCls}>{errors.county_id.message}</p>}
            </div>

            <div>
              <label className={lbl}>Subcounty</label>
              <select
                {...subcountyRest}
                onChange={handleSubcountyChange}
                disabled={!countySelected || subcounties.length === 0}
                className={f}
              >
                <option value="">
                  {!countySelected ? "Select county first…" : subcounties.length === 0 ? "None on record" : "Select subcounty…"}
                </option>
                {subcounties.map(s => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </select>
              {countySelected && subcounties.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">No subcounties on record for this county — can still save</p>
              )}
            </div>

            <div>
              <label className={lbl}>Ward</label>
              <select {...register("ward_id")} disabled={!subcountySelected || wards.length === 0} className={f}>
                <option value="">
                  {!subcountySelected ? "Select subcounty first…" : wards.length === 0 ? "None on record" : "Select ward…"}
                </option>
                {wards.map(w => (
                  <option key={w.id} value={String(w.id)}>{w.name}</option>
                ))}
              </select>
              {subcountySelected && wards.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">No wards on record — can still save</p>
              )}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="grid grid-cols-2 gap-4">
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
              <option value="ussd">USSD (*384*57463#)</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="app">App</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href="/farmers"
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || profileLoading || !profile}
            className="flex-1 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {(saving || profileLoading) && <Loader2 size={15} className="animate-spin" />}
            {profileLoading ? "Loading…" : saving ? "Registering…" : !profile ? "Session error — refresh" : "Register Farmer"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
