import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { DashboardShell } from "./DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return (
    <DashboardShell userEmail={user.email} userRole={profile?.role}>
      {children}
    </DashboardShell>
  );
}
