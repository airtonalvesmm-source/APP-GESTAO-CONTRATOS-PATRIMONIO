import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { excluirBens } from "@/lib/excluir-bem";
import { norm } from "@/lib/dmp-utils";
import { caminhoDepartamento } from "@/lib/departamentos";
import { Modal, Btn, Campo, Vazio, Pill, inputCls } from "../ui";
import { Check, Search, Trash2, AlertTriangle } from "lucide-react";

export default function ExcluirBens({ data, isAdmin, refresh, onClose }) {
  const { catalog, contratos, departamentos, bens } = data;
  const [termo, setTermo] = useState("");
  const [sel, setSel] = useState(new Set());

  // Usuários comuns só veem/excluem unidades em estoque; admin vê todas.
  const visiveis = useMemo(() => {
    const base = (bens || []).filter(u => isAdmin || u.situacao === "em estoque");
    return base.slice().sort((a, c) => norm(a.placa).localeCompare(c.placa, "pt-BR", { numeric: true }));
  }, [bens, isAdmin]);

  const filtrados = useMemo(() => {
    const t = norm(termo.trim());
    if (!t) return visiveis;
    return visiveis.filter(u => {
      const b = catalog.find(x => x.id === u.benId) || {};
      const c = contratos.find(x => x.id === u.contratoId) || {};
      return norm(u.placa).includes(t) || norm(b.objeto).includes(t) || String(b.catmat).includes(t) || norm(c.numero).includes(t);
    });
  }, [visiveis, termo, catalog, contratos]);

  function toggle(id) { setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleAll() {
    setSel(s => (s.size === filtrados.length && filtrados.length > 0) ? new Set() : new Set(filtrados.map(u => u.id)));
  }

  async function confirmar() {
    const ids = Array.from(sel);
    if (!ids.length) return;
    const placas = ids.map(id => (bens.find(b => b.id === id) || {}).placa || id).slice(0, 12);
    const lista = placas.join(", ") + (ids.length > 12 ? ` … (+${ids.length - 12})` : "");
    const temTransf = ids.some(id => (bens.find(b => b.id === id) || {}).situacao === "transferido");
    const msg = temTransf
      ? `Excluir DEFINITIVAMENTE ${ids.length} unidade(s) patrimoniada(s)?\n\nPlacas: ${lista}\n\nAtenção: entre elas há unidades já transferidas a departamentos — o histórico de destino também será removido.`
      : `Excluir DEFINITIVAMENTE ${ids.length} unidade(s) patrimoniada(s)?\n\nPlacas: ${lista}\n\nAs movimentações de entrada associadas também serão removidas.`;
    if (!confirm(msg)) return;
    await excluirBens(ids, bens);
    if (refresh) await refresh();
    onClose();
    alert(`${ids.length} unidade(s) excluída(s).`);
  }

  return (
    <Modal sobre="Estoque" titulo="Excluir lançamentos de estoque" onClose={onClose}
      footer={<>
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn variant="risco" onClick={confirmar} disabled={sel.size === 0}>
          <Trash2 className="w-4 h-4 inline mr-1.5" />Excluir {sel.size > 0 ? `${sel.size} unidade(s)` : ""}
        </Btn>
      </>}>
      {!isAdmin && (
        <div className="border border-amber-300 bg-amber-50 rounded-sm px-3.5 py-2.5 text-[12.5px] text-amber-900 mb-4 flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 flex-none mt-0.5" />
          <span>Você só pode excluir unidades ainda <b>em estoque</b>. Unidades já transferidas a departamentos só podem ser removidas por administradores.</span>
        </div>
      )}

      <div className="flex gap-2 items-center mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input type="search" value={termo} onChange={e => setTermo(e.target.value)} placeholder="Buscar por placa, bem, CATMAT ou contrato"
            className="border border-slate-300 rounded-sm pl-8 pr-3 py-2 font-sans text-sm bg-white w-full" />
        </div>
        <button onClick={toggleAll} className="border border-slate-300 bg-white rounded-sm px-3 py-2 font-sans font-semibold text-[12.5px] text-slate-700 hover:border-slate-500 cursor-pointer">
          {sel.size === filtrados.length && filtrados.length > 0 ? "Limpar seleção" : "Selecionar todos"}
        </button>
        <span className="font-mono text-[11px] tracking-wider uppercase text-slate-500">
          {sel.size} selecionado{sel.size === 1 ? "" : "s"} · {visiveis.length} {isAdmin ? "unidades" : "em estoque"}
        </span>
      </div>

      {filtrados.length === 0 ? (
        <Vazio titulo="Nenhuma unidade para excluir" texto={isAdmin ? "Não há bens patrimoniados cadastrados." : "Não há unidades em estoque disponíveis para exclusão."} />
      ) : (
        <div className="border border-slate-300 rounded-sm max-h-[46vh] overflow-auto">
          <table className="w-full border-collapse text-[13px] min-w-[640px]">
            <thead className="sticky top-0"><tr className="bg-stone-50">
              <th className="w-8 px-2.5 py-2"></th>
              <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-2.5 py-2">Placa</th>
              <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-2.5 py-2">Bem</th>
              <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-2.5 py-2">Contrato</th>
              <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-2.5 py-2">Situação</th>
              <th className="text-left font-sans text-[9.5px] tracking-widest uppercase text-slate-500 px-2.5 py-2">Destino</th>
            </tr></thead>
            <tbody>
              {filtrados.map(u => {
                const b = catalog.find(x => x.id === u.benId) || {};
                const c = contratos.find(x => x.id === u.contratoId) || {};
                const d = departamentos.find(x => x.id === u.departamentoId);
                const on = sel.has(u.id);
                const transf = u.situacao === "transferido";
                return (
                  <tr key={u.id} onClick={() => toggle(u.id)} className={`border-t border-slate-100 cursor-pointer ${on ? "bg-red-50/70" : "hover:bg-stone-50"}`}>
                    <td className="px-2.5 py-2 text-center">
                      <span className={`inline-flex w-5 h-5 rounded border-2 items-center justify-center transition-colors ${on ? "bg-red-700 border-red-700 text-white" : "bg-white border-slate-400"}`}>
                        {on && <Check className="w-3 h-3" />}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 font-mono font-semibold text-slate-800">{u.placa}</td>
                    <td className="px-2.5 py-2 font-sans text-[12.5px] text-slate-700">{b.objeto || "—"}</td>
                    <td className="px-2.5 py-2 font-sans text-[12.5px] text-slate-600">{c.numero || "—"}</td>
                    <td className="px-2.5 py-2"><Pill tipo={transf ? "aviso" : "ok"}>{u.situacao}</Pill></td>
                    <td className="px-2.5 py-2 font-sans text-[12px] text-slate-500">{d ? caminhoDepartamento(d, departamentos) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}