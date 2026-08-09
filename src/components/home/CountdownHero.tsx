import { useEffect, useState } from "react";
import { useCouple, useWrite } from "@/hooks/us";
import { countdownTo, formatDay, spellDays } from "@/lib/format";
import { Button, Card, Eyebrow, Field, Input, Modal } from "@/components/kit";

export function CountdownHero() {
  const { settings } = useCouple();
  const write = useWrite("settings");
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const count = countdownTo(settings?.meetupDate ?? null);
  const start = settings?.meetupStart ? new Date(`${settings.meetupStart}T00:00:00`).getTime() : null;
  const target = settings?.meetupDate ? new Date(`${settings.meetupDate}T00:00:00`).getTime() : null;
  const progress =
    start && target && target > start
      ? Math.min(100, Math.max(0, ((Date.now() - start) / (target - start)) * 100))
      : null;

  const [title, setTitle] = useState(settings?.meetupTitle ?? "");
  const [place, setPlace] = useState(settings?.meetupPlace ?? "");
  const [date, setDate] = useState(settings?.meetupDate ?? "");
  useEffect(() => {
    setTitle(settings?.meetupTitle ?? "");
    setPlace(settings?.meetupPlace ?? "");
    setDate(settings?.meetupDate ?? "");
  }, [settings?.meetupTitle, settings?.meetupPlace, settings?.meetupDate]);

  const save = async () => {
    await write.set("couple", {
      meetupTitle: title || "Next meetup",
      meetupPlace: place || null,
      meetupDate: date || null,
      meetupStart: settings?.meetupStart ?? new Date().toISOString().slice(0, 10),
      members: settings?.["members" as keyof typeof settings] ?? undefined,
    });
    setOpen(false);
  };

  return (
    <>
      <Card className="p-6" delay={0}>
        <button onClick={() => setOpen(true)} className="w-full text-left">
          <Eyebrow>{settings?.meetupPlace ? `Meetup in ${settings.meetupPlace}` : "Next meetup"}</Eyebrow>
          {count ? (
            <h2 className="font-serif text-4xl leading-tight text-balance">
              {count.past
                ? "We're together now"
                : count.days === 0
                  ? `${count.hours} hours until we're home`
                  : `${spellDays(count.days)} days until we're home`}
            </h2>
          ) : (
            <h2 className="font-serif text-4xl leading-tight text-balance">
              Set the day we meet again
            </h2>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {settings?.meetupDate
              ? `${settings.meetupTitle || "Meetup"} • ${formatDay(settings.meetupDate)}${count && !count.past ? ` • ${count.hours}h ${count.minutes}m` : ""}`
              : "Tap to add a date"}
          </p>
          {progress !== null ? (
            <div className="mt-4 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-input">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{Math.round(progress)}%</span>
            </div>
          ) : null}
          <span className="hidden">{tick}</span>
        </button>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Next meetup">
        <Field label="What is it">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Winter break" />
        </Field>
        <Field label="Where">
          <Input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Kochi" />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Button onClick={() => void save()}>Save</Button>
      </Modal>
    </>
  );
}
