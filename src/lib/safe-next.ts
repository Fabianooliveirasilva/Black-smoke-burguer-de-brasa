/** Only allow same-site relative redirects (prevents open redirect via ?next=). */
export function safeNext(next: string | null | undefined, fallback = "/conta") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || /[\r\n\t]/.test(next)) return fallback;
  return next;
}
