// Função agendada (Netlify): todo dia ~09:00 UTC busca CDI, Selic e taxa de veículos PF no Banco Central.
// As três séries vão em paralelo, 8 s cada (nucleo/publicos.mjs), para caber no limite de 30 s da função agendada.
import { atualizarPublicos } from "../nucleo/publicos.mjs";
export default async () => {
  const r = await atualizarPublicos();
  console.log("publicos:", r.atualizadoEm, ["cdi", "selic", "taxaVeiculoPF"].map((k) => `${k}=${r[k].erro || "ok"}`).join(" "));
};
export const config = { schedule: "0 9 * * *" };
