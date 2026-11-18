import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import JSZip from 'npm:jszip@3.10.2';

// Backup integral do banco: exclusivo para administradores.
// A verificação de papel acontece aqui, no servidor, e não apenas na interface.

const LOTE = 500;

const ENTIDADES = [
  { nome: 'CatalogItem', arquivo: 'catalog_items' },
  { nome: 'PCAItem', arquivo: 'pca_items' },
  { nome: 'Licitacao', arquivo: 'licitacoes' },
  { nome: 'Ata', arquivo: 'atas' },
  { nome: 'Contrato', arquivo: 'contratos' },
  { nome: 'Fornecedor', arquivo: 'fornecedores' },
  { nome: 'Pagamento', arquivo: 'pagamentos' },
  { nome: 'Ocorrencia', arquivo: 'ocorrencias' },
  { nome: 'DFD', arquivo: 'dfds' },
  { nome: 'Subcategoria', arquivo: 'subcategorias' },
  { nome: 'Categoria', arquivo: 'categorias' },
  { nome: 'Departamento', arquivo: 'departamentos' },
  { nome: 'BemPatrimonial', arquivo: 'bens_patrimoniais' },
  { nome: 'MovimentacaoEstoque', arquivo: 'movimentacoes_estoque' },
  { nome: 'Reserva', arquivo: 'reservas' },
  { nome: 'OrdemFornecimento', arquivo: 'ordens_fornecimento' },
  { nome: 'TermoRecebimento', arquivo: 'termos_recebimento' }
];

const USER_FIELDS = ['id', 'created_date', 'updated_date', 'full_name', 'email', 'role'];

async function listarTudo(entity) {
  const out = [];
  let cursor;
  for (;;) {
    const opts = { limit: LOTE, sort: '-created_date' };
    if (cursor) opts.cursor = cursor;
    const page = await entity.filter({}, opts);
    out.push(...(page.items || []));
    if (!page.has_more || !page.next_cursor) break;
    cursor = page.next_cursor;
  }
  return out;
}

const PREFIXO_FORMULA = /^[=+\-@\t\r]/;

function escaparCSV(val) {
  if (val === null || val === undefined) return '';
  let s = typeof val === 'object' ? JSON.stringify(val) : String(val);
  if (PREFIXO_FORMULA.test(s)) s = "'" + s;
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function gerarCSV(registros) {
  if (!registros.length) return '';
  const chaves = new Set();
  registros.forEach(r => Object.keys(r).forEach(k => chaves.add(k)));
  const ordem = { id: 0, created_date: 1, updated_date: 2, created_by_id: 3 };
  const cols = Array.from(chaves).sort((a, b) => {
    const oa = ordem[a] ?? 99, ob = ordem[b] ?? 99;
    if (oa !== ob) return oa - ob;
    return a.localeCompare(b);
  });
  const linhas = [cols.join(',')];
  registros.forEach(r => linhas.push(cols.map(c => escaparCSV(r[c])).join(',')));
  return linhas.join('\n');
}

function toBase64(bytes) {
  let binario = '';
  const passo = 0x8000;
  for (let i = 0; i < bytes.length; i += passo) {
    binario += String.fromCharCode.apply(null, bytes.subarray(i, i + passo));
  }
  return btoa(binario);
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Não autenticado.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Somente administradores podem gerar o backup integral.' }, { status: 403 });

    const db = base44.asServiceRole.entities;
    const zip = new JSZip();
    const detalhes = [];
    let tabelas = 0, registros = 0;
    const falhas = [];

    for (const ent of ENTIDADES) {
      try {
        const lista = await listarTudo(db[ent.nome]);
        zip.file(`${ent.arquivo}.csv`, gerarCSV(lista));
        tabelas++;
        registros += lista.length;
        detalhes.push({ tabela: ent.nome, arquivo: `${ent.arquivo}.csv`, registros: lista.length, ok: true });
      } catch (e) {
        const msg = e?.message || String(e);
        falhas.push({ tabela: ent.nome, erro: msg });
        detalhes.push({ tabela: ent.nome, arquivo: `${ent.arquivo}.csv`, registros: 0, ok: false, erro: msg });
      }
    }

    // Usuários: apenas campos seguros, sem segredos
    try {
      const users = await db.User.list('-created_date', 5000);
      const seguros = (users || []).map(u => {
        const safe = {};
        USER_FIELDS.forEach(f => { if (u[f] !== undefined) safe[f] = u[f]; });
        return safe;
      });
      zip.file('users.csv', gerarCSV(seguros));
      tabelas++;
      registros += seguros.length;
      detalhes.push({ tabela: 'User', arquivo: 'users.csv', registros: seguros.length, ok: true });
    } catch (e) {
      const msg = e?.message || String(e);
      falhas.push({ tabela: 'User', erro: msg });
      detalhes.push({ tabela: 'User', arquivo: 'users.csv', registros: 0, ok: false, erro: msg });
    }

    const resumoLinhas = ['tabela,arquivo,registros,status,erro'];
    detalhes.forEach(d => {
      resumoLinhas.push([escaparCSV(d.tabela), escaparCSV(d.arquivo || ''), d.registros ?? '', d.ok ? 'ok' : 'erro', escaparCSV(d.erro || '')].join(','));
    });
    zip.file('_resumo_backup.csv', resumoLinhas.join('\n'));

    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const data = new Date().toISOString().slice(0, 10);

    return Response.json({
      nomeArquivo: `backup_completo_${data}.zip`,
      tamanho: bytes.length,
      base64: toBase64(bytes),
      tabelas,
      registros,
      falhas,
      detalhes
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}