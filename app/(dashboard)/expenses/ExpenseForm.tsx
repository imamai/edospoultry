"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Calculator } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/shared/PageHeader";

const CATEGORIES = [
  { key: "feed",       label: "Feed"       },
  { key: "medication", label: "Medication" },
  { key: "vaccine",    label: "Vaccine"    },
  { key: "labor",      label: "Labor"      },
  { key: "utilities",  label: "Utilities"  },
  { key: "equipment",  label: "Equipment"  },
  { key: "transport",  label: "Transport"  },
  { key: "bedding",    label: "Bedding"    },
  { key: "other",      label: "Other"      },
];

const COMMON_UNITS = ["kg", "litres", "bags", "units", "trays", "bales", "litres", "hours", "days"];

const schema = z.object({
  expense_date: z.string().min(1, "Date required"),
  category:     z.string().min(1, "Category required"),
  description:  z.string().min(2, "Description required"),
  farmer_id:    z.string().min(1, "Farmer required"),
  flock_id:     z.string().min(1, "Flock required"),
  quantity:     z.string().optional().transform(v => (v && v !== "" ? Number(v) : undefined)),
  unit:         z.string().optional().transform(v => v || undefined),
  unit_cost:    z.string().optional().transform(v => (v && v !== "" ? Number(v) : undefined)),
  total_amount: z.string().min(1, "Amount required").transform(v => Number(v)),
  vendor:       z.string().optional().transform(v => v || undefined),
  notes:        z.string().optional().transform(v => v || undefined),
});

type RawForm = {
  expense_date: string;
  category:     string;
  description:  string;
  farmer_id:    string;
  flock_id:     string;
  quantity:     string;
  unit:         string;
  unit_cost:    string;
  total_amount: string;
  vendor:       string;
  notes:        string;
};

interface ExpenseRow {
  id:           string;
  expense_date: string;
  category:     string;
  description:  string;
  farmer_id:    string;
  flock_id:     string;
  quantity?:    number | null;
  unit?:        string | null;
  unit_cost?:   number | null;
  total_amount: number;
  vendor?:      string | null;
  notes?:       string | null;
}

interface Props {
  defaultValues?: ExpenseRow;
}

