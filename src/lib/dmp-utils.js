// Utilidades de formatação e cálculo para o DMP

export const fmtM = (n) => (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtQ = (n) => (Number(n) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
export const fmtData = (d) => { if (!d) return "—"; const p = String(d).split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; };

export const nQtd = (v) => { const n = parseFloat(String(v || "").replace(",", ".")); return isFinite(n) && n > 0 ? n : 0; };
export const nVal = (v) => {
  const t = String(v == null ? "" : v).trim().replace(/[^\d,.-]/g, "");
  if (!t) return 0;
  const n = parseFloat(t.indexOf(",") > -1 ? t.replace(/\./g, "").replace(",", ".") : t);
  return isFinite(n) && n >= 0 ? n : 0;
};

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
    if (c.ataId !== ataId || c.id === ignorarContrato) return;
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
  const t = String(v == null ? "" : v).trim().replace(/[^\d,.-]/g, "");
  if (!t) return 0;
  const neg = t.charAt(0) === "-";
  const corpo = t.replace(/-/g, "");
  const n = parseFloat(corpo.indexOf(",") > -1 ? corpo.replace(/\./g, "").replace(",", ".") : corpo);
  return isFinite(n) ? (neg ? -n : n) : 0;
};

// Pagamentos
export const pagamentosDe = (id, pagamentos) => pagamentos.filter(p => p.contratoId === id);
export function totaisPagamento(c, pagamentos, ocorrencias) {
  const ps = pagamentosDe(c.id, pagamentos);
  const nf = ps.reduce((t, p) => t + nVal(p.valorNF), 0);
  const pago = ps.reduce((t, p) => t + nVal(p.valorPago), 0);
  const empenhado = valorEmpenhado(c, ocorrencias);
  return { ps, nf, pago, retido: Math.max(0, nf - pago), empenhado, aPagar: Math.max(0, empenhado - pago) };
}

// CSV
export const csvLinha = (linhas) => "\uFEFF" + linhas.map(l => l.map(c => {
  const t = String(c == null ? "" : c);
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