import { NextResponse } from "next/server";
import { route } from "@/lib/http";
import { handlePaymentWebhook } from "@/server/payments/mercadopago";

// Server-to-server: no CSRF origin check; authenticity comes from the HMAC signature.
export const POST = route({ csrf: false, rateLimit: { name: "mp-webhook", limit: 300, windowMs: 60_000 } }, async ({ req }) => {
  const url = req.nextUrl;
  let body: { type?: string; data?: { id?: string | number } } = {};
  try {
    body = await req.json();
  } catch {
    /* MP may send query-only notifications */
  }
  const outcome = await handlePaymentWebhook({
    type: url.searchParams.get("type") ?? body.type ?? null,
    dataId: url.searchParams.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null),
    signatureHeader: req.headers.get("x-signature"),
    requestId: req.headers.get("x-request-id"),
  });
  if (outcome === "invalid_signature") return NextResponse.json({ error: { code: "INVALID_SIGNATURE", message: "Assinatura inválida." } }, { status: 401 });
  return NextResponse.json({ received: true, outcome });
});
