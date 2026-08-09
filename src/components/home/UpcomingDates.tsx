import { Link } from "@tanstack/react-router";
import { useCollection } from "@/hooks/us";
import { formatDay, today } from "@/lib/format";
import { Card, CardTitle, Empty } from "@/components/kit";
import type { CalendarEvent } from "@/lib/types";

const KIND_LABEL: Record<CalendarEvent["kind"], string> = {
  exam: "Exam",
  class: "Class",
  date: "Date",
  travel: "Travel",
  gift: "Gift",
  other: "Shared",
};

export function UpcomingDates() {
  const events = useCollection<CalendarEvent>("events");
  const day = today();
  const upcoming = events
    .filter((event) => event.date >= day)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <Card delay={220}>
      <CardTitle right={<Link to="/dates" className="underline">All dates</Link>}>Upcoming dates</CardTitle>
      {upcoming.length === 0 ? (
        <Empty>Nothing on the calendar yet.</Empty>
      ) : (
        <div className="divide-y divide-hairline">
          {upcoming.map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDay(event.date)}
                  {event.time ? ` • ${event.time}` : ""}
                  {event.notes ? ` • ${event.notes}` : ""}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium">
                {KIND_LABEL[event.kind]}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
