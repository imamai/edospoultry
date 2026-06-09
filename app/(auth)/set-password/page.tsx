"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});
type FormData = z.infer<typeof schema>;

export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: data.password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password set! Welcome to EdosHatch.");
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-edos-50 via-white to-chick-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-edos-500 to-edos-700 shadow-edos-glow mb-4"
          >
            <span className="text-3xl">🐣</span>
          </motion.div>
          <h1 className="text-2xl font-bold text-edos-900">Welcome to EdosHatch</h1>
          <p className="text-sm text-muted-foreground mt-1">Set a password to secure your account</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-card border border-border rounded-2xl shadow-card-hover p-8"
        >
          <h2 className="text-lg font-semibold mb-1">Create your password</h2>
          <p className="text-sm text-muted-foreground mb-6">
            You were invited to manage a hatchery on EdosHatch. Set a password to get started.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">New password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  {...register("password")}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Confirm password</label>
              <input
                type={showPwd ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repeat password"
                {...register("confirm")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
              {errors.confirm && (
                <p className="mt-1 text-xs text-destructive">{errors.confirm.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Saving…" : "Set password & enter dashboard"}
            </button>
          </form>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Edos Centre · EdosHatch v1.0
        </p>
      </motion.div>
    </div>
  );
}
