"use client";
import { useState, useEffect, useMemo } from "react";
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
  title:       z.string().min(2, "Title required"),
  task_type:   z.string().min(1, "Select task type"),
  priority:    z.enum(["low","medium","high","urgent"]),
  description: z.string().optional(),
  due_date:    z.string().optional(),
  due_time:    z.string().optional(),
  farmer_id:   z.string().optional().transform(v => v || undefined),
  flock_id:    z.string().optional().transform(v => v || undefined),
  recurrence:  z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// Matches task_type enum in migration
const TASK_TYPES = ["vaccination","feeding","weighing","cleaning","medication","inspection","harvest","delivery","deworming","culling","admin","other"];
// Matches task_priority enum in migration
const TASK_PRIORITIES = ["low","medium","high","urgent"];

export default function NewTaskPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [farmers, setFarmers] = useState<{ id: string; full_name: string }[]>([]);
  const [flocks, setFlocks] = useState<{ id: string; flock_code: string }[]>([]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "medium", due_date: new Date().toISOString().split("T")[0] },
  });
  const farmerId = watch("farmer_id");

  useEffect(() => {
    fetch("/api/farmers").then(r => r.json()).then(d => setFarmers(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!farmerId) { setFlocks([]); return; }
    fetch(`/api/flocks?farmer_id=${farmerId}`).then(r => r.json()).then(d => setFlocks(Array.isArray(d) ? d : [])).catch(() => {});
  }, [farmerId]);

  async function onSubmit(data: FormData) {
    setSaving(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (!res.ok) { toast.error((await res.json()).error ?? "Failed"); return; }
    toast.success("Task created!");
    router.push("/tasks");
  }

  const field = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
  const label = "block text-sm font-medium mb-1.5";
  const err = "mt-1 text-xs text-destructive";

  return (
    <div className="page-enter max-w-2xl">
      <PageHeader
        title="New Task"
        actions={
          <Link href="/tasks" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Back
          </Link>
        }
      />
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card border border-border rounded-2xl p-6 space-y-5"
      >
        <div>
          <label className={label}>Title *</label>
          <input placeholder="e.g. Vaccinate flock A against Newcastle" {...register("title")} className={field} />
          {errors.title && <p className={err}>{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Task Type *</label>
            <select {...register("task_type")} className={field}>
              <option value="">— Select —</option>
              {TASK_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
            {errors.task_type && <p className={err}>{errors.task_type.message}</p>}
          </div>
          <div>
            <label className={label}>Priority *</label>
            <select {...register("priority")} className={field}>
              {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Due Date</label>
            <input type="date" {...register("due_date")} className={field} />
          </div>
          <div>
            <label className={label}>Due Time</label>
            <input type="time" {...register("due_time")} className={field} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Farmer (optional)</label>
            <select {...register("farmer_id")} className={field}>
              <option value="">— All —</option>
              {farmers.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Flock (optional)</label>
            <select {...register("flock_id")} className={field} disabled={!farmerId || !flocks.length}>
              <option value="">— All —</option>
              {flocks.map(f => <option key={f.id} value={f.id}>{f.flock_code}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={label}>Recurrence</label>
          <select {...register("recurrence")} className={field}>
            <option value="none">None (one-time)</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div>
          <label className={label}>Description</label>
          <textarea rows={3} placeholder="Detailed instructions…" {...register("description")} className={field} />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/tasks" className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : "Create Task"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
