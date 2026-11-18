import React from "react";
import { Modal, Btn } from "../ui";
import { fmtM, fmtQ, fmtData, nQtd, nVal, escHtml, valorOrdem } from "@/lib/dmp-utils";
import { CONTRATANTE } from "@/lib/dmp-data";
import { CSS_DOC, imprimirDocumento } from "@/lib/imprimir";
import { Printer } from "lucide-react";

export function htmlOrdem(o, c, data) {
  const ata = (data.atas || []).find(a => a.id === c.ataId);
  const linhas = (o.itens || []).map((i, idx) => {
    const b = (data.catalog || []).find(x => x.id === i.benId) || { objeto: "(item removido)", unidade: "—" };
    return `<tr>
      <td class="num">${idx + 1}</td>
      <td>${escHtml(b.objeto)}</td>
      <td>${escHtml(b.unidade || "—")}</td>
      <td class="num">${fmtQ(i.qtd)}</td>
      <td class="num">R$ ${fmtM(i.valor)}</td>
      <td class="num">R$ ${fmtM(nQtd(i.qtd) * nVal(i.valor))}</td>
    </tr>`;
  }).join("");
  const total = valorOrdem(o);

  return `<div class="doc">
    <h1>Ordem de Fornecimento — Contrato nº ${escHtml(c.numero)}</h1>
    <p class="doc-sub">Emitida em ${escHtml(fmtData(o.data))}</p>

    <div class="doc-sec">
      <div class="doc-tit">Dados da contratada</div>
      <div class="doc-body grade">
        <div><span class="rot">Contratada</span>${escHtml(c.fornecedor || "—")}</div>
        <div><span class="rot">CNPJ</span>${escHtml(c.cnpj || "—")}</div>
      </div>
    </div>

    <div class="doc-sec">
      <div class="doc-tit">Dados da contratante</div>
      <div class="doc-body grade">
        <div><span class="rot">Contratante</span>${escHtml(CONTRATANTE.nome)}</div>
        <div><span class="rot">CNPJ</span>${escHtml(CONTRATANTE.cnpj)}</div>
      </div>
    </div>

    <div class="doc-sec">
      <div class="doc-tit">Detalhes do contrato e licitação</div>
      <div class="doc-body grade">
        <div><span class="rot">Contrato nº</span>${escHtml(c.numero || "—")}</div>
        <div><span class="rot">Ata de registro de preços nº</span>${escHtml(ata?.numero || "—")}</div>
        <div><span class="rot">Nota de empenho</span>${escHtml(c.notaEmpenho || "—")}</div>
        <div><span class="rot">Valor total desta ordem</span><b>R$ ${fmtM(total)}</b></div>
      </div>
    </div>

    <div class="doc-sec">
      <div class="doc-tit">Itens solicitados</div>
      <table>
        <thead><tr>
          <th style="width:52px">Ordem</th><th>Objeto</th><th style="width:70px">Unid.</th>
          <th style="width:80px">Qtd.</th><th style="width:110px">Valor unitário</th><th style="width:110px">Valor total</th>
        </tr></thead>
        <tbody>${linhas || `<tr><td colspan="6">Nenhum item informado.</td></tr>`}</tbody>
        <tfoot><tr>
          <td colspan="5" class="num total">VALOR TOTAL GERAL</td>
          <td class="num total">R$ ${fmtM(total)}</td>
        </tr></tfoot>
      </table>
    </div>

    <div class="doc-sec">
      <div class="doc-tit">Informações de entrega</div>
      <div class="doc-body">
        <p><span class="rot">Prazo</span>${escHtml(o.prazoEntrega || "—")}</p>
        <p><span class="rot">Confirmação do recebimento da ordem</span>${escHtml(fmtData(o.dataConfirmacao))}</p>
        <p><span class="rot">Data limite para entrega</span>${escHtml(fmtData(o.dataLimiteEntrega))}</p>
        <p><span class="rot">Endereço</span>${escHtml(o.localEntrega || "—")}</p>
        <p><span class="rot">Observação</span>${escHtml(o.observacao || "—")}</p>
      </div>
    </div>

    <div class="assin">
      <div class="linha"></div>
      <div class="nome">${escHtml(c.fiscalNome || "—")}</div>
      <div>Fiscal do Contrato</div>
      <div>${c.portariaFiscalizacao ? "Portaria " + escHtml(c.portariaFiscalizacao) : ""}${c.pgeaFiscalizacao ? " · PGEA " + escHtml(c.pgeaFiscalizacao) : ""}</div>
    </div>
  </div>`;
}

export default function OrdemDocumento({ o, c, data, onClose }) {
  const html = htmlOrdem(o, c, data);
  return (
    <Modal sobre="Documento auxiliar" titulo={`Ordem de fornecimento — ${c.numero}`} onClose={onClose}
      footer={<>
        <Btn onClick={onClose}>Fechar</Btn>
        <Btn variant="forte" onClick={() => imprimirDocumento(`Ordem de fornecimento — ${c.numero}`, html)}>
          <Printer className="w-4 h-4 inline mr-1" />Imprimir / salvar como PDF
        </Btn>
      </>}>
      <style>{CSS_DOC}</style>
      <div className="border border-slate-300 rounded-sm p-4 bg-white" dangerouslySetInnerHTML={{ __html: html }} />
    </Modal>
  );
}