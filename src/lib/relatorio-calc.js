import { nQtd, nVal, saldoItem, situacaoAta, fmtData } from "@/lib/dmp-utils";

export function calcularSerieItem(benId, data, anoInicio, anoFim) {
  const { catalog, pca, contratos } = data;
  const ben = catalog.find(b => b.id === benId);
  if (!ben) return null;
  const anos = [];
  for (let a = anoInicio; a <= anoFim; a++) anos.push(a);
  const pcaPorAno = {}, pcaFontes = {};
  pca.filter(p => p.benId === benId).forEach(p => {
    const ex = Number(p.exercicio);
    if (!ex) return;
    pcaPorAno[ex] = (pcaPorAno[ex] || 0) + nQtd(p.qtd);
    if (!pcaFontes[ex]) pcaFontes[ex] = [];
    pcaFontes[ex].push({ tipo: "PCA", codigo: p.codigo || "", qtd: nQtd(p.qtd) });
  });
  const contrPorAno = {}, contrFontes = {}, precosPorAno = {};
  contratos.forEach(c => {
    const anoContr = c.inicio ? Number(c.inicio.slice(0, 4)) : null;
    if (!anoContr) return;
    (c.itens || []).forEach(it => {
      if (it.benId !== benId) return;
      const q = nQtd(it.qtd), v = nVal(it.valor);
      contrPorAno[anoContr] = (contrPorAno[anoContr] || 0) + q;
      if (!contrFontes[anoContr]) contrFontes[anoContr] = [];
      contrFontes[anoContr].push({ tipo: "Contrato", contrato: `${c.tipo} ${c.numero}`, ne: c.notaEmpenho || "", qtd: q, valor: v });
      if (v > 0) { if (!precosPorAno[anoContr]) precosPorAno[anoContr] = []; precosPorAno[anoContr].push(v); }
    });
  });
  const serie = anos.map(ano => {
    const planejado = pcaPorAno[ano] || 0;
    const contratado = contrPorAno[ano] || 0;
    const precos = precosPorAno[ano] || [];
    const precoMedio = precos.length ? precos.reduce((t, p) => t + p, 0) / precos.length : 0;
    return {
      ano, planejado, contratado, recebido: contratado,
      execucao: planejado > 0 ? (contratado / planejado) * 100 : 0,
      precoMedio, valorContratado: contratado * precoMedio,
      fontes: [...(pcaFontes[ano] || []), ...(contrFontes[ano] || [])]
    };
  });
  return { ben, serie };
}

export function calcularEstatisticas(valores) {
  const n = valores.length;
  if (!n) return { n: 0, soma: 0, media: 0, mediana: 0, desvio: 0, cv: 0, min: 0, max: 0, amplitude: 0, varMedia: "—" };
  const soma = valores.reduce((t, v) => t + v, 0);
  const media = soma / n;
  const sorted = [...valores].sort((a, b) => a - b);
  const mediana = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const variancia = n > 1 ? valores.reduce((t, v) => t + Math.pow(v - media, 2), 0) / (n - 1) : 0;
  const desvio = Math.sqrt(variancia);
  const cv = media > 0 ? (desvio / media) * 100 : 0;
  const min = Math.min(...valores), max = Math.max(...valores);
  let varMedia = "—";
  if (n >= 2) {
    const xMean = (n - 1) / 2;
    let num = 0, den = 0;
    valores.forEach((y, x) => { num += (x - xMean) * (y - media); den += Math.pow(x - xMean, 2); });
    const slope = den > 0 ? num / den : 0;
    varMedia = (slope >= 0 ? "+" : "") + slope.toFixed(1).replace(".", ",");
  }
  return { n, soma, media, mediana, desvio, cv, min, max, amplitude: max - min, varMedia };
}

