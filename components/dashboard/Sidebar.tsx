"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Bird, Egg, Baby, ShoppingBag, Users,
  Truck, BarChart3, Activity, LogOut, ChevronLeft, Menu, Wifi, WifiOff,
  Building2, Package, ClipboardList, CheckSquare, AlertTriangle,
  ClipboardCheck, FileText, HeartHandshake, TrendingUp, Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useOfflineSync } from "@/lib/hooks/useOfflineSync";

const navItems = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/flocks",     label: "Flocks",     icon: Bird },
  { href: "/eggs",       label: "Eggs",       icon: Egg },
  { href: "/hatchery",   label: "Hatchery",   icon: Baby },
  { href: "/depot/pos",       label: "Sales Terminal", icon: ShoppingBag },
  { href: "/depot/inventory", label: "Inventory",      icon: Package },
  { href: "/depot/orders",    label: "Orders",         icon: ClipboardList },
  { href: "/farmers",           label: "Farmers",     icon: Users },
  { href: "/tasks",      label: "Tasks",      icon: CheckSquare },
  { href: "/incidents",  label: "Incidents",  icon: AlertTriangle },
  { href: "/inspections",label: "Inspections",icon: ClipboardCheck },
  { href: "/documents",  label: "Documents",  icon: FileText },
  { href: "/breeding",   label: "Breeding",   icon: HeartHandshake },
  { href: "/production", label: "Production", icon: TrendingUp },
  { href: "/expenses",   label: "Expenses",   icon: Receipt },
  { href: "/dispatch",   label: "Dispatch",   icon: Truck },
  { href: "/analytics",  label: "Analytics",  icon: BarChart3 },
  { href: "/health",     label: "Health",     icon: Activity },
];

const superAdminItems = [
  { href: "/tenants", label: "Tenants", icon: Building2 },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  userEmail?: string;
  userRole?: string;
  onNavClick?: () => void;
}

export function Sidebar({ collapsed, onToggle, userEmail, userRole, onNavClick }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { isOnline, pendingCount } = useOfflineSync();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="relative flex flex-col h-full bg-edos-950 text-white overflow-hidden shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-edos-800">
        <div className="w-8 h-8 rounded-lg bg-edos-500 flex items-center justify-center shrink-0 text-lg">🐣</div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="font-bold text-sm whitespace-nowrap"
            >
              EdosHatch
            </motion.span>
          )}
        </AnimatePresence>
        <button
          onClick={onToggle}
          className="ml-auto p-1 rounded-lg hover:bg-edos-800 transition-colors"
        >
          {collapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {(userRole === "super_admin" ? [...superAdminItems, ...navItems] : navItems).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavClick}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm transition-all",
                active
                  ? "bg-edos-600 text-white font-medium"
                  : "text-edos-200 hover:bg-edos-800 hover:text-white"
              )}
            >
              <Icon size={18} className="shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-edos-800 p-3 space-y-2">
        {/* Sync status */}
        <div className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs",
          isOnline ? "text-edos-300" : "text-amber-400"
        )}>
          {isOnline ? <Wifi size={13} className="shrink-0" /> : <WifiOff size={13} className="shrink-0" />}
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                {isOnline
                  ? pendingCount > 0 ? `${pendingCount} pending sync` : "Online"
                  : "Offline mode"}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* User */}
        {!collapsed && (
          <div className="px-2">
            <p className="text-xs text-edos-300 truncate">{userEmail}</p>
            {userRole && (
              <p className="text-[10px] text-edos-500 capitalize">{userRole.replace(/_/g, " ")}</p>
            )}
          </div>
        )}

        <button
          onClick={signOut}
          title={collapsed ? "Sign out" : undefined}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-edos-300 hover:bg-edos-800 hover:text-white transition-colors"
        >
          <LogOut size={16} className="shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
