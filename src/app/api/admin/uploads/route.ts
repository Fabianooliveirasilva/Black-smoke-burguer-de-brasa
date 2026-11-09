import { HttpError, route } from "@/lib/http";
import { MAX_UPLOAD_BYTES, saveProductImage } from "@/server/uploads";

export const POST = route({ auth: "admin", rateLimit: { name: "upload", limit: 30, windowMs: 60_000 } }, async ({ req }) => {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64_000) {
    throw new HttpError(413, "FILE_TOO_LARGE", "Envie uma imagem de até 5 MB.");
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "NO_FILE", "Nenhum arquivo enviado.");
  return Response.json({ url: await saveProductImage(file) }, { status: 201 });
});
