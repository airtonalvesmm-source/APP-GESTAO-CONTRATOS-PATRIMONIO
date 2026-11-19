import { nValS, parseDataBR } from "./dmp-utils";

// Compara cabeçalhos ignorando acentos, caixa e espaços extras
const normCab = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

// Confere quais colunas esperadas existem no arquivo (por cabeçalho ou alias)
export function colunasDetectadas(linhas, colunas) {
  const cab = linhas.length ? Object.keys(linhas[0]).map(c => ({ original: c, norm: normCab(c) })) : [];
  return colunas.map(c => {
    const aceitos = [c.header, ...(c.aliases || [])].map(normCab);
    const achado = cab.find(m => aceitos.includes(m.norm));
    return { header: c.header, obrigatorio: !!c.obrigatorio, encontrado: !!achado, cabecalhoArquivo: achado ? achado.original : "" };
  });
}

function valorDaColuna(row, coluna) {
  const aceitos = [coluna.header, ...(coluna.aliases || [])].map(normCab);
  for (const chave of Object.keys(row)) {
    if (aceitos.includes(normCab(chave)) && String(row[chave]).trim() !== "") return String(row[chave]).trim();
  }
  return "";
}

const numeroBruto = (v) => /^-?[\d.,]+$/.test(String(v).trim()) && !Number.isNaN(nValS(v));

// Converte as linhas do CSV em registros conforme o mapeamento de colunas.
// ignorados: [{ linha, motivo }] — o motivo é exibido na prévia da importação.
export function mapearLinhas(linhas, colunas, preProcess, data) {
  const registros = [];
  const ignorados = [];
  linhas.forEach((row, idx) => {
    const rec = {};
    const motivos = [];
    for (const c of colunas) {
      const val = valorDaColuna(row, c);
      if (val === "") {
        if (c.obrigatorio) motivos.push(`"${c.header}" vazio`);
        rec[c.campo] = c.tipo === "number" ? 0 : "";
        continue;
      }
      if (c.tipo === "number") {
        if (!numeroBruto(val)) motivos.push(`"${c.header}" não é um número válido (${val})`);
        rec[c.campo] = nValS(val);
      } else if (c.tipo === "date") {
        const d = parseDataBR(val);
        if (!d) motivos.push(`"${c.header}" com data inválida (${val})`);
        rec[c.campo] = d;
      } else if (c.tipo === "boolean") rec[c.campo] = /^(sim|true|1|s)$/i.test(val);
      else rec[c.campo] = val;
    }
    if (motivos.length) { ignorados.push({ linha: idx + 2, motivo: motivos.join("; ") }); return; }
    const final = preProcess ? preProcess(rec, data) : rec;
    if (final) registros.push(final);
    else ignorados.push({ linha: idx + 2, motivo: "vínculo não encontrado (registro referenciado não cadastrado)" });
  });
  return { registros, ignorados };
}

// Separa registros novos dos que já existem (mesma chave).
// duplicadosNoArquivo: linhas que repetem a chave de uma linha anterior do próprio arquivo.
export function separarDuplicados(registros, existentes, chave) {
  if (!chave) return { novos: registros, dups: [], repetidos: [] };
  const mapa = new Map();
  (existentes || []).forEach(e => { const k = chave(e); if (k) mapa.set(k, e.id); });
  const novos = [], dups = [], repetidos = [], vistos = new Set();
  registros.forEach((r, i) => {
    const k = chave(r);
    if (vistos.has(k)) { repetidos.push({ linha: i + 2, chave: k }); return; }
    vistos.add(k);
    const id = mapa.get(k);
    if (id) dups.push({ id, rec: r }); else novos.push(r);
  });
  return { novos, dups, repetidos };
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