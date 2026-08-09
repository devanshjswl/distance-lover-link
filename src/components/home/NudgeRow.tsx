import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useCouple, useWrite } from "@/hooks/us";
import type { Nudge } from "@/lib/types";

const ACTIONS: { kind: Nudge["kind"]; label: (name: string) => string; tone: string }[] = [
  { kind: "hug", label: () => "Send a hug", tone: "bg-accent/25" },
  { kind: "thinking", label: (name) => `Thinking of ${name}`, tone: "bg-partner-a/25" },
  { kind: "call", label: () => "Ask for a call", tone: "bg-partner-b/25" },
];

export function NudgeRow() {
  const { session, profile } = useAuth();
  const { partner } = useCouple();
  const nudges = useWrite("nudges");

  const send = async (kind: Nudge["kind"], label: string) => {
    if (!session) return;
    await nudges.add({
      kind,
      fromId: session.uid,
      fromName: profile?.name ?? session.name,
      text: label,
    });
    toast.success("Sent");
  };

  const partnerName = partner?.name?.split(" ")[0] ?? "them";

  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
      {ACTIONS.map((action) => {
        const label = action.label(partnerName);
        return (
          <button
            key={action.kind}
            onClick={() => void send(action.kind, label)}
            className="press glass flex shrink-0 items-center gap-2 rounded-full py-2 pr-4 pl-2"
          >
            <span className={`h-4 w-4 rounded-full ${action.tone}`} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
