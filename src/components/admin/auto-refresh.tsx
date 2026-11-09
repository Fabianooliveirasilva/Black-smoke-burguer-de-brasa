"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-renders server data periodically so new orders appear without reload. */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => !document.hidden && router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
