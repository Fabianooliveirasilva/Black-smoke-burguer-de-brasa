import "server-only";
import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must have at least 32 chars"),
    BETTER_AUTH_URL: z.string().url(),
    NEXT_PUBLIC_SITE_URL: z.string().url(),
    UPLOAD_DIR: z.string().default("./storage/uploads"),
    /** Only honour X-Forwarded-For when running behind a trusted reverse proxy. */
    TRUST_PROXY: z.enum(["true", "false"]).default("false"),
    MP_ACCESS_TOKEN: z.string().optional(),
    MP_WEBHOOK_SECRET: z.string().optional(),
    MP_API_BASE_URL: z.string().url().default("https://api.mercadopago.com"),
  })
  .refine((e) => !e.MP_ACCESS_TOKEN || !!e.MP_WEBHOOK_SECRET, {
    message: "MP_WEBHOOK_SECRET is required when MP_ACCESS_TOKEN is set",
    path: ["MP_WEBHOOK_SECRET"],
  })
  .refine((e) => e.NODE_ENV !== "production" || !e.BETTER_AUTH_SECRET.startsWith("dev-only"), {
    message: "Refusing to start in production with the development auth secret",
    path: ["BETTER_AUTH_SECRET"],
  });

export type Env = z.infer<typeof schema>;
let cached: Env | undefined;

/** Validated server environment. Lazy so `next build` does not require runtime secrets. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const onlinePaymentsEnabled = () => Boolean(env().MP_ACCESS_TOKEN);
