import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Restaura todos os itens do catálogo que foram excluídos (oculto: true).
// Apenas administradores podem executar esta operação — é o inverso da exclusão
// administrativa, que é protegida por RLS (delete = role admin).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Somente administradores podem restaurar itens do catálogo.' }, { status: 403 });

    await base44.asServiceRole.entities.CatalogItem.updateMany({ oculto: true }, { $set: { oculto: false } });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}