import { base44 } from "@/api/base44Client";

const LOTE = 500;

// Carrega todos os registros de uma entidade, em lotes, sem limite de 500
export async function listarTudo(nome) {
  const out = [];
  for (let skip = 0; ; skip += LOTE) {
    const lote = await base44.entities[nome].list("-created_date", LOTE, skip);
    out.push(...lote);
    if (lote.length < LOTE) return out;
  }
}

export const ENTIDADES = {
  catalog: "CatalogItem", pca: "PCAItem", licitacoes: "Licitacao", atas: "Ata", contratos: "Contrato",
  fornecedores: "Fornecedor", pagamentos: "Pagamento", ocorrencias: "Ocorrencia", dfds: "DFD",
  subcategorias: "Subcategoria", categorias: "Categoria",
  departamentos: "Departamento", bens: "BemPatrimonial", movimentacoes: "MovimentacaoEstoque",
  reservas: "Reserva", ordens: "OrdemFornecimento", termos: "TermoRecebimento"
};

export async function carregarDados() {
  const chaves = Object.keys(ENTIDADES);
  const res = await Promise.all(chaves.map(k => listarTudo(ENTIDADES[k])));
  return Object.fromEntries(chaves.map((k, i) => [k, res[i]]));
}