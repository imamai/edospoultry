"use client";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "./AnimatedCounter";

interface Props {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  delay?: number;
  className?: string;
}

export function StatCard({
  title, value, prefix, suffix, decimals = 0,
  change, changeLabel, icon: Icon, iconColor = "text-edos-600",
  delay = 0, className,
}: Props) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      className={cn("stat-card bg-card border border-border rounded-2xl p-5", className)}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="mt-1.5 text-3xl font-bold text-foreground">
            <AnimatedCounter value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
          </p>
          {change !== undefined && (
            <p className={cn("mt-1 text-xs font-medium", isPositive ? "text-green-600" : "text-red-500")}>
              {isPositive ? "▲" : "▼"} {Math.abs(change)}%
              {changeLabel && <span className="text-muted-foreground font-normal ml-1">{changeLabel}</span>}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-2.5 rounded-xl bg-edos-50 dark:bg-edos-950/30">
            <Icon size={20} className={iconColor} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
