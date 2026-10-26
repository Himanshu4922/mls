import type { Metadata } from "next";
import { AccountSettings } from "@/components/account/AccountSettings";

export const metadata: Metadata = {
  title: "Account settings",
  description: "Manage your HomeAtlas profile and notification preferences.",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <div className="container-page py-10">
      <h1 className="text-h1 text-ink">Account settings</h1>
      <p className="mt-1 text-small text-ink-muted">
        Profile details and how you hear about homes you watch.
      </p>
      <div className="mt-8">
        <AccountSettings />
      </div>
    </div>
  );
}
