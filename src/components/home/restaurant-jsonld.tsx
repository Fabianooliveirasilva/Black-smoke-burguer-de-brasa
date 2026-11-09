import { connection } from "next/server";
import { getStore } from "@/server/store";
import { siteUrl } from "@/lib/site";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function RestaurantJsonLd() {
  await connection();
  const { settings } = await getStore();
  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: settings.name,
    url: siteUrl(),
    image: `${siteUrl()}/images/brand/hero-smash.jpg`,
    servesCuisine: ["Hambúrguer", "Americana"],
    priceRange: "$$",
    telephone: settings.phone,
    menu: `${siteUrl()}/cardapio`,
    acceptsReservations: false,
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.street,
      addressLocality: settings.city,
      addressRegion: settings.state,
      postalCode: settings.cep,
      addressCountry: "BR",
    },
    geo: { "@type": "GeoCoordinates", latitude: settings.latitude, longitude: settings.longitude },
    openingHoursSpecification: settings.openingHours.map((w) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${DAYS[w.day]}`,
      opens: w.open,
      closes: w.close,
    })),
  };
  // JSON.stringify output is escaped for "<" to prevent breaking out of the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
