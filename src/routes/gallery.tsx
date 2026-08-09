import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Image as ImageIcon, Mic, Square, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useCollection, useCoupleId, useWrite } from "@/hooks/us";
import { uploadMedia } from "@/lib/backend";
import { formatDay, today } from "@/lib/format";
import { Button, Card, CardTitle, Empty, Input } from "@/components/kit";
import type { Memory } from "@/lib/types";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Memory timeline — Us" },
      {
        name: "description",
        content: "A shared timeline of photos, videos and voice notes — the two of you, in order.",
      },
      { property: "og:title", content: "Memory timeline — Us" },
      { property: "og:description", content: "Photos, videos and voice notes on one shared timeline." },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const { session } = useAuth();
  const coupleId = useCoupleId();
  const memories = useCollection<Memory>("memories");
  const write = useWrite("memories");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const photoInput = useRef<HTMLInputElement | null>(null);
  const videoInput = useRef<HTMLInputElement | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const addFile = async (file: File, kind: Memory["kind"]) => {
    setBusy(true);
    try {
      const url = await uploadMedia(`couples/${coupleId}/memories/${Date.now()}-${file.name}`, file);
      await write.add({
        caption: caption.trim() || file.name,
        kind,
        url,
        date: today(),
        ownerId: session?.uid ?? "",
      });
      setCaption("");
      toast.success("Added to your timeline");
    } catch {
      toast.error("Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const recordVoice = async () => {
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (event) => chunks.current.push(event.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        const url = await uploadMedia(`couples/${coupleId}/memories/${Date.now()}.webm`, blob);
        await write.add({
          caption: caption.trim() || "Voice note",
          kind: "voice",
          url,
          date: today(),
          ownerId: session?.uid ?? "",
        });
        setCaption("");
        toast.success("Voice note saved");
      };
      recorder.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      toast.error("Microphone permission is needed.");
    }
  };

  const ordered = [...memories].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <AppShell title="Memories">
      <Card delay={0}>
        <CardTitle right={busy ? "uploading…" : undefined}>Add a memory</CardTitle>
        <Input
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Caption (optional)"
        />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button variant="quiet" size="sm" onClick={() => photoInput.current?.click()}>
            <ImageIcon size={14} /> Photo
          </Button>
          <Button variant="quiet" size="sm" onClick={() => videoInput.current?.click()}>
            <Video size={14} /> Video
          </Button>
          <Button
            variant={recording ? "danger" : "quiet"}
            size="sm"
            onClick={() => void recordVoice()}
          >
            {recording ? <Square size={13} /> : <Mic size={14} />} {recording ? "Stop" : "Voice"}
          </Button>
        </div>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void addFile(file, "photo");
          }}
        />
        <input
          ref={videoInput}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void addFile(file, "video");
          }}
        />
      </Card>

      {ordered.length === 0 ? (
        <Card delay={60}>
          <Empty>Your timeline is empty. Start with one photo.</Empty>
        </Card>
      ) : (
        ordered.map((memory, index) => (
          <Card key={memory.id} className="p-2" delay={60 + index * 40}>
            {memory.kind === "photo" ? (
              <img
                src={memory.url}
                alt={memory.caption}
                loading="lazy"
                className="aspect-video w-full rounded-sm object-cover"
              />
            ) : memory.kind === "video" ? (
              <video src={memory.url} controls playsInline className="aspect-video w-full rounded-sm object-cover" />
            ) : (
              <div className="rounded-sm bg-secondary p-4">
                <audio src={memory.url} controls className="w-full" />
              </div>
            )}
            <div className="flex items-end justify-between px-3 py-3">
              <div className="min-w-0">
                <h3 className="truncate font-serif text-lg">{memory.caption}</h3>
                <p className="text-xs text-muted-foreground">{formatDay(memory.date)}</p>
              </div>
              <button
                className="press text-muted-foreground"
                aria-label="Delete memory"
                onClick={() => void write.remove(memory.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </Card>
        ))
      )}
    </AppShell>
  );
}
