import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useIncomingNudges, usePresenceSync } from "@/hooks/us";
import { BottomNav } from "@/components/BottomNav";
import { AuthScreen } from "@/components/AuthScreen";
import { PairScreen } from "@/components/PairScreen";
import { SosButton } from "@/components/SosButton";
import type { Nudge } from "@/lib/types";

const NUDGE_COPY: Record<Nudge["kind"], string> = {
  hug: "sent you a hug",
  thinking: "is thinking of you",
  call: "would love a call",
  sos: "needs you — SOS",
  safe: "reached their place safely",
};

function Ambient() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-[10%] -left-[10%] h-[40vh] w-[60vw] rounded-full bg-partner-a/12 blur-[100px]" />
      <div className="absolute right-[-10%] bottom-[18%] h-[45vh] w-[55vw] rounded-full bg-accent/8 blur-[110px]" />
      <div className="absolute top-[38%] left-[20%] h-[25vh] w-[45vw] rounded-full bg-partner-b/8 blur-[110px]" />
    </div>
  );
}

function Live() {
  const { session, profile } = useAuth();
  usePresenceSync();
  const onNudge = useCallback(
    (nudge: Nudge) => {
      const label = `${nudge.fromName ?? "Your partner"} ${NUDGE_COPY[nudge.kind]}`;
      if (nudge.kind === "sos") toast.error(label, { duration: 15000 });
      else toast(label);
    },
    [],
  );
  useIncomingNudges(onNudge);
  useEffect(() => {
    if (session && profile && typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, [session, profile]);
  return null;
}

export function AppShell({ title, children }: { title?: string; children: ReactNode }) {
  const { ready, session, profile } = useAuth();
  const { mode, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="font-serif text-3xl opacity-40">Us</span>
      </div>
    );
  }

  if (!session) return <AuthScreen />;
  if (!profile?.coupleId) return <PairScreen />;

  return (
    <div className="relative min-h-screen">
      <Ambient />
      <Live />
      <div className="relative mx-auto w-full max-w-[420px]">
        <header className="sticky top-0 z-40 flex items-center justify-between px-5 pt-5 pb-3 backdrop-blur-md">
          <h1 className="font-serif text-2xl leading-none">{title ?? "Us"}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="press glass flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground"
            >
              {mode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <SosButton />
          </div>
        </header>
        <main className="flex flex-col gap-5 px-5 pt-1 pb-32">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
