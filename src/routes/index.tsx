import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CountdownHero } from "@/components/home/CountdownHero";
import { PresencePair } from "@/components/home/PresencePair";
import { CheckInCard } from "@/components/home/CheckInCard";
import { StudyCard } from "@/components/home/StudyCard";
import { UpcomingDates } from "@/components/home/UpcomingDates";
import { NudgeRow } from "@/components/home/NudgeRow";
import { MemoryGlimpse } from "@/components/home/MemoryGlimpse";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Us — a private space for long-distance couples" },
      {
        name: "description",
        content:
          "Us keeps two people close: live location with battery and ETA, shared calendar, daily check-ins, study sessions, memories, and private chat.",
      },
      { property: "og:title", content: "Us — a private space for long-distance couples" },
      {
        property: "og:description",
        content: "Live presence, shared calendar, check-ins, study sessions and memories for two.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <AppShell>
      <CountdownHero />
      <PresencePair />
      <CheckInCard />
      <StudyCard />
      <UpcomingDates />
      <NudgeRow />
      <MemoryGlimpse />
    </AppShell>
  );
}
