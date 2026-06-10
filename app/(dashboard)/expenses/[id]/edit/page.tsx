import { notFound } from "next/navigation";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { ExpenseForm } from "../../ExpenseForm";

export const metadata = { title: "Edit Expense" };

export default async function EditExpensePage({ params }: { params: { id: string } }) {
  const { orgId } = await getOrgContext();
  const supabase  = createServiceClient();

  const { data: expense } = await supabase
    .from("flock_expenses")
    .select("id, expense_date, category, description, farmer_id, flock_id, quantity, unit, unit_cost, total_amount, vendor, notes")
    .eq("id", params.id)
    .eq("organization_id", orgId ?? "")
    .single();

  if (!expense) notFound();

  return <ExpenseForm defaultValues={expense} />;
}
