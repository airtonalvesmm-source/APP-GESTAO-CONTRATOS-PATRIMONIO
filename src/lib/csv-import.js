import { nValS, parseDataBR } from "./dmp-utils";

// Converte as linhas do CSV em registros conforme o mapeamento de colunas
export function mapearLinhas(linhas, colunas, preProcess, data) {
  const registros = [];
  const ignorados = [];
  linhas.forEach((row, idx) => {
    const rec = {};
    let valido = true;
    for (const c of colunas) {
      let val = "";
      for (const h of [c.header, ...(c.aliases || [])]) {
        if (row[h] != null && String(row[h]).trim() !== "") { val = row[h]; break; }
      }
      if (val === "") {
        if (c.obrigatorio) valido = false;
        rec[c.campo] = c.tipo === "number" ? 0 : "";
        continue;
      }
      const v = String(val).trim();
      if (c.tipo === "number") rec[c.campo] = nValS(v);
      else if (c.tipo === "date") {
        const d = parseDataBR(v);
        if (!d) valido = false;
        rec[c.campo] = d;
      } else if (c.tipo === "boolean") rec[c.campo] = /^(sim|true|1|s)$/i.test(v);
      else rec[c.campo] = v;
    }
    const final = valido ? (preProcess ? preProcess(rec, data) : rec) : null;
    if (final) registros.push(final);
    else ignorados.push(idx + 2);
  });
  return { registros, ignorados };
}

// Separa registros novos dos que já existem (mesma chave)
export function separarDuplicados(registros, existentes, chave) {
  if (!chave || !existentes) return { novos: registros, dups: [] };
  const mapa = new Map();
  existentes.forEach(e => { const k = chave(e); if (k) mapa.set(k, e.id); });
  const novos = [], dups = [];
  registros.forEach(r => {
    const id = mapa.get(chave(r));
    if (id) dups.push({ id, rec: r }); else novos.push(r);
  });
  return { novos, dups };
}

// Na atualização, não apaga campos existentes com valores vazios do CSV
export function semVazios(rec) {
  const out = {};
  Object.entries(rec).forEach(([k, v]) => {
    if (k.startsWith("_") || v === "" || v == null || (Array.isArray(v) && !v.length)) return;
    out[k] = v;
  });
  return out;
}