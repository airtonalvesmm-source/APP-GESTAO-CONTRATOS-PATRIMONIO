import { UNIDADES_ORCAMENTARIAS, CONTRATANTE } from "./dmp-data";

// Resolve a unidade orçamentária pela sigla (ou pelo nome, em cadastros antigos)
export function uoPor(valor) {
  if (!valor) return null;
  return UNIDADES_ORCAMENTARIAS.find(u => u.sigla === valor || u.nome === valor) || null;
}

// Rótulo para exibição: "PGJ — Procuradoria Geral da Justiça"
export function rotuloUO(valor) {
  const uo = uoPor(valor);
  return uo ? `${uo.sigla} — ${uo.nome}` : (valor || "—");
}

// Contratante que figura nos documentos, conforme o órgão gerenciador da ata vinculada
export function contratanteDoContrato(c, atas) {
  const ata = (atas || []).find(a => a.id === c?.ataId);
  const uo = uoPor(ata?.gerenciador);
  if (!uo) return { ...CONTRATANTE, sigla: "PGJ" };
  return { sigla: uo.sigla, nome: `Ministério Público do Estado do Piauí — ${uo.nome}`, cnpj: uo.cnpj };
}