import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useCollection, useCouple, usePrivacy, useWrite } from "@/hooks/us";
import { saveProfile } from "@/lib/backend";
import { firebaseConfigured } from "@/lib/firebase";
import { today } from "@/lib/format";
import { Button, Card, CardTitle, Chip, Empty, Field, Input, Textarea, Toggle } from "@/components/kit";
import type { BucketItem, Goal, Note, StudySession } from "@/lib/types";

export const Route = createFileRoute("/us")({
  head: () => ({
    meta: [
      { title: "Us — goals, journal & privacy" },
      {
        name: "description",
        content:
          "Shared goals and habits, a collaborative bucket list, private journal, weekly study stats and per-feature privacy controls.",
      },
      { property: "og:title", content: "Us — goals, journal & privacy" },
      {
        property: "og:description",
        content: "Goals, habits, bucket list, journal, study stats and privacy controls for two.",
      },
    ],
  }),
  component: UsPage,
});

function PrivacyCard() {
  const { mine, setMine } = usePrivacy();
  const { partner } = useCouple();
  const { partner: theirs } = usePrivacy();
  return (
    <Card delay={0}>
      <CardTitle right="only you control these">Privacy</CardTitle>
      <div className="divide-y divide-hairline">
        <Toggle
          label="Live location"
          hint="Shares coarse location, movement and ETA"
          checked={mine.shareLocation}
          onChange={(next) => setMine({ shareLocation: next })}
        />
        <Toggle
          label="Reached safely alerts"
          hint="Notifies them when you arrive at a saved place"
          checked={mine.geofenceAlerts}
          onChange={(next) => setMine({ geofenceAlerts: next })}
        />
        <Toggle label="Battery level" checked={mine.shareBattery} onChange={(n) => setMine({ shareBattery: n })} />
        <Toggle label="Activity & last active" checked={mine.shareActivity} onChange={(n) => setMine({ shareActivity: n })} />
        <Toggle label="Currently studying" checked={mine.shareStudy} onChange={(n) => setMine({ shareStudy: n })} />
        <Toggle label="Sleep schedule" checked={mine.shareSleep} onChange={(n) => setMine({ shareSleep: n })} />
        <Toggle label="Weather at my place" checked={mine.shareWeather} onChange={(n) => setMine({ shareWeather: n })} />
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {theirs?.shareLocation
          ? `${partner?.name ?? "They"} shares location with you too.`
          : `${partner?.name ?? "They"} is not sharing location right now.`}
      </p>
    </Card>
  );
}

