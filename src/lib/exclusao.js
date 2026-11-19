import { base44 } from "@/api/base44Client";

// Exclusão centralizada: o servidor confere dependentes e a política de cancelamento/inativação.
// Devolve { ok, mensagem } — quando ok é falso, mensagem explica o bloqueio e o que fazer.
export async function excluirComDependencias(entidade, id) {
  try {
    const resp = await base44.functions.invoke("excluirRegistro", { entidade, id });
    const erro = resp?.data?.error;
    return erro ? { ok: false, mensagem: erro } : { ok: true, mensagem: "" };
  } catch (e) {
    return { ok: false, mensagem: e?.response?.data?.error || e?.message || String(e) };
  }
}