import { readJson, route } from "@/lib/http";
import { settingsSchema } from "@/schemas/catalog";
import { getSettings, updateSettings } from "@/server/admin";

export const GET = route({ auth: "admin" }, async () => getSettings());
export const PUT = route({ auth: "admin" }, async ({ req }) => updateSettings(await readJson(req, settingsSchema)));
