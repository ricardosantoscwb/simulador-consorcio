import { html, redirect } from "../nucleo/base.mjs";
import { sessaoDe } from "../nucleo/auth.mjs";
import { paginaEntrar } from "../nucleo/paginas.mjs";
export default async (req) => {
  if (await sessaoDe(req)) return redirect("/");
  return html(paginaEntrar());
};
export const config = { path: "/entrar" };
