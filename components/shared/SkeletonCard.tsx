import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  lines?: number;
}

export function SkeletonCard({ className, lines = 3 }: Props) {
  return (
    <div className={cn("bg-card border border-border rounded-2xl p-5 space-y-3", className)}>
      <div className="skeleton h-4 w-2/5 rounded" />
      <div className="skeleton h-8 w-1/2 rounded" />
      {Array.from({ length: lines - 2 }).map((_, i) => (
        <div key={i} className={cn("skeleton h-3 rounded", i % 2 === 0 ? "w-3/4" : "w-1/2")} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-12 rounded-xl" />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
      <div className="skeleton h-3 w-1/3 rounded" />
      <div className="skeleton h-9 w-1/2 rounded" />
      <div className="skeleton h-3 w-2/3 rounded" />
    </div>
  );
}
