import { base44 } from "@/api/base44Client";

// Exclui unidades patrimoniadas (BemPatrimonial) e, em cascata, as movimentações
// de entrada associadas (MovimentacaoEstoque.bemId guarda a placa da unidade).
// ids: array de ids de BemPatrimonial. bens: lista completa de bens (para achar placa).
export async function excluirBens(ids, bens) {
  if (!ids || !ids.length) return 0;
  const placas = new Set();
  ids.forEach(id => {
    const u = (bens || []).find(b => b.id === id);
    if (u && u.placa) placas.add(String(u.placa));
  });
  if (placas.size) {
    try {
      await base44.entities.MovimentacaoEstoque.deleteMany({ bemId: { $in: Array.from(placas) } });
    } catch (e) { /* movimentações podem não existir; segue */ }
  }
  await base44.entities.BemPatrimonial.deleteMany({ id: { $in: ids } });
  return ids.length;
}