export function ExpenseForm({ defaultValues }: Props) {
  const router  = useRouter();
  const isEdit  = !!defaultValues;
  const [saving, setSaving]   = useState(false);
  const [farmers, setFarmers] = useState<{ id: string; full_name: string }[]>([]);
  const [flocks,  setFlocks]  = useState<{ id: string; flock_code: string }[]>([]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<RawForm>({
      resolver: zodResolver(schema) as never,
      defaultValues: {
        expense_date: defaultValues?.expense_date ?? new Date().toISOString().split("T")[0],
        category:     defaultValues?.category    ?? "",
        description:  defaultValues?.description ?? "",
        farmer_id:    defaultValues?.farmer_id   ?? "",
        flock_id:     defaultValues?.flock_id    ?? "",
        quantity:     defaultValues?.quantity    != null ? String(defaultValues.quantity) : "",
        unit:         defaultValues?.unit        ?? "",
        unit_cost:    defaultValues?.unit_cost   != null ? String(defaultValues.unit_cost) : "",
        total_amount: defaultValues?.total_amount != null ? String(defaultValues.total_amount) : "",
        vendor:       defaultValues?.vendor  ?? "",
        notes:        defaultValues?.notes   ?? "",
      },
    });

  const farmerId  = watch("farmer_id");
  const qty       = watch("quantity");
  const unitCost  = watch("unit_cost");

  useEffect(() => {
    fetch("/api/farmers")
      .then(r => r.json())
      .then(d => setFarmers(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!farmerId) { setFlocks([]); return; }
    fetch(`/api/flocks?farmer_id=${farmerId}`)
      .then(r => r.json())
      .then(d => setFlocks(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [farmerId]);

  // Auto-calculate total when qty × unit_cost both filled
  useEffect(() => {
    const q = parseFloat(qty ?? "");
    const u = parseFloat(unitCost ?? "");
    if (!isNaN(q) && !isNaN(u) && q > 0 && u > 0) {
      setValue("total_amount", String((q * u).toFixed(2)));
    }
  }, [qty, unitCost, setValue]);

  async function onSubmit(data: RawForm) {
    setSaving(true);
    const parsed = schema.parse(data);
    const url    = isEdit ? `/api/flock-expenses/${defaultValues!.id}` : "/api/flock-expenses";
    const method = isEdit ? "PATCH" : "POST";
    const res    = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Failed to save");
      return;
    }
    toast.success(isEdit ? "Expense updated!" : "Expense recorded!");
    router.push("/expenses");
    router.refresh();
  }

  const field = "px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors w-full";
  const lbl   = "block text-sm font-medium mb-1.5";
  const err   = "mt-1 text-xs text-destructive";

  return (
    <div className="page-enter max-w-2xl">
      <PageHeader
        title={isEdit ? "Edit Expense" : "New Expense"}
        actions={
          <Link href="/expenses" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Back to Expenses
          </Link>
        }
      />

      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit(onSubmit as never)}
        className="bg-card border border-border rounded-2xl p-6 space-y-5"
      >
        {/* Date + Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Date *</label>
            <input type="date" {...register("expense_date")} className={field} />
            {errors.expense_date && <p className={err}>{errors.expense_date.message}</p>}
          </div>
          <div>
            <label className={lbl}>Category *</label>
            <select {...register("category")} className={field}>
              <option value="">— Select —</option>
              {CATEGORIES.map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
            {errors.category && <p className={err}>{errors.category.message}</p>}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={lbl}>Description *</label>
          <input
            placeholder="e.g. Layer mash — 50 kg bags from AgroVet Meru"
            {...register("description")}
            className={field}
          />
          {errors.description && <p className={err}>{errors.description.message}</p>}
        </div>

        {/* Farmer + Flock */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Farmer *</label>
            <select {...register("farmer_id")} className={field}>
              <option value="">— Select farmer —</option>
              {farmers.map(f => (
                <option key={f.id} value={f.id}>{f.full_name}</option>
              ))}
            </select>
            {errors.farmer_id && <p className={err}>{errors.farmer_id.message}</p>}
          </div>
          <div>
            <label className={lbl}>Flock *</label>
            <select
              {...register("flock_id")}
              className={field}
              disabled={!farmerId || flocks.length === 0}
            >
              <option value="">— Select flock —</option>
              {flocks.map(f => (
                <option key={f.id} value={f.id}>{f.flock_code}</option>
              ))}
            </select>
            {errors.flock_id && <p className={err}>{errors.flock_id.message}</p>}
          </div>
        </div>

        {/* Qty + Unit + Unit Cost */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Quantity</label>
            <input
              type="number"
              step="0.001"
              min="0"
              placeholder="e.g. 50"
              {...register("quantity")}
              className={field}
            />
          </div>
          <div>
            <label className={lbl}>Unit</label>
            <input
              list="unit-options"
              placeholder="kg, bags, hrs…"
              {...register("unit")}
              className={field}
            />
            <datalist id="unit-options">
              {COMMON_UNITS.map(u => <option key={u} value={u} />)}
            </datalist>
          </div>
          <div>
            <label className={lbl}>Unit Cost (KES)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 68.00"
              {...register("unit_cost")}
              className={field}
            />
          </div>
        </div>

        {/* Total Amount */}
        <div>
          <label className={lbl}>
            Total Amount (KES) *
            <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <Calculator size={11} /> auto-filled when Qty × Unit Cost are set
            </span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 3400.00"
            {...register("total_amount")}
            className={`${field} font-semibold`}
          />
          {errors.total_amount && <p className={err}>{errors.total_amount.message}</p>}
        </div>

        {/* Vendor */}
        <div>
          <label className={lbl}>Vendor / Supplier</label>
          <input
            placeholder="e.g. Unga Feeds Ltd, Local hardware store"
            {...register("vendor")}
            className={field}
          />
        </div>

        {/* Notes */}
        <div>
          <label className={lbl}>Notes</label>
          <textarea
            rows={2}
            placeholder="Any additional details, receipt reference, batch number…"
            {...register("notes")}
            className={field}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Link
            href="/expenses"
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-center hover:bg-muted transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? "Saving…" : isEdit ? "Update Expense" : "Record Expense"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
