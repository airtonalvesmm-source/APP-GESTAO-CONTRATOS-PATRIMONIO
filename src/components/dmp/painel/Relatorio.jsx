import { fmtM, fmtQ, fmtData } from "@/lib/dmp-utils";
import { fmtCurto, fmtPct, fmtRs, calcPlanejado, calcContratado, calcSaldoAtasDetalhado, calcAPagar, calcPlanejamentoFunil, calcExecucaoAtas, calcEconomiaCobertura, calcTopFornecedores, calcRiscoVencidas, calcRiscoVencendo, calcPendencias } from "@/lib/painel-calc";

export function gerarRelatorioPDF(data, ano) {
  const hoje = new Date();
  const dataExt = hoje.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const planejado = calcPlanejado(data.pca, ano);
  const contratado = calcContratado(data.contratos, data.ocorrencias, ano);
  const saldo = calcSaldoAtasDetalhado(data.atas, data.contratos);
  const aPagar = calcAPagar(data.contratos, data.pagamentos, data.ocorrencias);
  const plan = calcPlanejamentoFunil(data.pca, data.atas, ano);
  const exec = calcExecucaoAtas(data.atas, data.contratos, data.pagamentos, data.ocorrencias, "todas");
  const eco = calcEconomiaCobertura(data.contratos, data.pca, ano);
  const { top, total } = calcTopFornecedores(data.contratos, data.ocorrencias);
  const vencidas = calcRiscoVencidas(data.atas, data.contratos);
  const vencendo = calcRiscoVencendo(data.atas, data.contratos);
  const pendencias = calcPendencias(data.contratos, data.pagamentos, data.ocorrencias);
  const top5 = top.slice(0, 5);
  const nContratos = data.contratos.filter(c => (c.inicio || "").slice(0, 4) === String(ano)).length;
  const retidoTotal = pendencias.reduce((t, x) => t + x.retido, 0);
  const naoPagos = pendencias.filter(x => x.dias !== null && x.dias < 0 && x.aPagar > 0);
  const totalNaoPago = naoPagos.reduce((t, x) => t + x.aPagar, 0);
  const inconsistente = Math.abs(exec.diff) > 0.01;

  const pct = (a, b) => b ? fmtPct(a / b * 100) : "—";

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório Executivo — DMP/MP-PI — Exercício ${ano}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: Georgia, serif; color: #1B2430; max-width: 800px; margin: 0 auto; }
  h1, h2, h3, th { font-family: Arial, sans-serif; }
  .capa { text-align: center; padding-top: 120px; page-break-after: always; }
  .capa h1 { font-size: 22px; margin-bottom: 4px; }
  .capa .sub { font-size: 13px; color: #555; margin-bottom: 30px; }
  .capa .data { font-size: 14px; margin-bottom: 80px; }
  .secao { margin-bottom: 22px; page-break-inside: avoid; }
  .secao h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #333; border-bottom: 2px solid #C7CCC3; padding-bottom: 4px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #C7CCC3; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #F7F9F5; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  .resumo td { font-size: 13px; }
  .resumo td.valor { font-size: 16px; font-weight: bold; text-align: right; }
  .barra { height: 14px; background: #E8EAE5; border-radius: 2px; overflow: hidden; }
  .barra > div { height: 100%; background: #4A5568; border-radius: 2px; }
  .assinatura { margin-top: 60px; text-align: center; page-break-inside: avoid; }
  .linha { border-top: 1px solid #333; width: 280px; margin: 0 auto 4px; }
  .cargo { font-size: 12px; color: #555; }
  .critico { color: #B91C1C; font-weight: bold; }
  .aviso { color: #B45309; font-weight: bold; }
  .ok { color: #047857; font-weight: bold; }
  .inc { background: #FEE2E2; border: 1px solid #FCA5A5; padding: 6px 10px; border-radius: 4px; color: #991B1B; font-size: 12px; }
</style></head><body>

<div class="capa">
  <h1>RELATÓRIO EXECUTIVO DE CONTRATAÇÕES</h1>
  <p class="sub">Divisão de Material Permanente · Coordenadoria de Apoio Administrativo<br>Ministério Público do Estado do Piauí</p>
  <p class="data">Exercício ${ano}<br>Posição em ${hoje.toLocaleDateString("pt-BR")}<br>Teresina, ${dataExt}</p>
  <div class="assinatura">
    <div class="linha"></div>
    <p class="cargo">Airton Alves Mendes de Moura<br>Chefe da Divisão de Material Permanente</p>
  </div>
</div>

<div class="secao">
  <h2>1. Resumo Financeiro</h2>
  <table class="resumo">
    <tr><th>Indicador</th><th>Valor</th><th>Observação</th></tr>
    <tr><td>Planejado (PCA ${ano})</td><td class="valor">${fmtRs(planejado)}</td><td>${plan.itensPlanejados} itens no PCA</td></tr>
    <tr><td>Contratado em ${ano}</td><td class="valor">${fmtRs(contratado)}</td><td>${nContratos} contrato(s) · inclui execução de atas de 2025</td></tr>
    <tr><td>Saldo em atas vigentes</td><td class="valor">${fmtRs(saldo.valor)}</td><td>${saldo.itens} itens · ${saldo.unidades.toLocaleString("pt-BR")} unidades · ${saldo.atas} atas</td></tr>
    <tr><td>A pagar</td><td class="valor">${fmtRs(aPagar)}</td><td>Empenhado − pago em contratos vigentes</td></tr>
  </table>
</div>

<div class="secao">
  <h2>2. Planejamento (PCA ${ano})</h2>
  <table>
    <tr><th>Etapa</th><th class="num">Valor</th><th class="num">% do planejado</th><th>Proporção</th></tr>
    <tr><td>Planejado (PCA)</td><td class="num">${fmtRs(plan.planejado)}</td><td class="num">100%</td><td><div class="barra"><div style="width:100%"></div></div></tr>
    <tr><td>Já licitado</td><td class="num">${fmtRs(plan.licitado)}</td><td class="num">${pct(plan.licitado, plan.planejado)}</td><td><div class="barra"><div style="width:${plan.planejado ? Math.max(2, plan.licitado / plan.planejado * 100) : 0}%"></div></div></tr>
    <tr><td>Ainda a licitar</td><td class="num">${fmtRs(plan.aLicitrar)}</td><td class="num">${pct(plan.aLicitrar, plan.planejado)}</td><td><div class="barra"><div style="width:${plan.planejado ? Math.max(2, plan.aLicitrar / plan.planejado * 100) : 0}%"></div></div></tr>
  </table>
</div>

<div class="secao">
  <h2>3. Execução das Atas</h2>
  <p style="font-size:11px;color:#555;margin-bottom:6px">A execução de ${ano} inclui atas homologadas em 2025.</p>
  <table>
    <tr><th>Etapa</th><th class="num">Valor</th><th class="num">% do registrado</th><th>Proporção</th></tr>
    <tr><td>Registrado em ata</td><td class="num">${fmtRs(exec.registrado)}</td><td class="num">100%</td><td><div class="barra"><div style="width:100%"></div></div></tr>
    <tr><td>Empenhado (contratos)</td><td class="num">${fmtRs(exec.empenhado)}</td><td class="num">${pct(exec.empenhado, exec.registrado)}</td><td><div class="barra"><div style="width:${exec.registrado ? Math.max(2, exec.empenhado / exec.registrado * 100) : 0}%"></div></div></tr>
    <tr><td>Pago</td><td class="num">${fmtRs(exec.pago)}</td><td class="num">${pct(exec.pago, exec.registrado)}</td><td><div class="barra"><div style="width:${exec.registrado ? Math.max(2, exec.pago / exec.registrado * 100) : 0}%"></div></div></tr>
    <tr><td>Saldo vigente</td><td class="num">${fmtRs(exec.saldoVigente)}</td><td class="num">${pct(exec.saldoVigente, exec.registrado)}</td><td><div class="barra"><div style="width:${exec.registrado ? Math.max(2, exec.saldoVigente / exec.registrado * 100) : 0}%"></div></div></tr>
    <tr><td>Saldo perdido</td><td class="num">${fmtRs(exec.saldoPerdido)}</td><td class="num">${pct(exec.saldoPerdido, exec.registrado)}</td><td><div class="barra"><div style="width:${exec.registrado ? Math.max(2, exec.saldoPerdido / exec.registrado * 100) : 0}%"></div></div></tr>
  </table>
  ${inconsistente ? `<p class="inc">Inconsistência de ${fmtRs(Math.abs(exec.diff))} — verificar lançamentos na aba Atas.</p>` : `<p class="ok" style="font-size:11px;margin-top:6px">✓ Registrado = Empenhado + Saldo vigente + Saldo perdido</p>`}
</div>

${eco.cobertura >= 80 ? `<div class="secao">
  <h2>4. Economia Obtida</h2>
  <p style="font-size:13px"><b>${fmtRs(eco.economia)}</b> (${fmtPct(eco.pct)} abaixo do estimado) · base: ${eco.pares} itens casados.</p>
</div>` : `<div class="secao">
  <h2>4. Economia Obtida — Indisponível</h2>
  <p style="font-size:12px">${eco.itensSemValor} dos ${eco.itensTotal} itens do PCA ${ano} estão sem valor unitário estimado. Sem essa informação não é possível medir a economia da licitação.</p>
</div>`}

<div class="secao">
  <h2>5. Concentração de Fornecedores — Top 5</h2>
  ${top5.length ? `<table>
    <tr><th>#</th><th>Fornecedor</th><th class="num">Empenhado</th><th class="num">%</th></tr>
    ${top5.map((forn, i) => `<tr><td>${i + 1}</td><td>${forn.nome}</td><td class="num">${fmtRs(forn.valor)}</td><td class="num">${fmtPct(total ? forn.valor / total * 100 : 0)}</td></tr>`).join("")}
  </table>
  <p style="font-size:11px;margin-top:6px">Os 5 maiores concentram ${fmtPct(total ? top5.reduce((t, x) => t + x.valor, 0) / total * 100 : 0)} do valor empenhado.</p>` : "<p>Nenhum contrato lançado.</p>"}
</div>

<div class="secao">
  <h2>6. Saldo de Ata Não Aproveitado</h2>
  ${vencidas.length ? `<table>
    <tr><th>Ata</th><th>Fornecedor</th><th class="num">Un. em saldo</th><th class="num">Saldo (R$)</th><th>Vencimento</th></tr>
    ${vencidas.map(x => `<tr><td>${x.a.numero}</td><td>${x.a.fornecedor || "—"}</td><td class="num">${fmtQ(x.qtdSaldo)}</td><td class="num critico">${fmtRs(x.sal)}</td><td>${fmtData(x.a.fim)}</td></tr>`).join("")}
  </table>
  <p style="font-size:11px;margin-top:6px" class="critico">Total: ${fmtRs(vencidas.reduce((t, x) => t + x.sal, 0))} em ${vencidas.length} atas encerradas.</p>` : "<p class='ok'>✓ Nenhuma ata encerrada com saldo.</p>"}
</div>

<div class="secao">
  <h2>7. Atas em Risco (90 dias)</h2>
  ${vencendo.length ? `<table>
    <tr><th>Ata</th><th>Fornecedor</th><th class="num">Saldo (R$)</th><th>Vencimento</th><th>Dias</th></tr>
    ${vencendo.map(x => `<tr><td>${x.a.numero}</td><td>${x.a.fornecedor || "—"}</td><td class="num aviso">${fmtRs(x.sal)}</td><td>${fmtData(x.a.fim)}</td><td class="num">${x.dias}</td></tr>`).join("")}
  </table>` : "<p class='ok'>✓ Nenhuma ata em risco nos próximos 90 dias.</p>"}
</div>

<div class="secao">
  <h2>8. Pendências Financeiras</h2>
  <table class="resumo">
    <tr><th>Indicador</th><th class="valor">Valor</th></tr>
    <tr><td>Retido em notas fiscais</td><td class="valor">${fmtRs(retidoTotal)}</td></tr>
    <tr><td>A pagar com vigência encerrada</td><td class="valor critico">${fmtRs(totalNaoPago)}</td></tr>
  </table>
  ${naoPagos.length ? `<table style="margin-top:8px">
    <tr><th>Contrato</th><th>Fornecedor</th><th class="num">A pagar</th><th>Encerrado em</th></tr>
    ${naoPagos.slice(0, 10).map(x => `<tr><td>${x.c.tipo} ${x.c.numero}</td><td>${x.c.fornecedor || "—"}</td><td class="num critico">${fmtRs(x.aPagar)}</td><td>${fmtData(x.fim)}</td></tr>`).join("")}
  </table>` : "<p class='ok'>✓ Nenhum contrato com vigência encerrada e valor pendente.</p>"}
</div>

<div class="assinatura" style="margin-top:80px">
  <div class="linha"></div>
  <p class="cargo">Airton Alves Mendes de Moura<br>Chefe da Divisão de Material Permanente</p>
</div>

</body></html>`;

  const w = window.open("", "_blank");
  if (!w) return alert("O navegador bloqueou a nova aba. Permita pop-ups para imprimir.");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 300);
}