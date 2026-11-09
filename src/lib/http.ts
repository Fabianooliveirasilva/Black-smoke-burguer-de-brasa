import "server-only";
import { connection, NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { PricingError } from "@/server/pricing";
import { env } from "./env";
import { rateLimit } from "./rate-limit";
import { getUserFromHeaders, type SessionUser } from "./session";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what = "Recurso") => new HttpError(404, "NOT_FOUND", `${what} não encontrado.`);

export function errorResponse(status: number, code: string, message: string, details?: unknown, init?: ResponseInit) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status, ...init });
}

export function clientIp(req: NextRequest): string {
  if (env().TRUST_PROXY === "true") {
    const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (fwd) return fwd;
  }
  // Without a trusted proxy the client IP is unknown; limits then apply per endpoint globally.
  return "unknown";
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** CSRF defence for cookie-authenticated endpoints: reject cross-site browser requests. */
function assertSameOrigin(req: NextRequest) {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") throw new HttpError(403, "CSRF", "Origem não permitida.");
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(env().NEXT_PUBLIC_SITE_URL).origin && origin !== req.nextUrl.origin) {
    throw new HttpError(403, "CSRF", "Origem não permitida.");
  }
}

interface Options {
  auth?: "user" | "admin";
  rateLimit?: { name: string; limit: number; windowMs: number };
  /** Disable only for server-to-server endpoints such as webhooks. */
  csrf?: boolean;
}

interface Ctx<P> {
  req: NextRequest;
  params: P;
  user: SessionUser | null;
  ip: string;
}

type Handler<P, U> = (ctx: Ctx<P> & { user: U }) => Promise<Response | object | null>;

export function route<P = Record<string, never>>(
  opts: Options & { auth: "user" | "admin" },
  fn: Handler<P, SessionUser>,
): (req: NextRequest, ctx: { params: Promise<P> }) => Promise<Response>;
export function route<P = Record<string, never>>(
  opts: Options,
  fn: Handler<P, SessionUser | null>,
): (req: NextRequest, ctx: { params: Promise<P> }) => Promise<Response>;
export function route<P>(opts: Options, fn: Handler<P, SessionUser>) {
  return async (req: NextRequest, ctx: { params: Promise<P> }) => {
    // API responses are always request-time: never prerendered at build.
    await connection();
    try {
      if (MUTATING.has(req.method) && opts.csrf !== false) assertSameOrigin(req);
      const ip = clientIp(req);
      if (opts.rateLimit) {
        const r = rateLimit(`${opts.rateLimit.name}:${ip}`, opts.rateLimit.limit, opts.rateLimit.windowMs);
        if (!r.ok) {
          return errorResponse(429, "RATE_LIMITED", "Muitas tentativas. Aguarde um instante.", undefined, {
            headers: { "Retry-After": String(r.retryAfterSec) },
          });
        }
      }
      let user: SessionUser | null = null;
      if (opts.auth) {
        user = await getUserFromHeaders(req.headers);
        if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Faça login para continuar.");
        if (opts.auth === "admin" && user.role !== "admin") throw new HttpError(403, "FORBIDDEN", "Acesso negado.");
      }
      // `user` is non-null whenever opts.auth is set (enforced above); public handlers accept null.
      const result = await fn({ req, params: await ctx.params, user: user as SessionUser, ip });
      if (result instanceof Response) return result;
      if (result === null) return new NextResponse(null, { status: 204 });
      return NextResponse.json(result);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

export function toErrorResponse(err: unknown) {
  if (err instanceof HttpError) return errorResponse(err.status, err.code, err.message, err.details);
  if (err instanceof ZodError) {
    return errorResponse(422, "VALIDATION_ERROR", "Dados inválidos.", err.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  }
  if (err instanceof PricingError) return errorResponse(422, err.code, err.message);
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return errorResponse(409, "CONFLICT", "Já existe um registro com esses dados.");
    if (err.code === "P2025") return errorResponse(404, "NOT_FOUND", "Recurso não encontrado.");
    if (err.code === "P2003") return errorResponse(409, "IN_USE", "Registro em uso por outros dados.");
  }
  console.error("[api] unhandled error", err);
  return errorResponse(500, "INTERNAL_ERROR", "Erro interno. Tente novamente.");
}

export async function readJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 100_000) throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Requisição muito grande.");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "INVALID_JSON", "Corpo da requisição inválido.");
  }
  return schema.parse(body);
}

/**
 * PATCH body: validates with a partial schema, then keeps only keys the client sent.
 * Needed because Zod 4 applies `.default()` even inside `.partial()`, which would
 * otherwise silently reset omitted fields.
 */
export async function readPatch<T extends object>(req: NextRequest, schema: ZodType<T>): Promise<Partial<T>> {
  const raw = await req.clone().json().catch(() => null);
  const parsed = await readJson(req, schema);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new HttpError(400, "INVALID_JSON", "Corpo da requisição inválido.");
  const sent = new Set(Object.keys(raw));
  if (sent.size === 0) throw new HttpError(422, "VALIDATION_ERROR", "Nada para atualizar.");
  return Object.fromEntries(Object.entries(parsed).filter(([k]) => sent.has(k))) as Partial<T>;
}

export function readQuery<T>(req: NextRequest, schema: ZodType<T>): T {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams));
}
