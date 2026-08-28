// Cálculos do Painel Executivo — funções puras sobre os dados das entidades
import { nQtd, nVal, fmtM, diasAte, resumoAta, saldoItem, valorEmpenhado, fimVigente, totaisPagamento } from "./dmp-utils";

export function fmtCurto(n) {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
  if (abs >= 100_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return `R$ ${fmtM(v)}`;
}

export function calcPlanejado(pca, ano) {
  return pca.filter(p => +p.exercicio === +ano).reduce((t, p) => t + nQtd(p.qtd) * nVal(p.valor), 0);
}

export function calcContratado(contratos, ocorrencias, ano) {
  return contratos.filter(c => (c.inicio || "").slice(0, 4) === String(ano)).reduce((t, c) => t + valorEmpenhado(c, ocorrencias), 0);
}

export function atasVigentes(atas) {
  return atas.filter(a => { const d = diasAte(a.fim); return d === null || d >= 0; });
}

export function calcSaldoAtas(atas, contratos) {
  return atasVigentes(atas).reduce((t, a) => t + resumoAta(a, contratos).sal, 0);
}

export function contratosVigentes(contratos, ocorrencias) {
  return contratos.filter(c => { const f = fimVigente(c, ocorrencias); const d = diasAte(f); return d === null || d >= 0; });
}

export function calcAPagar(contratos, pagamentos, ocorrencias) {
  return contratosVigentes(contratos, ocorrencias).reduce((t, c) => t + totaisPagamento(c, pagamentos, ocorrencias).aPagar, 0);
}

export function calcFunil(ano, data) {
  const { pca, licitacoes, atas, contratos, pagamentos, ocorrencias } = data;
  const planejado = calcPlanejado(pca, ano);
  const licitado = licitacoes.filter(l => l.status === "Homologado" && String(l.ano) === String(ano)).reduce((t, l) => t + nVal(l.valorGlobal), 0);
  const registrado = atas.filter(a => (a.inicio || "").slice(0, 4) === String(ano)).reduce((t, a) => t + resumoAta(a, contratos).reg, 0);
  const contratado = calcContratado(contratos, ocorrencias, ano);
  const pago = contratos.filter(c => (c.inicio || "").slice(0, 4) === String(ano)).reduce((t, c) => t + totaisPagamento(c, pagamentos, ocorrencias).pago, 0);
  return { planejado, licitado, registrado, contratado, pago };
}

export function calcEconomia(contratos, pca, ano) {
  let planejadoLicitado = 0, homologado = 0;
  contratos.forEach(c => (c.itens || []).forEach(i => {
    if (!i.pcaId) return;
    const p = pca.find(x => x.id === i.pcaId);
    if (!p || +p.exercicio !== +ano || !nVal(p.valor)) return;
    planejadoLicitado += nQtd(i.qtd) * nVal(p.valor);
    homologado += nQtd(i.qtd) * nVal(i.valor);
  }));
  const economia = planejadoLicitado - homologado;
  const pct = planejadoLicitado ? economia / planejadoLicitado * 100 : 0;
  return { economia, pct, planejadoLicitado, homologado };
}

export function calcRiscoAtas(atas, contratos) {
  return atas.map(a => {
    const r = resumoAta(a, contratos);
    const d = diasAte(a.fim);
    const qtdSaldo = (a.itens || []).reduce((t, it) => t + Math.max(0, saldoItem(a, it, contratos)), 0);
    return { a, sal: r.sal, qtdSaldo, dias: d, fim: a.fim };
  }).filter(x => x.sal > 0 && x.dias !== null);
}

export function calcPendencias(contratos, pagamentos, ocorrencias) {
  return contratos.map(c => {
    const t = totaisPagamento(c, pagamentos, ocorrencias);
    const f = fimVigente(c, ocorrencias);
    const d = diasAte(f);
    return { c, retido: t.retido, aPagar: t.aPagar, dias: d, fim: f };
  }).filter(x => x.retido > 0 || (x.dias !== null && x.dias < 0 && x.aPagar > 0));
}

export function calcTopFornecedores(contratos, ocorrencias) {
  const map = {};
  contratos.forEach(c => {
    const f = c.fornecedor || "—";
    map[f] = (map[f] || 0) + valorEmpenhado(c, ocorrencias);
  });
  const total = Object.values(map).reduce((t, v) => t + v, 0);
  const top = Object.entries(map).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
  return { top, total };
}