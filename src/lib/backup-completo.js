import { base44 } from "@/api/base44Client";
import JSZip from "jszip";

const LOTE = 500;

// 16 entidades: 15 customizadas + User (tratada separadamente, sem expor segredos)
const ENTIDADES_BACKUP = [
  { nome: "CatalogItem", arquivo: "catalog_items" },
  { nome: "PCAItem", arquivo: "pca_items" },
  { nome: "Licitacao", arquivo: "licitacoes" },
  { nome: "Ata", arquivo: "atas" },
  { nome: "Contrato", arquivo: "contratos" },
  { nome: "Fornecedor", arquivo: "fornecedores" },
  { nome: "Pagamento", arquivo: "pagamentos" },
  { nome: "Ocorrencia", arquivo: "ocorrencias" },
  { nome: "DFD", arquivo: "dfds" },
  { nome: "Subcategoria", arquivo: "subcategorias" },
  { nome: "Categoria", arquivo: "categorias" },
  { nome: "Departamento", arquivo: "departamentos" },
  { nome: "BemPatrimonial", arquivo: "bens_patrimoniais" },
  { nome: "MovimentacaoEstoque", arquivo: "movimentacoes_estoque" },
  { nome: "Reserva", arquivo: "reservas" },
  { nome: "OrdemFornecimento", arquivo: "ordens_fornecimento" },
  { nome: "TermoRecebimento", arquivo: "termos_recebimento" },
  { nome: "User", arquivo: "users", especial: true }
];

// Campos seguros da entidade User — sem segredos, tokens ou dados sensíveis
const USER_FIELDS = ["id", "created_date", "updated_date", "full_name", "email", "role"];

// Paginação por cursor para entidades normais — preserva todos os registros
async function listarTudoCursor(nome) {
  const out = [];
  let cursor = undefined;
  for (;;) {
    const opts = { limit: LOTE, sort: "-created_date" };
    if (cursor) opts.cursor = cursor;
    const page = await base44.entities[nome].filter({}, opts);
    out.push(...(page.items || []));
    if (!page.has_more || !page.next_cursor) break;
    cursor = page.next_cursor;
  }
  return out;
}

// User: sem cursor (não suportado), usa list com limite alto; filtra apenas campos seguros
async function listarUsers() {
  const users = await base44.entities.User.list("-created_date", 5000);
  return (users || []).map(u => {
    const safe = {};
    USER_FIELDS.forEach(f => { if (u[f] !== undefined) safe[f] = u[f]; });
    return safe;
  });
}

// Escapa CSV — previne injeção de fórmula em planilhas (mesma proteção que csvLinha)
const PREFIXO_FORMULA = /^[=+\-@\t\r]/;
function escaparCSV(val) {
  if (val === null || val === undefined) return "";
  let s;
  if (typeof val === "object") s = JSON.stringify(val);
  else s = String(val);
  if (PREFIXO_FORMULA.test(s)) s = "'" + s;
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function gerarCSV(registros) {
  if (!registros.length) return "";
  // Coleta todas as chaves únicas — preserva campos de relacionamento dinamicamente
  const chaves = new Set();
  registros.forEach(r => Object.keys(r).forEach(k => chaves.add(k)));
  // Ordena: id, campos built-in, depois o restante alfabético
  const ordem = { id: 0, created_date: 1, updated_date: 2, created_by_id: 3 };
  const cols = Array.from(chaves).sort((a, b) => {
    const oa = ordem[a] ?? 99, ob = ordem[b] ?? 99;
    if (oa !== ob) return oa - ob;
    return a.localeCompare(b);
  });
  const linhas = [cols.join(",")];
  registros.forEach(r => {
    linhas.push(cols.map(c => escaparCSV(r[c])).join(","));
  });
  return linhas.join("\n");
}

export async function gerarBackupCompleto(onProgress) {
  const zip = new JSZip();
  const resumo = { tabelas: 0, registros: 0, falhas: [], detalhes: [] };

  for (let i = 0; i < ENTIDADES_BACKUP.length; i++) {
    const ent = ENTIDADES_BACKUP[i];
    try {
      if (onProgress) onProgress({ atual: i + 1, total: ENTIDADES_BACKUP.length, tabela: ent.nome, status: "lendo" });
      const registros = ent.especial ? await listarUsers() : await listarTudoCursor(ent.nome);
      const csv = gerarCSV(registros);
      zip.file(`${ent.arquivo}.csv`, csv);
      resumo.tabelas++;
      resumo.registros += registros.length;
      resumo.detalhes.push({ tabela: ent.nome, arquivo: `${ent.arquivo}.csv`, registros: registros.length, ok: true });
      if (onProgress) onProgress({ atual: i + 1, total: ENTIDADES_BACKUP.length, tabela: ent.nome, status: "ok", count: registros.length });
    } catch (e) {
      const msg = e?.message || String(e);
      resumo.falhas.push({ tabela: ent.nome, erro: msg });
      resumo.detalhes.push({ tabela: ent.nome, registros: 0, ok: false, erro: msg });
      if (onProgress) onProgress({ atual: i + 1, total: ENTIDADES_BACKUP.length, tabela: ent.nome, status: "erro", erro: msg });
    }
  }

  // Arquivo de resumo dentro do ZIP
  const resumoLinhas = ["tabela,arquivo,registros,status,erro"];
  resumo.detalhes.forEach(d => {
    resumoLinhas.push([
      escaparCSV(d.tabela),
      escaparCSV(d.arquivo || ""),
      d.registros ?? "",
      d.ok ? "ok" : "erro",
      escaparCSV(d.erro || "")
    ].join(","));
  });
  zip.file("_resumo_backup.csv", resumoLinhas.join("\n"));

  const blob = await zip.generateAsync({ type: "blob" });
  const data = new Date().toISOString().slice(0, 10);
  const nomeArquivo = `backup_completo_${data}.zip`;

  // Dispara download no navegador
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  return { ...resumo, nomeArquivo, tamanho: blob.size };
}