import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export type Role = "customer" | "admin";
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** Data Access Layer: the single place that turns a request into a user. */
export async function getUserFromHeaders(h: Headers): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: h });
  if (!session) return null;
  const u = session.user as typeof session.user & { role?: string };
  return { id: u.id, name: u.name, email: u.email, role: u.role === "admin" ? "admin" : "customer" };
}

export async function currentUser() {
  return getUserFromHeaders(await headers());
}

export async function requireUser(next = "/conta") {
  const user = await currentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin() {
  const user = await currentUser();
  if (!user) redirect("/entrar?next=/admin");
  if (user.role !== "admin") redirect("/");
  return user;
}
