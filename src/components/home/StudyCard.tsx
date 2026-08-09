import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useCollection, useCouple, usePresence, useWrite } from "@/hooks/us";
import { mmss } from "@/lib/format";
import { Button, Card, CardTitle, Chip, Input } from "@/components/kit";
import type { StudySession } from "@/lib/types";

const FOCUS_MS = 25 * 60 * 1000;
const BREAK_MS = 5 * 60 * 1000;
const SUBJECTS = ["Thermodynamics", "Fluid Mechanics", "Physics", "Chemistry", "Biology"];

export function StudyCard() {
  const { session, profile } = useAuth();
  const { partner } = useCouple();
  const { partner: theirPresence } = usePresence();
  const presence = useWrite("presence");
  const sessions = useWrite("sessions");
  const rows = useCollection<StudySession>("sessions");

  const [subject, setSubject] = useState(SUBJECTS[0] as string);
  const [custom, setCustom] = useState("");
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [remaining, setRemaining] = useState(FOCUS_MS);
  const [running, setRunning] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1000) {
          window.clearInterval(timer);
          return 0;
        }
        return value - 1000;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (remaining !== 0 || !running) return;
    setRunning(false);
    void finish(true);
  }, [remaining]); // eslint-disable-line react-hooks/exhaustive-deps

  const publish = async (studying: boolean) => {
    if (!session) return;
    await presence.set(session.uid, {
      id: session.uid,
      name: profile?.name ?? session.name,
      studying,
      studySubject: studying ? subject : null,
      studyEndsAt: studying ? Date.now() + remaining : null,
      lastActive: Date.now(),
    });
  };

  const start = async () => {
    startedAt.current = Date.now();
    setRunning(true);
    setFocusMode(mode === "focus");
    await publish(mode === "focus");
  };

  const finish = async (completed: boolean) => {
    const total = mode === "focus" ? FOCUS_MS : BREAK_MS;
    const elapsed = Math.round((total - remaining) / 60000);
    if (session && mode === "focus" && elapsed > 0) {
      await sessions.add({
        userId: session.uid,
        userName: profile?.name ?? session.name,
        subject,
        minutes: completed ? total / 60000 : elapsed,
        mode,
        completed,
        startedAt: startedAt.current ?? Date.now(),
      });
    }
    await publish(false);
    setFocusMode(false);
    setRunning(false);
    if (completed) {
      toast.success(mode === "focus" ? "Pomodoro done — take five" : "Break over");
      const next = mode === "focus" ? "break" : "focus";
      setMode(next);
      setRemaining(next === "focus" ? FOCUS_MS : BREAK_MS);
    } else {
      setRemaining(mode === "focus" ? FOCUS_MS : BREAK_MS);
    }
  };

  const total = mode === "focus" ? FOCUS_MS : BREAK_MS;
  const pct = ((total - remaining) / total) * 100;

  const weekStart = Date.now() - 7 * 86400000;
  const myMinutes = rows
    .filter((row) => row.userId === session?.uid && row.createdAt > weekStart)
    .reduce((sum, row) => sum + row.minutes, 0);
  const theirMinutes = rows
    .filter((row) => partner && row.userId === partner.id && row.createdAt > weekStart)
    .reduce((sum, row) => sum + row.minutes, 0);

  return (
    <>
      {focusMode ? (
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-xl">
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Focus • {subject}</p>
          <p className="font-serif text-7xl">{mmss(remaining)}</p>
          <div className="flex gap-3">
            <Button variant="quiet" onClick={() => setRunning((value) => !value)}>
              {running ? "Pause" : "Resume"}
            </Button>
            <Button variant="pill" onClick={() => void finish(false)}>
              End session
            </Button>
          </div>
        </div>
      ) : null}

      <Card delay={180}>
        <CardTitle right={mode === "focus" ? "25 min focus" : "5 min break"}>Study together</CardTitle>

        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
              <circle cx="18" cy="18" r="16" fill="none" stroke="var(--input)" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 100.5} 100.5`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
              {mmss(remaining)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{subject}</p>
            <p className="text-[11px] text-muted-foreground">
              {theirPresence?.studying
                ? `${partner?.name ?? "They"} is studying ${theirPresence.studySubject ?? ""}`
                : `${partner?.name ?? "They"} isn't studying right now`}
            </p>
            <div className="mt-2 flex gap-2">
              {running ? (
                <Button size="sm" variant="quiet" onClick={() => setRunning(false)}>
                  <Pause size={13} /> Pause
                </Button>
              ) : (
                <Button size="sm" onClick={() => void start()}>
                  <Play size={13} /> Start
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => void finish(false)}>
                <RotateCcw size={13} /> Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
          {[...SUBJECTS, ...(custom ? [custom] : [])].map((item) => (
            <Chip key={item} active={subject === item} onClick={() => setSubject(item)} className="shrink-0">
              {item}
            </Chip>
          ))}
        </div>
        <form
          className="mt-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!custom.trim()) return;
            setSubject(custom.trim());
          }}
        >
          <Input
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            placeholder="Other subject…"
            className="py-2 text-xs"
          />
        </form>

        <div className="mt-4 flex justify-between border-t border-hairline pt-3 text-[11px] text-muted-foreground">
          <span>You this week: {Math.round(myMinutes)}m</span>
          <span>
            {partner?.name ?? "Them"}: {Math.round(theirMinutes)}m
          </span>
        </div>
      </Card>
    </>
  );
}
