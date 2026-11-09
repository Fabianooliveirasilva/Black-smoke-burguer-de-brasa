import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { formatBRL, parseBRL } from "@/lib/money";
import { rateLimit } from "@/lib/rate-limit";
import { safeNext } from "@/lib/safe-next";
import { mapProviderStatus, verifyWebhookSignature } from "@/server/payments/mercadopago";

describe("money", () => {
  it("formats and parses BRL", () => {
    expect(formatBRL(3890)).toBe("R$ 38,90");
    expect(formatBRL(123456)).toBe("R$ 1.234,56");
    expect(parseBRL("38,90")).toBe(3890);
    expect(parseBRL("1.234,5")).toBe(123450);
    expect(parseBRL("abc")).toBeNaN();
  });
});

describe("rateLimit", () => {
  it("blocks after the limit within the window and resets after it", () => {
    const t = 1_000_000;
    expect(rateLimit("k", 2, 1000, t).ok).toBe(true);
    expect(rateLimit("k", 2, 1000, t + 1).ok).toBe(true);
    const blocked = rateLimit("k", 2, 1000, t + 2);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(1);
    expect(rateLimit("k", 2, 1000, t + 1001).ok).toBe(true);
  });
});

describe("safeNext", () => {
  it.each([
    ["/checkout", "/checkout"],
    ["//evil.com", "/conta"],
    ["https://evil.com", "/conta"],
    ["/\\evil.com", "/conta"],
    [null, "/conta"],
  ])("%s -> %s", (input, out) => expect(safeNext(input)).toBe(out));
});

describe("Mercado Pago webhook signature", () => {
  const secret = "whsec_test";
  const now = Date.UTC(2026, 5, 1, 12);
  const ts = String(Math.floor(now / 1000));
  const sign = (id: string, req: string, t = ts) => createHmac("sha256", secret).update(`id:${id};request-id:${req};ts:${t};`).digest("hex");

  it("accepts a valid signature", () => {
    expect(verifyWebhookSignature({ signatureHeader: `ts=${ts},v1=${sign("123", "req-1")}`, requestId: "req-1", dataId: "123", secret, now })).toBe(true);
  });
  it("rejects tampered id, wrong secret, missing headers and stale timestamps", () => {
    const v1 = sign("123", "req-1");
    expect(verifyWebhookSignature({ signatureHeader: `ts=${ts},v1=${v1}`, requestId: "req-1", dataId: "124", secret, now })).toBe(false);
    expect(verifyWebhookSignature({ signatureHeader: `ts=${ts},v1=${v1}`, requestId: "req-1", dataId: "123", secret: "other", now })).toBe(false);
    expect(verifyWebhookSignature({ signatureHeader: null, requestId: "req-1", dataId: "123", secret, now })).toBe(false);
    const old = String(Math.floor(now / 1000) - 3600);
    expect(verifyWebhookSignature({ signatureHeader: `ts=${old},v1=${sign("123", "req-1", old)}`, requestId: "req-1", dataId: "123", secret, now })).toBe(false);
    expect(verifyWebhookSignature({ signatureHeader: `ts=${ts},v1=zz`, requestId: "req-1", dataId: "123", secret, now })).toBe(false);
  });
  it("maps provider statuses", () => {
    expect(mapProviderStatus("approved")).toBe("PAID");
    expect(mapProviderStatus("rejected")).toBe("FAILED");
    expect(mapProviderStatus("charged_back")).toBe("REFUNDED");
    expect(mapProviderStatus("in_process")).toBe("PENDING");
  });
});

describe("pt-BR formatting (BUG-01, BUG-02)", () => {
  it("pluralizes with pt-BR rules", async () => {
    const { plural } = await import("@/lib/format");
    expect(plural(0, "pedido", "pedidos")).toBe("0 pedidos");
    expect(plural(1, "pedido", "pedidos")).toBe("1 pedido");
    expect(plural(2, "pedido", "pedidos")).toBe("2 pedidos");
    expect(plural(1500, "pedido", "pedidos")).toBe("1.500 pedidos");
  });
  it("formats percentages with a decimal comma", async () => {
    const { formatPercent } = await import("@/lib/format");
    expect(formatPercent(0)).toBe("0,0%");
    expect(formatPercent(0.125)).toBe("12,5%");
    expect(formatPercent(1)).toBe("100,0%");
    expect(formatPercent(Number.NaN)).toBe("0,0%");
  });
});

describe("route guard formats (BUG-03)", () => {
  it("only well-formed slugs and tracking tokens reach the database", async () => {
    const { SLUG_RE, TRACKING_TOKEN_RE } = await import("@/server/route-guards");
    expect(SLUG_RE.test("smoke-classic")).toBe(true);
    for (const bad of ["../../etc/passwd", "Smoke", "a--b", "-a", "a b", ""]) expect(SLUG_RE.test(bad)).toBe(false);
    expect(TRACKING_TOKEN_RE.test("a3ksv50RrJqw4SB27ewpFuduLrjHBuip")).toBe(true);
    for (const bad of ["1", "A".repeat(31), "A".repeat(33), "a3ksv50RrJqw4SB27ewpFuduLrjHBu/p"]) expect(TRACKING_TOKEN_RE.test(bad)).toBe(false);
  });
});
