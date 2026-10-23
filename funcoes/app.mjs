// A página do simulador só sai com sessão válida. O HTML fica em nucleo/ (não publicado).
import { html, redirect, jsonParaScript } from "../nucleo/base.mjs";
import { sessaoDe } from "../nucleo/auth.mjs";
import { APP } from "../nucleo/app-html.mjs";
export default async (req) => {
  const s = await sessaoDe(req);
  if (!s) return redirect("/entrar");
  const corpo = APP.replace("<!--SESSAO-->", `<script>window.SESSAO=${jsonParaScript({ email: s.email, admin: s.admin })}</script>`);
  return html(corpo);
};
export const config = { path: "/" };
