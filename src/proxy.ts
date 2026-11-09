import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { productSlugExists, trackingTokenExists } from "@/server/route-guards";

/**
 * 1. Optimistic gate: redirects anonymous visitors away from /admin and /conta without a DB hit.
 *    Real authorization happens in the Data Access Layer (requireAdmin / route({ auth })).
 * 2. Real 404s: product and tracking pages stream inside <Suspense>, so their own notFound()
 *    can only answer 200 + noindex. Checking existence here, before streaming, returns 404.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/conta")) {
    if (!getSessionCookie(req, { cookiePrefix: "bsb" })) {
      const url = req.nextUrl.clone();
      url.pathname = "/entrar";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const [, section, param] = pathname.split("/");
  try {
    const value = decodeURIComponent(param ?? "");
    const exists = section === "cardapio" ? await productSlugExists(value) : await trackingTokenExists(value);
    if (!exists) return NextResponse.rewrite(new URL("/_not-found", req.url), { status: 404 });
  } catch (err) {
    // Fail open: the page still renders its own not-found (200 + noindex) if the DB is unreachable.
    console.error("[proxy] existence check failed", err);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/conta/:path*", "/cardapio/:slug", "/pedido/:token"] };
