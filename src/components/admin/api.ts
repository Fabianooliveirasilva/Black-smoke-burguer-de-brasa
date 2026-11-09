"use client";

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: Array<{ path: string; message: string }>) {
    super(message);
  }
}

/** JSON fetch for admin UIs: surfaces the API's standardized error message. */
export async function api<T = unknown>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const details = data?.error?.details;
    throw new ApiError(details?.[0] ? `${details[0].path}: ${details[0].message}` : (data?.error?.message ?? "Erro inesperado."), res.status, details);
  }
  return data as T;
}
