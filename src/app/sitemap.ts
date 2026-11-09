import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getMenu } from "@/server/catalog";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = siteUrl();
  const menu = await getMenu();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/cardapio`, changeFrequency: "daily", priority: 0.9 },
    ...menu.flatMap((c) => c.products.map((p) => ({ url: `${base}/cardapio/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 }))),
  ];
}