export function gerarLeituraAutomatica(statsContr, execMedia) {
  const n = statsContr.n;
  if (n < 3)
    return `Amostra insuficiente para tratamento estatístico. A série dispõe de apenas ${n} exercício(s); as medidas de dispersão não são representativas e a estimativa deve ser fundamentada por levantamento junto às unidades demandantes.`;
  const cv = statsContr.cv;
  if (cv > 50)
    return `Demanda irregular (coeficiente de variação de ${cv.toFixed(0).replace(".", ",")}%). A média não é boa preditora; recomenda-se adotar a mediana ou o levantamento de demanda das unidades como base da estimativa.`;
  if (execMedia > 0 && execMedia < 60)
    return `As estimativas anteriores superaram consistentemente o efetivamente contratado (execução média de ${execMedia.toFixed(1).replace(".", ",")}%). Recomenda-se revisar a metodologia de levantamento antes de replicar as quantidades planejadas.`;
  return `Demanda regular (CV de ${cv.toFixed(0).replace(".", ",")}%). A média dos últimos ${n} exercícios é base adequada para a estimativa.`;
}

export function calcularCenarios(serieContratada) {
  const n = serieContratada.length;
  const valores = serieContratada;
  const ultimos3 = valores.slice(-3);
  const media3 = ultimos3.length ? ultimos3.reduce((t, v) => t + v, 0) / ultimos3.length : 0;
  const sorted = [...valores].sort((a, b) => a - b);
  const mediana = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  let tendencia = null;
  if (n >= 4) {
    const xMean = (n - 1) / 2, yMean = valores.reduce((t, v) => t + v, 0) / n;
    let num = 0, den = 0;
    valores.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += Math.pow(x - xMean, 2); });
    const b = den > 0 ? num / den : 0;
    const a = yMean - b * xMean;
    tendencia = Math.max(0, Math.round(a + b * n));
  }
  return {
    media3: Math.round(media3),
    mem3: `(${ultimos3.join(" + ")}) ÷ ${ultimos3.length} = ${media3.toFixed(2).replace(".", ",")} → ${Math.round(media3)}`,
    mediana: Math.round(mediana),
    memMed: `mediana de (${sorted.join("; ")})`,
    tendencia, n
  };
}

export function saldoAtaVigente(benId, data) {
  const { atas, contratos } = data;
  let saldoTotal = 0, ataInfo = null;
  atas.forEach(a => {
    const sv = situacaoAta(a);
    if (sv.dias === null || sv.dias < 0) return;
    (a.itens || []).forEach(it => {
      if (it.benId !== benId) return;
      const s = saldoItem(a, it, contratos);
      if (s > 0) {
        saldoTotal += s;
        if (!ataInfo || (a.fim && new Date(a.fim) < new Date(ataInfo.fim)))
          ataInfo = { numero: a.numero, fim: a.fim, saldo: s };
      }
    });
  });
  return { saldoTotal, ataInfo };
}

export function calcularRelatorio(itemIds, data, anoInicio, anoFim) {
  return itemIds.map(id => {
    const item = calcularSerieItem(id, data, anoInicio, anoFim);
    if (!item) return null;
    const serieContr = item.serie.map(s => s.contratado);
    const seriePlan = item.serie.map(s => s.planejado);
    const statsContr = calcularEstatisticas(serieContr);
    const statsPlan = calcularEstatisticas(seriePlan);
    const totalContr = serieContr.reduce((t, v) => t + v, 0);
    const totalPlan = seriePlan.reduce((t, v) => t + v, 0);
    const execMedia = totalPlan > 0 ? (totalContr / totalPlan) * 100 : 0;
    return {
      ...item, statsContr, statsPlan, execMedia,
      leitura: gerarLeituraAutomatica(statsContr, execMedia),
      cenarios: calcularCenarios(serieContr),
      saldo: saldoAtaVigente(item.ben.id, data)
    };
  }).filter(Boolean);
}