function PlacesCard() {
  const places = useCollection<{ id: string; title: string; lat: number; lon: number; radiusKm: number }>("places");
  const write = useWrite("places");
  const [title, setTitle] = useState("");

  const addHere = async () => {
    if (!title.trim()) return;
    const position = await new Promise<GeolocationPosition | null>((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (p) => resolve(p),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10_000 },
      ),
    );
    if (!position) {
      toast.error("Could not read your location");
      return;
    }
    await write.add({
      title: title.trim(),
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      radiusKm: 0.3,
    });
    setTitle("");
    toast.success("Saved place");
  };

  return (
    <Card delay={40}>
      <CardTitle right="used for ETA & arrival alerts">Safe places</CardTitle>
      <div className="flex gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hostel, home, campus…" />
        <Button size="sm" onClick={() => void addHere()}>
          Use here
        </Button>
      </div>
      {places.length === 0 ? (
        <Empty>No saved places yet.</Empty>
      ) : (
        <div className="mt-2 divide-y divide-hairline">
          {places.map((place) => (
            <div key={place.id} className="flex items-center justify-between py-2.5">
              <span className="text-sm">{place.title}</span>
              <button className="press text-muted-foreground" onClick={() => void write.remove(place.id)}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function GoalsCard() {
  const { session } = useAuth();
  const goals = useCollection<Goal>("goals");
  const write = useWrite("goals");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Goal["kind"]>("habit");
  const day = today();

  return (
    <Card delay={80}>
      <CardTitle>Goals & habits</CardTitle>
      <div className="mb-3 flex gap-2">
        <Chip active={kind === "habit"} onClick={() => setKind("habit")}>
          habit
        </Chip>
        <Chip active={kind === "goal"} onClick={() => setKind("goal")}>
          goal
        </Chip>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          void write.add({
            title: title.trim(),
            kind,
            ownerId: session?.uid ?? "",
            shared: true,
            done: false,
            streak: 0,
            lastDone: null,
          });
          setTitle("");
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sleep before 12" />
        <Button size="sm" type="submit">
          Add
        </Button>
      </form>
      {goals.length === 0 ? (
        <Empty>Nothing shared yet.</Empty>
      ) : (
        <div className="mt-2 divide-y divide-hairline">
          {goals.map((goal) => (
            <div key={goal.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm">{goal.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {goal.kind === "habit" ? `${goal.streak ?? 0} day streak` : goal.done ? "done" : "in progress"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {goal.kind === "habit" ? (
                  <Button
                    size="sm"
                    variant={goal.lastDone === day ? "quiet" : "accent"}
                    onClick={() =>
                      void write.update(goal.id, {
                        lastDone: day,
                        streak: goal.lastDone === day ? goal.streak : (goal.streak ?? 0) + 1,
                      })
                    }
                  >
                    {goal.lastDone === day ? "done today" : "mark done"}
                  </Button>
                ) : (
                  <Button size="sm" variant="quiet" onClick={() => void write.update(goal.id, { done: !goal.done })}>
                    {goal.done ? "reopen" : "complete"}
                  </Button>
                )}
                <button className="press text-muted-foreground" onClick={() => void write.remove(goal.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function BucketCard() {
  const { session } = useAuth();
  const items = useCollection<BucketItem>("bucket");
  const write = useWrite("bucket");
  const [title, setTitle] = useState("");

  return (
    <Card delay={120}>
      <CardTitle right={`${items.filter((item) => item.done).length}/${items.length} done`}>
        Bucket list
      </CardTitle>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          void write.add({ title: title.trim(), done: false, ownerId: session?.uid ?? "" });
          setTitle("");
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Backwaters in monsoon" />
        <Button size="sm" type="submit">
          Add
        </Button>
      </form>
      <div className="mt-2 divide-y divide-hairline">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-3">
            <button
              className="press flex min-w-0 items-center gap-3 text-left"
              onClick={() => void write.update(item.id, { done: !item.done })}
            >
              <span
                className={`h-4 w-4 shrink-0 rounded-full border ${item.done ? "border-accent bg-accent" : "border-input"}`}
              />
              <span className={`truncate text-sm ${item.done ? "text-muted-foreground line-through" : ""}`}>
                {item.title}
              </span>
            </button>
            <button className="press text-muted-foreground" onClick={() => void write.remove(item.id)}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function NotesCard() {
  const { session } = useAuth();
  const notes = useCollection<Note>("notes");
  const write = useWrite("notes");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [shared, setShared] = useState(true);

  const visible = notes.filter((note) => note.shared || note.ownerId === session?.uid);

  return (
    <Card delay={160}>
      <CardTitle>Notes & journal</CardTitle>
      <div className="flex flex-col gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write it out…" />
        <div className="flex items-center justify-between">
          <Chip active={shared} onClick={() => setShared(!shared)}>
            {shared ? "shared with them" : "private to me"}
          </Chip>
          <Button
            size="sm"
            disabled={!title.trim() && !body.trim()}
            onClick={() => {
              void write.add({
                title: title.trim() || "Untitled",
                body: body.trim(),
                ownerId: session?.uid ?? "",
                shared,
              });
              setTitle("");
              setBody("");
            }}
          >
            Save
          </Button>
        </div>
      </div>
      {visible.length === 0 ? (
        <Empty>No notes yet.</Empty>
      ) : (
        <div className="mt-3 divide-y divide-hairline">
          {[...visible].reverse().map((note) => (
            <div key={note.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif text-base">{note.title}</h3>
                <button className="press text-muted-foreground" onClick={() => void write.remove(note.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="text-xs text-pretty text-muted-foreground">{note.body}</p>
              <p className="mt-1 text-[10px] tracking-widest text-muted-foreground uppercase">
                {note.shared ? "shared" : "private"}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function StatsCard() {
  const { session } = useAuth();
  const { partner } = useCouple();
  const sessions = useCollection<StudySession>("sessions");
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.now() - (6 - index) * 86400000);
    const key = date.toISOString().slice(0, 10);
    const mine = sessions
      .filter((row) => row.userId === session?.uid && new Date(row.createdAt).toISOString().slice(0, 10) === key)
      .reduce((sum, row) => sum + row.minutes, 0);
    const theirs = sessions
      .filter(
        (row) => partner && row.userId === partner.id && new Date(row.createdAt).toISOString().slice(0, 10) === key,
      )
      .reduce((sum, row) => sum + row.minutes, 0);
    return { key, label: date.toLocaleDateString("en-GB", { weekday: "narrow" }), mine, theirs };
  });
  const max = Math.max(60, ...days.map((day) => Math.max(day.mine, day.theirs)));

  return (
    <Card delay={200}>
      <CardTitle right="last 7 days">Study stats</CardTitle>
      <div className="flex items-end justify-between gap-2" style={{ height: 96 }}>
        {days.map((day) => (
          <div key={day.key} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-20 w-full items-end justify-center gap-0.5">
              <div className="w-2 rounded-t-full bg-partner-a" style={{ height: `${(day.mine / max) * 100}%` }} />
              <div className="w-2 rounded-t-full bg-partner-b" style={{ height: `${(day.theirs / max) * 100}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{day.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        You {Math.round(days.reduce((s, d) => s + d.mine, 0))}m • {partner?.name ?? "Them"}{" "}
        {Math.round(days.reduce((s, d) => s + d.theirs, 0))}m
      </p>
    </Card>
  );
}

function ProfileCard() {
  const { session, profile, signOut } = useAuth();
  const { partner } = useCouple();
  const [name, setName] = useState(profile?.name ?? "");
  const [sleepStart, setSleepStart] = useState(profile?.sleepStart ?? "23:30");
  const [sleepEnd, setSleepEnd] = useState(profile?.sleepEnd ?? "07:00");

  return (
    <Card delay={240}>
      <CardTitle right={partner ? `paired with ${partner.name}` : "not paired"}>You</CardTitle>
      <div className="flex flex-col gap-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          <Field label="Sleep from">
            <Input type="time" value={sleepStart} onChange={(e) => setSleepStart(e.target.value)} />
          </Field>
          <Field label="Wake at">
            <Input type="time" value={sleepEnd} onChange={(e) => setSleepEnd(e.target.value)} />
          </Field>
        </div>
        <Button
          size="sm"
          onClick={() => {
            if (!session) return;
            void saveProfile(session.uid, { name: name.trim(), sleepStart, sleepEnd });
            toast.success("Saved");
          }}
        >
          Save profile
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Invite code <span className="text-foreground">{profile?.inviteCode}</span> •{" "}
          {firebaseConfigured ? "syncing through Firebase" : "on-device mode (add Firebase keys to sync phones)"}
        </p>
        <Button variant="ghost" size="sm" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </Card>
  );
}

function UsPage() {
  return (
    <AppShell title="Us">
      <PrivacyCard />
      <PlacesCard />
      <GoalsCard />
      <BucketCard />
      <NotesCard />
      <StatsCard />
      <ProfileCard />
    </AppShell>
  );
}
