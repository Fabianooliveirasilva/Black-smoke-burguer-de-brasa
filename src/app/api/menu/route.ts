import { connection } from "next/server";
import { route } from "@/lib/http";
import { getMenu } from "@/server/catalog";

export const GET = route({}, async () => {
  await connection();
  const menu = await getMenu();
  return {
    categories: menu.map((c) => ({
      slug: c.slug,
      name: c.name,
      products: c.products.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        priceCents: p.priceCents,
        imageUrl: p.imageUrl,
        isPopular: p.isPopular,
        isAvailable: p.isAvailable,
        allowsDoneness: p.allowsDoneness,
        ingredients: p.ingredients,
        options: p.options,
      })),
    })),
  };
});
