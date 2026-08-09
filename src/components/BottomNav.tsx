import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Heart, Home, Images, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/dates", label: "Dates", icon: CalendarDays },
  { to: "/gallery", label: "Gallery", icon: Images },
  { to: "/us", label: "Us", icon: Heart },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[420px]">
      <div className="glass-strong mx-4 mb-6 flex h-16 items-center justify-between rounded-full px-6">
        {TABS.map((tab) => {
          const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "press flex flex-col items-center gap-1",
                active ? "text-accent" : "text-muted-foreground",
              )}
            >
              <Icon size={17} strokeWidth={active ? 2.2 : 1.6} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
