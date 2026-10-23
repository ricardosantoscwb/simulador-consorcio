import { json, pedidoValido, cookieApaga } from "../nucleo/base.mjs";
import { sair } from "../nucleo/auth.mjs";
export default async (req) => {
  if (!pedidoValido(req)) return json({ ok: false }, 403);
  await sair(req);
  return json({ ok: true }, 200, { "Set-Cookie": cookieApaga() });
};
export const config = { path: "/api/sair" };
