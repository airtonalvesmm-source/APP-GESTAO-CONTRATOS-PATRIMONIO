// Utilidades de formatação e cálculo para o DMP

// Escapa HTML para prevenção de XSS em relatórios gerados via document.write
export const escHtml = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

export const fmtM = (n) => (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtQ = (n) => (Number(n) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
export const fmtData = (d) => { if (!d) return "—"; const p = String(d).split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; };

export const nQtd = (v) => { const n = parseFloat(String(v || "").replace(",", ".")); return isFinite(n) && n > 0 ? n : 0; };

// Interpreta número digitado no padrão brasileiro: "1.500" = 1500; "1.500,00" = 1500; "1,50" = 1,5
function parseNumBR(t) {
  if (t.indexOf(",") > -1) return parseFloat(t.replace(/\./g, "").replace(",", "."));
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return parseFloat(t.replace(/\./g, ""));
  return parseFloat(t);
}
export const nVal = (v) => {
  if (typeof v === "number") return isFinite(v) && v >= 0 ? v : 0;
  const t = String(v == null ? "" : v).trim().replace(/[^\d,.]/g, "");
  if (!t) return 0;
  const n = parseNumBR(t);
  return isFinite(n) && n >= 0 ? n : 0;
};

// Datas: aceita d/m/aaaa, dd/mm/aaaa, d-m-aaaa e aaaa-m-d; devolve aaaa-mm-dd ou "" se inválida
export function parseDataBR(s) {
  const v = String(s || "").trim();
  if (!v) return "";
  let d, m, y;
  const br = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (br) { d = +br[1]; m = +br[2]; y = +br[3]; }
  else if (iso) { y = +iso[1]; m = +iso[2]; d = +iso[3]; }
  else return "";
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return "";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// CNPJ: somente dígitos e validação dos dígitos verificadores
export const soDigitos = (s) => String(s || "").replace(/\D/g, "");
export function cnpjValido(s) {
  const c = soDigitos(s);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const dv = (base) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = pesos.reduce((t, p, i) => t + p * +base[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(c.slice(0, 12)) === +c[12] && dv(c.slice(0, 13)) === +c[13];
}

// Contratos cancelados ou rescindidos não consomem saldo de ata nem entram nos totais
export const SITUACOES_INATIVAS = ["Cancelado", "Rescindido"];
export const contratoAtivo = (c) => !SITUACOES_INATIVAS.includes(c?.situacao);

export const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export const cmpTexto = (a, b) => norm(a).localeCompare(norm(b), "pt-BR");
export const cmpNum = (a, b) => (Number(a) || 0) - (Number(b) || 0);

export const hoje = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };

export function diasAte(d) {
  if (!d) return null;
  const p = String(d).split("-");
  if (p.length !== 3) return null;
  return Math.round((new Date(+p[0], +p[1] - 1, +p[2]) - hoje()) / 86400000);
}

export const anoAtual = new Date().getFullYear();

export function somaDias(d, n) {
  if (!d) return "";
  const p = String(d).split("-");
  if (p.length !== 3) return d;
  const dt = new Date(+p[0], +p[1] - 1, +p[2]);
  dt.setDate(dt.getDate() + (Number(n) || 0));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export const isoData = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;

export const anoDeTexto = (d) => (d && String(d).length >= 4) ? String(d).slice(0, 4) : "";

// Saldos das atas
export function consumido(ataId, itemAtaId, contratos, ignorarContrato) {
  let q = 0;
  contratos.forEach(c => {
    if (c.ataId !== ataId || c.id === ignorarContrato || !contratoAtivo(c)) return;
    (c.itens || []).forEach(i => { if (i.itemAtaId === itemAtaId) q += nQtd(i.qtd); });
  });
  return q;
}

export const saldoItem = (ata, it, contratos, ignorar) => nQtd(it.qtd) - consumido(ata.id, it.id, contratos, ignorar);

export function resumoAta(a, contratos) {
  let reg = 0, cons = 0, sal = 0, esgotados = 0;
  (a.itens || []).forEach(it => {
    const c = consumido(a.id, it.id, contratos), s = nQtd(it.qtd) - c;
    reg += nQtd(it.qtd) * nVal(it.valor);
    cons += c * nVal(it.valor);
    sal += s * nVal(it.valor);
    if (s <= 0) esgotados++;
  });
  return { reg, cons, sal, esgotados, itens: (a.itens || []).length };
}

export function situacaoAta(a) {
  const d = diasAte(a.fim);
  if (d === null) return { classe: "neutro", txt: "Sem vigência informada", dias: null };
  if (d < 0) return { classe: "critico", txt: `Vencida em ${fmtData(a.fim)}`, dias: d };
  if (d <= 90) return { classe: "aviso", txt: `Vence em ${d} dia${d === 1 ? "" : "s"}`, dias: d };
  return { classe: "ok", txt: `Vigente até ${fmtData(a.fim)}`, dias: d };
}

// Ocorrências
export const ocorrenciasDe = (id, ocorrencias) => ocorrencias.filter(o => o.contratoId === id);
export const aditivoValor = (id, ocorrencias) => ocorrenciasDe(id, ocorrencias).filter(o => o.tipo === "Aditivo de valor").reduce((t, o) => t + nValS(o.valor), 0);
export const diasAditivados = (id, ocorrencias) => ocorrenciasDe(id, ocorrencias).filter(o => o.tipo === "Aditivo de prazo").reduce((t, o) => t + (Number(o.dias) || 0), 0);
export const valorItensContrato = (c) => (c.itens || []).reduce((t, i) => t + nQtd(i.qtd) * nVal(i.valor), 0);
export const valorEmpenhado = (c, ocorrencias) => valorItensContrato(c) + aditivoValor(c.id, ocorrencias);
export const fimVigente = (c, ocorrencias) => c.fim ? somaDias(c.fim, diasAditivados(c.id, ocorrencias)) : "";

export const nValS = (v) => {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const t = String(v == null ? "" : v).trim().replace(/[^\d,.-]/g, "");
  if (!t) return 0;
  const neg = t.charAt(0) === "-";
  const n = parseNumBR(t.replace(/-/g, ""));
  return isFinite(n) ? (neg ? -n : n) : 0;
};

// Pagamentos — notas canceladas não contam; "retido" soma só notas com situação Retido
export const pagamentosDe = (id, pagamentos) => pagamentos.filter(p => p.contratoId === id);
export function totaisPagamento(c, pagamentos, ocorrencias) {
  const ps = pagamentosDe(c.id, pagamentos);
  const validas = ps.filter(p => p.situacao !== "Cancelado");
  // Arredonda em centavos: sem isso, somas de ponto flutuante deixam resíduos
  // (ex.: 16.354,919999...) e um contrato quitado aparece "com saldo a pagar R$ 0,00".
  const cent = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const nf = cent(validas.reduce((t, p) => t + nVal(p.valorNF), 0));
  const pago = cent(validas.reduce((t, p) => t + nVal(p.valorPago), 0));
  const retido = cent(validas.filter(p => p.situacao === "Retido").reduce((t, p) => t + Math.max(0, nVal(p.valorNF) - nVal(p.valorPago)), 0));
  const empenhado = cent(valorEmpenhado(c, ocorrencias));
  const aPagar = contratoAtivo(c) ? cent(Math.max(0, empenhado - pago)) : 0;
  return { ps, nf, pago, retido, empenhado, aPagar };
}

// CSV — previne injeção de fórmula em planilhas (Excel, Calc, LibreOffice)
// Valores que começam com =, +, -, @, tab ou CR são prefixados com apóstrofo.
// O dado original no banco não é alterado — apenas o CSV exportado recebe o prefixo.
const PREFIXO_FORMULA = /^[=+\-@\t\r]/;
export const csvLinha = (linhas) => "\uFEFF" + linhas.map(l => l.map(c => {
  let t = String(c == null ? "" : c);
  if (PREFIXO_FORMULA.test(t)) t = "'" + t;
  return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}).join(";")).join("\r\n");

export function baixarCSV(nome, linhas) {
  const conteudo = csvLinha(linhas);
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome;
  document.body.appendChild(a);
  a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Detecta o separador (; , ou tab) contando as ocorrências fora de aspas na primeira linha
function detectarSeparador(texto) {
  let dentroAspas = false, contagem = { ";": 0, ",": 0, "\t": 0 };
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (ch === '"') dentroAspas = !dentroAspas;
    else if (!dentroAspas && (ch === "\n" || ch === "\r")) break;
    else if (!dentroAspas && contagem[ch] != null) contagem[ch]++;
  }
  const melhor = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0];
  return melhor[1] > 0 ? melhor[0] : ";";
}

// Parser de CSV — respeita aspas escapadas ("") e campos multilinha; retorna objetos keyed por cabeçalho
export function parsearCSV(texto) {
  const src = String(texto == null ? "" : texto).replace(/^\uFEFF/, "");
  if (!src.trim()) return [];
  const sep = detectarSeparador(src);
  const linhas = [];
  let campo = "", linha = [], aspas = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (aspas) {
      if (ch === '"') {
        if (src[i + 1] === '"') { campo += '"'; i++; }
        else aspas = false;
      } else campo += ch;
    } else if (ch === '"') {
      aspas = true;
    } else if (ch === sep) {
      linha.push(campo); campo = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      linhas.push(linha); linha = [];
    } else campo += ch;
  }
  if (campo !== "" || linha.length) { linha.push(campo); linhas.push(linha); }
  // Descarta linhas totalmente vazias (comuns no fim do arquivo)
  const uteis = linhas.filter(l => l.some(c => String(c).trim() !== ""));
  if (uteis.length < 2) return [];
  const cab = uteis[0].map(c => String(c).trim());
  return uteis.slice(1).map(l => {
    const obj = {};
    cab.forEach((c, i) => { obj[c] = String(l[i] == null ? "" : l[i]).trim(); });
    return obj;
  });
}

// Ordens de fornecimento — saldo do contrato por item
export const ordensDe = (contratoId, ordens) =>
  (ordens || []).filter(o => o.contratoId === contratoId && o.situacao !== "cancelada");

export const valorOrdem = (o) => (o.itens || []).reduce((t, i) => t + nQtd(i.qtd) * nVal(i.valor), 0);

export function qtdSolicitada(contratoId, benId, ordens, ignorarOrdem) {
  let q = 0;
  ordensDe(contratoId, ordens).forEach(o => {
    if (o.id === ignorarOrdem) return;
    (o.itens || []).forEach(i => { if (i.benId === benId) q += nQtd(i.qtd); });
  });
  return q;
}

// Saldo por item: contratado − solicitado em ordens de fornecimento
export function saldoContrato(c, ordens, ignorarOrdem) {
  const mapa = new Map();
  (c.itens || []).forEach(i => {
    const atual = mapa.get(i.benId) || { benId: i.benId, contratado: 0, valor: nVal(i.valor), marca: "" };
    atual.contratado += nQtd(i.qtd);
    if (!atual.valor) atual.valor = nVal(i.valor);
    if (!atual.marca) atual.marca = i.marca || "";
    mapa.set(i.benId, atual);
  });
  return Array.from(mapa.values()).map(l => {
    const solicitado = qtdSolicitada(c.id, l.benId, ordens, ignorarOrdem);
    return { ...l, solicitado, saldo: Math.max(0, l.contratado - solicitado) };
  });
}

export const termosDe = (contratoId, termos) => (termos || []).filter(t => t.contratoId === contratoId);

// Prazo de entrega em texto (ex.: "30 dias", "15 dias úteis")
export const prazoTexto = (v) => (v == null ? "" : String(v).trim());

// Extrai os dias do prazo textual; 0 quando não há número no texto
export function diasDoPrazo(v) {
  const m = String(v == null ? "" : v).match(/\d+/);
  return m ? Number(m[0]) : 0;
}

// Situação da nota fiscal: retenção tem prioridade; sem retenção, Pago quando o pago iguala a nota
export function situacaoNota(valorNF, valorPago, valorRetido) {
  if (nVal(valorRetido) > 0) return "Retido";
  const nf = nVal(valorNF), pg = nVal(valorPago);
  if (nf > 0 && Math.abs(nf - pg) < 0.005) return "Pago";
  return "Pendente";
}

// Dados de entrega herdados da ata vinculada ao contrato
export function entregaDaAta(c, atas) {
  const a = (atas || []).find(x => x.id === c?.ataId);
  return {
    prazoEntrega: a?.prazoEntrega || "",
    localEntrega: a?.localEntrega || "",
    observacao: a?.observacaoEntrega || ""
  };
}