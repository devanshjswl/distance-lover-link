import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useWrite } from "@/hooks/us";
import { Button, Modal } from "@/components/kit";

export function SosButton() {
  const { session, profile } = useAuth();
  const nudges = useWrite("nudges");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!session) return;
    setBusy(true);
    const position = await new Promise<GeolocationPosition | null>((resolve) => {
      if (!("geolocation" in navigator)) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve(p),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10_000 },
      );
    });
    await nudges.add({
      kind: "sos",
      fromId: session.uid,
      fromName: profile?.name ?? session.name,
      text: "SOS — I need you",
      lat: position?.coords.latitude ?? null,
      lon: position?.coords.longitude ?? null,
    });
    setBusy(false);
    setOpen(false);
    toast.success("SOS sent with your location");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="press glass flex h-9 items-center rounded-full px-3 text-[10px] font-medium tracking-widest text-destructive uppercase"
      >
        SOS
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Send an SOS?">
        <p className="text-xs text-pretty text-muted-foreground">
          This alerts your partner immediately and shares your current location once — regardless of
          your location privacy setting.
        </p>
        <Button variant="danger" onClick={() => void send()} disabled={busy}>
          {busy ? "Sending…" : "Send SOS now"}
        </Button>
      </Modal>
    </>
  );
}
