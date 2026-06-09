import { cn } from "@/lib/utils";

const colorMap: Record<string, string> = {
  active:       "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  confirmed:    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  dispatched:   "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  in_transit:   "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  delivered:    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending:      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  cancelled:    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  failed:       "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  completed:    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  depleted:     "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  validated:    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  error:        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  processing:   "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  broiler:      "bg-orange-100 text-orange-800",
  layer:        "bg-yellow-100 text-yellow-800",
  dual_purpose: "bg-purple-100 text-purple-800",
  indigenous:   "bg-green-100 text-green-800",
  breeder:      "bg-blue-100 text-blue-800",
};

const dotMap: Record<string, string> = {
  active: "bg-green-500",  confirmed: "bg-blue-500",
  dispatched: "bg-indigo-500",  in_transit: "bg-purple-500",
  delivered: "bg-green-500",  pending: "bg-amber-500",
  cancelled: "bg-red-500",  failed: "bg-red-500",
  completed: "bg-green-500",  processing: "bg-blue-500",
};

interface Props {
  status: string;
  label?: string;
  dot?: boolean;
  className?: string;
}

export function StatusBadge({ status, label, dot = false, className }: Props) {
  const colors = colorMap[status] ?? "bg-gray-100 text-gray-800";
  const dotColor = dotMap[status] ?? "bg-gray-400";
  const text = label ?? status.replace(/_/g, " ");

  return (
    <span className={cn("status-pill", colors, className)}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotColor)} />}
      {text}
    </span>
  );
}
