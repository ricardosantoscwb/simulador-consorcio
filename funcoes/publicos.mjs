// Dados públicos de referência (CDI, Selic, taxa média de veículos PF do Banco Central). Só leitura, só com sessão.
import { json } from "../nucleo/base.mjs";
import { sessaoDe } from "../nucleo/auth.mjs";
import { lerPublicos } from "../nucleo/publicos.mjs";
export default async (req) => {
  const s = await sessaoDe(req);
  if (!s) return json({ ok: false }, 401);
  if (req.method !== "GET") return json({ ok: false }, 405);
  return json(await lerPublicos());
};
export const config = { path: "/api/publicos" };
