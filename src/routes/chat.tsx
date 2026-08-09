import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mic, Send, Smile, Square } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useCollection, useCoupleId, useWrite } from "@/hooks/us";
import { uploadMedia } from "@/lib/backend";
import { mmss, timeAgo } from "@/lib/format";
import { Button, Chip, Input } from "@/components/kit";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Us" },
      {
        name: "description",
        content: "A private thread for two: text, voice notes, GIFs and stickers, synced instantly.",
      },
      { property: "og:title", content: "Chat — Us" },
      { property: "og:description", content: "Private text, voice notes, GIFs and stickers for two." },
    ],
  }),
  component: ChatPage,
});

const STICKERS = ["🫂", "💌", "☕️", "🌙", "✨", "📚", "🧪", "🌻", "🫶", "🐣", "🎧", "🍜"];
const GIPHY_KEY = "dc6zaTOxFJmzC";

function Bubble({ message, mine }: { message: Message; mine: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[76%] rounded-lg px-4 py-2.5",
          mine ? "bg-accent text-accent-foreground" : "glass",
          message.kind === "sticker" && "bg-transparent px-0 py-0 text-4xl",
        )}
      >
        {message.kind === "text" ? <p className="text-sm text-pretty">{message.text}</p> : null}
        {message.kind === "sticker" ? <span>{message.text}</span> : null}
        {message.kind === "gif" ? (
          <img src={message.url} alt="GIF" className="w-48 rounded-sm" loading="lazy" />
        ) : null}
        {message.kind === "voice" ? (
          <span className="flex items-center gap-2">
            <audio src={message.url} controls className="h-8 w-44" />
          </span>
        ) : null}
      </div>
      <span className="px-1 text-[10px] text-muted-foreground">{timeAgo(message.createdAt)}</span>
    </div>
  );
}

function ChatPage() {
  const { session, profile } = useAuth();
  const coupleId = useCoupleId();
  const messages = useCollection<Message>("messages");
  const write = useWrite("messages");
  const [text, setText] = useState("");
  const [panel, setPanel] = useState<"none" | "stickers" | "gifs">("none");
  const [gifQuery, setGifQuery] = useState("hug");
  const [gifs, setGifs] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const bottom = useRef<HTMLDivElement | null>(null);

  const sorted = useMemo(() => [...messages].sort((a, b) => a.createdAt - b.createdAt), [messages]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [sorted.length]);

  useEffect(() => {
    if (panel !== "gifs") return;
    let live = true;
    void fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&limit=12&rating=g&q=${encodeURIComponent(gifQuery)}`,
    )
      .then((res) => res.json())
      .then((json: { data?: { images?: { fixed_width?: { url?: string } } }[] }) => {
        if (!live) return;
        setGifs(
          (json.data ?? [])
            .map((item) => item.images?.fixed_width?.url)
            .filter((url): url is string => Boolean(url)),
        );
      })
      .catch(() => setGifs([]));
    return () => {
      live = false;
    };
  }, [panel, gifQuery]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1000), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  const send = async (payload: Partial<Message>) => {
    if (!session) return;
    await write.add({
      authorId: session.uid,
      authorName: profile?.name ?? session.name,
      readBy: [session.uid],
      ...payload,
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (event) => chunks.current.push(event.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        const url = await uploadMedia(`couples/${coupleId}/voice/${Date.now()}.webm`, blob);
        await send({ kind: "voice", url, durationMs: elapsed });
        setElapsed(0);
      };
      recorder.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      toast.error("Microphone permission is needed for voice notes.");
    }
  };

  const stopRecording = () => {
    recorder.current?.stop();
    setRecording(false);
  };

  return (
    <AppShell title="Chat">
      <div className="flex min-h-[55vh] flex-col gap-4">
        {sorted.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">
            Nothing here yet. Say something small.
          </p>
        ) : (
          sorted.map((message) => (
            <Bubble key={message.id} message={message} mine={message.authorId === session?.uid} />
          ))
        )}
        <div ref={bottom} />
      </div>

      {panel === "stickers" ? (
        <div className="glass grid grid-cols-6 gap-2 rounded-lg p-3">
          {STICKERS.map((sticker) => (
            <button
              key={sticker}
              className="press text-2xl"
              onClick={() => {
                void send({ kind: "sticker", text: sticker });
                setPanel("none");
              }}
            >
              {sticker}
            </button>
          ))}
        </div>
      ) : null}

      {panel === "gifs" ? (
        <div className="glass rounded-lg p-3">
          <div className="mb-2 flex gap-2">
            {["hug", "miss you", "good night", "study"].map((term) => (
              <Chip key={term} active={gifQuery === term} onClick={() => setGifQuery(term)}>
                {term}
              </Chip>
            ))}
          </div>
          <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto">
            {gifs.map((url) => (
              <button
                key={url}
                className="press"
                onClick={() => {
                  void send({ kind: "gif", url });
                  setPanel("none");
                }}
              >
                <img src={url} alt="GIF" className="h-20 w-full rounded-sm object-cover" loading="lazy" />
              </button>
            ))}
            {gifs.length === 0 ? (
              <p className="col-span-3 py-4 text-center text-xs text-muted-foreground">No GIFs found.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="glass-strong sticky bottom-24 flex items-center gap-2 rounded-full p-2">
        <button
          className="press flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground"
          onClick={() => setPanel(panel === "stickers" ? "none" : "stickers")}
          aria-label="Stickers"
        >
          <Smile size={17} />
        </button>
        <button
          className="press h-9 rounded-full px-2 text-[10px] font-medium tracking-widest text-muted-foreground uppercase"
          onClick={() => setPanel(panel === "gifs" ? "none" : "gifs")}
        >
          GIF
        </button>
        <form
          className="flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (!text.trim()) return;
            void send({ kind: "text", text: text.trim() });
            setText("");
          }}
        >
          <Input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={recording ? `Recording ${mmss(elapsed)}` : "Write something"}
            className="rounded-full border-0 bg-transparent py-2"
          />
        </form>
        {text.trim() ? (
          <Button
            size="sm"
            className="h-9 w-9 rounded-full p-0"
            onClick={() => {
              void send({ kind: "text", text: text.trim() });
              setText("");
            }}
            aria-label="Send"
          >
            <Send size={15} />
          </Button>
        ) : (
          <Button
            size="sm"
            variant={recording ? "danger" : "accent"}
            className="h-9 w-9 rounded-full p-0"
            onClick={() => (recording ? stopRecording() : void startRecording())}
            aria-label="Record voice note"
          >
            {recording ? <Square size={14} /> : <Mic size={15} />}
          </Button>
        )}
      </div>
    </AppShell>
  );
}
