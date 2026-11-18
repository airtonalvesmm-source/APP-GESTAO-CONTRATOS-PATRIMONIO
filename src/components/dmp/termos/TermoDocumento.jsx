import React from "react";
import { Modal, Btn } from "../ui";
import { fmtM, fmtQ, fmtData, nQtd, nVal, escHtml } from "@/lib/dmp-utils";
import { valorPorExtenso } from "@/lib/extenso";
import { CSS_DOC, imprimirDocumento } from "@/lib/imprimir";
import { Printer } from "lucide-react";

function diasEntre(a, b) {
  if (!a || !b) return 0;
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

const CSS_TERMO = `
.doc .t-tit { font-family: Arial, sans-serif; font-weight: bold; font-size: 12.5px; margin: 14px 0 6px; text-transform: uppercase; }
.doc .t-sub { text-align: center; font-family: Arial, sans-serif; font-weight: bold; font-size: 11.5px; color: #C2410C; margin: 0 0 14px; }
.doc .t-box { border: 1px solid #1B2430; padding: 8px 10px; margin-top: 10px; }
.doc .t-rec { margin: 0 0 8px; }
`;

export function htmlTermo(t, c, data) {
  const ata = (data.atas || []).find(a => a.id === c.ataId);
  const lic = ata ? (data.licitacoes || []).find(l => l.id === ata.licitacaoId) : null;
  const pe = lic ? `${lic.numero}/${lic.ano}` : "—";
  const notas = (t.pagamentoIds || []).map(id => (data.pagamentos || []).find(p => p.id === id)).filter(Boolean);
  const total = notas.reduce((s, p) => s + nVal(p.valorNF), 0);
  const itens = (c.itens || []).filter(i => nQtd(i.qtd) > 0);
  const totalItens = itens.reduce((s, i) => s + nQtd(i.qtd) * nVal(i.valor), 0);
  const atraso = !!(t.dataRecebimentoProvisorio && t.dataLimiteEntrega && t.dataRecebimentoProvisorio > t.dataLimiteEntrega);
  const dias = atraso ? diasEntre(t.dataLimiteEntrega, t.dataRecebimentoProvisorio) : 0;
  const notasTxt = notas.map(p => `Nota Fiscal N° ${escHtml(p.nf)}, recebida em ${escHtml(fmtData(t.dataRecebimentoProvisorio || p.dataNF))}`).join("; ");

  const linhas = itens.map((i, idx) => {
    const b = (data.catalog || []).find(x => x.id === i.benId) || { objeto: "(item removido)" };
    const itemAta = ata ? (ata.itens || []).find(x => x.id === i.itemAtaId) : null;
    return `<tr>
      <td>${escHtml(itemAta?.numItem || idx + 1)}</td>
      <td>${escHtml(b.objeto)}</td>
      <td>${escHtml(ata?.numero || "—")}</td>
      <td>${escHtml(pe)}</td>
      <td>${escHtml(fmtQ(i.qtd))}</td>
      <td class="num">R$ ${fmtM(i.valor)}</td>
      <td class="num">R$ ${fmtM(nQtd(i.qtd) * nVal(i.valor))}</td>
    </tr>`;
  }).join("");

  return `<div class="doc">
    <h1 style="text-decoration:underline">Termo Circunstanciado de Recebimento – Lei 14.133/2021.</h1>
    <p class="t-sub">(COMPRAS E SERVIÇOS)</p>

    <div class="t-tit">1. Fundamentação: Art. 140, Lei 14.133/2021.</div>

    <div class="t-tit">2. Informações gerais:</div>
    <p>a. Número do contrato ou instrumento equivalente: ${escHtml((c.tipo || "Contrato").toUpperCase())} Nº ${escHtml(c.numero || "—")}</p>
    <p>b. Valor do Recebimento: R$ ${fmtM(total)} (${escHtml(valorPorExtenso(total))})</p>
    <p>c. Número da Nota de Empenho: ${escHtml(c.notaEmpenho || "—")}</p>
    <p>d. Data do envio da nota fiscal/fatura/boleto pelo contratado/prestador: ${notasTxt || "—"}.</p>

    <div class="t-tit">3. Unidade requisitante/solicitante: <span style="font-weight:normal">Divisão de Material Permanente/CAA</span></div>

    <div class="t-tit">4. Nomeação do servidor/fiscal ou comissão:</div>
    <p>a) Portaria n° ${escHtml(c.portariaFiscalizacao || "—")}</p>

    <div class="t-tit">5. Dados do fiscal:</div>
    <p>a) Nome: ${escHtml(c.fiscalNome || "—")}</p>
    <p>b) CPF: ${escHtml(c.fiscalCpf || "—")}</p>

    <div class="t-tit">6. Contratada (quem está fornecendo ou prestando serviço):</div>
    <p>a) Nome: ${escHtml(c.fornecedor || "—")}</p>
    <p>b) CNPJ/CPF: ${escHtml(c.cnpj || "—")}</p>

    <div class="t-tit">7. Detalhamento do objeto conforme instrumento contratual</div>
    <table>
      <thead><tr><th>Ordem</th><th>Descrição do objeto</th><th>Nº ARP</th><th>Nº P.E.</th><th>Quantidade</th><th>Valor unitário</th><th>Valor global</th></tr></thead>
      <tbody>${linhas || `<tr><td colspan="7">Nenhum item lançado no contrato.</td></tr>`}</tbody>
      <tfoot><tr><td colspan="6" class="total">TOTAL</td><td class="num total">R$ ${fmtM(totalItens)}</td></tr></tfoot>
    </table>

    <div class="t-box">
      <p style="text-align:center"><b><u>PARECER FINAL DO FISCAL OU COMISSÃO DE FISCALIZAÇÃO</u></b>:</p>
      <p><b><u>Recebi o objeto deste contrato, conforme art. 140, da lei 14.133/2021:</u></b></p>
      <p class="t-rec"><b>( ${t.dataRecebimentoProvisorio ? "X" : "&nbsp;&nbsp;"} ) COMPRAS</b>: recebi <b>PROVISORIAMENTE</b> o objeto deste contrato, de forma sumária, com verificação posterior da conformidade do material com as exigências contratuais, na data de: ${escHtml(fmtData(t.dataRecebimentoProvisorio))}</p>
      <p class="t-rec"><b>( ${t.dataRecebimentoDefinitivo ? "X" : "&nbsp;&nbsp;"} ) COMPRAS</b>: recebi <b>DEFINITIVAMENTE</b> o objeto deste contrato, mediante detalhamento, conforme quadro acima, comprovando o atendimento das exigências contratuais, na data de: ${escHtml(fmtData(t.dataRecebimentoDefinitivo))}</p>
    </div>

    <div class="t-tit">8. Anotações complementares:</div>
    <div class="t-box" style="margin-top:0">
      ${t.observacoes ? `<p>${escHtml(t.observacoes)}</p>` : ""}
      <p>Material novo, entregue <b>${atraso ? "FORA do prazo" : "DENTRO do prazo"}</b>, conforme as regras contratuais.</p>
      ${t.dataConfirmacaoOrdem || t.dataLimiteEntrega ? `<p><b>OBSERVAÇÕES:</b></p>
      <p>${t.dataConfirmacaoOrdem ? `A confirmação de recebimento da ordem de fornecimento ocorreu no dia ${escHtml(fmtData(t.dataConfirmacaoOrdem))}. ` : ""}${t.dataLimiteEntrega ? `Diante disso, o prazo para entrega finalizou no dia ${escHtml(fmtData(t.dataLimiteEntrega))}. ` : ""}A efetiva entrega ocorreu no dia ${escHtml(fmtData(t.dataRecebimentoProvisorio))}${atraso ? `, totalizando ${dias} dia(s) corrido(s) de atraso na entrega` : ", dentro do prazo"}.</p>` : ""}
    </div>

    <div class="assin">
      <div class="linha"></div>
      <div class="nome">${escHtml(c.fiscalNome || "—")}</div>
      <div>Fiscal do Contrato</div>
    </div>
  </div>`;
}

export default function TermoDocumento({ t, c, data, onClose }) {
  const html = htmlTermo(t, c, data);
  return (
    <Modal sobre="Documento auxiliar" titulo="Termo circunstanciado de recebimento" onClose={onClose}
      footer={<>
        <Btn onClick={onClose}>Fechar</Btn>
        <Btn variant="forte" onClick={() => imprimirDocumento("Termo de recebimento", `<style>${CSS_TERMO}</style>` + html)}>
          <Printer className="w-4 h-4 inline mr-1" />Imprimir / salvar como PDF
        </Btn>
      </>}>
      <style>{CSS_DOC + CSS_TERMO}</style>
      <div className="border border-slate-300 rounded-sm p-4 bg-white" dangerouslySetInnerHTML={{ __html: html }} />
    </Modal>
  );
}