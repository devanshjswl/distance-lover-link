import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { findProfileByCode, newId, saveProfile, setRecord } from "@/lib/backend";
import { defaultPrivacy } from "@/lib/types";
import { Button, Card, Field, Input } from "@/components/kit";

export function PairScreen() {
  const { session, profile, signOut } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const pair = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || !profile) return;
    setBusy(true);
    try {
      const wanted = code.trim().toUpperCase();
      if (wanted === profile.inviteCode) throw new Error("That's your own code.");
      const partner = await findProfileByCode(wanted);
      if (!partner) throw new Error("No one found with that code.");
      if (partner.coupleId) throw new Error("That code is already paired.");

      const coupleId = newId();
      await setRecord(coupleId, "settings", "couple", {
        members: [
          { id: session.uid, name: profile.name },
          { id: partner.id, name: partner.name },
        ],
        togetherSince: new Date().toISOString().slice(0, 10),
      });
      await setRecord(coupleId, "privacy", session.uid, defaultPrivacy(session.uid));
      await setRecord(coupleId, "privacy", partner.id, defaultPrivacy(partner.id));
      await saveProfile(partner.id, { coupleId });
      await saveProfile(session.uid, { coupleId });
      toast.success(`Paired with ${partner.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not pair");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col justify-center gap-5 px-5 py-12">
      <header className="fade-up">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          One last step
        </p>
        <h1 className="font-serif text-4xl leading-tight text-balance">
          Two lit windows,
          <br />
          one address
        </h1>
      </header>

      <Card delay={80}>
        <p className="text-xs text-muted-foreground">Share your invite code</p>
        <p className="mt-2 font-serif text-4xl tracking-[0.2em]">{profile?.inviteCode ?? "…"}</p>
        <Button
          variant="quiet"
          size="sm"
          className="mt-4"
          onClick={() => {
            void navigator.clipboard.writeText(profile?.inviteCode ?? "");
            toast.success("Code copied");
          }}
        >
          Copy code
        </Button>
      </Card>

      <Card delay={140}>
        <form onSubmit={pair} className="flex flex-col gap-3">
          <Field label="Or enter their code">
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="A1B2C3"
              maxLength={8}
              className="tracking-[0.3em] uppercase"
            />
          </Field>
          <Button type="submit" disabled={busy || code.length < 4}>
            {busy ? "Pairing…" : "Pair us"}
          </Button>
        </form>
      </Card>

      <button
        className="press mx-auto text-xs text-muted-foreground underline"
        onClick={() => void signOut()}
      >
        Sign out
      </button>
    </main>
  );
}
