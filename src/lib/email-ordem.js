import { contratanteDoContrato } from "./unidade-orcamentaria";

// Texto de encaminhamento da ordem de fornecimento, pronto para copiar para o e-mail.
export function textoEmailOrdem(o, c, data) {
  const ata = (data.atas || []).find(a => a.id === c.ataId);
  const contratante = contratanteDoContrato(c, data.atas);
  const docs = [
    `Contrato Nº ${c.numero || "—"}`,
    c.notaEmpenho ? `Nota de Empenho nº ${c.notaEmpenho}` : "Nota de Empenho",
    "Termo de Referência",
    "Ordem de Fornecimento"
  ];

  return `Prezados(as),

Em conformidade com o ${c.tipo === "Nota de empenho" ? "Empenho" : "Contrato"} nº ${c.numero || "—"}, celebrado entre o ${contratante.nome} (CNPJ ${contratante.cnpj}) e a empresa ${c.fornecedor || "—"}, inscrita no CNPJ (MF) sob o nº ${c.cnpj || "—"}, encaminhamos a presente Ordem de Fornecimento${ata?.numero ? ` (Ata de Registro de Preços nº ${ata.numero})` : ""}, com a finalidade de formalizar o início da contagem do prazo para entrega dos bens contratados.

Para sua análise e registro, seguem anexados os seguintes documentos:
${docs.map(d => "- " + d).join("\n")}

Solicitamos a confirmação do recebimento desta Ordem de Fornecimento, por meio de resposta a este e-mail, a fim de viabilizar a continuidade dos trâmites administrativos pertinentes.

Desde já, agradecemos a atenção e colaboração.`;
}