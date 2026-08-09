import { useState } from "react";
import { toast } from "sonner";
import { firebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { Button, Card, Field, Input } from "@/components/kit";

export function AuthScreen() {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        await signUp(email.trim(), password, name.trim());
        toast.success(
          firebaseConfigured ? "Account created — check your email if asked." : "Account created.",
        );
      } else {
        await signIn(email.trim(), password);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col justify-center gap-5 px-5 py-12">
      <header className="fade-up">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Just the two of you
        </p>
        <h1 className="font-serif text-5xl leading-tight text-balance">Us</h1>
        <p className="mt-2 max-w-[34ch] text-sm text-pretty text-muted-foreground">
          A quiet, private space for two people in different cities.
        </p>
      </header>

      <Card delay={80}>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "up" ? (
            <Field label="Your name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Aarav" />
            </Field>
          ) : null}
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@email.com"
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              placeholder="••••••••"
            />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? "One moment…" : mode === "up" ? "Create our space" : "Sign in"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[10px] tracking-widest text-muted-foreground uppercase">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          variant="quiet"
          className="w-full"
          onClick={() =>
            void signInWithGoogle().catch((error: Error) => toast.error(error.message))
          }
        >
          Continue with Google
        </Button>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <button className="press underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "Create an account" : "I already have an account"}
          </button>
          {mode === "in" ? (
            <button
              className="press underline"
              onClick={() =>
                void resetPassword(email.trim())
                  .then(() => toast.success("Reset link sent"))
                  .catch((error: Error) => toast.error(error.message))
              }
            >
              Forgot password
            </button>
          ) : null}
        </div>
      </Card>

      {!firebaseConfigured ? (
        <Card delay={160} className="text-xs text-muted-foreground">
          <p className="text-pretty">
            Running in <span className="text-foreground">on-device mode</span> — everything works and
            syncs across tabs on this device. Add your Firebase keys to sync between real phones and
            enable Google sign-in.
          </p>
        </Card>
      ) : null}
    </main>
  );
}
