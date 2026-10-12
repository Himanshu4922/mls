"use client";

import { useState } from "react";
import { Field, Input, Textarea } from "@/components/ui/Field";
import type { ConnectionDocument, ConnectionField } from "@/lib/api/integrations";

const LONG = new Set([
  "ampreBearerToken",
  "webPushPrivateKey",
  "cacheUrl",
  "facebookAllowedRedirectUris",
  "secretKey",
  "databaseUrl",
  "cloudinaryUrl",
  "sendgridApiKey",
  "celeryBrokerUrl",
  "celeryResultBackend",
]);

const STATUS = {
  console: "Saved in this console",
  server: "Already set on the server",
  default: "Built-in default",
  empty: "Not set yet",
} as const;

export function ConnectionsEditor({ initial }: { initial: ConnectionDocument }) {
  const [doc, setDoc] = useState(initial);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.fields.map((field) => [field.key, field.value])),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function persist(values: Record<string, string>, clear: string[] = []) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/studio/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values, clear }),
      });
      const body = (await response.json()) as ConnectionDocument & { error?: string };
      if (!response.ok) {
        setError(body.error || "Could not save.");
        return;
      }
      setDoc(body);
      setDraft(Object.fromEntries(body.fields.map((field) => [field.key, field.value])));
      setMessage(clear.length ? "Removed." : "Saved. The site is using these values.");
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault();
        void persist(draft);
      }}
    >
      {doc.groups.map((group) => {
        const fields = doc.fields.filter((field) => field.group === group);
        return (
          <section key={group} className="rounded-surface border border-line bg-surface p-5 sm:p-6">
            <h2 className="text-h3 text-ink">{group}</h2>
            <div className="mt-5 grid gap-5">
              {fields.map((field) => (
                <ConnectionControl
                  key={field.key}
                  field={field}
                  value={draft[field.key] ?? ""}
                  disabled={saving}
                  onChange={(value) => setDraft((current) => ({ ...current, [field.key]: value }))}
                  onClear={() => void persist({}, [field.key])}
                />
              ))}
            </div>
          </section>
        );
      })}

      {error ? (
        <p role="alert" className="text-small text-negative">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-small text-ink-muted">{message}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="rounded-control bg-navy px-5 py-3 text-small font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save connections"}
      </button>
    </form>
  );
}

function ConnectionControl({
  field,
  value,
  disabled,
  onChange,
  onClear,
}: {
  field: ConnectionField;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  const id = `connection-${field.key}`;
  const status = STATUS[field.status];
  return (
    <Field label={field.label} htmlFor={id} hint={[field.env, field.hint, status].filter(Boolean).join(" · ")}>
      {LONG.has(field.key) || value.length > 80 ? (
        <Textarea
          id={id}
          value={value}
          rows={3}
          disabled={disabled}
          autoComplete="off"
          placeholder="Not set"
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          autoComplete="off"
          placeholder="Not set"
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {field.status === "console" ? (
        <button type="button" className="mt-2 text-caption font-medium text-navy hover:underline" onClick={onClear} disabled={disabled}>
          Remove saved value
        </button>
      ) : null}
    </Field>
  );
}
