"use client";

import { createContext, useContext, type ReactNode } from "react";
import { WHATSAPP_NUMBER, whatsappHref } from "@/lib/constants/contact";

const WhatsappContext = createContext(WHATSAPP_NUMBER);

export function WhatsappProvider({ number, children }: { number: string; children: ReactNode }) {
  const digits = number.replace(/\D/g, "");
  return (
    <WhatsappContext.Provider value={digits.length >= 10 ? digits : WHATSAPP_NUMBER}>
      {children}
    </WhatsappContext.Provider>
  );
}

export function useWhatsappNumber() {
  return useContext(WhatsappContext);
}

export function useWhatsappHref(message?: string) {
  return whatsappHref(message, useWhatsappNumber());
}

export function WhatsappLink({
  message,
  className,
  children,
}: {
  message?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={useWhatsappHref(message)} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
