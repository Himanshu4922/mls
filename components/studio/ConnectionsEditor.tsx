"use client";

import { useMemo, useState } from "react";
import { Field, Input, PasswordInput, Select, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/utils/cn";
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

const FLAGS = new Set(["debug", "emailUseTls", "celeryTaskAlwaysEager", "celeryTaskEagerPropagates"]);

const STATUS = {
  console: "Saved here",
  server: "On the server",
  default: "Default",
  empty: "Not set",
} as const;

type Block = { title: string; keys: string[] };

const LAYOUT: Record<string, { note: string; blocks: Block[] }> = {
  Website: {
    note: "Addresses the public site calls, and the analytics IDs that load after a visitor accepts cookies.",
    blocks: [
      { title: "Addresses", keys: ["apiBaseUrl", "siteUrl", "whatsappNumber"] },
      { title: "Analytics", keys: ["gaMeasurementId", "metaPixelId", "googleAdsId"] },
    ],
  },
  "Sign-in": {
    note: "Google and Facebook credentials for the sign-in buttons. Leave Facebook blank to hide that button.",
    blocks: [
      { title: "Google", keys: ["googleClientId", "googleClientSecret"] },
      { title: "Facebook", keys: ["facebookAppId", "facebookAppSecret", "facebookGraphVersion", "facebookRedirectUri", "facebookAllowedRedirectUris"] },
    ],
  },
  Email: {
    note: "SendGrid sends verification mail, alerts, and lead notices. SMTP is only used if the sender is not SendGrid.",
    blocks: [
      { title: "SendGrid", keys: ["emailBackend", "sendgridApiKey", "sendgridBaseUrl", "sendgridTimeoutSeconds", "defaultFromEmail"] },
      { title: "SMTP", keys: ["emailHost", "emailPort", "emailHostUser", "emailHostPassword", "emailUseTls"] },
      { title: "Who receives mail", keys: ["realtorInboxEmail", "frontendUrl", "newsletterSiteUrl", "emailVerificationExpiryHours"] },
    ],
  },
  CRM: {
    note: "GoHighLevel account the site writes new contacts into.",
    blocks: [{ title: "Account", keys: ["ghlApiKey", "ghlLocationId", "ghlUserId"] }],
  },
  "Phone verification": {
    note: "Twilio Verify. Codes are sent only when the account, token, and service are all set.",
    blocks: [{ title: "Twilio", keys: ["twilioAccountSid", "twilioAuthToken", "twilioVerifyServiceSid", "twilioPhoneNumber"] }],
  },
  AI: {
    note: "OpenAI key and the models used by search, listing summaries, and the assistant.",
    blocks: [
      { title: "Access", keys: ["openaiApiKey", "openaiBaseUrl"] },
      { title: "Models", keys: ["openaiSearchModel", "openaiSummaryModel", "openaiEmbeddingModel", "openaiEmbeddingDimensions"] },
      { title: "Limits", keys: ["aiAssistAnonRate", "aiAssistUserRate", "aiSearchAnonRate", "aiSearchUserRate"] },
    ],
  },
  Photos: {
    note: "Cloudinary account for uploaded photos and files, plus the size limits.",
    blocks: [
      { title: "Cloudinary", keys: ["cloudinaryCloudName", "cloudinaryApiKey", "cloudinaryApiSecret", "cloudinaryUrl", "estateCloudinaryPickerPrefix"] },
      { title: "Limits", keys: ["estateImageMaxUploadMb", "preconAssetMaxUploadMb", "estateDocumentAllowedHosts", "estateDocumentAccessMaxAge", "estateDocumentMaxBytes"] },
    ],
  },
  Listings: {
    note: "CREA DDF credentials. Used when the listing feed is synced.",
    blocks: [{ title: "Feed", keys: ["ddfClientId", "ddfClientSecret"] }],
  },
  "Market trends": {
    note: "AMPRE sold-price feed. Market trend charts read sold prices with this token.",
    blocks: [{ title: "Sold data", keys: ["ampreBaseUrl", "ampreBearerToken"] }],
  },
  "Browser alerts": {
    note: "VAPID key pair for browser push. The contact must be a mailto address.",
    blocks: [{ title: "Push", keys: ["webPushPublicKey", "webPushPrivateKey", "webPushSubject"] }],
  },
  Server: {
    note: "A new database, cache, or job broker is picked up the next time the server starts.",
    blocks: [
      { title: "Process", keys: ["secretKey", "debug", "databaseUrl", "publicBackendUrl", "localNetworkIp", "cacheUrl"] },
      { title: "Background jobs", keys: ["celeryBrokerUrl", "celeryResultBackend", "celeryTaskAlwaysEager", "celeryTaskEagerPropagates", "celeryTimezone"] },
    ],
  },
  Advanced: {
    note: "Cache times, scheduled jobs, and recommendation weights. Most of these apply after a restart.",
    blocks: [
      { title: "Cache", keys: ["djangoCacheKeyPrefix", "djangoCacheTimeout", "featuredCacheTtlSeconds", "listingCacheTtlSeconds", "mapViewCacheTtlSeconds", "nearestSchoolCacheTtlSeconds", "recommendationCacheTtlSeconds"] },
      { title: "Schedules", keys: ["dailyNewsletterBeatEnabled", "dailyNewsletterHourUtc", "dailyNewsletterMinuteUtc", "homepageBeatEnabled", "savedSearchAlertsBeatEnabled", "savedSearchAlertsHourUtc", "savedSearchAlertsMinuteUtc", "soldTrendsWarmBeatEnabled"] },
      { title: "Recommendations", keys: ["maxSavedSearchesPerUser", "newsletterMaxPerSection", "recEnableCollab", "recEnablePersonal", "recWeightCollab", "recWeightContent", "recWeightFreshness", "recWeightPersonal"] },
      { title: "Map and deploy checks", keys: ["mapGeocoderUserAgent", "smokeBaseUrl", "smokeTestEmail", "smokeTestPassword", "smokeTimeoutSeconds"] },
    ],
  },
};

export function ConnectionsEditor({ initial }: { initial: ConnectionDocument }) {
  const [doc, setDoc] = useState(initial);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.fields.map((field) => [field.key, field.value])),
  );
  const [active, setActive] = useState(initial.groups[0] ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const byGroup = useMemo(() => {
    const map = new Map<string, ConnectionField[]>();
    for (const group of doc.groups) map.set(group, []);
    for (const field of doc.fields) {
      const list = map.get(field.group) ?? [];
      list.push(field);
      map.set(field.group, list);
    }
    return map;
  }, [doc]);

  const group = doc.groups.includes(active) ? active : doc.groups[0] ?? "";
  const fields = byGroup.get(group) ?? [];
  const blocks = blocksFor(group, fields);

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
      setMessage(clear.length ? "Removed." : "Saved.");
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="overflow-hidden rounded-surface border border-line bg-surface shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        void persist(draft);
      }}
    >
      <div className="overflow-x-auto border-b border-line">
        <div role="tablist" aria-label="Connection groups" className="flex min-w-max">
          {doc.groups.map((name) => {
            const selected = name === group;
            const missing = (byGroup.get(name) ?? []).filter((field) => field.status === "empty").length;
            return (
              <button
                key={name}
                type="button"
                role="tab"
                id={`connection-tab-${slug(name)}`}
                aria-selected={selected}
                aria-controls={`connection-panel-${slug(name)}`}
                className={cn(
                  "border-b-2 px-3.5 py-2.5 text-small whitespace-nowrap",
                  selected ? "border-navy font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink",
                )}
                onClick={() => {
                  setActive(name);
                  setMessage("");
                  setError("");
                }}
              >
                {name}
                {missing > 0 ? <span className="ml-1.5 text-caption text-ink-subtle">{missing}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`connection-panel-${slug(group)}`}
        aria-labelledby={`connection-tab-${slug(group)}`}
        className="space-y-6 p-4 sm:p-5"
      >
        {LAYOUT[group]?.note ? <p className="max-w-3xl text-small text-ink-muted">{LAYOUT[group].note}</p> : null}

        {blocks.map((block) => (
          <section key={block.title || "fields"}>
            {block.title ? <h2 className="text-caption font-medium text-ink-muted">{block.title}</h2> : null}
            <div className={cn("grid gap-4 md:grid-cols-2", block.title && "mt-3")}>
              {block.fields.map((field) => (
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
        ))}

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <button
            type="submit"
            disabled={saving}
            className="h-9 rounded-control bg-navy px-3.5 text-small font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {error ? (
            <p role="alert" className="text-small text-negative">
              {error}
            </p>
          ) : null}
          {message ? <p className="text-small text-ink-muted">{message}</p> : null}
        </div>
      </div>
    </form>
  );
}

function blocksFor(group: string, fields: ConnectionField[]) {
  const layout = LAYOUT[group];
  if (!layout) return [{ title: "", fields }];
  const used = new Set<string>();
  const blocks = layout.blocks
    .map((block) => {
      const matched = block.keys
        .map((key) => fields.find((field) => field.key === key))
        .filter((field): field is ConnectionField => Boolean(field));
      matched.forEach((field) => used.add(field.key));
      return { title: block.title, fields: matched };
    })
    .filter((block) => block.fields.length > 0);
  const rest = fields.filter((field) => !used.has(field.key));
  if (rest.length) blocks.push({ title: blocks.length ? "Other" : "", fields: rest });
  if (blocks.length === 0) return [{ title: "", fields }];
  return blocks;
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
  const wide = LONG.has(field.key) || value.length > 80;
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <Field label={field.label} htmlFor={id} hint={field.hint || undefined}>
        {FLAGS.has(field.key) ? (
          <Select id={id} value={value === "False" ? "False" : value === "True" ? "True" : value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
            {value !== "True" && value !== "False" && value !== "" ? <option value={value}>{value}</option> : null}
            <option value="">Not set</option>
            <option value="True">True</option>
            <option value="False">False</option>
          </Select>
        ) : wide ? (
          <Textarea
            id={id}
            value={value}
            rows={field.secret ? 2 : 3}
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            placeholder="Not set"
            className="min-h-16 font-mono text-caption"
            onChange={(event) => onChange(event.target.value)}
          />
        ) : field.secret ? (
          <PasswordInput id={id} value={value} disabled={disabled} autoComplete="off" placeholder="Not set" onChange={(event) => onChange(event.target.value)} />
        ) : (
          <Input id={id} type="text" value={value} disabled={disabled} autoComplete="off" spellCheck={false} placeholder="Not set" onChange={(event) => onChange(event.target.value)} />
        )}
      </Field>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-caption text-ink-subtle">{field.env}</span>
        <span className="text-caption text-ink-muted">{STATUS[field.status]}</span>
        {field.status === "console" ? (
          <button type="button" className="text-caption font-medium text-navy hover:underline" onClick={onClear} disabled={disabled}>
            Remove saved value
          </button>
        ) : null}
      </div>
    </div>
  );
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
