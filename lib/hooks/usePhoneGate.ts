"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

/**
 * Runs an action only for a signed-in user with a verified phone.
 *
 * - signed out  → sign-in dialog, then continues automatically after sign-in
 * - unverified  → phone OTP dialog, then continues once verified
 * - verified    → runs immediately
 *
 * Used by the pre-con Floor plans / Pricing buttons and the listing
 * submission wizard — the backend requires `phone_verified` for both, so
 * checking here only saves the round trip; the server still enforces it.
 */
export function usePhoneGate() {
  const { user, openAuth, verifyPhone } = useAuth();

  // The continuation runs after a sign-in re-render, so it must read the
  // latest user rather than the one captured when the button was clicked.
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const gate = useCallback(
    function run(action: () => void | Promise<void>) {
      const current = userRef.current;
      if (!current) {
        openAuth("login", () => {
          // Defer a tick so userRef has the new user before re-checking.
          setTimeout(() => run(action), 0);
        });
        return;
      }
      if (current.phoneVerified) {
        void action();
        return;
      }
      void verifyPhone().then((verified) => {
        if (verified) void action();
      });
    },
    [openAuth, verifyPhone],
  );

  return {
    gate,
    signedIn: Boolean(user),
    verified: Boolean(user?.phoneVerified),
  };
}
