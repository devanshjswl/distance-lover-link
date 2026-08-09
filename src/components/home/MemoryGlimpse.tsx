import { Link } from "@tanstack/react-router";
import { useCollection } from "@/hooks/us";
import { formatDay } from "@/lib/format";
import { Card } from "@/components/kit";
import type { Memory } from "@/lib/types";

export function MemoryGlimpse() {
  const memories = useCollection<Memory>("memories");
  const latest = memories[memories.length - 1];

  if (!latest) {
    return (
      <Card delay={260}>
        <h3 className="font-serif text-lg">No memories yet</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Add a photo, a video, or a voice note in{" "}
          <Link to="/gallery" className="text-accent underline">
            the gallery
          </Link>
          .
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-2" delay={260}>
      <Link to="/gallery" className="block">
        {latest.kind === "photo" ? (
          <img
            src={latest.url}
            alt={latest.caption}
            loading="lazy"
            className="mb-3 aspect-video w-full rounded-sm object-cover"
          />
        ) : latest.kind === "video" ? (
          <video src={latest.url} className="mb-3 aspect-video w-full rounded-sm object-cover" muted playsInline />
        ) : (
          <div className="mb-3 grid aspect-video w-full place-items-center rounded-sm bg-secondary">
            <span className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase">Voice note</span>
          </div>
        )}
        <div className="px-3 pb-3">
          <h3 className="font-serif text-lg">{latest.caption || "Untitled"}</h3>
          <p className="max-w-[40ch] text-xs text-pretty text-muted-foreground">
            {formatDay(latest.date)} • from your timeline
          </p>
        </div>
      </Link>
    </Card>
  );
}
