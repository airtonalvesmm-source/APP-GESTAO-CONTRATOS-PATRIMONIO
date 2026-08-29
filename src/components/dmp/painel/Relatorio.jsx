import { fmtM, fmtQ, fmtData } from "@/lib/dmp-utils";
import { fmtCurto, calcPlanejado, calcContratado, calcSaldoAtas, calcAPagar, calcFunil, calcEconomia, calcTopFornecedores, calcRiscoAtas } from "@/lib/painel-calc";

export function gerarRelatorioPDF(data, ano) {
  const hoje = new Date();
  const dataExt = hoje.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const planejado = calcPlanejado(data.pca, ano);
  const contratado = calcContratado(data.contratos, data.ocorrencias, ano);
  const saldoAtas = calcSaldoAtas(data.atas, data.contratos);
  const aPagar = calcAPagar(data.contratos, data.pagamentos, data.ocorrencias);
  const f = calcFunil(ano, data);
  const eco = calcEconomia(data.contratos, data.pca, ano);
  const { top, total } = calcTopFornecedores(data.contratos, data.ocorrencias);
  const riscoAtas = calcRiscoAtas(data.atas, data.contratos);
  const vencidas = riscoAtas.filter(x => x.dias < 0).sort((a, b) => b.sal - a.sal);
  const vence90 = riscoAtas.filter(x => x.dias >= 0 && x.dias <= 90).sort((a, b) => b.sal - a.sal);
  const top5 = top.slice(0, 5);

  const fmtRs = (n) => `R$ ${fmtM(n)}`;
  const pct = (a, b) => b ? `${Math.round(a / b * 100)}%` : "—";

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
  td.num, th.num { text-align: right; font-family: 'Courier New', monospace; white-space: nowrap; }
  .resumo td { font-size: 13px; }
  .resumo td.valor { font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; text-align: right; }
  .funil td { font-size: 12.5px; }
  .funil td.valor { font-family: 'Courier New', monospace; font-weight: bold; text-align: right; }
  .barra { height: 14px; background: #E8EAE5; border-radius: 2px; overflow: hidden; }
  .barra > div { height: 100%; background: #4A5568; border-radius: 2px; }
  .assinatura { margin-top: 60px; text-align: center; page-break-inside: avoid; }
  .linha { border-top: 1px solid #333; width: 280px; margin: 0 auto 4px; }
  .cargo { font-size: 12px; color: #555; }
  .critico { color: #B91C1C; font-weight: bold; }
  .aviso { color: #B45309; font-weight: bold; }
</style></head><body>

<div class="capa">
  <h1>RELATÓRIO EXECUTIVO DE CONTRATAÇÕES</h1>
  <p class="sub">Divisão de Material Permanente · Coordenadoria de Apoio Administrativo<br>Ministério Público do Estado do Piauí</p>
  <p class="data">Exercício ${ano}<br>Teresina, ${dataExt}</p>
  <div class="assinatura">
    <div class="linha"></div>
    <p class="cargo">Airton Alves Mendes de Moura<br>Chefe da Divisão de Material Permanente</p>
  </div>
</div>

<div class="secao">
  <h2>1. Resumo Financeiro</h2>
  <table class="resumo">
    <tr><th>Indicador</th><th>Valor</th><th>Observação</th></tr>
    <tr><td>Planejado (PCA ${ano})</td><td class="valor">${fmtRs(planejado)}</td><td>Σ (qtd × vlr. unit.) dos itens do PCA</td></tr>
    <tr><td>Contratado</td><td class="valor">${fmtRs(contratado)}</td><td>${planejado ? pct(contratado, planejado) + " do planejado" : "—"}</td></tr>
    <tr><td>Saldo de ata a empenhar</td><td class="valor">${fmtRs(saldoAtas)}</td><td>Atas vigentes com saldo</td></tr>
    <tr><td>A pagar</td><td class="valor">${fmtRs(aPagar)}</td><td>Empenhado − pago em contratos vigentes</td></tr>
  </table>
</div>

<div class="secao">
  <h2>2. Funil de Execução</h2>
  <table class="funil">
    <tr><th>Etapa</th><th>Valor</th><th>% anterior</th><th>Proporção</th></tr>
    ${[
      { l: "Planejado (PCA)", v: f.planejado, b: null },
      { l: "Licitado (homologado)", v: f.licitado, b: f.planejado },
      { l: "Registrado em ata", v: f.registrado, b: f.licitado },
      { l: "Contratado/empenhado", v: f.contratado, b: f.registrado },
      { l: "Pago", v: f.pago, b: f.contratado }
    ].map(b => {
      const max = Math.max(f.planejado, f.licitado, f.registrado, f.contratado, f.pago, 1);
      const w = max ? Math.max(2, b.v / max * 100) : 2;
      return `<tr><td>${b.l}</td><td class="valor">${fmtRs(b.v)}</td><td>${b.b ? pct(b.v, b.b) : "100%"}</td><td><div class="barra"><div style="width:${w}%"></div></div></td></tr>`;
    }).join("")}
  </table>
  ${eco.planejadoLicitado ? `<p style="font-size:12px;margin-top:8px"><b>Economia obtida:</b> ${fmtRs(eco.economia)} (${eco.pct.toFixed(1)}% do valor planejado dos itens licitados).</p>` : ""}
</div>

<div class="secao">
  <h2>3. Concentração de Fornecedores — Top 5</h2>
  ${top5.length ? `<table>
    <tr><th>#</th><th>Fornecedor</th><th class="num">Empenhado</th><th class="num">%</th></tr>
    ${top5.map((forn, i) => `<tr><td>${i + 1}</td><td>${forn.nome}</td><td class="num">${fmtRs(forn.valor)}</td><td class="num">${total ? (forn.valor / total * 100).toFixed(1) : "0"}%</td></tr>`).join("")}
  </table>
  <p style="font-size:11px;margin-top:6px">Os 5 maiores concentram ${total ? (top5.reduce((t, x) => t + x.valor, 0) / total * 100).toFixed(1) : "0"}% do valor empenhado.</p>` : "<p>Nenhum contrato lançado.</p>"}
</div>

<div class="secao">
  <h2>4. Atas em Risco de Perda</h2>
  ${(vencidas.length || vence90.length) ? `<table>
    <tr><th>Ata</th><th>Fornecedor</th><th class="num">Saldo (R$)</th><th class="num">Qtd. un.</th><th>Vencimento</th><th>Situação</th></tr>
    ${vencidas.map(x => `<tr><td>${x.a.numero}</td><td>${x.a.fornecedor || "—"}</td><td class="num critico">${fmtRs(x.sal)}</td><td class="num">${fmtQ(x.qtdSaldo)}</td><td>${fmtData(x.a.fim)}</td><td class="critico">Vencida</td></tr>`).join("")}
    ${vence90.map(x => `<tr><td>${x.a.numero}</td><td>${x.a.fornecedor || "—"}</td><td class="num aviso">${fmtRs(x.sal)}</td><td class="num">${fmtQ(x.qtdSaldo)}</td><td>${fmtData(x.a.fim)}</td><td class="aviso">Vence em ${x.dias} dias</td></tr>`).join("")}
  </table>` : "<p>Nenhuma ata com saldo em risco.</p>"}
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