import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Exclui um contrato/empenho com suas ocorrências e notas fiscais num único passo.
// Bloqueia se houver nota paga. Se algum passo falhar, restaura o que já foi removido.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Somente administradores podem excluir lançamentos.' }, { status: 403 });

    const { contratoId } = await req.json();
    if (!contratoId) return Response.json({ error: 'Contrato não informado.' }, { status: 400 });

    const db = base44.asServiceRole.entities;
    const contrato = await db.Contrato.get(contratoId);
    if (!contrato) return Response.json({ error: 'Contrato não encontrado.' }, { status: 404 });

    const pagamentos = await db.Pagamento.filter({ contratoId }, '-created_date', 1000);
    const pagos = pagamentos.filter(p => p.situacao === 'Pago' || Number(p.valorPago) > 0);
    if (pagos.length) {
      return Response.json({ error: `Exclusão bloqueada: ${pagos.length} nota(s) fiscal(is) com pagamento registrado. Altere a situação do lançamento para "Cancelado" para preservar o histórico financeiro.` }, { status: 409 });
    }
    const ocorrencias = await db.Ocorrencia.filter({ contratoId }, '-created_date', 1000);

    const limpar = (r) => {
      const { id, created_date, updated_date, created_by_id, created_by, ...resto } = r;
      return resto;
    };
    let ocRemovidas = false, pgRemovidos = false;
    try {
      if (ocorrencias.length) { await db.Ocorrencia.deleteMany({ contratoId }); ocRemovidas = true; }
      if (pagamentos.length) { await db.Pagamento.deleteMany({ contratoId }); pgRemovidos = true; }
      await db.Contrato.delete(contratoId);
    } catch (e) {
      if (ocRemovidas) await db.Ocorrencia.bulkCreate(ocorrencias.map(limpar));
      if (pgRemovidos) await db.Pagamento.bulkCreate(pagamentos.map(limpar));
      return Response.json({ error: 'Falha na exclusão; nenhum registro foi perdido. ' + e.message }, { status: 500 });
    }

    return Response.json({ ok: true, ocorrencias: ocorrencias.length, pagamentos: pagamentos.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}