import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useCollection, useWrite } from "@/hooks/us";
import { countdownTo, formatDay, today } from "@/lib/format";
import { Button, Card, CardTitle, Chip, Empty, Field, Input, Modal, Textarea } from "@/components/kit";
import type { CalendarEvent, Milestone } from "@/lib/types";

export const Route = createFileRoute("/dates")({
  head: () => ({
    meta: [
      { title: "Dates & milestones — Us" },
      {
        name: "description",
        content:
          "Shared calendar for exams, classes, travel and gift reminders, plus the milestones you two are counting.",
      },
      { property: "og:title", content: "Dates & milestones — Us" },
      {
        property: "og:description",
        content: "One calendar for exams, classes, travel, gifts and milestones.",
      },
    ],
  }),
  component: DatesPage,
});

const KINDS: CalendarEvent["kind"][] = ["exam", "class", "date", "travel", "gift", "other"];

function EventForm({ onDone }: { onDone: () => void }) {
  const { session } = useAuth();
  const write = useWrite("events");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("");
  const [kind, setKind] = useState<CalendarEvent["kind"]>("exam");
  const [notes, setNotes] = useState("");

  return (
    <>
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Thermodynamics mid-sem" />
      </Field>
      <div className="flex gap-2">
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Time">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        {KINDS.map((item) => (
          <Chip key={item} active={kind === item} onClick={() => setKind(item)}>
            {item}
          </Chip>
        ))}
      </div>
      <Field label="Notes">
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Room B-204" />
      </Field>
      <Button
        disabled={!title.trim()}
        onClick={() => {
          void write.add({
            title: title.trim(),
            date,
            time: time || null,
            kind,
            notes: notes.trim() || null,
            ownerId: session?.uid ?? "",
            remindMe: true,
          });
          onDone();
        }}
      >
        Add to our calendar
      </Button>
    </>
  );
}

function DatesPage() {
  const events = useCollection<CalendarEvent>("events");
  const milestones = useCollection<Milestone>("milestones");
  const eventWrite = useWrite("events");
  const milestoneWrite = useWrite("milestones");
  const [openEvent, setOpenEvent] = useState(false);
  const [openMilestone, setOpenMilestone] = useState(false);
  const [msTitle, setMsTitle] = useState("");
  const [msDate, setMsDate] = useState(today());
  const [filter, setFilter] = useState<"all" | CalendarEvent["kind"]>("all");

  const day = today();
  const upcoming = events
    .filter((event) => event.date >= day && (filter === "all" || event.kind === filter))
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = events.filter((event) => event.date < day).sort((a, b) => b.date.localeCompare(a.date));
  const gifts = events.filter((event) => event.kind === "gift" && event.date >= day);

  return (
    <AppShell title="Dates">
      <Card delay={0}>
        <CardTitle right={<button className="underline" onClick={() => setOpenEvent(true)}>Add</button>}>
          Shared calendar
        </CardTitle>
        <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            all
          </Chip>
          {KINDS.map((kind) => (
            <Chip key={kind} active={filter === kind} onClick={() => setFilter(kind)} className="shrink-0">
              {kind}
            </Chip>
          ))}
        </div>
        {upcoming.length === 0 ? (
          <Empty>Nothing coming up.</Empty>
        ) : (
          <div className="divide-y divide-hairline">
            {upcoming.map((event) => {
              const count = countdownTo(event.date);
              return (
                <div key={event.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDay(event.date)}
                      {event.time ? ` • ${event.time}` : ""} • {event.kind}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs font-medium text-accent">
                      {count && count.days === 0 ? "today" : `${count?.days}d`}
                    </span>
                    <button
                      className="press text-muted-foreground"
                      aria-label="Delete"
                      onClick={() => void eventWrite.remove(event.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card delay={60}>
        <CardTitle>Gift & surprise reminders</CardTitle>
        {gifts.length === 0 ? (
          <Empty>No surprises planned. Add one as a “gift” date.</Empty>
        ) : (
          <div className="divide-y divide-hairline">
            {gifts.map((gift) => (
              <div key={gift.id} className="py-3">
                <p className="text-sm">{gift.title}</p>
                <p className="text-xs text-muted-foreground">{formatDay(gift.date)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card delay={120}>
        <CardTitle right={<button className="underline" onClick={() => setOpenMilestone(true)}>Add</button>}>
          Milestones
        </CardTitle>
        {milestones.length === 0 ? (
          <Empty>Add the first day you met, your anniversary, anything.</Empty>
        ) : (
          <div className="divide-y divide-hairline">
            {[...milestones]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((milestone) => {
                const count = countdownTo(milestone.date);
                return (
                  <div key={milestone.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-serif text-base">{milestone.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDay(milestone.date)} •{" "}
                        {count?.past ? `${count.days} days ago` : `in ${count?.days} days`}
                      </p>
                    </div>
                    <button
                      className="press shrink-0 text-muted-foreground"
                      aria-label="Delete"
                      onClick={() => void milestoneWrite.remove(milestone.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      {past.length > 0 ? (
        <Card delay={180}>
          <CardTitle>Already happened</CardTitle>
          <div className="divide-y divide-hairline">
            {past.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-center justify-between py-2.5">
                <p className="truncate text-sm text-muted-foreground">{event.title}</p>
                <span className="text-xs text-muted-foreground">{formatDay(event.date)}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Modal open={openEvent} onClose={() => setOpenEvent(false)} title="New date">
        <EventForm onDone={() => setOpenEvent(false)} />
      </Modal>

      <Modal open={openMilestone} onClose={() => setOpenMilestone(false)} title="New milestone">
        <Field label="What are we marking">
          <Input value={msTitle} onChange={(e) => setMsTitle(e.target.value)} placeholder="The day we met" />
        </Field>
        <Field label="Date">
          <Input type="date" value={msDate} onChange={(e) => setMsDate(e.target.value)} />
        </Field>
        <Button
          disabled={!msTitle.trim()}
          onClick={() => {
            void milestoneWrite.add({ title: msTitle.trim(), date: msDate });
            setMsTitle("");
            setOpenMilestone(false);
          }}
        >
          Save milestone
        </Button>
      </Modal>
    </AppShell>
  );
}
