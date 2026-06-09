import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Invite links go to set-password first; other types (e.g. magic link) go to next or dashboard
  const next = searchParams.get("next") ?? (type === "invite" ? "/set-password" : "/dashboard");

  if (token_hash && type) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect(next);
    }
  }

  redirect("/login?error=" + encodeURIComponent("Invalid or expired invite link. Please ask your admin to resend."));
}
