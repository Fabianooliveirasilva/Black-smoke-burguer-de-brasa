"use client";
import { useEffect, type RefObject } from "react";

/**
 * Keeps a controlled text field from losing what the user typed BEFORE hydration.
 *
 * Server-rendered inputs are editable before React hydrates. Safari/WebKit keeps the typed text
 * in the DOM but React does not replay it into state, so the field shows "sem cebola" while state
 * is "" and the note is silently dropped on submit (BUG-05, reproduced 5/5 in WebKit, 0/5 in
 * Chromium). After hydration, adopt the DOM value once if it diverges from state.
 */
export function useAdoptTypedValue(ref: RefObject<HTMLInputElement | HTMLTextAreaElement | null>, value: string, setValue: (v: string) => void) {
  useEffect(() => {
    const typed = ref.current?.value;
    // Syncing from an external system (the pre-hydration DOM) is exactly what effects are for.
    if (typed !== undefined && typed !== value) setValue(typed);
    // Run once, right after hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
