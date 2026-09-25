// Cálculos do Painel Executivo — funções puras sobre os dados das entidades
import { nQtd, nVal, fmtM, fmtQ, fmtData, diasAte, resumoAta, saldoItem, valorEmpenhado, fimVigente, totaisPagamento, situacaoAta, ocorrenciasDe, contratoAtivo } from "./dmp-utils";

// Contratos cancelados/rescindidos ficam fora dos totais
const ativos = (contratos) => contratos.filter(contratoAtivo);
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

function qtdEfetiva(p) { return Math.max(0, nQtd(p.qtd) - nQtd(p.qtdSobrestada)); }

export function calcPlanejado(pca, ano) {
  return pca.filter(p => +p.exercicio === +ano).reduce((t, p) => t + qtdEfetiva(p) * nVal(p.valor), 0);
}

export function calcContratado(contratos, ocorrencias, ano) {
  return ativos(contratos).filter(c => (c.inicio || "").slice(0, 4) === String(ano)).reduce((t, c) => t + valorEmpenhado(c, ocorrencias), 0);
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
  return ativos(contratos).filter(c => { const f = fimVigente(c, ocorrencias); const d = diasAte(f); return d === null || d >= 0; });
}

export function calcAPagar(contratos, pagamentos, ocorrencias) {
  return contratosVigentes(contratos, ocorrencias).reduce((t, c) => t + totaisPagamento(c, pagamentos, ocorrencias).aPagar, 0);
}

// Fase 1.2 Bloco A: Planejamento
// "Licitado" = bem presente em ata vigente, ou item do PCA vinculado diretamente (pcaId) a contrato ativo
export function calcPlanejamentoFunil(pca, atas, ano, contratos = []) {
  const pcaAno = pca.filter(p => +p.exercicio === +ano);
  const itensPlanejados = pcaAno.length;
  const planejado = pcaAno.reduce((t, p) => t + qtdEfetiva(p) * nVal(p.valor), 0);
  const benIdsAta = new Set();
  atasVigentes(atas).forEach(a => (a.itens || []).forEach(it => benIdsAta.add(it.benId)));
  const pcaIdsContrato = new Set();
  ativos(contratos).forEach(c => (c.itens || []).forEach(i => { if (i.pcaId) pcaIdsContrato.add(i.pcaId); }));
  const licitados = pcaAno.filter(p => benIdsAta.has(p.benId) || pcaIdsContrato.has(p.id));
  const itensLicitados = licitados.length;
  const licitado = licitados.reduce((t, p) => t + qtdEfetiva(p) * nVal(p.valor), 0);
  const aLicitrar = planejado - licitado;
  return { planejado, licitado, aLicitrar, itensPlanejados, itensLicitados };
}

// Fase 1.2 Bloco B: Execução das atas
export function calcExecucaoAtas(atas, contratos, pagamentos, ocorrencias, filtro = "todas", ano) {
  let atasF = atas;
  if (filtro === "ano" && ano) atasF = atas.filter(a => (a.inicio || "").slice(0, 4) === String(ano));
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
  ativos(contratos).forEach(c => {
    if ((c.inicio || "").slice(0, 4) !== String(ano)) return;
    const mes = +(c.inicio || "").slice(5, 7) - 1;
    if (mes >= 0 && mes < 12) meses[mes] += valorEmpenhado(c, ocorrencias);
  });
  return meses;
}

// Fase 5.3: Concentração de fornecedores
export function calcTopFornecedores(contratos, ocorrencias) {
  const map = {};
  ativos(contratos).forEach(c => {
    const f = c.fornecedor || "—";
    map[f] = (map[f] || 0) + valorEmpenhado(c, ocorrencias);
  });
  const total = Object.values(map).reduce((t, v) => t + v, 0);
  const top = Object.entries(map).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
  return { top, total };
}

// Ainda a contratar = planejado − empenhado em contratos do exercício
export function calcAindaContratar(pca, contratos, ocorrencias, ano) {
  const planejado = calcPlanejado(pca, ano);
  const empenhado = ativos(contratos).filter(c => (c.inicio || "").slice(0, 4) === String(ano))
    .reduce((t, c) => t + valorEmpenhado(c, ocorrencias), 0);
  return Math.max(0, planejado - empenhado);
}

// PCA não contratado — itens do PCA do exercício com status "não iniciado",
// espelhando a lógica da aba Execução do Plano Anual: vínculo pelo pcaId do item do contrato.
export function calcPCANaoContratado(pca, contratos, catalog, ano) {
  const pcaAno = pca.filter(p => +p.exercicio === +ano);
  const qtdPorPca = {};
  ativos(contratos).forEach(c => (c.itens || []).forEach(i => {
    if (!i.pcaId) return;
    qtdPorPca[i.pcaId] = (qtdPorPca[i.pcaId] || 0) + nQtd(i.qtd);
  }));
  return pcaAno.filter(p => {
    if (nQtd(p.qtdSobrestada) >= nQtd(p.qtd) && nQtd(p.qtd) > 0) return false; // sobrestado (total)
    return (qtdPorPca[p.id] || 0) === 0; // não iniciado = nenhum contrato vinculado
  }).map(p => {
    const b = catalog.find(x => x.id === p.benId);
    const qtd = Math.max(0, nQtd(p.qtd) - nQtd(p.qtdSobrestada));
    return { p, ben: b, qtd, valor: qtd * nVal(p.valor) };
  }).filter(x => x.qtd > 0);
}

