import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useCollection, useCouple, useWrite } from "@/hooks/us";
import { timeAgo, today } from "@/lib/format";
import { Card, CardTitle, Chip, Input } from "@/components/kit";
import type { CheckIn } from "@/lib/types";

const DEFAULT_MOODS = ["Quietly happy", "A bit tired", "Productive", "Missing you", "Stressed"];
const MOOD_KEY = "us.moods";

export function CheckInCard() {
  const { session, profile } = useAuth();
  const { partner } = useCouple();
  const rows = useCollection<CheckIn>("checkins");
  const write = useWrite("checkins");
  const [moods, setMoods] = useState<string[]>(DEFAULT_MOODS);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(MOOD_KEY);
    if (stored) setMoods(JSON.parse(stored) as string[]);
  }, []);

  const day = today();
  const mine = rows.find((row) => row.userId === session?.uid && row.day === day) ?? null;
  const theirs = partner ? (rows.find((row) => row.userId === partner.id && row.day === day) ?? null) : null;

  const setMood = async (mood: string) => {
    if (!session) return;
    const id = `${session.uid}-${day}`;
    await write.set(id, {
      userId: session.uid,
      userName: profile?.name ?? session.name,
      day,
      mood,
      energy: mine?.energy ?? 3,
    });
  };

  const setEnergy = async (energy: number) => {
    if (!session) return;
    await write.set(`${session.uid}-${day}`, {
      userId: session.uid,
      userName: profile?.name ?? session.name,
      day,
      mood: mine?.mood ?? moods[0],
      energy,
    });
  };

  return (
    <Card delay={140}>
      <CardTitle right={mine ? `synced ${timeAgo(mine.createdAt)}` : "not yet today"}>
        How are we today?
      </CardTitle>

      <div className="flex flex-wrap gap-2">
        {moods.map((mood) => (
          <Chip key={mood} active={mine?.mood === mood} onClick={() => void setMood(mood)}>
            {mood}
          </Chip>
        ))}
        <Chip onClick={() => setAdding(true)}>+</Chip>
      </div>

      {adding ? (
        <form
          className="mt-3"
          onSubmit={(event) => {
            event.preventDefault();
            const next = [...moods, draft.trim()].filter(Boolean).slice(0, 12);
            setMoods(next);
            localStorage.setItem(MOOD_KEY, JSON.stringify(next));
            void setMood(draft.trim());
            setDraft("");
            setAdding(false);
          }}
        >
          <Input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add your own mood"
          />
        </form>
      ) : null}

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Energy</span>
          <span>{mine?.energy ?? 3}/5</span>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => void setEnergy(level)}
              aria-label={`Energy ${level}`}
              className={`press h-2 flex-1 rounded-full ${(mine?.energy ?? 0) >= level ? "bg-accent" : "bg-input"}`}
            />
          ))}
        </div>
      </div>

      <p className="mt-4 border-t border-hairline pt-3 text-xs text-muted-foreground">
        {theirs
          ? `${partner?.name ?? "They"} feels ${theirs.mood.toLowerCase()} • energy ${theirs.energy}/5`
          : `${partner?.name ?? "They"} hasn't checked in today`}
      </p>
    </Card>
  );
}
