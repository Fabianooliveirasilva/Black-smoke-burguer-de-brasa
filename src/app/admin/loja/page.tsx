import { requireAdmin } from "@/lib/session";
import { getSettings, listZones } from "@/server/admin";
import { SettingsForm } from "@/components/admin/settings-form";
import { ZoneManager } from "@/components/admin/zone-manager";
import type { OpeningWindow } from "@/server/hours";

export const metadata = { title: "Loja" };

export default async function StorePage() {
  await requireAdmin();
  const [s, zones] = await Promise.all([getSettings(), listZones()]);
  const { id: _id, updatedAt: _u, ...settings } = s;
  return (
    <div className="flex flex-col gap-10">
      <h1 className="display text-6xl">Loja</h1>
      <SettingsForm initial={{ ...settings, openingHours: settings.openingHours as unknown as OpeningWindow[] }} />
      <ZoneManager zones={zones.map((z) => ({ id: z.id, name: z.name, neighborhoods: z.neighborhoods, feeCents: z.feeCents, etaMinutes: z.etaMinutes, active: z.active }))} />
    </div>
  );
}
