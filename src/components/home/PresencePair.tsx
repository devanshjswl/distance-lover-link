import { BatteryCharging, Footprints, MapPin, Moon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCouple, usePresence, usePrivacy } from "@/hooks/us";
import { localTime, timeAgo, weatherLabel } from "@/lib/format";
import { Avatar, Card } from "@/components/kit";
import type { Presence } from "@/lib/types";

function PersonCard({
  presence,
  name,
  tone,
  isMe,
  delay,
  sleeping,
}: {
  presence: Presence | null;
  name: string;
  tone: "a" | "b";
  isMe: boolean;
  delay: number;
  sleeping?: boolean;
}) {
  const online = presence?.lastActive && Date.now() - presence.lastActive < 5 * 60 * 1000;

  return (
    <Card className="flex flex-col gap-3 p-4" delay={delay}>
      <div className="flex items-center gap-3">
        <span className="relative">
          <Avatar name={name} tone={tone} size={40} />
          {online ? (
            <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-positive ring-2 ring-background" />
          ) : null}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{isMe ? "You" : name}</p>
          <p className="text-[10px] text-muted-foreground">
            {presence?.city ?? "—"} • {localTime()}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-[11px]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${presence?.studying ? "bg-positive breathe" : online ? "bg-positive" : "bg-muted-foreground/40"}`}
          />
          <span className="truncate text-foreground/80">
            {presence?.studying
              ? `Studying ${presence.studySubject ?? ""}`.trim()
              : sleeping
                ? "Probably asleep"
                : online
                  ? "Online now"
                  : `Last active ${timeAgo(presence?.lastActive)}`}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {presence?.charging ? <BatteryCharging size={12} /> : <span className="h-3 w-3 rounded-xs border border-border" />}
          <span className="truncate">
            {presence?.battery !== null && presence?.battery !== undefined ? `${presence.battery}%` : "battery hidden"}
            {presence?.weatherTemp !== null && presence?.weatherTemp !== undefined
              ? ` • ${Math.round(presence.weatherTemp)}°C ${weatherLabel(presence.weatherCode)}`
              : ""}
          </span>
        </div>

        {presence?.lat ? (
          <a
            href={`https://www.google.com/maps?q=${presence.lat},${presence.lon}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-[11px] text-accent"
          >
            <MapPin size={12} />
            <span className="truncate">
              {presence.movement === "moving"
                ? "On the move"
                : presence.movement === "walking"
                  ? "Walking"
                  : "Live location"}
              {presence.etaMinutes !== null && presence.etaMinutes !== undefined
                ? ` • ${presence.etaMinutes}m to ${presence.destinationName ?? "home"}`
                : ""}
            </span>
          </a>
        ) : (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {sleeping ? <Moon size={12} /> : <Footprints size={12} />}
            <span>location private</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function isSleeping(start?: string, end?: string) {
  if (!start || !end) return false;
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const toMin = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const s = toMin(start);
  const e = toMin(end);
  return s > e ? minutes >= s || minutes < e : minutes >= s && minutes < e;
}

export function PresencePair() {
  const { session, profile } = useAuth();
  const { partner } = useCouple();
  const { mine, partner: theirs } = usePresence();
  const { mine: myPrivacy } = usePrivacy();

  return (
    <div className="grid grid-cols-2 gap-4">
      <PersonCard
        presence={mine}
        name={profile?.name ?? session?.name ?? "You"}
        tone="a"
        isMe
        delay={60}
        sleeping={myPrivacy.shareSleep && isSleeping(profile?.sleepStart, profile?.sleepEnd)}
      />
      <PersonCard
        presence={theirs}
        name={partner?.name ?? "Partner"}
        tone="b"
        isMe={false}
        delay={100}
      />
    </div>
  );
}
