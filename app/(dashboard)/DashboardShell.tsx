"use client";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";

interface Props {
  children: React.ReactNode;
  userEmail?: string;
  userRole?: string;
}

export function DashboardShell({ children, userEmail, userRole }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — drawer on mobile, fixed column on desktop */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-50 lg:relative lg:inset-auto",
          "transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
          userEmail={userEmail}
          userRole={userRole}
          onNavClick={() => setMobileOpen(false)}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold text-sm">EdosHatch</span>
        </div>

        <div className="p-4 md:p-6 max-w-screen-xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
