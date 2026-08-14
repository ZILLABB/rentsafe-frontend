import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, CheckCircle2, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/States";
import { api } from "@/lib/api";

/** Agent profile claims awaiting a decision.
 *
 *  Both endpoints and the submit form existed with nothing calling the queue,
 *  so a claim could be filed and never decided — exactly the state the photo
 *  queue was in, and with the same consequence: a feature that looks finished
 *  from the outside and is a dead end in practice.
 *
 *  Approving is the moment someone gains the ability to answer, on the public
 *  record, every tenant who has reviewed that agent. The obvious abuses are a
 *  rival claiming a competitor and a landlord claiming the agent who let their
 *  property in order to answer criticism of themselves, so the screen shows
 *  what a moderator needs to weigh that rather than just a name and a button.
 */
export function ClaimQueue() {
  const queryClient = useQueryClient();
  const [acted, setActed] = useState<Record<number, "approve" | "reject">>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ["admin", "claims"],
    queryFn: api.claimQueue,
  });

  async function decide(id: number, action: "approve" | "reject") {
    setError(null);
    if (action === "reject" && !(notes[id] ?? "").trim()) {
      setError("A rejection needs a reason — the claimant is told why.");
      return;
    }
    try {
      await api.decideClaim(id, action, notes[id]);
      setActed((a) => ({ ...a, [id]: action }));
      await queryClient.invalidateQueries({ queryKey: ["admin", "claims"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply that decision.");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2.5">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <Card className="py-10 text-center">
        <CheckCircle2 size={26} className="mx-auto text-score-good" />
        <p className="mt-2 text-sm font-600 text-foreground">No claims waiting</p>
        <p className="text-xs text-subtle">
          Agents asking to manage their own profile appear here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2.5">
      {error && (
        <p className="rounded-md bg-score-bad/[0.08] px-3 py-2 text-xs text-score-bad">
          {error}
        </p>
      )}

      {queue.map((c) => {
        const decision = acted[c.claim_id];
        return (
          <Card key={c.claim_id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-700 text-heading">
                  {c.agent_name}
                  {c.agent_flagged && (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-score-bad/10 px-1.5 py-0.5 text-2xs font-700 text-score-bad">
                      <ShieldAlert size={10} /> FLAGGED AGENT
                    </span>
                  )}
                </p>
                <p className="text-2xs text-subtle">
                  {c.company_name ?? "No company on record"} ·{" "}
                  {c.agent_total_reviews} reviews on this profile
                </p>
              </div>
              <span className="flex-none text-2xs text-subtle">
                {Math.round(c.submitted_hours_ago)}h ago
              </span>
            </div>

            <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-2xs">
              <dt className="text-subtle">LASRERA</dt>
              <dd className="font-mono text-foreground">
                {c.lasrera_number ?? "— none given"}
              </dd>
              <dt className="text-subtle">Contact</dt>
              <dd className="text-foreground">{c.contact_email ?? "— none given"}</dd>
              <dt className="text-subtle">Claimant</dt>
              <dd className="font-mono text-foreground">
                ····{c.claimant_phone_last4 ?? "????"}
              </dd>
            </dl>

            {c.evidence_note && (
              <p className="mt-2 rounded-md bg-inset px-2.5 py-2 text-2xs leading-relaxed text-muted-foreground">
                “{c.evidence_note}”
              </p>
            )}

            {/* Said on the screen where the decision is made, not in a wiki
                nobody opens: this is a verification step, not a formality. */}
            <p className="mt-2 flex items-start gap-1.5 text-2xs leading-relaxed text-subtle">
              <AlertTriangle size={12} className="mt-px flex-none" aria-hidden />
              <span>
                Check the LASRERA number against the register and the company
                against CAC before approving. Approval lets this person reply
                publicly to every review of {c.agent_name}.
              </span>
            </p>

            {decision ? (
              <p
                className={`mt-2.5 text-2xs font-700 ${
                  decision === "approve" ? "text-score-good" : "text-score-bad"
                }`}
              >
                {decision === "approve" ? "Approved" : "Rejected"}
              </p>
            ) : (
              <div className="mt-2.5 space-y-2">
                <input
                  value={notes[c.claim_id] ?? ""}
                  onChange={(e) =>
                    setNotes((n) => ({ ...n, [c.claim_id]: e.target.value }))
                  }
                  placeholder="Note (required to reject — the claimant is told why)"
                  aria-label={`Decision note for ${c.agent_name}`}
                  className="h-9 w-full rounded-lg bg-muted px-3 text-2xs outline-none placeholder:text-subtle focus:shadow-focus"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => decide(c.claim_id, "approve")}
                    className="inline-flex items-center gap-1.5 rounded-md bg-score-good/10 px-3 py-1.5 text-2xs font-700 text-score-good transition-colors hover:bg-score-good/20"
                  >
                    <Check size={11} /> Approve
                  </button>
                  <button
                    onClick={() => decide(c.claim_id, "reject")}
                    className="inline-flex items-center gap-1.5 rounded-md bg-score-bad/10 px-3 py-1.5 text-2xs font-700 text-score-bad transition-colors hover:bg-score-bad/20"
                  >
                    <X size={11} /> Reject
                  </button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