export function agruparPorPDM(resultados) {
  const grupos = {};
  resultados.forEach(r => {
    const pdm = r.ben.pdm || "Sem PDM";
    if (!grupos[pdm]) grupos[pdm] = { pdm, itens: [], catmats: [] };
    grupos[pdm].itens.push(r);
    grupos[pdm].catmats.push(r.ben.catmat);
  });
  return Object.values(grupos).map(g => {
    const anos = g.itens[0].serie.map(s => s.ano);
    const serie = anos.map((ano, i) => {
      const planejado = g.itens.reduce((t, r) => t + r.serie[i].planejado, 0);
      const contratado = g.itens.reduce((t, r) => t + r.serie[i].contratado, 0);
      const precos = g.itens.flatMap(r => r.serie[i].fontes.filter(f => f.tipo === "Contrato" && f.valor > 0).map(f => f.valor));
      const precoMedio = precos.length ? precos.reduce((t, p) => t + p, 0) / precos.length : 0;
      return { ano, planejado, contratado, recebido: contratado, execucao: planejado > 0 ? (contratado / planejado) * 100 : 0, precoMedio, valorContratado: contratado * precoMedio };
    });
    const serieContr = serie.map(s => s.contratado);
    const seriePlan = serie.map(s => s.planejado);
    const statsContr = calcularEstatisticas(serieContr);
    const statsPlan = calcularEstatisticas(seriePlan);
    const totalContr = serieContr.reduce((t, v) => t + v, 0);
    const totalPlan = seriePlan.reduce((t, v) => t + v, 0);
    const execMedia = totalPlan > 0 ? (totalContr / totalPlan) * 100 : 0;
    return {
      ben: { objeto: `Família PDM ${g.pdm}`, catmat: g.catmats.join(", "), pdm: g.pdm, unidade: "—", categoria: "—", aplicacao: g.itens.map(r => r.ben.objeto).join("; ") },
      serie, statsContr, statsPlan, execMedia,
      leitura: gerarLeituraAutomatica(statsContr, execMedia),
      cenarios: calcularCenarios(serieContr),
      saldo: { saldoTotal: g.itens.reduce((t, r) => t + r.saldo.saldoTotal, 0), ataInfo: null },
      isPDM: true, _pdm: g.pdm
    };
  });
}

export function gerarTextoETP(item, estimativa, justificativa) {
  const s = item.serie, sc = item.statsContr;
  const linhas = [
    `ITEM: ${item.ben.objeto}`,
    `CATMAT: ${item.ben.catmat} | PDM: ${item.ben.pdm} | Unidade: ${item.ben.unidade || "UNIDADE"}`,
    "",
    `SÉRIE HISTÓRICA (${s[0].ano}–${s[s.length - 1].ano}):`,
    `Planejado (PCA): ${s.map(x => `${x.ano}: ${x.planejado}`).join(", ")}`,
    `Contratado: ${s.map(x => `${x.ano}: ${x.contratado}`).join(", ")}`,
    "",
    `ESTATÍSTICAS (série contratada):`,
    `Nº de exercícios: ${sc.n} | Soma: ${sc.soma} | Média: ${sc.media.toFixed(1).replace(".", ",")} | Mediana: ${sc.mediana.toFixed(1).replace(".", ",")}`,
    `Desvio-padrão: ${sc.desvio.toFixed(1).replace(".", ",")} | CV: ${sc.cv.toFixed(0).replace(".", ",")}% | Mín/Máx: ${sc.min}/${sc.max}`,
    "",
    `LEITURA AUTOMÁTICA:`,
    item.leitura,
    "",
    `CENÁRIOS PARA O PRÓXIMO EXERCÍCIO:`,
    `Média dos últimos 3: ${item.cenarios.media3} | Mediana: ${item.cenarios.mediana}${item.cenarios.tendencia !== null ? ` | Tendência linear: ${item.cenarios.tendencia}` : " | Tendência: não aplicável"}`,
    "",
    `ESTIMATIVA PROPOSTA: ${estimativa || "[não preenchido]"} un.`,
    `JUSTIFICATIVA: ${justificativa || "[não preenchido]"}`,
  ];
  if (item.saldo.saldoTotal > 0)
    linhas.push("", `SALDO EM ATA VIGENTE: ${item.saldo.saldoTotal} un.${item.saldo.ataInfo ? ` (Ata ${item.saldo.ataInfo.numero}, vence em ${fmtData(item.saldo.ataInfo.fim)})` : ""}`);
  else
    linhas.push("", "SALDO EM ATA VIGENTE: Sem saldo em ata vigente para este item.");
  return linhas.join("\n");
}