"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PublicConnections } from "@/lib/api/integrations";

const PublicConnectionsContext = createContext<PublicConnections | null>(null);

export function PublicConnectionsProvider({
  value,
  children,
}: {
  value: PublicConnections;
  children: ReactNode;
}) {
  return <PublicConnectionsContext.Provider value={value}>{children}</PublicConnectionsContext.Provider>;
}

export function usePublicConnections(): PublicConnections | null {
  return useContext(PublicConnectionsContext);
}
