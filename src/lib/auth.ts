import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { env } from "./env";
import { prisma } from "./prisma";

function createAuth() {
  const e = env();
  return betterAuth({
    appName: "Black Smoke Burger",
    secret: e.BETTER_AUTH_SECRET,
    baseURL: e.BETTER_AUTH_URL,
    trustedOrigins: [e.NEXT_PUBLIC_SITE_URL],
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    telemetry: { enabled: false },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    user: {
      // `input: false` — clients can never set their own role (mass-assignment guard).
      additionalFields: { role: { type: "string", input: false, defaultValue: "customer" } },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 15,
    },
    rateLimit: {
      enabled: e.NODE_ENV !== "test",
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 300, max: 5 },
        "/change-password": { window: 300, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: e.BETTER_AUTH_URL.startsWith("https://"),
      cookiePrefix: "bsb",
      ipAddress: { ipAddressHeaders: e.TRUST_PROXY === "true" ? ["x-forwarded-for"] : [], disableIpTracking: false },
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;
const g = globalThis as unknown as { auth?: Auth };
const instance = () => (g.auth ??= createAuth());
/** Lazy: env is only read on first use (build never needs secrets). Traps cover `in` checks too. */
export const auth: Auth = new Proxy({} as Auth, {
  get: (_t, prop) => Reflect.get(instance(), prop),
  has: (_t, prop) => Reflect.has(instance(), prop),
});
