"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type Preset = "today" | "yesterday" | "week" | "month" | "quarter" | "year" | "custom";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "today",     label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week",      label: "Last 7 Days" },
  { key: "month",     label: "This Month" },
  { key: "quarter",   label: "This Quarter" },
  { key: "year",      label: "This Year" },
  { key: "custom",    label: "Custom" },
];

function resolve(preset: Exclude<Preset, "custom">): { from: string; to: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const today = fmt(now);
  switch (preset) {
    case "today":     return { from: today, to: today };
    case "yesterday": { const d = new Date(now); d.setDate(d.getDate() - 1); return { from: fmt(d), to: fmt(d) }; }
    case "week":      { const d = new Date(now); d.setDate(d.getDate() - 6); return { from: fmt(d), to: today }; }
    case "month":     return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    case "quarter":   return { from: fmt(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)), to: today };
    case "year":      return { from: `${now.getFullYear()}-01-01`, to: today };
  }
}

interface Props {
  active?: Preset;
  from?:   string;
  to?:     string;
}

export function DateRangeFilter({ active = "week", from: initFrom = "", to: initTo = "" }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const [customFrom, setCustomFrom] = useState(initFrom);
  const [customTo,   setCustomTo]   = useState(initTo);

  function apply(preset: Preset, cf?: string, ct?: string) {
    const p = new URLSearchParams();
    p.set("preset", preset);
    if (preset !== "custom") {
      const r = resolve(preset); p.set("from", r.from); p.set("to", r.to);
    } else if (cf && ct) {
      p.set("from", cf); p.set("to", ct);
    }
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(p => (
        <button
          key={p.key}
          onClick={() => apply(p.key, customFrom, customTo)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            active === p.key
              ? "bg-edos-600 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/60"
          }`}
        >
          {p.label}
        </button>
      ))}
      {active === "custom" && (
        <div className="flex items-center gap-2">
          <input type="date" value={customFrom} max={customTo || undefined}
            onChange={e => setCustomFrom(e.target.value)}
            className="px-2 py-1 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <input type="date" value={customTo} min={customFrom || undefined}
            onChange={e => setCustomTo(e.target.value)}
            className="px-2 py-1 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => apply("custom", customFrom, customTo)}
            disabled={!customFrom || !customTo}
            className="px-3 py-1 rounded-lg bg-edos-600 text-white text-xs font-medium disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
