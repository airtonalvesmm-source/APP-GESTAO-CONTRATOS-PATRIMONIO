// Geração do relatório unificado de Contratos e Pagamentos
import { fmtM, fmtData, valorEmpenhado, fimVigente, ocorrenciasDe, totaisPagamento, baixarCSV } from "./dmp-utils";
import { FALTAS } from "./dmp-data";

// Monta as linhas do relatório no formato da planilha de referência
export function linhasRelatorioUnificado(contratos, pagamentos, ocorrencias, atas) {
  const header = [
    "Tipo", "Número", "Ano", "SEI Contrato", "Nota de empenho", "Ata vinculada",
    "Fornecedor", "CNPJ", "Objeto", "Situação", "Início da vigência", "Fim da vigência",
    "Qtd. de itens", "Valor do Contrato", "STATUS", "Atraso – Retenção"
  ];
  const rows = (contratos || []).map(c => {
    const a = atas.find(x => x.id === c.ataId);
    const ocs = ocorrenciasDe(c.id, ocorrencias);
    const tp = totaisPagamento(c, pagamentos, ocorrencias);
    const temAtraso = ocs.some(o => FALTAS.includes(o.tipo));
    const temRetencao = tp.retido > 0;
    return [
      c.tipo || "Contrato",
      c.numero || "",
      c.inicio?.slice(0, 4) || c.fim?.slice(0, 4) || "",
      c.processo || "",
      c.notaEmpenho || "",
      a?.numero || "",
      c.fornecedor || "",
      c.cnpj || "",
      c.objeto || "",
      c.situacao || "",
      fmtData(c.inicio),
      fmtData(fimVigente(c, ocorrencias)),
      (c.itens || []).length,
      fmtM(valorEmpenhado(c, ocorrencias)),
      c.statusEntrega || "Aguardando entrega",
      (temAtraso || temRetencao) ? "Sim" : "Não"
    ];
  });
  return [header, ...rows];
}

// Exporta o relatório unificado como CSV
export function exportarRelatorioUnificado(contratos, pagamentos, ocorrencias, atas) {
  const linhas = linhasRelatorioUnificado(contratos, pagamentos, ocorrencias, atas);
  baixarCSV("relatorio-unificado-contratos-pagamentos.csv", linhas);
}

// Gera o HTML para impressão do relatório unificado
export function htmlRelatorioUnificado(contratos, pagamentos, ocorrencias, atas) {
  const linhas = linhasRelatorioUnificado(contratos, pagamentos, ocorrencias, atas);
  const [header, ...rows] = linhas;
  const ths = header.map(h => `<th>${h}</th>`).join("");
  const trs = rows.map(r => {
    const atrasoSim = r[15] === "Sim";
    return "<tr>" + r.map((c, i) => {
      const cls = (i === 15 && atrasoSim) ? ' style="background:#FF8C00;color:#fff;font-weight:bold;text-align:center;"' : (i === 14 ? ' style="text-align:center;"' : "");
      return `<td${cls}>${c}</td>`;
    }).join("") + "</tr>";
  }).join("");
  const total = rows.length;
  const dataHora = new Date().toLocaleString("pt-BR");
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório Unificado — Contratos e Pagamentos</title>
    <style>
      body { font-family: Arial, sans-serif; color: #1B2430; max-width: 1400px; margin: 0 auto; padding: 14mm; }
      h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
      .meta { text-align: center; font-size: 11px; color: #64748b; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background: #1e293b; color: #fff; border: 1px solid #334155; padding: 5px 7px; text-align: left; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; }
      td { border: 1px solid #cbd5e1; padding: 4px 7px; vertical-align: top; }
      tr:nth-child(even) td { background: #f8fafc; }
      .footer { margin-top: 12px; font-size: 11px; color: #64748b; text-align: right; }
      @media print { body { padding: 8mm; } }
    </style></head><body>
    <h1>RELATÓRIO UNIFICADO — CONTRATOS E PAGAMENTOS</h1>
    <p class="meta">DMP / CAA — Ministério Público do Estado do Piauí · Emitido em ${dataHora}</p>
    <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
    <p class="footer">${total} contrato(s) · Atraso – Retenção = Sim indica descumprimento registrado ou pagamento retido</p>
    </body></html>`;
}

// Abre janela de impressão do relatório
export function imprimirRelatorioUnificado(contratos, pagamentos, ocorrencias, atas) {
  const html = htmlRelatorioUnificado(contratos, pagamentos, ocorrencias, atas);
  const w = window.open("", "_blank");
  if (!w) return alert("O navegador bloqueou a nova aba. Permita pop-ups para imprimir.");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 300);
}