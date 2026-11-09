/**
 * Minimal Mercado Pago API double for E2E/API tests (never used in production).
 * Control endpoint: POST /__control/payments/:id { status } changes a payment's state.
 */
import http from "node:http";

export const MP_MOCK_PORT = 3199;
interface Pay { id: number; status: string; external_reference: string; transaction_amount: number }

export function startMpMock() {
  const payments = new Map<number, Pay>();
  let seq = 5_000_000;
  const server = http.createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const send = (code: number, data: unknown) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    };
    const url = req.url ?? "";
    if (req.method === "POST" && url === "/v1/payments") {
      const p = { id: ++seq, status: "pending", external_reference: body.external_reference, transaction_amount: body.transaction_amount };
      payments.set(p.id, p);
      return send(201, { ...p, point_of_interaction: { transaction_data: { qr_code: `00020126PIX-MOCK-${p.id}`, qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/epv2gAAAABJRU5ErkJggg==" } } });
    }
    if (req.method === "POST" && url === "/checkout/preferences") return send(201, { id: `pref-${++seq}`, init_point: "http://localhost:3199/checkout", sandbox_init_point: "http://localhost:3199/checkout" });
    let m = url.match(/^\/v1\/payments\/(\d+)$/);
    if (req.method === "GET" && m) {
      const p = payments.get(Number(m[1]));
      return p ? send(200, p) : send(404, { message: "not found" });
    }
    if (req.method === "POST" && /^\/v1\/payments\/\d+\/refunds$/.test(url)) return send(201, { id: ++seq });
    m = url.match(/^\/__control\/payments\/(\d+)$/);
    if (req.method === "POST" && m) {
      const p = payments.get(Number(m[1]));
      if (!p) return send(404, {});
      Object.assign(p, body);
      return send(200, p);
    }
    if (req.method === "GET" && url === "/__control/payments") return send(200, [...payments.values()]);
    send(404, { message: "unknown route" });
  });
  server.listen(MP_MOCK_PORT);
  return server;
}
