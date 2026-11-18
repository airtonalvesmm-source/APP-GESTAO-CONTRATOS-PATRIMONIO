import React from "react";
import { Modal, Btn } from "../ui";
import { fmtM, fmtData, nVal, escHtml } from "@/lib/dmp-utils";
import { CONTRATANTE } from "@/lib/dmp-data";
import { CSS_DOC, imprimirDocumento } from "@/lib/imprimir";
import { Printer } from "lucide-react";

function diasEntre(a, b) {
  if (!a || !b) return 0;
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

export function htmlTermo(t, c, data) {
  const ata = (data.atas || []).find(a => a.id === c.ataId);
  const notas = (t.pagamentoIds || []).map(id => (data.pagamentos || []).find(p => p.id === id)).filter(Boolean);
  const total = notas.reduce((s, p) => s + nVal(p.valorNF), 0);
  const atraso = !!(t.dataRecebimentoProvisorio && t.dataLimiteEntrega && t.dataRecebimentoProvisorio > t.dataLimiteEntrega);
  const dias = atraso ? diasEntre(t.dataLimiteEntrega, t.dataRecebimentoProvisorio) : 0;

  const linhasNotas = notas.map(p => `<tr>
    <td>${escHtml(p.nf)}</td>
    <td>${escHtml(fmtData(p.dataNF))}</td>
    <td class="num">R$ ${fmtM(p.valorNF)}</td>
    <td>${escHtml(p.situacao || "Pendente")}</td>
  </tr>`).join("");

  return `<div class="doc">
    <h1>Termo Circunstanciado de Recebimento</h1>
    <p class="doc-sub">Lei nº 14.133/2021 — compras e serviços${t.numero ? " · Termo nº " + escHtml(t.numero) : ""}</p>

    <div class="doc-sec">
      <div class="doc-tit">1. Dados do contrato</div>
      <div class="doc-body grade">
        <div><span class="rot">Contrato nº</span>${escHtml(c.numero || "—")}</div>
        <div><span class="rot">Ata de registro de preços</span>${escHtml(ata?.numero || "—")}</div>
        <div><span class="rot">Nota de empenho</span>${escHtml(c.notaEmpenho || "—")}</div>
        <div><span class="rot">Processo</span>${escHtml(c.processo || "—")}</div>
      </div>
    </div>

    <div class="doc-sec">
      <div class="doc-tit">2. Contratante e contratada</div>
      <div class="doc-body grade">
        <div><span class="rot">Contratante</span>${escHtml(CONTRATANTE.nome)}<br />CNPJ ${escHtml(CONTRATANTE.cnpj)}</div>
        <div><span class="rot">Contratada</span>${escHtml(c.fornecedor || "—")}<br />CNPJ ${escHtml(c.cnpj || "—")}</div>
      </div>
    </div>

    <div class="doc-sec">
      <div class="doc-tit">3. Objeto</div>
      <div class="doc-body">${escHtml(c.objeto || "Fornecimento dos itens contratados.")}</div>
    </div>

    <div class="doc-sec">
      <div class="doc-tit">4. Notas fiscais objeto do recebimento</div>
      <table>
        <thead><tr><th style="width:130px">Nota fiscal</th><th style="width:110px">Emissão</th><th style="width:130px">Valor da nota</th><th>Situação</th></tr></thead>
        <tbody>${linhasNotas || `<tr><td colspan="4">Nenhuma nota selecionada.</td></tr>`}</tbody>
        <tfoot><tr><td colspan="2" class="num total">TOTAL</td><td class="num total">R$ ${fmtM(total)}</td><td></td></tr></tfoot>
      </table>
    </div>

    <div class="doc-sec">
      <div class="doc-tit">5. Recebimento</div>
      <div class="doc-body grade">
        <div><span class="rot">Confirmação do recebimento da ordem de fornecimento</span>${escHtml(fmtData(t.dataConfirmacaoOrdem))}</div>
        <div><span class="rot">Data limite para entrega</span>${escHtml(fmtData(t.dataLimiteEntrega))}</div>
        <div><span class="rot">Recebimento provisório</span>${escHtml(fmtData(t.dataRecebimentoProvisorio))}</div>
        <div><span class="rot">Recebimento definitivo</span>${escHtml(fmtData(t.dataRecebimentoDefinitivo))}</div>
      </div>
    </div>

    <div class="doc-sec">
      <div class="doc-tit">6. Anotações complementares</div>
      <div class="doc-body">
        ${atraso ? `<p class="destaque"><b>Entrega em atraso.</b> O recebimento provisório ocorreu em ${escHtml(fmtData(t.dataRecebimentoProvisorio))}, após a data limite para entrega de ${escHtml(fmtData(t.dataLimiteEntrega))} — ${dias} dia(s) de atraso.</p>` : `<p>Sem ocorrências de atraso registradas.</p>`}
        ${t.observacoes ? `<p style="margin-top:6px">${escHtml(t.observacoes)}</p>` : ""}
      </div>
    </div>

    <div class="doc-sec">
      <div class="doc-tit">7. Fiscalização</div>
      <div class="doc-body grade">
        <div><span class="rot">Fiscal do contrato</span>${escHtml(c.fiscalNome || "—")}</div>
        <div><span class="rot">Portaria de fiscalização</span>${escHtml(c.portariaFiscalizacao || "—")}</div>
        <div><span class="rot">PGEA de fiscalização</span>${escHtml(c.pgeaFiscalizacao || "—")}</div>
      </div>
    </div>

    <p style="margin-top:14px">Para constar, o objeto acima discriminado foi recebido ${atraso ? "com a anotação de atraso registrada" : "nas condições contratadas"}, e este termo é lavrado para os fins do art. 140 da Lei nº 14.133/2021.</p>

    <div class="assin">
      <div class="linha"></div>
      <div class="nome">${escHtml(c.fiscalNome || "—")}</div>
      <div>Fiscal do Contrato</div>
      <div>${c.portariaFiscalizacao ? "Portaria " + escHtml(c.portariaFiscalizacao) : ""}</div>
    </div>
  </div>`;
}

export default function TermoDocumento({ t, c, data, onClose }) {
  const html = htmlTermo(t, c, data);
  return (
    <Modal sobre="Documento auxiliar" titulo={`Termo de recebimento${t.numero ? " " + t.numero : ""}`} onClose={onClose}
      footer={<>
        <Btn onClick={onClose}>Fechar</Btn>
        <Btn variant="forte" onClick={() => imprimirDocumento(`Termo de recebimento ${t.numero || ""}`, html)}>
          <Printer className="w-4 h-4 inline mr-1" />Imprimir / salvar como PDF
        </Btn>
      </>}>
      <style>{CSS_DOC}</style>
      <div className="border border-slate-300 rounded-sm p-4 bg-white" dangerouslySetInnerHTML={{ __html: html }} />
    </Modal>
  );
}