import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Existence checks run by the Proxy BEFORE a page starts streaming, so unknown products and
 * tracking tokens get a real HTTP 404. A notFound() inside <Suspense> can only produce a
 * "soft 404" (status 200 + noindex) because the headers were already sent.
 * See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md#status-codes
 */

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const TRACKING_TOKEN_RE = /^[A-Za-z0-9_-]{32}$/; // randomBytes(24).toString("base64url")

const SLUG_TTL_MS = 60_000;
let known: { slugs: Set<string>; at: number } | null = null;

/**
 * Menu pages prefetch every product link, so known slugs are served from a short in-memory
 * snapshot. A miss always checks the database (a product created a second ago must not 404).
 * A product deleted within the TTL still reaches the page, which renders not-found + noindex.
 */
export async function productSlugExists(slug: string, now = Date.now()): Promise<boolean> {
  if (!SLUG_RE.test(slug) || slug.length > 120) return false;
  const where = { deletedAt: null, category: { active: true } } as const;
  if (!known || now - known.at > SLUG_TTL_MS) {
    const rows = await prisma.product.findMany({ where, select: { slug: true } });
    known = { slugs: new Set(rows.map((r) => r.slug)), at: now };
  }
  if (known.slugs.has(slug)) return true;
  const row = await prisma.product.findFirst({ where: { ...where, slug }, select: { id: true } });
  if (row) known.slugs.add(slug);
  return row !== null;
}

/** Tracking tokens are private and unguessable: always checked, never cached. */
export async function trackingTokenExists(token: string): Promise<boolean> {
  if (!TRACKING_TOKEN_RE.test(token)) return false;
  return (await prisma.order.findUnique({ where: { trackingToken: token }, select: { id: true } })) !== null;
}

/** Test hook. */
export function resetRouteGuardCache() {
  known = null;
}