// Execução do PCA — percentual de itens do exercício com ao menos um contrato/empenho vinculado
export function calcExecucaoPCA(pca, contratos, ano) {
  const pcaAno = pca.filter(p => +p.exercicio === +ano);
  const total = pcaAno.length;
  const qtdPorPca = {};
  ativos(contratos).forEach(c => (c.itens || []).forEach(i => {
    if (!i.pcaId) return;
    qtdPorPca[i.pcaId] = (qtdPorPca[i.pcaId] || 0) + nQtd(i.qtd);
  }));
  let executados = 0, naoIniciados = 0, sobrestados = 0;
  pcaAno.forEach(p => {
    if (nQtd(p.qtdSobrestada) >= nQtd(p.qtd) && nQtd(p.qtd) > 0) { sobrestados++; return; }
    if ((qtdPorPca[p.id] || 0) === 0) naoIniciados++;
    else executados++;
  });
  const pct = total ? executados / total * 100 : 0;
  return { total, executados, naoIniciados, sobrestados, pct };
}

// Previsto vs gasto — planejado PCA vs efetivamente pago no exercício
export function calcPrevistoVsGasto(pca, contratos, pagamentos, ocorrencias, ano) {
  const planejado = calcPlanejado(pca, ano);
  const contratosAno = ativos(contratos).filter(c => (c.inicio || "").slice(0, 4) === String(ano));
  const pago = contratosAno.reduce((t, c) => t + totaisPagamento(c, pagamentos, ocorrencias).pago, 0);
  const empenhado = contratosAno.reduce((t, c) => t + valorEmpenhado(c, ocorrencias), 0);
  const pct = planejado ? pago / planejado * 100 : 0;
  return { planejado, pago, empenhado, pct, saldo: Math.max(0, planejado - pago) };
}

// Top itens por ano — ranking por quantidade contratada no exercício
export function calcTopItensPorAno(contratos, catalog, ano) {
  const map = {};
  contratos.forEach(c => {
    if ((c.inicio || "").slice(0, 4) !== String(ano)) return;
    (c.itens || []).forEach(i => {
      const b = catalog.find(x => x.id === i.benId);
      if (!b) return;
      if (!map[b.id]) map[b.id] = { ben: b, qtd: 0, valor: 0 };
      map[b.id].qtd += nQtd(i.qtd);
      map[b.id].valor += nQtd(i.qtd) * nVal(i.valor);
    });
  });
  return Object.values(map).sort((a, b) => b.qtd - a.qtd);
}

// Variação vs exercício anterior para os KPIs do topo
export function calcVariacao(pca, contratos, ocorrencias, ano) {
  const pAtual = calcPlanejado(pca, ano);
  const pAnt = calcPlanejado(pca, ano - 1);
  const cAtual = calcContratado(contratos, ocorrencias, ano);
  const cAnt = calcContratado(contratos, ocorrencias, ano - 1);
  const pct = (atual, ant) => ant > 0 ? (atual - ant) / ant * 100 : null;
  return {
    planejado: { atual: pAtual, ant: pAnt, pct: pct(pAtual, pAnt) },
    contratado: { atual: cAtual, ant: cAnt, pct: pct(cAtual, cAnt) }
  };
}

// Contratos vigentes com valor a pagar (para o card "A pagar")
export function calcContratosAPagar(contratos, pagamentos, ocorrencias) {
  return contratosVigentes(contratos, ocorrencias)
    .filter(c => totaisPagamento(c, pagamentos, ocorrencias).aPagar > 0);
}

// Timeline unificada — atas e contratos vigentes posicionados por dias restantes
export function calcTimelineVigencia(atas, contratos, pagamentos, ocorrencias) {
  const itens = [];
  atas.forEach(a => {
    const d = diasAte(a.fim);
    if (d === null || d < 0) return;
    const sal = resumoAta(a, contratos).sal;
    if (sal <= 0) return;
    itens.push({ tipo: "ata", id: a.id, numero: a.numero, fornecedor: a.fornecedor || "—", dias: d, valor: sal, fim: a.fim });
  });
  contratos.forEach(c => {
    const f = fimVigente(c, ocorrencias);
    const d = diasAte(f);
    if (d === null || d < 0) return;
    const t = totaisPagamento(c, pagamentos, ocorrencias);
    const empenhado = valorEmpenhado(c, ocorrencias);
    const valor = Math.max(0, empenhado - t.pago);
    if (valor <= 0 && t.empenhado <= 0) return;
    itens.push({ tipo: "contrato", id: c.id, numero: `${c.tipo} ${c.numero}`, fornecedor: c.fornecedor || "—", dias: d, valor: valor || empenhado, fim: f });
  });
  return itens.sort((a, b) => a.dias - b.dias);
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