"use client";
import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Props {
  id:      string;
  apiPath: string;
  label?:  string;
}

export function DeleteButton({ id, apiPath, label = "record" }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handle() {
    if (!confirm(`Delete this ${label}? This cannot be undone.`)) return;
    setLoading(true);
    const res = await fetch(`${apiPath}/${id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      toast.success(`${label[0].toUpperCase()}${label.slice(1)} deleted`);
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Delete failed");
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      title={`Delete ${label}`}
      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
    </button>
  );
}
