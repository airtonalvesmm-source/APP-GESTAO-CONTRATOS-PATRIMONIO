import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Exclusão de registros com conferência de dependentes no servidor.
// Política: registros que já produziram efeito (contrato, nota, ordem, reserva, ata, item de plano)
// não são apagados — devem ser cancelados/inativados para preservar o histórico:
//   contrato/empenho -> situação "Cancelado"; nota fiscal -> "Cancelado";
//   ordem de fornecimento -> "cancelada"; reserva -> "cancelada";
//   item de catálogo -> "Excluir do catálogo" (ocultar); item do plano -> "Sobrestar".
const ENTIDADES = {
  Fornecedor: {
    modelo: 'Fornecedor',
    deps: async (db, id) => {
      const [atas, contratos] = await Promise.all([
        db.Ata.filter({ fornecedorId: id }, '-created_date', 500),
        db.Contrato.filter({ fornecedorId: id }, '-created_date', 500),
      ]);
      return [
        ...atas.map((a) => `ata ${a.numero}`),
        ...contratos.map((c) => `${c.tipo || 'contrato'} ${c.numero}`),
      ];
    },
    dica: 'Mantenha o fornecedor cadastrado: ele é o histórico das atas e contratos já firmados.',
  },
  Licitacao: {
    modelo: 'Licitacao',
    deps: async (db, id) => {
      const atas = await db.Ata.filter({ licitacaoId: id }, '-created_date', 500);
      return atas.map((a) => `ata ${a.numero}`);
    },
    dica: 'Altere o status da licitação (Revogado/Anulado) para encerrá-la sem perder o histórico.',
  },
  Ata: {
    modelo: 'Ata',
    deps: async (db, id) => {
      const contratos = await db.Contrato.filter({ ataId: id }, '-created_date', 500);
      return contratos.map((c) => `${c.tipo || 'contrato'} ${c.numero}`);
    },
    dica: 'Atas com contratos vinculados devem ser mantidas para preservar o saldo e o histórico.',
  },
  CatalogItem: {
    modelo: 'CatalogItem',
    deps: async (db, id) => {
      const [pca, bens, reservas, atas, contratos] = await Promise.all([
        db.PCAItem.filter({ benId: id }, '-created_date', 500),
        db.BemPatrimonial.filter({ benId: id }, '-created_date', 500),
        db.Reserva.filter({ benId: id }, '-created_date', 500),
        db.Ata.filter({}, '-created_date', 1000),
        db.Contrato.filter({}, '-created_date', 1000),
      ]);
      const emAtas = atas.filter((a) => (a.itens || []).some((i) => i.benId === id)).map((a) => `ata ${a.numero}`);
      const emContratos = contratos.filter((c) => (c.itens || []).some((i) => i.benId === id)).map((c) => `${c.tipo || 'contrato'} ${c.numero}`);
      return [
        ...pca.map((p) => `item do plano ${p.exercicio}`),
        ...bens.map((b) => `bem ${b.placa}`),
        ...reservas.map((r) => `reserva ${r.id}`),
        ...emAtas,
        ...emContratos,
      ];
    },
    dica: 'Use "Excluir do catálogo" (oculta o item das listas) em vez de apagar o registro.',
  },
  Departamento: {
    modelo: 'Departamento',
    deps: async (db, id) => {
      const [bens, reservas, movs] = await Promise.all([
        db.BemPatrimonial.filter({ departamentoId: id }, '-created_date', 500),
        db.Reserva.filter({ departamentoId: id }, '-created_date', 500),
        db.MovimentacaoEstoque.filter({ departamentoId: id }, '-created_date', 500),
      ]);
      return [
        ...bens.map((b) => `bem ${b.placa}`),
        ...reservas.map((r) => `reserva ${r.id}`),
        ...movs.map((m) => `movimentação ${m.data || m.id}`),
      ];
    },
    dica: 'Departamentos com bens ou movimentações não podem ser excluídos; mantenha o histórico.',
  },
  PCAItem: {
    modelo: 'PCAItem',
    deps: async (db, id) => {
      const [contratos, dfds] = await Promise.all([
        db.Contrato.filter({}, '-created_date', 1000),
        db.DFD.filter({}, '-created_date', 1000),
      ]);
      const emContratos = contratos.filter((c) => (c.itens || []).some((i) => i.pcaId === id)).map((c) => `${c.tipo || 'contrato'} ${c.numero}`);
      const emDfds = dfds.filter((d) => (d.itensIds || []).includes(id)).map((d) => `DFD ${d.processo || '(sem processo)'}`);
      return [...emContratos, ...emDfds];
    },
    dica: 'Use "Sobrestar" para retirar o item do plano sem apagar o vínculo com contratos e DFDs.',
  },
  Categoria: {
    modelo: 'Categoria',
    deps: async (db, id) => {
      const cat = await db.Categoria.get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!cat) return [];
      const [itens, subs] = await Promise.all([
        db.CatalogItem.filter({ categoria: cat.nome }, '-created_date', 500),
        db.Subcategoria.filter({ categoria: cat.nome }, '-created_date', 500),
      ]);
      return [
        ...itens.map((b) => `bem ${b.objeto}`),
        ...subs.map((s) => `subcategoria ${s.nome}`),
      ];
    },
    dica: 'Categorias em uso no catálogo devem ser mantidas; mova os itens antes de excluir.',
  },
  Subcategoria: {
    modelo: 'Subcategoria',
    deps: async (db, id) => {
      const sub = await db.Subcategoria.get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!sub) return [];
      const itens = await db.CatalogItem.filter({ categoria: sub.categoria, subcategoria: sub.nome }, '-created_date', 500);
      return itens.map((b) => `bem ${b.objeto}`);
    },
    dica: 'Subcategorias em uso no catálogo devem ser mantidas; mova os itens antes de excluir.',
  },
  Pagamento: {
    modelo: 'Pagamento',
    deps: async (db, id) => {
      const bens = await db.BemPatrimonial.filter({ pagamentoId: id }, '-created_date', 500);
      return bens.map((b) => `bem ${b.placa}`);
    },
    dica: 'Notas vinculadas a bens patrimoniados devem ser mantidas; para anular, mude a situação para "Cancelado".',
  },
  // Sem dependentes: podem ser excluídos por administradores
  DFD: { modelo: 'DFD', deps: async () => [], dica: '' },
  Ocorrencia: { modelo: 'Ocorrencia', deps: async () => [], dica: '' },
  TermoRecebimento: { modelo: 'TermoRecebimento', deps: async () => [], dica: '' },
  OrdemFornecimento: { modelo: 'OrdemFornecimento', deps: async () => [], dica: 'Para preservar o histórico, cancele a ordem (situação "cancelada") em vez de excluí-la.' },
  Reserva: { modelo: 'Reserva', deps: async () => [], dica: 'Para preservar o histórico, cancele a reserva (situação "cancelada") em vez de excluí-la.' },
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Não autenticado.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Somente administradores podem excluir registros.' }, { status: 403 });

    const { entidade, id, ignorarDependencias } = await req.json().catch(() => ({}));
    if (!entidade || !id) return Response.json({ error: 'Entidade e identificador são obrigatórios.' }, { status: 400 });
    const alvo = ENTIDADES[entidade];
    if (!alvo) return Response.json({ error: `Exclusão não permitida para "${entidade}".` }, { status: 400 });

    const db = base44.asServiceRole.entities;
    const registro = await db[alvo.modelo].get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!registro) return Response.json({ error: 'Registro não encontrado (pode já ter sido excluído).' }, { status: 404 });

    const deps = (await alvo.deps(db, id)).filter(Boolean);
    if (deps.length && !ignorarDependencias) {
      return Response.json({
        error: `Exclusão bloqueada: este registro está vinculado a ${deps.length} registro(s) — ${deps.slice(0, 6).join(', ')}${deps.length > 6 ? '…' : ''}. ${alvo.dica}`.trim(),
        dependencias: deps,
      }, { status: 409 });
    }

    await db[alvo.modelo].delete(id);
    return Response.json({ ok: true, entidade: alvo.modelo });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}