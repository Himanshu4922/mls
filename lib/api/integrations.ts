import { cache } from "react";
import { apiFetch } from "@/lib/api/client";

export interface ConnectionField {
  key: string;
  label: string;
  hint: string;
  group: string;
  secret: boolean;
  value: string;
  status: "console" | "server" | "empty";
}

export interface ConnectionDocument {
  groups: string[];
  fields: ConnectionField[];
}

export interface PublicConnections {
  whatsappNumber: string;
  siteUrl: string;
  googleClientId: string;
  facebookAppId: string;
  facebookGraphVersion: string;
  gaMeasurementId: string;
  metaPixelId: string;
  googleAdsId: string;
}

const EMPTY_PUBLIC: PublicConnections = {
  whatsappNumber: "",
  siteUrl: "",
  googleClientId: "",
  facebookAppId: "",
  facebookGraphVersion: "",
  gaMeasurementId: "",
  metaPixelId: "",
  googleAdsId: "",
};

export function getStudioConnections(token: string) {
  return apiFetch<ConnectionDocument>("/api/home/studio/integrations/", { token });
}

export function saveStudioConnections(token: string, values: Record<string, string>, clear: string[] = []) {
  return apiFetch<ConnectionDocument>("/api/home/studio/integrations/", {
    token,
    method: "PUT",
    body: { values, clear },
  });
}

export const getPublicConnections = cache(async (): Promise<PublicConnections> => {
  try {
    const data = await apiFetch<Partial<PublicConnections>>("/api/home/integrations/public/", {
      revalidate: 60,
      timeoutMs: 2000,
    });
    const next = { ...EMPTY_PUBLIC };
    for (const key of Object.keys(EMPTY_PUBLIC) as (keyof PublicConnections)[]) {
      const value = data[key];
      if (typeof value === "string") next[key] = value.trim();
    }
    return next;
  } catch {
    return EMPTY_PUBLIC;
  }
});
