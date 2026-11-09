"use client";
import { useMounted } from "@/hooks/use-mounted";

/**
 * Disables every control inside until React has hydrated (BUG-06).
 *
 * Forms with pre-filled values (react-hook-form `defaultValues`) are editable in the server HTML.
 * Text typed before hydration was merged with the default on Chromium ("Nome AntigoNome Novo") and
 * would be saved that way. Empty forms (login, sign-up) are unaffected; checkout renders after mount.
 * `display: contents` keeps the parent's grid/flex layout untouched.
 */
export function HydrationGate({ children }: { children: React.ReactNode }) {
  const mounted = useMounted();
  return (
    <fieldset disabled={!mounted} data-hydrated={mounted} className="contents">
      {children}
    </fieldset>
  );
}
