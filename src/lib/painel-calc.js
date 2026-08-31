// Cálculos do Painel Executivo — funções puras sobre os dados das entidades
import { nQtd, nVal, fmtM, fmtQ, fmtData, diasAte, resumoAta, saldoItem, valorEmpenhado, fimVigente, totaisPagamento, situacaoAta, ocorrenciasDe } from "./dmp-utils";
import { FALTAS } from "./dmp-data";

export function fmtCurto(n) {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
  if (abs >= 100_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return `R$ ${fmtM(v)}`;
}

export function fmtPct(n) {
  return `${(Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export const fmtRs = (n) => `R$ ${fmtM(n)}`;

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

// Fase 1.1: Saldo de atas com detalhamento de itens vs unidades
export function calcSaldoAtasDetalhado(atas, contratos) {
  const vig = atasVigentes(atas).filter(a => resumoAta(a, contratos).sal > 0);
  const valor = vig.reduce((t, a) => t + resumoAta(a, contratos).sal, 0);
  let itens = 0, unidades = 0;
  vig.forEach(a => (a.itens || []).forEach(it => {
    const s = saldoItem(a, it, contratos);
    if (s > 0) { itens++; unidades += s; }
  }));
  return { valor, itens, unidades, atas: vig.length };
}

export function contratosVigentes(contratos, ocorrencias) {
  return contratos.filter(c => { const f = fimVigente(c, ocorrencias); const d = diasAte(f); return d === null || d >= 0; });
}

export function calcAPagar(contratos, pagamentos, ocorrencias) {
  return contratosVigentes(contratos, ocorrencias).reduce((t, c) => t + totaisPagamento(c, pagamentos, ocorrencias).aPagar, 0);
}

// Fase 1.2 Bloco A: Planejamento
export function calcPlanejamentoFunil(pca, atas, ano) {
  const pcaAno = pca.filter(p => +p.exercicio === +ano);
  const itensPlanejados = pcaAno.length;
  const planejado = pcaAno.reduce((t, p) => t + nQtd(p.qtd) * nVal(p.valor), 0);
  const benIdsAta = new Set();
  atas.forEach(a => (a.itens || []).forEach(it => benIdsAta.add(it.benId)));
  const licitados = pcaAno.filter(p => benIdsAta.has(p.benId));
  const itensLicitados = licitados.length;
  const licitado = licitados.reduce((t, p) => t + nQtd(p.qtd) * nVal(p.valor), 0);
  const aLicitrar = planejado - licitado;
  return { planejado, licitado, aLicitrar, itensPlanejados, itensLicitados };
}

// Fase 1.2 Bloco B: Execução das atas
export function calcExecucaoAtas(atas, contratos, pagamentos, ocorrencias, filtro = "todas") {
  let atasF = atas;
  if (filtro === "2026") atasF = atas.filter(a => (a.inicio || "").slice(0, 4) === "2026");
  else if (filtro === "vigentes") atasF = atasVigentes(atas);

  const registrado = atasF.reduce((t, a) => t + resumoAta(a, contratos).reg, 0);
  const empenhado = atasF.reduce((t, a) => t + resumoAta(a, contratos).cons, 0);
  const saldoVigente = atasF.filter(a => { const d = diasAte(a.fim); return d === null || d >= 0; }).reduce((t, a) => t + resumoAta(a, contratos).sal, 0);
  const saldoPerdido = atasF.filter(a => { const d = diasAte(a.fim); return d !== null && d < 0; }).reduce((t, a) => t + resumoAta(a, contratos).sal, 0);

  const ataIds = new Set(atasF.map(a => a.id));
  const contratosComAta = contratos.filter(c => ataIds.has(c.ataId));
  const pago = contratosComAta.reduce((t, c) => t + totaisPagamento(c, pagamentos, ocorrencias).pago, 0);

  const diff = registrado - (empenhado + saldoVigente + saldoPerdido);
  return { registrado, empenhado, pago, saldoVigente, saldoPerdido, diff };
}

// Fase 1.3: Economia com cobertura
export function calcEconomiaCobertura(contratos, pca, ano) {
  const pcaAno = pca.filter(p => +p.exercicio === +ano);
  const itensTotal = pcaAno.length;
  const itensComValor = pcaAno.filter(p => nVal(p.valor) > 0).length;
  const cobertura = itensTotal ? itensComValor / itensTotal * 100 : 0;
  const itensSemValor = itensTotal - itensComValor;

  let planejadoLicitado = 0, homologado = 0, pares = 0;
  contratos.forEach(c => (c.itens || []).forEach(i => {
    if (!i.pcaId) return;
    const p = pca.find(x => x.id === i.pcaId);
    if (!p || +p.exercicio !== +ano || !nVal(p.valor)) return;
    planejadoLicitado += nQtd(i.qtd) * nVal(p.valor);
    homologado += nQtd(i.qtd) * nVal(i.valor);
    pares++;
  }));
  const economia = planejadoLicitado - homologado;
  const pct = planejadoLicitado ? economia / planejadoLicitado * 100 : 0;
  return { economia, pct, planejadoLicitado, homologado, cobertura, itensComValor, itensTotal, itensSemValor, pares };
}

// Fase 2: Risco
export function calcRiscoVencidas(atas, contratos) {
  return atas.map(a => {
    const r = resumoAta(a, contratos);
    const d = diasAte(a.fim);
    const qtdSaldo = (a.itens || []).reduce((t, it) => t + Math.max(0, saldoItem(a, it, contratos)), 0);
    return { a, sal: r.sal, qtdSaldo, dias: d, itens: (a.itens || []).length };
  }).filter(x => x.sal > 0 && x.dias !== null && x.dias < 0).sort((a, b) => b.sal - a.sal);
}

export function calcRiscoVencendo(atas, contratos) {
  return atas.map(a => {
    const r = resumoAta(a, contratos);
    const d = diasAte(a.fim);
    const qtdSaldo = (a.itens || []).reduce((t, it) => t + Math.max(0, saldoItem(a, it, contratos)), 0);
    return { a, sal: r.sal, qtdSaldo, dias: d, itens: (a.itens || []).length };
  }).filter(x => x.sal > 0 && x.dias !== null && x.dias >= 0 && x.dias <= 90).sort((a, b) => b.sal - a.sal);
}

export function calcPendencias(contratos, pagamentos, ocorrencias) {
  return contratos.map(c => {
    const t = totaisPagamento(c, pagamentos, ocorrencias);
    const f = fimVigente(c, ocorrencias);
    const d = diasAte(f);
    return { c, retido: t.retido, aPagar: t.aPagar, dias: d, fim: f };
  }).filter(x => x.retido > 0 || (x.dias !== null && x.dias < 0 && x.aPagar > 0));
}

// Fase 3: Atas vigentes detalhado
export function calcAtasVigentesDetalhado(atas, contratos) {
  return atas
    .filter(a => { const d = diasAte(a.fim); return d === null || d >= 0; })
    .filter(a => resumoAta(a, contratos).sal > 0)
    .map(a => {
      const r = resumoAta(a, contratos);
      const d = diasAte(a.fim);
      const pctConsumido = r.reg ? r.cons / r.reg * 100 : 0;
      return { a, reg: r.reg, cons: r.cons, sal: r.sal, itens: (a.itens || []).length, dias: d, pctConsumido };
    })
    .sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999));
}

// Fase 5.2: Execução mensal
export function calcExecucaoMensal(contratos, ocorrencias, ano) {
  const meses = Array(12).fill(0);
  contratos.forEach(c => {
    if ((c.inicio || "").slice(0, 4) !== String(ano)) return;
    const mes = +(c.inicio || "").slice(5, 7) - 1;
    if (mes >= 0 && mes < 12) meses[mes] += valorEmpenhado(c, ocorrencias);
  });
  return meses;
}

// Fase 5.3: Concentração de fornecedores
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

// Alertas centrais
export function calcTodosAlertas(data) {
  const { atas, contratos, pagamentos, ocorrencias } = data;
  const out = [];
  atas.forEach(a => {
    const s = situacaoAta(a);
    const r = resumoAta(a, contratos);
    const qtdSaldo = (a.itens || []).reduce((t, it) => t + Math.max(0, saldoItem(a, it, contratos)), 0);
    if (s.dias !== null && s.dias < 0 && qtdSaldo > 0)
      out.push({ severidade: "critico", txt: `Ata ${a.numero} venceu em ${fmtData(a.fim)} com saldo de ${fmtQ(qtdSaldo)} un. (R$ ${fmtM(r.sal)}).` });
    else if (s.dias !== null && s.dias >= 0 && s.dias <= 90 && qtdSaldo > 0)
      out.push({ severidade: s.dias <= 30 ? "critico" : "aviso", txt: `Ata ${a.numero} vence em ${s.dias} dia${s.dias === 1 ? "" : "s"} com ${fmtQ(qtdSaldo)} un. em saldo (R$ ${fmtM(r.sal)}).` });
  });
  contratos.forEach(c => {
    const t = totaisPagamento(c, pagamentos, ocorrencias);
    if (t.retido > 0)
      out.push({ severidade: "aviso", txt: `${c.tipo} ${c.numero}: R$ ${fmtM(t.retido)} retidos em notas fiscais.` });
    const faltas = ocorrenciasDe(c.id, ocorrencias).filter(o => FALTAS.includes(o.tipo));
    if (faltas.length > 0)
      out.push({ severidade: "critico", txt: `${c.tipo} ${c.numero}: descumprimento — ${faltas.map(o => o.tipo).join("; ")}.` });
    const d = diasAte(fimVigente(c, ocorrencias));
    if (d !== null && d < 0 && t.aPagar > 0)
      out.push({ severidade: "critico", txt: `${c.tipo} ${c.numero}: vigência encerrada em ${fmtData(fimVigente(c, ocorrencias))} com R$ ${fmtM(t.aPagar)} ainda não pagos.` });
  });
  return out;
}