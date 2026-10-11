"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { WhatsappLink } from "@/components/providers/WhatsappProvider";
import { browserSessionKey } from "@/lib/activity/client";
import { cn } from "@/lib/utils/cn";

interface AssistLink {
  label: string;
  href: string;
}

interface AssistMessage {
  role: "user" | "assistant";
  text: string;
  links?: AssistLink[];
  handoff?: "none" | "whatsapp" | "contact";
}

/**
 * Floating site assistant. Answers come from the backend, which only sees
 * listings, pre-construction, assignments and this site's own pages.
 */
export function AiAssistant() {
  const titleId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistMessage[]>([]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || pending) return;
    setDraft("");
    setError(null);
    setMessages((current) => [...current, { role: "user", text: question }]);
    setPending(true);
    try {
      const response = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, session_key: browserSessionKey() }),
      });
      const payload = (await response.json()) as {
        answer?: string;
        links?: AssistLink[];
        handoff?: AssistMessage["handoff"];
        error?: string;
      };
      if (!response.ok || !payload.answer) {
        setError(payload.error || "The assistant is unavailable right now.");
        return;
      }
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: payload.answer!,
          links: payload.links ?? [],
          handoff: payload.handoff ?? "none",
        },
      ]);
    } catch {
      setError("The assistant is unavailable right now.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-6 right-4 z-[60] flex flex-col items-end gap-3 sm:right-6">
      {open && (
        <section
          role="dialog"
          aria-labelledby={titleId}
          className="pointer-events-auto flex h-[min(32rem,calc(100dvh-8rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-surface border border-line bg-surface shadow-card"
        >
          <header className="flex items-start justify-between gap-3 border-b border-line bg-navy px-4 py-3 text-white">
            <div>
              <h2 id={titleId} className="text-small font-semibold">
                HomeAtlas assistant
              </h2>
              <p className="mt-0.5 text-caption text-white/80">
                Listings, projects and pages on this site.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-control px-2 py-1 text-caption text-white/80 hover:bg-white/10 hover:text-white"
            >
              Close
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-small text-ink-muted">
                Ask where to find a listing, a pre-construction project, market trends or an assignment.
              </p>
            )}
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  "max-w-[90%] rounded-control px-3 py-2 text-small",
                  message.role === "user"
                    ? "ml-auto bg-navy text-white"
                    : "bg-surface-alt text-ink",
                )}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                {message.links && message.links.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {message.links.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} className="font-medium text-navy underline underline-offset-2">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {message.handoff === "whatsapp" && (
                  <WhatsappLink
                    message="Hi, I was using the HomeAtlas assistant and would like to talk to someone."
                    className="mt-2 inline-block font-medium text-navy underline underline-offset-2"
                  >
                    Continue on WhatsApp
                  </WhatsappLink>
                )}
                {message.handoff === "contact" && (
                  <Link href="/market-trends" className="mt-2 inline-block font-medium text-navy underline underline-offset-2">
                    Contact an agent
                  </Link>
                )}
              </div>
            ))}
            {pending && <p className="text-caption text-ink-muted">Looking that up…</p>}
            {error && (
              <p role="alert" className="text-caption text-negative">
                {error}
              </p>
            )}
          </div>

          <form onSubmit={ask} className="border-t border-line p-3">
            <label htmlFor="assistant-question" className="sr-only">
              Your question
            </label>
            <textarea
              ref={inputRef}
              id="assistant-question"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              maxLength={500}
              placeholder="3 bed condos in Vaughan"
              className="w-full resize-none rounded-control border border-line bg-surface px-3 py-2 text-small text-ink outline-none focus:border-navy"
            />
            <Button type="submit" size="sm" className="mt-2" disabled={pending || !draft.trim()} loading={pending}>
              Ask
            </Button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="pointer-events-auto rounded-full bg-navy px-4 py-3 text-small font-medium text-white shadow-card hover:bg-navy-deep"
      >
        {open ? "Hide assistant" : "Ask HomeAtlas"}
      </button>
    </div>
  );
}
